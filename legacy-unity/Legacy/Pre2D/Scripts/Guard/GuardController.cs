using UnityEngine;
namespace DontMove
{
    [RequireComponent(typeof(GuardVision))]
    public sealed class GuardController : MonoBehaviour
    {
        public Transform[] patrolPoints;
        public float patrolSpeed = 1.7f;
        public float rotationSpeed = 190f;
        public GuardVision vision;
        int waypoint;
        public void TickPatrol(float dt)
        {
            if (patrolPoints == null || patrolPoints.Length == 0) return;
            Vector3 goal = patrolPoints[waypoint].position;
            Vector3 delta = goal - transform.position;
            delta.y = 0;
            if (delta.magnitude < 0.22f) { waypoint = (waypoint + 1) % patrolPoints.Length; return; }
            transform.position += delta.normalized * Mathf.Min(patrolSpeed * dt, delta.magnitude);
            RotateTowards(delta, dt);
        }
        public void FacePlayer(Transform target, float dt)
        {
            if (target == null) return;
            Vector3 delta = target.position - transform.position;
            delta.y = 0;
            RotateTowards(delta, dt);
        }
        void RotateTowards(Vector3 delta, float dt)
        {
            if (delta.sqrMagnitude < 0.01f) return;
            transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(delta), rotationSpeed * dt);
        }
    }
}
