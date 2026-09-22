using UnityEngine;

namespace DontMove
{
    public enum PatrolState { Patrol, Stop, Turn }
    public enum GuardState { Patrol, Suspicious, Alert, Chase, Search, Return }

    [RequireComponent(typeof(GuardVision))]
    public sealed class GuardController : MonoBehaviour
    {
        public Transform[] patrolPoints;
        public float patrolSpeed = 1.7f;
        public float chaseSpeed = 3.8f;
        public float searchSpeed = 2.4f;
        public float returnSpeed = 2.1f;
        public float rotationSpeed = 110f;
        public float stopDuration = .8f;
        public float initialDelay;
        public bool pingPong;
        [Range(.1f, 2f)] public float suspicionDecayDelay = .65f;
        [Range(.02f, 1f)] public float suspicionDecayPerSecond = .18f;
        [Range(.1f, 2f)] public float alertWhistleDuration = .55f;
        [Range(.1f, 5f)] public float captureRadius = .6f;
        [Range(1f, 15f)] public float searchDuration = 4.5f;
        [Range(.5f, 5f)] public float searchRadius = 2.6f;
        [Range(.15f, .5f)] public float collisionRadius = .28f;
        [Range(.1f, 2f)] public float suspiciousMovementScale = 1f;
        public GuardVision vision;

        public PatrolState PatrolPhase { get; private set; } = PatrolState.Stop;
        // State is retained as the legacy patrol phase API used by editor tooling.
        public PatrolState State => PatrolPhase;
        public GuardState AlertState { get; private set; } = GuardState.Patrol;
        public float Suspicion { get; private set; }
        public float SuspicionGainPerSecond { get; private set; }
        public float DistanceToPlayer { get; private set; } = float.PositiveInfinity;
        public float VisionCenterFactor { get; private set; }
        public bool CanSeePlayer => vision != null && vision.SeesPlayer;
        public Vector3 LastKnownPosition { get; private set; }
        public Vector3 CurrentTarget { get; private set; }
        public bool IsWhistling { get; private set; }
        public float WhistleRemaining { get; private set; }
        public float SearchRemaining { get; private set; }
        public float AlertElapsed { get; private set; }
        public GuardController AlertSource { get; private set; }

        // Editor-only presentation override used by the visual alert QA shortcut.
        // It never changes the gameplay FSM, suspicion calculation, or global alert.
        public bool HasDebugPreview { get; private set; }
        public GuardState DisplayState => HasDebugPreview ? debugPreviewState : AlertState;
        public float DisplaySuspicion => HasDebugPreview ? debugPreviewSuspicion : Suspicion;

        int waypoint;
        int step = 1;
        int searchPoint;
        float wait;
        float lostSightTime;
        float searchPause;
        bool initialized;
        bool respondingToGlobalAlert;
        Vector3 searchOrigin;
        GuardAudio guardAudio;
        GuardState debugPreviewState;
        float debugPreviewSuspicion;

        public void Configure(GameStateController controller, Transform target)
        {
            if (vision == null) vision = GetComponent<GuardVision>();
            vision.player = target;
        }

        void Awake()
        {
            if (vision == null) vision = GetComponent<GuardVision>();
            guardAudio = gameObject.GetComponent<GuardAudio>() ?? gameObject.AddComponent<GuardAudio>();
            guardAudio.EnsureSource();
        }

        public void TickAI(float dt, GameStateController game)
        {
            if (game == null || game.player == null || vision == null) return;
            vision.Evaluate();
            DistanceToPlayer = Vector3.Distance(transform.position, game.player.transform.position);
            VisionCenterFactor = vision.CenterFactor;
            // Capture is a physical proximity rule. Sight is only needed to build
            // suspicion; once the guard is on top of the player, cover cannot save it.
            if (DistanceToPlayer <= captureRadius)
            {
                game.NotifyCaught(this);
                return;
            }

            switch (AlertState)
            {
                case GuardState.Patrol: TickPatrolAwareness(dt, game); break;
                case GuardState.Suspicious: TickSuspicious(dt, game); break;
                case GuardState.Alert: TickAlert(dt, game); break;
                case GuardState.Chase: TickChase(dt, game); break;
                case GuardState.Search: TickSearch(dt, game); break;
                case GuardState.Return: TickReturn(dt, game); break;
            }
        }

        // Compatibility entry point for editor tests and tooling.
        public void TickPatrol(float dt)
        {
            if (AlertState != GuardState.Patrol) SetState(GuardState.Patrol);
            TickPatrolRoute(dt);
        }

        void TickPatrolAwareness(float dt, GameStateController game)
        {
            TickPatrolRoute(dt);
            if (CanSeePlayer)
            {
                LastKnownPosition = game.player.transform.position;
                SetState(GuardState.Suspicious);
                TickSuspicion(dt, game);
            }
        }

