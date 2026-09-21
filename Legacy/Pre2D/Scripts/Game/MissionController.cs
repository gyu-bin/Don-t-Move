using UnityEngine;
namespace DontMove
{
    public sealed class MissionController : MonoBehaviour
    {
        public Transform diamond;
        public Transform exit;
        public GameStateController game;
        public bool HasDiamond { get; private set; }
        public void CollectDiamond()
        {
            if (HasDiamond) return;
            HasDiamond = true;
            if (diamond != null) diamond.gameObject.SetActive(false);
            game.OnDiamondStolen();
        }
        public void EnterExit() { if (HasDiamond) game.CompleteMission(); }
        public float DistanceToObjective(Transform player) => Vector3.Distance(player.position, HasDiamond ? exit.position : diamond.position);
        public void ResetMission()
        {
            HasDiamond = false;
            if (diamond != null) diamond.gameObject.SetActive(true);
        }
    }
}
