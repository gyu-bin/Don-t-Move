using UnityEngine;
namespace DontMove
{
    // Visuals face the fixed overhead camera; physics/heading remain on the root.
    public sealed class DirectionalSprite : MonoBehaviour
    {
        public Sprite[] directions;
        public SpriteRenderer visual;
        public float height = 1.45f;
        Transform actor;
        Vector3 previous;
        float phase;
        void Awake() { actor=transform.parent; previous=actor.position; }
        void LateUpdate()
        {
            Vector3 forward=actor.forward;
            int direction=Mathf.Abs(forward.x)>Mathf.Abs(forward.z) ? (forward.x>0?3:2) : (forward.z>0?1:0);
            if(directions!=null && directions.Length==4) visual.sprite=directions[direction];
            float speed=(actor.position-previous).magnitude/Mathf.Max(.001f,Time.deltaTime);
            previous=actor.position; phase+=Time.deltaTime*Mathf.Lerp(4,13,Mathf.Clamp01(speed/5.2f));
            transform.rotation=Quaternion.Euler(90,0,0);
            float bounce=speed>.05f?Mathf.Sin(phase)*.025f:0;
            transform.position=actor.position+new Vector3(0,.1f,.35f+bounce);
            float scale=height/Mathf.Max(.01f,visual.sprite.bounds.size.y);
            transform.localScale=Vector3.one*scale;
            visual.sortingOrder=1000-Mathf.RoundToInt(actor.position.z*10);
        }
    }
}
