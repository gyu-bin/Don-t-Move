/* global __dirname */
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const babel=require('@babel/core');
const generate=require('@babel/generator').default;

// Exercise the actual production callback, isolated from native UI dependencies.
const source=fs.readFileSync(path.resolve(__dirname,'../VisualPlaygroundScreen.tsx'),'utf8');
const ast=babel.parseSync(source,{filename:'VisualPlaygroundScreen.tsx',presets:[require.resolve('babel-preset-expo')]});
let callback;
babel.traverse(ast,{CallExpression(p){if(p.node.callee.name==='useFrameCallback')callback=generate(p.node.arguments[0]).code;}});
assert(callback,'production callback exists');
function harness(){
 const s={t:0,player:{},cam:{x:0,y:0},touchSeq:0,events:{caught:false},mission:{complete:false}};
 let updates=0,steps=0,tiltTicks=0;
 const context={Date,Math,__DEV__:false,tiltEnabled:false,transitioning:false,
  inspectionActive:{value:false},awaitingReady:false,resources:{},pausedValue:{value:false},adCovering:false,
  state:{value:s,modify(fn){updates++;fn(s);}},stickEnabled:false,accumulated:{value:0},touch:{value:{seq:0}},
  previousTiltEnabled:{value:false},zoom:1,playerMode:{value:2},syncInputMode(){},
  stepPlayground(state,dt){steps++;state.t+=dt;},
  controller:{value:{x:0,y:0,status:'PLAY'},modify(fn){tiltTicks++;fn({});}},active:{value:true},sample:{value:null},tuning:{value:{}},stepTilt(){},
  inputReset:{value:0},TILE:40,viewW:400,viewH:800,bounds:{},movementBlockers:[],visionBlockers:[],navigation:{}};
 const tick=vm.runInNewContext(`(${callback})`,context);
 return {context,s,tick,counts:()=>({updates,steps,tiltTicks})};
}
test('90/120Hz callbacks keep the same 60Hz simulation budget without recording empty frames',()=>{
 for(const hz of [30,60,90,120]){
  const h=harness();let remainder=0,legacySteps=0;
  for(let frame=0;frame<hz*4;frame++){
   const elapsed=remainder+1/hz,n=Math.floor(elapsed*60);remainder=elapsed-n/60;legacySteps+=n;
   h.tick({timeSincePreviousFrame:1000/hz});
  }
  assert(Math.abs(h.counts().steps-legacySteps)<=1,`${hz}Hz simulation budget`);
  assert(h.counts().updates<=h.counts().steps,'no empty simulation redraw');
  if(hz===120)assert(h.counts().updates<=hz*4*.51,'about half the display callbacks retain the existing picture');
 }
});
test('caught/complete result scenes and paused/covered scenes do not keep modifying game state',()=>{
 for(const kind of ['caught','complete','paused','covered']){
  const h=harness();
  if(kind==='caught')h.s.events.caught=true;
  if(kind==='complete')h.s.mission.complete=true;
  if(kind==='paused')h.context.pausedValue.value=true;
  if(kind==='covered')h.context.adCovering=true;
  for(let i=0;i<120;i++)h.tick({timeSincePreviousFrame:1000/60});
  assert.equal(h.counts().updates,0,kind);assert.equal(h.counts().steps,0,kind);
 }
});
test('Tilt input processing remains at callback cadence even when no simulation step is due',()=>{
 const h=harness();h.context.tiltEnabled=true;
 for(let i=0;i<120;i++)h.tick({timeSincePreviousFrame:1000/120});
 assert.equal(h.counts().tiltTicks,120);
 assert(h.counts().updates<=60);
});
