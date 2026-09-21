using UnityEngine;

namespace DontMove
{
    // Visual-only rig. Gameplay movement, sensor input, and collision remain on the parent.
    public sealed class DMVisualAnimator : MonoBehaviour
    {
        public Transform leftArm;
        public Transform rightArm;
        public Transform leftLeg;
        public Transform rightLeg;
        public Transform head;
        public bool guard;

        PlayerController player;
        GuardController guardController;
        GameStateController game;
        Vector3 previousPosition;
        float phase;

        void Awake()
        {
            player = GetComponentInParent<PlayerController>();
            guardController = GetComponentInParent<GuardController>();
            game = Object.FindFirstObjectByType<GameStateController>();
            previousPosition = transform.parent != null ? transform.parent.position : transform.position;
        }

        void LateUpdate()
        {
            float speed;
            if (player != null) speed = player.Speed;
            else if (guardController != null)
            {
                Vector3 position = transform.parent.position;
                speed = Vector3.Distance(position, previousPosition) / Mathf.Max(Time.deltaTime, 0.0001f);
                previousPosition = position;
            }
            else speed = 0f;

            bool detected = !guard && game != null && game.State == GameState.Detected;
            bool frozen = !guard && game != null && speed < 0.08f;
            bool alert = guard && game != null && game.GuardVisibility &&
                         guardController != null && guardController.vision != null && guardController.vision.SeesPlayer;
            float motion = detected || frozen ? 0f : Mathf.Clamp01(speed / (guard ? 1.8f : 4f));
            phase += Time.deltaTime * Mathf.Lerp(4.5f, 11f, motion);
            float swing = Mathf.Sin(phase) * motion * 28f;
            if (leftLeg != null) leftLeg.localRotation = Quaternion.Euler(swing, 0f, 0f);
            if (rightLeg != null) rightLeg.localRotation = Quaternion.Euler(-swing, 0f, 0f);
            if (leftArm != null) leftArm.localRotation = Quaternion.Euler(detected ? -75f : alert ? -25f : -swing * 0.75f, 0f, detected ? -18f : 5f);
            if (rightArm != null) rightArm.localRotation = Quaternion.Euler(detected ? -75f : alert ? -25f : swing * 0.75f, 0f, detected ? 18f : -5f);
            if (head != null) head.localRotation = Quaternion.Euler(detected ? -18f : Mathf.Sin(phase * 0.36f) * 1.2f, 0f, 0f);
        }
    }
}
