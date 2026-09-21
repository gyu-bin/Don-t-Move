using UnityEngine;
namespace DontMove
{
    // Distance driven Animator sampling: one cycle consumes a configured world-space stride.
    // Final directional sprite clips can replace the placeholder clips without changing movement.
    [DefaultExecutionOrder(200)]
    public sealed class PlayerSpriteAnimator : MonoBehaviour
    {
        public PlayerController player;
        public Animator animator;
        public SpriteRenderer body;
        public SpriteRenderer leftFoot, rightFoot;
        public Sprite[] directions;
        public bool usePlaceholderCycle = true;
        Vector2 lastFacing = Vector2.down;
        public float sneakStride=.45f, walkStride=.9f, runStride=1.5f;
        public float PlaybackSpeed { get; private set; }
        public float CyclePhase { get; private set; }
        public int Facing { get; private set; }
        public MovementState AnimationState { get; private set; }
        Vector3 previous;
        void Awake() { previous=player.transform.position; animator.speed=0; }
        void LateUpdate() { Sync(Time.deltaTime); }
        public void Sync(float dt)
        {
            Vector3 delta=player.transform.position-previous;delta.y=0;previous=player.transform.position;
            float speed=player.Speed;
            AnimationState=player.MovementState;
            Vector3 facing=speed>.001f?player.CurrentVelocity.normalized:player.FacingDirection;
            if(speed>.001f) lastFacing=new Vector2(facing.x,facing.z);
            if(speed>.001f)
                Facing=Mathf.Abs(facing.x)>Mathf.Abs(facing.z)?(facing.x>0?3:2):(facing.z>0?1:0);
            float stride=AnimationState==MovementState.Sneak?sneakStride:AnimationState==MovementState.Run?runStride:walkStride;
            PlaybackSpeed=AnimationState==MovementState.Idle?0:speed/Mathf.Max(.1f,stride);
            // Teleports and scene setup never advance the gait.
            if(delta.magnitude<=Mathf.Max(.2f,player.maxSpeed*Mathf.Max(dt,.001f)*2)) CyclePhase=Mathf.Repeat(CyclePhase+delta.magnitude/Mathf.Max(.1f,stride),1);
            if(AnimationState==MovementState.Idle) CyclePhase=0;
            animator.SetFloat("Speed",speed);animator.SetFloat("PlaybackSpeed",PlaybackSpeed);
            animator.SetFloat("FacingX",lastFacing.x);animator.SetFloat("FacingY",lastFacing.y);
            animator.SetInteger("MovementState",(int)AnimationState);animator.SetInteger("Facing",Facing);
            animator.speed=0;animator.Play(AnimationState.ToString(),0,CyclePhase);animator.Update(0);
            transform.position=player.transform.position+new Vector3(0,.1f,.35f);transform.rotation=Quaternion.Euler(90,0,0);
            if(usePlaceholderCycle && directions!=null&&directions.Length>=4)
            {
                body.sprite=directions[Facing];
                float scale=1.16f/body.sprite.bounds.size.y;body.transform.localScale=Vector3.one*scale;
            }
            // Rotate the placeholder stride axis along the actual world travel direction.
            var gait=leftFoot.transform.parent;
            gait.gameObject.SetActive(usePlaceholderCycle);
            gait.localRotation=Quaternion.Euler(0,0,speed>.001f?-Mathf.Atan2(facing.x,facing.z)*Mathf.Rad2Deg:0);
            int order=1000-Mathf.RoundToInt(player.transform.position.z*10);
            body.sortingOrder=order;leftFoot.sortingOrder=rightFoot.sortingOrder=order-1;
        }
    }
}
