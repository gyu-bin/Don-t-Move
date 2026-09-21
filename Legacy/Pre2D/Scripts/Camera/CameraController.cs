using UnityEngine;
namespace DontMove
{
    public sealed class CameraController : MonoBehaviour
    {
        public Transform target;
        public Vector3 offset = new Vector3(0, 18, -8);
        [Range(45f, 75f)] public float pitch = 65f;
        public float smoothTime = 0.25f;
        Vector3 velocity;
        void LateUpdate()
        {
            if (target == null) return;
            transform.position = Vector3.SmoothDamp(transform.position, target.position + offset, ref velocity, smoothTime);
            transform.rotation = Quaternion.Euler(pitch, 0, 0);
        }
    }
}
