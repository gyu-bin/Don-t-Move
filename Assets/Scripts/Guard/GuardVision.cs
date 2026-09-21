using UnityEngine;

namespace DontMove
{
    public sealed class GuardVision : MonoBehaviour
    {
        public float distance = 7f;
        [Range(20, 150)] public float angle = 75f;
        public LayerMask obstructionMask;
        public Transform player;
        public bool SeesPlayer { get; private set; }
        public bool IsFullyCovered { get; private set; }
        public Material safeMaterial;
        public Material dangerMaterial;
        Mesh cone;
        MeshRenderer coneRenderer;
        void Awake()
        {
            var visual = new GameObject("Vision Cone");
            visual.transform.SetParent(transform, false);
            visual.transform.localPosition = new Vector3(0, -0.8f, 0);
            var filter = visual.AddComponent<MeshFilter>();
            coneRenderer = visual.AddComponent<MeshRenderer>();
            coneRenderer.sortingOrder = 10;
            cone = new Mesh { name = "Vision Cone" };
            filter.sharedMesh = cone;
            MakeCone();
            coneRenderer.sharedMaterial = safeMaterial;
        }
        void MakeCone()
        {
            const int segments = 24;
            var vertices = new Vector3[segments + 2];
            var triangles = new int[segments * 3];
            for (int i = 0; i <= segments; i++)
            {
                float a = (i / (float)segments - 0.5f) * angle * Mathf.Deg2Rad;
                Vector3 ray = new Vector3(Mathf.Sin(a),0,Mathf.Cos(a));
                float reach = Physics.Raycast(transform.position + Vector3.up*.1f, transform.TransformDirection(ray), out RaycastHit block, distance, obstructionMask, QueryTriggerInteraction.Ignore) ? block.distance : distance;
                vertices[i+1] = ray * reach;
                if (i == segments) continue;
                int t = i * 3;
                triangles[t] = 0; triangles[t + 1] = i + 1; triangles[t + 2] = i + 2;
            }
            cone.vertices = vertices;
            cone.triangles = triangles;
            cone.RecalculateNormals();
        }
        public void Evaluate()
        {
            MakeCone();
            SeesPlayer = false;
            IsFullyCovered = false;
            if (player == null) return;
            Vector3 origin = transform.position + Vector3.up * 0.1f;
            Vector3 destination = player.position + Vector3.up * 0.1f;
            Vector3 direction = destination - origin;
            float length = direction.magnitude;
            if (length < 0.001f || length > distance || Vector3.Angle(transform.forward, direction) > angle * 0.5f) return;
            if (Physics.Raycast(origin, direction / length, out RaycastHit hit, length, obstructionMask, QueryTriggerInteraction.Ignore))
            {
                IsFullyCovered = hit.collider.GetComponent<CoverMarker>() != null;
                return;
            }
            SeesPlayer = true;
        }
        public void SetDanger(bool danger)
        {
            if (coneRenderer != null) coneRenderer.sharedMaterial = danger ? dangerMaterial : safeMaterial;
        }
        void OnDestroy() { if (cone != null) Destroy(cone); }
    }
}
