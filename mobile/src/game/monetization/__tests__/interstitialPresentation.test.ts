import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {presentLoadedAd, type PresentableAd} from '../interstitialPresentation';
const events = {opened: 'opened', closed: 'closed', error: 'error'};
function fakeAd(show: () => Promise<void> = async () => {}) {
 const callbacks = new Map<string, (...args: unknown[]) => void>();
 let calls = 0;
 const ad: PresentableAd & {emit: (key: string) => void; calls: () => number} = {
  show: () => {calls++; return show();},
  addAdEventListener: (key, callback) => {callbacks.set(key, callback); return () => {callbacks.delete(key);};},
  emit: key => callbacks.get(key)?.(), calls: () => calls,
 };
 return ad;
}
test('closed/error duplicate events settle once and invoke native show once', async () => {
 const ad = fakeAd(); let settlements = 0;
 const request = presentLoadedAd(ad, events, () => {settlements++;}, 50);
 ad.emit('opened'); ad.emit('closed'); ad.emit('error'); request.cancel();
 assert.equal(await request.result, 'shown'); assert.equal(settlements, 1); assert.equal(ad.calls(), 1);
});
test('show rejection and synchronous throw continue without hanging', async () => {
 for (const show of [() => Promise.reject(new Error('offline')), () => {throw new Error('invalid activity');}]) {
  const request = presentLoadedAd(fakeAd(show), events, () => {}, 50);
  assert.equal(await request.result, 'skipped');
 }
});
test('ERROR cleans listeners and settles before any CLOSED event', async () => {
 const ad = fakeAd(); const request = presentLoadedAd(ad, events, () => {}, 50);
 ad.emit('error'); ad.emit('closed'); assert.equal(await request.result, 'skipped');
});
test('missing presentation start callback has bounded fallback', async () => {
 const request = presentLoadedAd(fakeAd(), events, () => {}, 10);
 assert.equal(await request.result, 'skipped');
});
test('normal visible ad is not ended by start watchdog', async () => {
 const ad = fakeAd(); const request = presentLoadedAd(ad, events, () => {}, 10);
 ad.emit('opened'); let settled = false; void request.result.then(() => {settled = true;});
 await new Promise(resolve => setTimeout(resolve, 25)); assert.equal(settled, false);
 ad.emit('closed'); assert.equal(await request.result, 'shown');
});
test('dispose cancels pending continuation exactly once', async () => {
 const request = presentLoadedAd(fakeAd(), events, () => {}, 50);
 request.cancel(); request.cancel(); assert.equal(await request.result, 'skipped');
});

test('missing consumer close callback recovers only after SDK confirms ad ended', async () => {
 const ad = fakeAd(); let loaded = true;
 Object.defineProperty(ad, 'loaded', {get: () => loaded});
 const request = presentLoadedAd(ad, events, () => {}, 10);
 ad.emit('opened'); loaded = false;
 assert.equal(await request.result, 'shown');
});

test('touch confirmation recovers a lost close only after OPENED and its grace', async () => {
 const ad = fakeAd(); let settlements = 0;
 const request = presentLoadedAd(ad, events, () => {settlements++;}, 1000, 20);
 let settled = false; void request.result.then(() => {settled = true;});
 request.confirmDismissed(); ad.emit('opened'); request.confirmDismissed();
 await new Promise(resolve => setTimeout(resolve, 5)); assert.equal(settled, false);
 await new Promise(resolve => setTimeout(resolve, 25));
 request.confirmDismissed(); request.confirmDismissed(); ad.emit('closed');
 assert.equal(await request.result, 'shown'); assert.equal(settlements, 1);
});
