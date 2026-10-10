/* global __dirname */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sku = 'com.dontmove.removeads';
const bought = {productId:sku,purchaseState:'purchased',id:'test-transaction'};

/** Runs the production provider with deterministic hook/native boundaries.
 * No copied purchase or restore logic; effect/state rerenders use the same TSX. */
function harness({connected=true,cached=false,items=[],products=[{id:sku,type:'in-app',displayPrice:'₩4,900'}],platform='ios'}={}) {
  let cursor=0, dirty=true, output, options;
  const slots=[], effects=[], messages=[], requests=[];
  const state={connected,items,products,cache:{removeAdsOwned:cached,clearsSinceLastInterstitial:1},failQuery:false,finish:async()=>{},reconnects:0,queries:0,request:async()=>{},query:null};
  const depsSame=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>v===b[i]);
  const hooks={
    useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{const next=typeof value==='function'?value(slots[i].value):value;if(next!==slots[i].value){slots[i].value=next;dirty=true;}}];},
    useRef(initial){const i=cursor++;if(!slots[i])slots[i]={current:initial};return slots[i];},
    useMemo(fn,deps){const i=cursor++;if(!slots[i]||!depsSame(slots[i].deps,deps))slots[i]={deps,value:fn()};return slots[i].value;},
    useCallback(fn,deps){return hooks.useMemo(()=>fn,deps);},
    useEffect(fn,deps){const i=cursor++;if(!slots[i]||!depsSame(slots[i].deps,deps)){const previous=slots[i];slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=fn();});}},
  };
  const requestPurchase=async request=>{requests.push(request);return state.request();};
  const reconnect=async()=>{state.reconnects++;state.connected=true;dirty=true;return true;};
  const iap={
    useIAP(value){options=value;return {connected:state.connected,requestPurchase,reconnect};},
    fetchProducts:async()=>state.products,
    getAvailablePurchases:async()=>{state.queries++;if(state.query)return state.query();if(state.failQuery)throw new Error('offline');return state.items;},
    restorePurchases:async()=>{},finishTransaction:args=>state.finish(args),
  };
  const controller={setRemoveAdsOwned(){},initialize:async()=>{},preload(){},dispose(){},isReady:()=>false};
  const cache=new Map();
  const execute=file=>{
    if(cache.has(file))return cache.get(file);
    const module={exports:{}};
    const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    vm.runInNewContext(source,{module,exports:module.exports,console,__DEV__:false,
      require:name=>name==='react'?hooks:name==='react/jsx-runtime'?{jsx:(type,props)=>props}:name==='react-native'?{Platform:{OS:platform},AppState:{addEventListener:()=>({remove(){}})}}:name==='expo-iap'?iap:name==='./MonetizationContext'?{MonetizationContext:{Provider:{}}}:name==='./ads'?{interstitialController:controller}:name==='./monetizationStorage'?{DEFAULT_AD_STATE:{removeAdsOwned:false,clearsSinceLastInterstitial:0},loadAdState:async()=>state.cache,saveAdState:async next=>{state.cache=next;}}:name==='../analytics/track'?{track(){}}:execute(path.resolve(path.dirname(file),name.endsWith('.ts')||name.endsWith('.tsx')?name:name+'.ts'))});
    cache.set(file,module.exports);return module.exports;
  };
  const Provider=execute(path.resolve(__dirname,'../MonetizationNative.tsx')).MonetizationNativeProvider;
  async function flush(){for(let i=0;i<12;i++){if(dirty){dirty=false;cursor=0;output=Provider({children:null}).value;if(output.purchaseMessage)messages.push(output.purchaseMessage);}while(effects.length)effects.shift()();await new Promise(resolve=>setImmediate(resolve));}}
  return {state,requests,messages,flush,get value(){return output;},get events(){return options;}};
}

test('provider restore success only displays restored, never empty flash',async()=>{
  const app=harness();await app.flush();app.state.items=[bought];
  await app.value.restorePurchases();await app.flush();
  assert.equal(app.value.adState.removeAdsOwned,true);
  assert.equal(app.value.purchaseMessage,'restored');
  assert.equal(app.messages.includes('restoreEmpty'),false);
});
test('provider empty restore clears cached entitlement, store failure retains it',async()=>{
  const app=harness({cached:true,items:[bought]});await app.flush();
  app.state.failQuery=true;await app.value.restorePurchases();await app.flush();
  assert.equal(app.value.adState.removeAdsOwned,true);assert.equal(app.value.purchaseMessage,'restoreFailed');
  app.state.failQuery=false;app.state.items=[];await app.value.restorePurchases();await app.flush();
  assert.equal(app.value.adState.removeAdsOwned,false);assert.equal(app.value.purchaseMessage,'restoreEmpty');
});
test('provider cannot request unloaded product; retry reconnects and fetches real price',async()=>{
  const app=harness({connected:false});await app.flush();
  await app.value.purchaseRemoveAds();await app.flush();assert.equal(app.requests.length,0);
  await app.value.refreshProducts();await app.flush();assert.equal(app.state.reconnects,1);assert.equal(app.value.product.displayPrice,'₩4,900');
  await app.value.purchaseRemoveAds();await app.value.purchaseRemoveAds();
  assert.equal(app.requests.length,1);assert.equal(app.requests[0].request.apple.sku,sku);
});
test('provider missing SKU blocks purchase, cancellation preserves ownership',async()=>{
  const app=harness({products:[]});await app.flush();
  await app.value.purchaseRemoveAds();await app.flush();assert.equal(app.requests.length,0);
  app.events.onPurchaseError({code:'user-cancelled'});await app.flush();
  assert.equal(app.value.purchaseMessage,'cancelled');assert.equal(app.value.adState.removeAdsOwned,false);
});
test('provider completes nonconsumable before ownership and enables retry on finish failure',async()=>{
  const app=harness();await app.flush();
  let finishArgs;app.state.finish=async args=>{finishArgs=args;throw new Error('unavailable');};
  await app.value.purchaseRemoveAds();app.events.onPurchaseSuccess(bought);await app.flush();
  assert.equal(finishArgs.isConsumable,false);assert.equal(app.value.adState.removeAdsOwned,false);assert.equal(app.value.purchaseMessage,'finishFailed');
  app.state.finish=async()=>{};await app.value.purchaseRemoveAds();app.events.onPurchaseSuccess(bought);await app.flush();
  assert.equal(app.value.adState.removeAdsOwned,true);assert.equal(app.value.purchaseMessage,'purchased');
});


