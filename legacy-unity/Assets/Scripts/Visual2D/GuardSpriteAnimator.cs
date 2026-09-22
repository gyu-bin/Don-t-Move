using UnityEngine;

namespace DontMove
{
    /// <summary>
    /// Runtime placeholder animation layer. It keeps guard motion tied to the
    /// actual state and speed until authored frame sheets are imported.
    /// </summary>
    [DefaultExecutionOrder(210)]
    public sealed class GuardSpriteAnimator : MonoBehaviour
    {
        public GuardController guard;
        DirectionalSprite directional;
        Transform visual;
        Vector3 baseScale;
        Vector3 basePosition;
        float phase;

        void Awake()
        {
            if (guard == null) guard = GetComponent<GuardController>();
            directional = GetComponentInChildren<DirectionalSprite>();
            if (directional != null)
            {
                visual = directional.transform;
                baseScale = visual.localScale;
                basePosition = visual.position;
            }
        }

        void LateUpdate()
        {
            if (guard == null || visual == null) return;
            float speed = guard.AlertState == GuardState.Chase ? guard.chaseSpeed :
                guard.AlertState == GuardState.Search || guard.AlertState == GuardState.Return ? guard.searchSpeed : guard.patrolSpeed;
            bool moving = guard.AlertState == GuardState.Chase || guard.AlertState == GuardState.Search || guard.AlertState == GuardState.Return || guard.PatrolPhase == PatrolState.Patrol;
            phase += Time.deltaTime * Mathf.Lerp(3.5f, 12f, Mathf.Clamp01(speed / 5f));
            float bob = moving ? Mathf.Sin(phase) * (guard.AlertState == GuardState.Chase ? .04f : .025f) : 0f;
            float pulse = guard.AlertState == GuardState.Alert ? 1f + Mathf.Sin(Time.unscaledTime * 15f) * .025f : 1f;
            visual.localScale = baseScale * pulse;
            visual.position = new Vector3(visual.position.x, basePosition.y + bob, visual.position.z);
        }
    }
}
