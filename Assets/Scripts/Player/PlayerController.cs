using UnityEngine;

namespace DontMove
{
    public enum MovementState { Idle, Sneak, Walk, Run }

    [RequireComponent(typeof(CharacterController))]
    public sealed class PlayerController : MonoBehaviour
    {
        public SensorManager sensor;
        public GameStateController game;
        [Tooltip("Sneak state speed boundary, not a minimum velocity. Input starts continuously at zero.")]
        [Range(0f, 2f)] public float minSpeed = .55f;
        [Range(.5f, 10f)] public float maxSpeed = 5.2f;
        [Tooltip("Response shape. 2.2 preserves the candidate AnimationCurve; higher values emphasize precision.")]
        [Range(1f, 4f)] public float responseCurve = 2.2f;
        public AnimationCurve speedResponse = DefaultResponse();
        [Range(1f, 40f)] public float acceleration = 15f;
        [Range(1f, 60f)] public float deceleration = 32f;
        [Range(.005f, .2f)] public float stopThreshold = .035f;
        [Range(90f, 1080f)] public float rotationSpeed = 540f;
        [Range(0f, 20f)] public float rotationDeadZone = 4f;
        public float Speed { get; private set; }
        public float TargetSpeed { get; private set; }
        public float MaxSpeed { get; private set; }
        public float DistanceTravelled { get; private set; }
        public float ResponseOutput { get; private set; }
        public Vector3 CurrentVelocity { get; private set; }
        public Vector3 TargetVelocity { get; private set; }
        public Vector3 SmoothedVelocity => velocity;
        public Vector3 FacingDirection => transform.forward;
        public MovementState MovementState { get; private set; }
        public bool WallSliding { get; private set; }
        Vector3 velocity;
        CharacterController body;
        void Awake()
        {
            body = GetComponent<CharacterController>();
            // Unity's minimum move distance otherwise discards micro-tilt movement each frame.
            body.minMoveDistance = 0f;
        }
        public static AnimationCurve DefaultResponse() => new AnimationCurve(
            new Keyframe(0, 0, 0, 0), new Keyframe(.15f, .075f, .8f, .8f),
            new Keyframe(.30f, .25f, 1.2f, 1.2f), new Keyframe(.50f, .50f, 1.25f, 1.25f),
            new Keyframe(.70f, .75f, 1f, 1f), new Keyframe(1f, 1f, .6f, .6f));
        public float EvaluateResponse(float magnitude)
        {
            float t = Mathf.Clamp01(magnitude);
            if (t <= 0) return 0;
            if (t >= 1) return 1;
            return Mathf.Clamp01(speedResponse.Evaluate(Mathf.Pow(t, Mathf.Max(.1f, responseCurve) / 2.2f)));
        }
        public float SpeedForTilt(float tiltMagnitude) => Mathf.Max(0, maxSpeed) * EvaluateResponse(tiltMagnitude);
        public Vector3 DesiredVelocity(Vector2 tilt)
        {
            Vector2 clamped = Vector2.ClampMagnitude(tilt, 1f);
            return clamped.sqrMagnitude <= 0 ? Vector3.zero : new Vector3(clamped.x, 0, clamped.y).normalized * SpeedForTilt(clamped.magnitude);
        }
        void Update()
        {
            if (sensor == null || game == null) return;
            Vector2 input = sensor.MovementVector;
            TickMovement(input, Time.deltaTime, game.CanMove);
        }
        public void TickMovement(Vector2 input, float dt, bool canMove = true)
        {
            dt = Mathf.Clamp(dt, .0001f, .1f);
            ResponseOutput = canMove ? EvaluateResponse(Vector2.ClampMagnitude(input, 1).magnitude) : 0;
            TargetVelocity = canMove ? DesiredVelocity(input) : Vector3.zero;
            TargetSpeed = TargetVelocity.magnitude;
            if (!canMove) velocity = Vector3.zero;
            else
            {
                bool braking = TargetVelocity.sqrMagnitude < velocity.sqrMagnitude || Vector3.Dot(velocity, TargetVelocity) < 0;
                velocity = Vector3.MoveTowards(velocity, TargetVelocity, Mathf.Max(.1f, braking ? deceleration : acceleration) * dt);
                if (TargetSpeed == 0 && velocity.magnitude <= stopThreshold) velocity = Vector3.zero;
            }
            Vector3 before = transform.position;
            WallSliding = false;
            body.Move(velocity * dt);
            Vector3 displacement = transform.position - before; displacement.y = 0;
            CurrentVelocity = displacement / dt; Speed = CurrentVelocity.magnitude;
            MaxSpeed = Mathf.Max(MaxSpeed, Speed); DistanceTravelled += displacement.magnitude;
            MovementState = Speed <= .001f ? MovementState.Idle : Speed <= minSpeed ? MovementState.Sneak :
                Speed <= maxSpeed * .7f ? MovementState.Walk : MovementState.Run;
            if (Speed > Mathf.Max(.06f, stopThreshold))
            {
                Quaternion facing = Quaternion.LookRotation(displacement.normalized);
                if (Quaternion.Angle(transform.rotation, facing) > rotationDeadZone)
                    transform.rotation = Quaternion.RotateTowards(transform.rotation, facing, rotationSpeed * dt);
            }
        }
        public void ResetMotion()
        {
            velocity=CurrentVelocity=TargetVelocity=Vector3.zero;Speed=TargetSpeed=ResponseOutput=0;MovementState=MovementState.Idle;
        }
        void OnControllerColliderHit(ControllerColliderHit hit)
        {
            if (Mathf.Abs(hit.normal.y) > .4f) return;
            Vector3 normal = new Vector3(hit.normal.x, 0, hit.normal.z).normalized;
            float intoWall = Vector3.Dot(velocity, normal);
            if (intoWall < 0)
            {
                velocity -= normal * intoWall;
                WallSliding = true;
            }
        }
    }
}
