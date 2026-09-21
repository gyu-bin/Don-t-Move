using UnityEngine;

namespace DontMove
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class PlayerController : MonoBehaviour
    {
        public SensorManager sensor;
        public GameStateController game;
        [Range(0f, 2f)] public float minSpeed = 0.55f;
        [Range(0.5f, 10f)] public float maxSpeed = 5.2f;
        [Range(1f, 4f)] public float responseCurve = 2.2f;
        [Range(1f, 40f)] public float acceleration = 15f;
        [Range(1f, 60f)] public float deceleration = 28f;
        public float Speed { get; private set; }
        public float TargetSpeed { get; private set; }
        public float MaxSpeed { get; private set; }
        public float DistanceTravelled { get; private set; }
        Vector3 velocity;
        CharacterController body;
        void Awake() { body = GetComponent<CharacterController>(); }

        public float SpeedForTilt(float tiltMagnitude)
        {
            float t = Mathf.Clamp01(tiltMagnitude);
            if (t <= 0f) return 0f;
            float top = Mathf.Max(0f, maxSpeed);
            float sneak = Mathf.Min(minSpeed, top);
            // Ease into the sneak floor, then accelerate more strongly at larger tilts.
            float sneakRamp = Mathf.SmoothStep(0f, 1f, Mathf.Clamp01(t * 4f));
            return Mathf.Min(top, sneak * sneakRamp + (top - sneak) * Mathf.Pow(t, responseCurve));
        }

        public Vector3 DesiredVelocity(Vector2 tilt)
        {
            Vector2 clamped = Vector2.ClampMagnitude(tilt, 1f);
            float speed = SpeedForTilt(clamped.magnitude);
            return speed <= 0f ? Vector3.zero : new Vector3(clamped.x, 0f, clamped.y).normalized * speed;
        }

        void Update()
        {
            if (sensor == null || game == null) return;
            Vector2 input = game.CanMove ? (game.State == GameState.Freeze && game.GuardVisibility ? sensor.FreezeMovementVector : sensor.MovementVector) : Vector2.zero;
            Vector3 desired = DesiredVelocity(input);
            TargetSpeed = desired.magnitude;
            // FREEZE begins at the current pose. Holding it must stop previous MOVE momentum.
            velocity = !game.CanMove || (game.State == GameState.Freeze && desired.sqrMagnitude < 0.0001f)
                ? Vector3.zero
                : Vector3.MoveTowards(velocity, desired, (desired.sqrMagnitude > velocity.sqrMagnitude ? acceleration : deceleration) * Time.deltaTime);
            Vector3 before = transform.position;
            body.Move(velocity * Time.deltaTime);
            Vector3 displacement = transform.position - before;
            Speed = displacement.magnitude / Mathf.Max(Time.deltaTime, 0.0001f);
            MaxSpeed = Mathf.Max(MaxSpeed, Speed);
            DistanceTravelled += displacement.magnitude;
            if (Speed > 0.12f) transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(displacement.normalized), 12f * Time.deltaTime);
        }
    }
}
