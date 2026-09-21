#if UNITY_EDITOR
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;

[DefaultExecutionOrder(-10000)]
public sealed class PlaySmokeDriver : MonoBehaviour
{
    public static Keyboard keyboard;
    public static Key[] desiredKeys = System.Array.Empty<Key>();
    void Update()
    {
        if (keyboard == null) return;
        InputSystem.QueueStateEvent(keyboard, new KeyboardState(desiredKeys));
        InputSystem.Update();
    }
}
#endif
