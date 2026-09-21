using UnityEngine;
namespace DontMove
{
    public sealed class ObjectiveTrigger : MonoBehaviour
    {
        public bool isExit;
        public MissionController mission;
        void OnTriggerEnter(Collider other)
        {
            if (other.GetComponent<PlayerController>() == null) return;
            if (isExit) mission.EnterExit(); else mission.CollectDiamond();
        }
    }
}