        void TickSuspicious(float dt, GameStateController game)
        {
            if (CanSeePlayer)
            {
                LastKnownPosition = game.player.transform.position;
                lostSightTime = 0f;
                TickSuspicion(dt, game);
                if (Suspicion >= 1f) BeginAlert(game, false);
            }
            else
            {
                lostSightTime += dt;
                SuspicionGainPerSecond = 0f;
                if (lostSightTime > suspicionDecayDelay)
                {
                    Suspicion = Mathf.Max(0f, Suspicion - suspicionDecayPerSecond * dt);
                    if (Suspicion <= .001f) SetState(GuardState.Patrol);
                }
            }
        }

        void TickSuspicion(float dt, GameStateController game)
        {
            float movement = MovementFactor(game.player.MovementState);
            float proximity = 1f + Mathf.Clamp01(1f - DistanceToPlayer / Mathf.Max(.01f, vision.distance)) * 1.4f;
            float center = Mathf.Lerp(.3f, 1f, VisionCenterFactor);
            SuspicionGainPerSecond = movement * proximity * center * suspiciousMovementScale;
            if (SuspicionGainPerSecond <= .001f) SuspicionGainPerSecond = .002f * center;
            Suspicion = Mathf.Clamp01(Suspicion + SuspicionGainPerSecond * dt);
            if (guardAudio != null && SuspicionGainPerSecond > .08f) guardAudio.TickSuspicion(Suspicion);
        }

        static float MovementFactor(MovementState state)
        {
            switch (state)
            {
                case MovementState.Sneak: return .22f;
                case MovementState.Walk: return .58f;
                case MovementState.Run: return 1f;
                default: return .001f;
            }
        }

        void BeginAlert(GameStateController game, bool globalResponse)
        {
            Suspicion = 1f;
            AlertSource = globalResponse ? game.AlertSource : this;
            respondingToGlobalAlert = globalResponse;
            IsWhistling = !globalResponse;
            WhistleRemaining = globalResponse ? .2f : alertWhistleDuration;
            AlertElapsed = 0f;
            SetState(GuardState.Alert);
            if (!globalResponse)
            {
                guardAudio?.PlayAlert();
                game.BroadcastGlobalAlert(this, LastKnownPosition);
            }
        }

        void TickAlert(float dt, GameStateController game)
        {
            AlertElapsed += dt;
            if (respondingToGlobalAlert)
            {
                MoveTowards(LastKnownPosition, dt, chaseSpeed);
                if (Vector3.Distance(transform.position, LastKnownPosition) < .25f)
                {
                    BeginSearch(game);
                    return;
                }
            }
            WhistleRemaining -= dt;
            if (WhistleRemaining <= 0f)
            {
                IsWhistling = false;
                if (!respondingToGlobalAlert) SetState(GuardState.Chase);
            }
        }

        void TickChase(float dt, GameStateController game)
        {
            if (CanSeePlayer)
            {
                LastKnownPosition = game.player.transform.position;
                lostSightTime = 0f;
                MoveTowards(LastKnownPosition, dt, chaseSpeed);
                guardAudio?.SetRunning(true);
            }
            else
            {
                lostSightTime += dt;
                MoveTowards(LastKnownPosition, dt, chaseSpeed);
                if (Vector3.Distance(transform.position, LastKnownPosition) < .25f || lostSightTime > .8f)
                    BeginSearch(game);
            }
        }

        void BeginSearch(GameStateController game)
        {
            respondingToGlobalAlert = false;
            searchOrigin = LastKnownPosition;
            searchPoint = 0;
            SearchRemaining = searchDuration;
            searchPause = 0f;
            SetState(GuardState.Search);
            guardAudio?.SetRunning(false);
            guardAudio?.PlaySearch();
        }

        void TickSearch(float dt, GameStateController game)
        {
            SearchRemaining -= dt;
            if (CanSeePlayer)
            {
                LastKnownPosition = game.player.transform.position;
                Suspicion = 1f;
                BeginAlert(game, true);
                SetState(GuardState.Chase);
                return;
            }
            Vector3 target = SearchTarget();
            CurrentTarget = target;
            if (searchPause > 0f) searchPause -= dt;
            else if (Vector3.Distance(transform.position, target) < .3f)
            {
                searchPoint = (searchPoint + 1) % 4;
                searchPause = .35f;
            }
            else MoveTowards(target, dt, searchSpeed);
            if (SearchRemaining <= 0f) SetState(GuardState.Return);
        }

        Vector3 SearchTarget()
        {
            Vector3[] offsets = { Vector3.forward, Vector3.right, Vector3.back, Vector3.left };
            return searchOrigin + offsets[searchPoint] * searchRadius;
        }

