/* global __dirname */
/** Serialized closure probe with mock canvas/paints, NOT a native pixel test. */
const assert=require('node:assert/strict');
const {test}=require('node:test');
const path=require('node:path');
const vm=require('node:vm');
const babel=require('@babel/core');
const modules=new Map();
const skia={Skia:{Color:color=>color,Paint:()=>({setAntiAlias(){},setColor(){},setAlphaf(){},setStyle(){},setStrokeWidth(){},setStrokeCap(){},setStrokeJoin(){},setBlendMode(){}})},PaintStyle:{Stroke:1},StrokeCap:{Round:1},StrokeJoin:{Round:1}};
function load(file){
 if(modules.has(file))return modules.get(file);
 const exports={};modules.set(file,exports);
 const code=babel.transformFileSync(file,{presets:[require.resolve('babel-preset-expo')]}).code;
 vm.runInNewContext(code,{exports,global,console,__DEV__:false,require(id){
  if(id==='@shopify/react-native-skia')return skia;
  if(!id.startsWith('.'))return require(id);
  return load(path.resolve(path.dirname(file),`${id}.ts`));
 }},{filename:file});return exports;
}
function onUI(fn,cache=new Map()){
 if(cache.has(fn))return cache.get(fn);
 assert(fn.__initData,'Required helper was not serialized as a worklet');
 const closure={},evaluated=vm.runInNewContext(`(${fn.__initData.code})`,{console,__DEV__:false},{filename:fn.__initData.location});
 const bound=evaluated.bind({__closure:closure});cache.set(fn,bound);
 for(const [key,value]of Object.entries(fn.__closure))closure[key]=typeof value==='function'&&value.__initData?onUI(value,cache):value;
 return bound;
}
const art=load(path.resolve(__dirname,'../../src/rendering/environment/doorArt.ts'));
const set=art.createDoorArt(),draw=onUI(art.drawPhysicalDoor);
const styles=Object.keys(set.styles);
test('all thirty-three chapter door styles prepare paints once and serialized leaves render all orientations/states',()=>{
 assert.equal(styles.length,33);
 for(const style of styles)for(const orientation of ['horizontal','vertical'])for(const [state,progress]of [['OPEN',0],['CLOSING',.5],['CLOSED',1]]){
  const commands=[];let saves=0;
  const canvas={save(){saves++;},restore(){saves--;assert(saves>=0);},translate(x,y){assert(Number.isFinite(x)&&Number.isFinite(y));},
   drawRect(rect,paint){assert(paint);assert(rect.width>=0&&rect.height>=0);assert(Object.values(rect).every(Number.isFinite));commands.push({...rect});},
   drawRRect(rr,paint){this.drawRect(rr.rect,paint);},
   drawOval(rect,paint){this.drawRect(rect,paint);},
   drawCircle(x,y,r,paint){assert(paint);assert([x,y,r].every(Number.isFinite));assert(r>=0);commands.push({x,y,r});},
   rotate(angle,x,y){assert([angle,x,y].every(Number.isFinite));},scale(x,y){assert([x,y].every(Number.isFinite));},drawLine(ax,ay,bx,by,paint){assert(paint);assert([ax,ay,bx,by].every(Number.isFinite));}};
  draw(canvas,{id:'probe',type:style==='galleryGlassSliding'?'glass':'solid',style,x:240,y:320,width:80,thickness:8,orientation,state,progress,pausedForOccupancy:false,collisionRevision:0},set,28.5);
  assert.equal(saves,0,`${style}:${orientation}:${state}: unbalanced canvas`);
  assert(commands.length>=5,`${style}:${orientation}:${state}: missing door pieces`);
 }
});
test('serialized closing panels change their drawn span with physical progress',()=>{
 for(const orientation of ['horizontal','vertical']){
  const spans=[];
  for(const progress of [0,.5,1]){
   const leafPaint=set.styles.museumSecurity.leaf,leaves=[];
   const canvas={save(){},restore(){},translate(){},drawRect(r,p){if(p===leafPaint)leaves.push({...r});},drawRRect(){},drawLine(){}};
   draw(canvas,{id:'probe',type:'solid',style:'museumSecurity',x:0,y:0,width:80,thickness:8,orientation,state:progress===1?'CLOSED':'CLOSING',progress},set,30);
   assert.equal(leaves.length,2);spans.push(orientation==='horizontal'?leaves[0].width:leaves[0].height);
  }
  assert(spans[0]<spans[1]&&spans[1]<spans[2],`${orientation}: animation did not advance`);
 }
});

test('Casino 4D profiles retain distinct open architecture and animate their own closure',()=>{
 const signatures=[];
 for(const style of ['casinoVip4d','casinoSecurity4d']){
  const states=[];
  for(const progress of [0,.5,1]){
   const commands=[];
   const canvas={save(){},restore(){},translate(){},
    drawRect(r,p){commands.push({shape:'rect',...r,material:p===set.styles[style].trim?'trim':'body'});},
    drawRRect(r,p){this.drawRect(r.rect,p);},drawLine(){}};
   draw(canvas,{id:'casino-probe',type:'solid',style,x:0,y:0,width:120,thickness:8,orientation:'horizontal',state:progress===0?'OPEN':progress===1?'CLOSED':'CLOSING',progress},set,30);
   states.push(JSON.stringify(commands));
  }
  assert.notEqual(states[0],states[1],`${style}: closing must change geometry`);
  assert.notEqual(states[1],states[2],`${style}: closed must change geometry`);
  signatures.push(states[0]);
 }
 assert.notEqual(signatures[0],signatures[1],'VIP and cashier security must have distinct open geometry');
});
