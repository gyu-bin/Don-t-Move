import {useEffect,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {SharedValue} from 'react-native-reanimated';
import type {PlaygroundState} from '../game/playground/playgroundState';
import type {RenderResources} from '../rendering/renderFrame';
import {motionAudit} from '../rendering/characters/motionAudit';
import {animForPose} from '../rendering/sprites/spriteAnimation';
import {tiltVisualGait} from '../game/input/tiltMovement';
import {BODY} from '../game/guards/guardTuning';
import {bodiesTouch} from '../game/guards/guardSystem';

const states=['PATROL','SUSPICIOUS','ALERT','SEARCH','CHASE','INVESTIGATE','RETURN'];
export function CharacterMotionDebug({state,resources,blockers,onMode,onClose,bottom}:{state:SharedValue<PlaygroundState>;resources:RenderResources;blockers:number[];onMode?:(mode:number)=>void;onClose:()=>void;bottom:number}){
 const [readout,setReadout]=useState('');
 useEffect(()=>{
  const sample=()=>{
   const s=state.get(),p=s.player;
   const format=(v:ReturnType<typeof motionAudit>)=>`${v.requested}/${v.direction} → ${v.source} ${v.resolved}\nf ${v.frame}/${v.count} phase ${v.phase.toFixed(3)} stride ${v.stride.toFixed(2)}`;
   const player=motionAudit(resources.player.sprites,animForPose(tiltVisualGait(p.speed),0,0),p.facing,p.spritePhase,s.t,p.dist);
   const lines=[`PLAYER (${p.x.toFixed(1)},${p.y.toFixed(1)}) speed ${p.speed.toFixed(1)} velocity (${p.vx.toFixed(1)},${p.vy.toFixed(1)})`,format(player),
    `CAPTURE r=${BODY.playerRadius}+${BODY.guardRadius}+${BODY.captureTolerance}=${BODY.playerRadius+BODY.guardRadius+BODY.captureTolerance} caughtBy=${s.events.caughtBy||'-'}`];
   s.guards.forEach((g,i)=>{
    const a=s.guardPlayback[i],v=motionAudit(resources.guard.sprites,a.animation,g.facing,a.phase,a.time,g.dist);
    lines.push(`G${i+1} ${states[g.awareness]} (${g.x.toFixed(1)},${g.y.toFixed(1)}) speed ${g.speed.toFixed(1)} d=${Math.hypot(g.x-p.x,g.y-p.y).toFixed(2)} contact=${bodiesTouch(g,p,blockers)}`,format(v));
   });setReadout(lines.join('\n'));
  };
  sample();const timer=setInterval(sample,200);return()=>clearInterval(timer);
 },[state,resources,blockers]);
 return <View style={[styles.panel,{bottom}]}>
  <View style={styles.row}><Text style={styles.text}>MOTION / CAPTURE · DEV</Text><Pressable accessibilityRole="button" accessibilityLabel="Close motion debug" onPress={onClose} style={styles.control}><Text style={styles.text}>CLOSE</Text></Pressable></View>
  <ScrollView style={{maxHeight:170}}><Text selectable style={styles.text}>{readout}</Text></ScrollView>
  {onMode&&<View style={styles.row}>{['IDLE','SNEAK','WALK','RUN'].map((name,i)=><Pressable key={name} accessibilityRole="button" onPress={()=>onMode(i)} style={styles.control}><Text style={styles.text}>{name}</Text></Pressable>)}</View>}
 </View>;
}
const styles=StyleSheet.create({panel:{position:'absolute',left:8,right:8,padding:8,backgroundColor:'#03131FEB',borderWidth:1,borderColor:'#61C9D9',zIndex:110},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},control:{minHeight:44,padding:8,justifyContent:'center'},text:{fontSize:10,color:'#DAF2FF',fontFamily:'Menlo'}});
