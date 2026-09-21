using UnityEngine;
namespace DontMove
{
    public enum PatrolState { Patrol, Stop, Turn }
    [RequireComponent(typeof(GuardVision))]
    public sealed class GuardController : MonoBehaviour
    {
        public Transform[] patrolPoints;
        public float patrolSpeed = 1.7f;
        public float rotationSpeed = 110f;
        public float stopDuration = .8f;
        public float initialDelay;
        public bool pingPong;
        public GuardVision vision;
        public PatrolState State { get; private set; } = PatrolState.Stop;
        int waypoint, step=1;
        float wait;
        bool initialized;
        public void TickPatrol(float dt)
        {
            if (patrolPoints == null || patrolPoints.Length < 2) return;
            if (!initialized) { initialized=true; wait=initialDelay; }
            if (State == PatrolState.Stop)
            {
                wait -= dt;
                if (wait <= 0) { Advance(); State=PatrolState.Turn; }
                return;
            }
            Vector3 delta=patrolPoints[waypoint].position-transform.position; delta.y=0;
            if (State == PatrolState.Turn)
            {
                RotateTowards(delta,dt);
                if (delta.sqrMagnitude < .001f || Vector3.Angle(transform.forward,delta)<2) State=PatrolState.Patrol;
                return;
            }
            transform.position+=delta.normalized*Mathf.Min(patrolSpeed*dt,delta.magnitude);
            if (delta.magnitude <= .08f) { State=PatrolState.Stop; wait=stopDuration; }
        }
        void Advance()
        {
            if (pingPong) { if (waypoint+step>=patrolPoints.Length || waypoint+step<0) step=-step; waypoint+=step; }
            else waypoint=(waypoint+1)%patrolPoints.Length;
        }
        public void FacePlayer(Transform target,float dt) { if(target!=null) RotateTowards(target.position-transform.position,dt); }
        void RotateTowards(Vector3 delta,float dt)
        {
            delta.y=0;
            if (delta.sqrMagnitude>.001f) transform.rotation=Quaternion.RotateTowards(transform.rotation,Quaternion.LookRotation(delta),rotationSpeed*dt);
        }
    }
}