        void TickReturn(float dt, GameStateController game)
        {
            if (CanSeePlayer)
            {
                LastKnownPosition = game.player.transform.position;
                BeginAlert(game, true);
                SetState(GuardState.Chase);
                return;
            }
            if (patrolPoints == null || patrolPoints.Length == 0) { SetState(GuardState.Patrol); return; }
            waypoint = NearestWaypoint();
            Vector3 target = patrolPoints[waypoint].position;
            CurrentTarget = target;
            MoveTowards(target, dt, returnSpeed);
            if (Vector3.Distance(transform.position, target) < .2f)
            {
                PatrolPhase = PatrolState.Stop;
                wait = stopDuration;
                SetState(GuardState.Patrol);
            }
        }

        void TickPatrolRoute(float dt)
        {
            if (patrolPoints == null || patrolPoints.Length < 2) return;
            if (!initialized) { initialized = true; wait = initialDelay; PatrolPhase = PatrolState.Stop; }
            if (PatrolPhase == PatrolState.Stop)
            {
                wait -= dt;
                if (wait <= 0f) { AdvanceWaypoint(); PatrolPhase = PatrolState.Turn; }
                return;
            }
            Vector3 target = patrolPoints[waypoint].position;
            CurrentTarget = target;
            Vector3 delta = target - transform.position; delta.y = 0f;
            if (PatrolPhase == PatrolState.Turn)
            {
                RotateTowards(delta, dt);
                if (delta.sqrMagnitude < .001f || Vector3.Angle(transform.forward, delta) < 2f) PatrolPhase = PatrolState.Patrol;
                return;
            }
            transform.position += delta.normalized * Mathf.Min(patrolSpeed * dt, delta.magnitude);
            if (delta.magnitude <= .08f) { PatrolPhase = PatrolState.Stop; wait = stopDuration; }
        }

        void AdvanceWaypoint()
        {
            if (pingPong)
            {
                if (waypoint + step >= patrolPoints.Length || waypoint + step < 0) step = -step;
                waypoint += step;
            }
            else waypoint = (waypoint + 1) % patrolPoints.Length;
        }

        int NearestWaypoint()
        {
            int result = 0; float best = float.PositiveInfinity;
            for (int i = 0; i < patrolPoints.Length; i++)
            {
                float d = (patrolPoints[i].position - transform.position).sqrMagnitude;
                if (d < best) { best = d; result = i; }
            }
            return result;
        }

        void MoveTowards(Vector3 target, float dt, float speed)
        {
            Vector3 delta = target - transform.position; delta.y = 0f;
            CurrentTarget = target;
            if (delta.sqrMagnitude < .001f) return;
            Vector3 direction = delta.normalized;
            float stepDistance = Mathf.Min(speed * dt, delta.magnitude);
            Vector3 origin = transform.position + Vector3.up * .35f;
            Vector3 top = transform.position + Vector3.up * 1.7f;
            int mask = vision != null ? vision.obstructionMask : 1 << 8;
            if (Physics.CapsuleCast(origin, top, collisionRadius, direction, out RaycastHit hit, stepDistance + .04f, mask, QueryTriggerInteraction.Ignore))
            {
                Vector3 slide = Vector3.ProjectOnPlane(direction, hit.normal);
                slide.y = 0f;
                if (slide.sqrMagnitude < .001f) return;
                direction = slide.normalized;
            }
            transform.position += direction * stepDistance;
            RotateTowards(direction, dt);
        }

        void RotateTowards(Vector3 delta, float dt)
        {
            delta.y = 0f;
            if (delta.sqrMagnitude > .001f)
                transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(delta), rotationSpeed * dt);
        }

        void SetState(GuardState state)
        {
            if (AlertState == state) return;
            AlertState = state;
            if (state == GuardState.Patrol) { Suspicion = 0f; lostSightTime = 0f; }
            if (state == GuardState.Chase) guardAudio?.SetRunning(true);
            if (state != GuardState.Chase) guardAudio?.SetRunning(false);
        }

        public void ReceiveGlobalAlert(GuardController source, Vector3 lastKnown)
        {
            if (source == this) return;
            AlertSource = source;
            LastKnownPosition = lastKnown;
            Suspicion = 1f;
            respondingToGlobalAlert = true;
            WhistleRemaining = .2f;
            IsWhistling = false;
            SetState(GuardState.Alert);
        }

        public void ForceSearch(Vector3 position, GameStateController game)
        {
            LastKnownPosition = position;
            BeginSearch(game);
        }

        public void SetDebugPreview(GuardState state, float suspicion)
        {
            HasDebugPreview = true;
            debugPreviewState = state;
            debugPreviewSuspicion = Mathf.Clamp01(suspicion);
        }

        public void ClearDebugPreview()
        {
            HasDebugPreview = false;
            debugPreviewState = GuardState.Patrol;
            debugPreviewSuspicion = 0f;
        }
    }
}
