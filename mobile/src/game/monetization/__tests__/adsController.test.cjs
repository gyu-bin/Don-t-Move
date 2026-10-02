/* global __dirname */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function harness() {
 const ads = [];
 const sdk = {TestIds:{INTERSTITIAL:'test'},AdEventType:{LOADED:'loaded',OPENED:'opened',CLOSED:'closed',ERROR:'error'},
  InterstitialAd:{createForAdRequest: () => {
   const listeners = new Map(); const old = new Map();
   const ad = {loaded:false,shows:0,load(){},show(){this.shows++;return Promise.resolve();},
    addAdEventListener(type,fn){listeners.set(type,fn);old.set(type,fn);return () => listeners.delete(type);},
    emit(type){if(type==='loaded')this.loaded=true;if(type==='closed'||type==='error')this.loaded=false;listeners.get(type)?.();},
    stale(type){old.get(type)?.();}};
   ads.push(ad);return ad;
  }}};
 const cache = new Map();
 const execute = filename => {
  if(cache.has(filename))return cache.get(filename);
  const out = {exports:{}};cache.set(filename,out.exports);
  const source = ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{module:out,exports:out.exports,setTimeout,clearTimeout,setInterval,clearInterval,console,
   require: name => name==='react-native'?{Platform:{OS:'ios'}}:name==='./adsConfig'?{adsLog(){},isProductionAdUnits:()=>false,PRODUCTION_INTERSTITIAL:{}}:
    name==='./nativeGate'?{hasGoogleMobileAdsNative:()=>true}:name==='react-native-google-mobile-ads'?sdk:
     name==='../../ui/branding/initialization'?{}:execute(path.resolve(path.dirname(filename),name+'.ts'))});
  return out.exports;
 };
 return {controller:execute(path.resolve(__dirname,'../ads.ts')).interstitialController,ads};
}
test('not-loaded ad skips immediately without starting load at navigation', async () => {
 const {controller,ads}=harness();
 assert.equal(await controller.showIfReady(),'skipped'); assert.equal(ads.length,0);
 controller.preload(); assert.equal(ads.length,1);
 assert.equal(await controller.showIfReady(),'skipped');assert.equal(ads[0].shows,0);
 controller.dispose();
});
test('presentation ERROR resolves navigation, concurrent requests show exactly once', async () => {
 const {controller,ads}=harness();controller.preload();ads[0].emit('loaded');
 const first=controller.showIfReady();const second=controller.showIfReady();
 assert.equal(first,second);assert.equal(ads[0].shows,1);
 ads[0].emit('error');assert.equal(await first,'skipped');controller.dispose();
});
test('disposed request stale load event cannot make replacement ad ready', () => {
 const {controller,ads}=harness();controller.preload();controller.dispose();controller.preload();
 ads[0].stale('loaded');assert.equal(controller.isReady(),false);
 ads[1].emit('loaded');assert.equal(controller.isReady(),true);controller.dispose();
});
test('remove ads cancels optional presentation and never preloads replacement', async () => {
 const {controller,ads}=harness();controller.preload();ads[0].emit('loaded');
 const show=controller.showIfReady();controller.setRemoveAdsOwned(true);
 assert.equal(await show,'skipped');assert.equal(ads.length,1);assert.equal(controller.isReady(),false);
});
test('controller touch confirmation is inert when idle and before OPENED', async () => {
 const {controller,ads}=harness();controller.confirmPresentationDismissed();
 controller.preload();ads[0].emit('loaded');const show=controller.showIfReady();
 controller.confirmPresentationDismissed();let settled=false;void show.then(()=>{settled=true;});
 await new Promise(resolve=>setTimeout(resolve,5));assert.equal(settled,false);
 ads[0].emit('opened');ads[0].emit('closed');assert.equal(await show,'shown');controller.dispose();
});