test('provider already-owned response reconciles Store ownership as normal success',async()=>{
  const app=harness();await app.flush();app.state.items=[bought];
  app.events.onPurchaseError({code:'already-owned'});await app.flush();
  assert.equal(app.value.purchaseMessage,'alreadyOwned');assert.equal(app.value.adState.removeAdsOwned,true);
});
test('provider cached startup survives store outage and failed purchase leaves entitlement unchanged',async()=>{
  const app=harness({cached:true,connected:false});app.state.failQuery=true;await app.flush();
  assert.equal(app.value.adState.removeAdsOwned,true);
  await app.value.refreshProducts();await app.flush();
  assert.equal(app.value.adState.removeAdsOwned,true);
  app.events.onPurchaseError({code:'network-error'});await app.flush();
  assert.equal(app.value.purchaseMessage,'purchaseFailed');assert.equal(app.value.adState.removeAdsOwned,true);
});
test('revoked purchase event reconciles active ownership instead of granting',async()=>{
  const app=harness({cached:true,items:[bought]});await app.flush();
  app.state.items=[];app.events.onPurchaseSuccess({...bought,revocationDateIOS:123456});await app.flush();
  assert.equal(app.value.adState.removeAdsOwned,false);assert.notEqual(app.value.purchaseMessage,'purchased');
});


test('native error event + request rejection reconcile once; late catch cannot unlock a newer restore',async()=>{
  const app=harness();await app.flush();
  let rejectRequest;app.state.request=()=>new Promise((_,reject)=>{rejectRequest=reject;});
  app.state.items=[bought];const before=app.state.queries;
  const requesting=app.value.purchaseRemoveAds();
  app.events.onPurchaseError({code:'already-owned'});await app.flush();
  assert.equal(app.state.queries,before+1);assert.equal(app.value.purchaseMessage,'alreadyOwned');
  let releaseRestore;app.state.query=()=>new Promise(resolve=>{releaseRestore=resolve;});
  const restoring=app.value.restorePurchases();await app.flush();
  assert.equal(app.value.purchaseStatus,'restoring');
  rejectRequest({code:'already-owned'});await requesting;await app.flush();
  const queryCount=app.state.queries;
  // A second restore must be ignored while the newer operation is unresolved.
  await app.value.restorePurchases();await app.flush();assert.equal(app.state.queries,queryCount);
  releaseRestore([bought]);await restoring;await app.flush();
  assert.equal(app.value.purchaseMessage,'restored');
});
test('simultaneous emitted and thrown already-owned error shares one Store query',async()=>{
  const app=harness();await app.flush();app.state.items=[bought];const before=app.state.queries;
  app.state.request=async()=>{app.events.onPurchaseError({code:'already-owned'});throw {code:'already-owned'};};
  await app.value.purchaseRemoveAds();await app.flush();
  assert.equal(app.state.queries,before+1);assert.equal(app.value.purchaseMessage,'alreadyOwned');
});
test('Android: the Play product remove_ads is fetched, bought through the google request, acknowledged and restored',async()=>{
  const play='remove_ads';
  const playBought={productId:play,purchaseState:'purchased',id:'GPA.test'};
  const finished=[];
  const app=harness({platform:'android',products:[{id:play,type:'in-app',displayPrice:'₩4,900'}]});
  app.state.finish=async args=>{finished.push(args);};
  await app.flush();
  assert.equal(app.value.productStatus,'ready');assert.equal(app.value.product.id,play);assert.equal(app.value.product.displayPrice,'₩4,900');
  await app.value.purchaseRemoveAds();await app.flush();
  assert.equal(app.requests.length,1);
  assert.equal(JSON.stringify(app.requests[0].request.google.skus),JSON.stringify([play]));assert.equal(app.requests[0].request.apple,undefined);assert.equal(app.requests[0].type,'in-app');
  app.events.onPurchaseSuccess(playBought);await app.flush();
  assert.equal(app.value.adState.removeAdsOwned,true);assert.equal(app.value.purchaseMessage,'purchased');
  assert.equal(finished.length,1);assert.equal(finished[0].isConsumable,false,'a one-time product is acknowledged, never consumed');
  // The App Store id is not a Play product: a purchase event carrying it is ignored.
  const other=harness({platform:'android',products:[{id:play,type:'in-app',displayPrice:'₩4,900'}]});await other.flush();
  other.events.onPurchaseSuccess({productId:sku,purchaseState:'purchased',id:'x'});await other.flush();
  assert.equal(other.value.adState.removeAdsOwned,false);
  // Restore on a new install finds the Play purchase.
  const restored=harness({platform:'android',items:[playBought],products:[{id:play,type:'in-app',displayPrice:'₩4,900'}]});await restored.flush();
  await restored.value.restorePurchases();await restored.flush();
  assert.equal(restored.value.adState.removeAdsOwned,true);
});
