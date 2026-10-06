import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createGuardEvents } from '../../game/guards/guardBrain';
import { updateGuardPhase, ESCAPE_TIMER_SECONDS } from '../../game/guards/guardPhase';
import { alertHudVisible } from './alertHud';

test('pickup, sighting, confirmed theft and high-security confirmation share one timer contract across all chapters', () => {
  for (let chapter = 1; chapter <= 9; chapter++) {
    const ev = createGuardEvents();
    const id = `${String(chapter).padStart(2, '0')}-01`;
    updateGuardPhase(ev, [], 10, id);
    assert.equal(ev.lockdownRemaining, 0, 'unknown pickup must not reveal a theft');
    assert.equal(alertHudVisible(ev.phase, ev.lockdownRemaining, ev.lockdownActive, false), false);
    ev.globalAlert = true; ev.sawPlayer = true;
    updateGuardPhase(ev, [], 12, id);
    assert.equal(ev.phase, 'PLAYER_SPOTTED');
    assert.equal(ev.lockdownRemaining, 0, 'sighting alone does not confirm the empty case');
    assert(alertHudVisible(ev.phase, 0, false, false));
    // Both visible empty case and delayed alarm use the same confirmed-theft event.
    ev.theftAlert = true; ev.theftActivatedAt = 15;
    const before = { x: ev.globalX, y: ev.globalY, revision: ev.globalRevision };
    updateGuardPhase(ev, [], 15, id);
    assert.equal(ev.lockdownRemaining, ESCAPE_TIMER_SECONDS);
    ev.sawPlayer = false;
    updateGuardPhase(ev, [], 20, id);
    assert.equal(ev.lockdownRemaining, ESCAPE_TIMER_SECONDS-5, 'search transition must not reset countdown');
    ev.sawPlayer = true;
    updateGuardPhase(ev, [], 21, id);
    assert.equal(ev.lockdownRemaining, ESCAPE_TIMER_SECONDS-6);
    updateGuardPhase(ev, [], 15+ESCAPE_TIMER_SECONDS, id);
    assert(ev.lockdownActive); assert(!ev.caught, 'timeout changes pressure, never capture');
    assert.deepEqual({ x: ev.globalX, y: ev.globalY, revision: ev.globalRevision }, before);
    assert(!alertHudVisible(ev.phase, 0, true, true), 'clear/caught removes gameplay HUD');
    assert.equal(createGuardEvents().theftActivatedAt, -1, 'retry starts fresh');
  }
});
