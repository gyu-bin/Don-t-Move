import {useEffect} from 'react';
import type {ReactNode} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {ImageSourcePropType} from 'react-native';
import Animated,{Easing,FadeIn,cancelAnimation,useAnimatedStyle,useSharedValue,withRepeat,withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useUIAudio} from '../../game/audio/useGameAudio';
import {CHAPTERS,missionName} from '../../game/levels/campaignCatalog';
import {migrateCampaign} from '../../game/progress/campaignProgress';
import {useMenu} from './MenuContext';
import {topInset} from '../device';
import {MenuHeading} from './MenuScreens';
import {formatTime} from './stageCard';
import {chapterIntroKey} from './strings';
import type {TextKey} from './strings';
import {QA_UNLOCK_ALL} from '../../game/progress/qaUnlock';
import {artCrop,CHAPTER_HERO,chapterRoute,HERO_ZOOM,initialRouteScroll,missionFocus,missionSelectLayout,VENUE_ART} from './missionRoute';
import type {ChapterRoute,RouteMission,RouteState} from './missionRoute';

/** Branding palette (Deep Navy / Cyan / Cream / Blue-gray). No red on this screen. */
export const MISSION_COLORS={
 bg:'#030D15',card:'#06131C',cardCurrent:'#0A1D29',border:'#22394A',borderCleared:'#2A4B5C',
 cyan:'#3EC5FF',ivory:'#FFF4D6',text:'#E6EDEF',sub:'#9FB6C0',muted:'#5F7A88',dim:'#3A5262',track:'#162A38',
} as const;
const C=MISSION_COLORS;
const pad=(n:number)=>String(n).padStart(2,'0');
type T=(key:TextKey)=>string;
type Layout=ReturnType<typeof missionSelectLayout>;

/** Mission Select: chapter header → hero + progress → vertical infiltration route. Card tap starts the mission. */
export function MissionSelect({chapter,art,onBack,onSelect}:{chapter:number;art:ImageSourcePropType;onBack:()=>void;onSelect:(index:number)=>void}) {
 const {progress,t}=useMenu();
 const playUI=useUIAudio();
 const insets=useSafeAreaInsets();
 const {width,height}=useWindowDimensions();
 const route=chapterRoute(migrateCampaign(progress),chapter,QA_UNLOCK_ALL);
 const L=missionSelectLayout(width,height,insets,route.total);
 const language=progress.language;
 const chapterName=language==='ko'?CHAPTERS[chapter].ko:CHAPTERS[chapter].name;
 const start=(m:RouteMission)=>{if(!m.playable)return;playUI('ui_select');onSelect(m.index);};
 return <View style={[styles.screen,{paddingTop:topInset(insets.top)}]}>
  <MenuHeading title={t('missions')} onBack={onBack} height={L.header}/>
  <ScrollView bounces={!L.fits} showsVerticalScrollIndicator={false} contentOffset={{x:0,y:initialRouteScroll(L,route,height,insets)}}
   contentContainerStyle={{paddingHorizontal:L.side,paddingBottom:insets.bottom+12,alignItems:'center'}}>
   <Animated.View entering={FadeIn.duration(220)} style={{width:L.contentW}}>
    <View style={{height:L.chapter,justifyContent:'center'}}>
     <Text maxFontSizeMultiplier={1.2} style={styles.chapterLabel}>{t('chapterLabel')} {pad(chapter+1)}</Text>
     <Text maxFontSizeMultiplier={1.2} accessibilityRole="header" style={[styles.chapterName,L.compact&&styles.chapterNameCompact]}>{chapterName}</Text>
     <Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={[styles.chapterIntro,L.compact&&styles.chapterIntroCompact]}>{t(chapterIntroKey(chapter))}</Text>
    </View>
    <Hero art={art} chapter={chapter} route={route} L={L} t={t}/>
    <View style={{height:L.heroGap}}/>
    {route.missions.map((m,i)=><RouteRow key={m.id} m={m} L={L} t={t} name={missionName(m.index,language)} art={art} chapter={chapter}
     first={i===0} last={i===route.missions.length-1} prevCleared={i>0&&route.missions[i-1].state==='cleared'} onPress={()=>start(m)}/>)}
    {L.tagline&&<Text allowFontScaling={false} style={[styles.tagline,{height:L.taglineH}]}>{t('heist')}</Text>}
   </Animated.View>
  </ScrollView>
 </View>;
}

function Hero({art,chapter,route,L,t}:{art:ImageSourcePropType;chapter:number;route:ChapterRoute;L:Layout;t:T}) {
 const [fx,fy]=CHAPTER_HERO[chapter]??[VENUE_ART.w/2,VENUE_ART.h/2];
 const crop=artCrop(L.contentW,L.heroH,fx,fy,HERO_ZOOM);
 const trackW=L.contentW-28;
 const fill=useSharedValue(0);
 useEffect(()=>{fill.set(withTiming(route.ratio,{duration:560,easing:Easing.out(Easing.cubic)}));},[route.ratio,fill]);
 const bar=useAnimatedStyle(()=>({width:Math.max(0,fill.value)*trackW}));
 const pct=Math.round(route.ratio*100);
 return <View accessible accessibilityLabel={`${route.cleared} / ${route.total} ${t('clearedCount')}, ${pct}%`} style={[styles.hero,{height:L.heroH}]}>
  <Image source={art} fadeDuration={0} style={{position:'absolute',width:crop.width,height:crop.height,left:crop.left,top:crop.top}}/>
  <View pointerEvents="none" style={[StyleSheet.absoluteFill,styles.heroShade]}/>
  <View style={styles.progress}>
   <View style={styles.progressRow}>
    <Text maxFontSizeMultiplier={1.2} style={styles.progressCount}><Text style={styles.progressDone}>{route.cleared}</Text> / {route.total}  {t('clearedCount')}</Text>
    <Text maxFontSizeMultiplier={1.2} style={styles.progressPct}>{pct}%</Text>
   </View>
   <View style={[styles.track,{width:trackW}]}><Animated.View style={[styles.fill,bar]}/></View>
  </View>
 </View>;
}

function RouteRow({m,L,t,name,art,chapter,first,last,prevCleared,onPress}:{m:RouteMission;L:Layout;t:T;name:string;art:ImageSourcePropType;chapter:number;
 first:boolean;last:boolean;prevCleared:boolean;onPress:()=>void}) {
 // Opened only by the QA override: drawn as an open mission with a QA tag. The save still has it locked.
 const current=m.state==='current',locked=m.state==='locked'&&!m.playable,cleared=m.state==='cleared',qaOpen=m.devUnlocked;
 const cardH=current?L.currentH:L.cardH,rowH=cardH+L.gap;
 const best=cleared&&m.record?.bestTime!==undefined?formatTime(m.record.bestTime):undefined;
 const status=current?t('currentMission'):cleared?t('clearedCount'):locked?t('locked'):qaOpen?t('devUnlocked'):'';
 const label=[m.id,name,status,`${t('guards')} ${m.guards}`,`${t('goals')} ${m.objectives}`,
  best?`${t('best')} ${best}${m.record?.legacy?' ('+t('legacy')+')':''}`:''].filter(Boolean).join(', ');
 return <View style={{flexDirection:'row',height:rowH}}>
  <View style={{width:L.nodeCol}}>
   {!first&&<View style={[styles.line,{top:0,height:rowH/2},prevCleared&&styles.lineDone]}/>}
   {!last&&<View style={[styles.line,{top:rowH/2,bottom:0},cleared&&styles.lineDone]}/>}
   <View style={[styles.nodeBox,{top:rowH/2-17}]}><RouteNode state={qaOpen?'available':m.state}/></View>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={locked&&!m.playable?t('lockedHint'):undefined}
   accessibilityState={{disabled:!m.playable,selected:current}} disabled={!m.playable} onPress={onPress}
   style={({pressed})=>[styles.card,{height:cardH,marginVertical:L.gap/2},cleared&&styles.cardCleared,current&&styles.cardCurrent,locked&&styles.cardLocked,pressed&&styles.cardPressed]}>
   <View style={styles.copy}>
    <View style={styles.topLine}>
     <Text maxFontSizeMultiplier={1.2} style={[styles.id,current&&styles.idCurrent,locked&&styles.idLocked]}>{m.id}</Text>
     <Status m={m} best={best} t={t}/>
    </View>
    <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.name,current&&styles.nameCurrent,locked&&styles.nameLocked]}>{name}</Text>
    <View style={styles.meta}>
     <GuardIcon color={locked?C.dim:C.sub}/>
     <Text maxFontSizeMultiplier={1.2} style={[styles.metaText,locked&&styles.metaLocked]}>{t('guards')} {m.guards}</Text>
     <Text style={[styles.metaText,locked&&styles.metaLocked]}>·</Text>
     <DiamondIcon color={locked?C.dim:C.cyan}/>
     <Text maxFontSizeMultiplier={1.2} style={[styles.metaText,locked&&styles.metaLocked]}>{t('goals')} {m.objectives}</Text>
    </View>
   </View>
   <Thumb art={art} chapter={chapter} order={m.order} w={current?L.currentThumbW:L.thumbW} h={current?L.currentThumbH:L.thumbH} state={qaOpen?'available':m.state}/>
   <View style={styles.affordance}>{current?<PlayIcon/>:locked?<LockIcon size={12} color={C.muted}/>:<Text allowFontScaling={false} style={styles.chevron}>›</Text>}</View>
  </Pressable>
 </View>;
}

function Status({m,best,t}:{m:RouteMission;best?:string;t:T}) {
 if(m.state==='current')return <View style={styles.pill}><Text maxFontSizeMultiplier={1.2} style={styles.pillText}>{t('currentMission')}</Text></View>;
 if(m.state==='cleared')return best
  ?<View style={styles.best}><Text allowFontScaling={false} style={styles.bestLabel}>{t('bestShort')}</Text><Text maxFontSizeMultiplier={1.2} style={styles.bestTime}>{best}</Text></View>
  :<Text maxFontSizeMultiplier={1.2} style={styles.clearedText}>{t('clearedCount')}</Text>;
 if(m.devUnlocked)return <View style={styles.lockedStatus}><Text maxFontSizeMultiplier={1.2} style={styles.lockedText}>{t('devUnlocked')}</Text></View>;
 if(m.state==='locked')return <View style={styles.lockedStatus}><LockIcon size={9} color={C.muted}/>
  <Text maxFontSizeMultiplier={1.2} style={styles.lockedText}>{t('locked')}</Text></View>;
 return null;
}

function Thumb({art,chapter,order,w,h,state}:{art:ImageSourcePropType;chapter:number;order:number;w:number;h:number;state:RouteState}) {
 const f=missionFocus(chapter,order),crop=artCrop(w,h,f.x,f.y,f.zoom);
 return <View style={[styles.thumb,{width:w,height:h},state==='current'&&styles.thumbCurrent]}>
  <Image source={art} fadeDuration={0} style={{position:'absolute',width:crop.width,height:crop.height,left:crop.left,top:crop.top}}/>
  {state==='locked'&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,styles.thumbLocked]}/>}
 </View>;
}

function RouteNode({state}:{state:RouteState}) {
 if(state==='current')return <CurrentNode/>;
 if(state==='cleared')return <View style={styles.nodeCleared}><Text allowFontScaling={false} style={styles.check}>✓</Text></View>;
 if(state==='locked')return <View style={styles.nodeLocked}><LockIcon size={8} color={C.muted}/></View>;
 return <View style={styles.nodeAvailable}><View style={styles.nodeAvailableDot}/></View>;
}
function CurrentNode() {
 const pulse=useSharedValue(0);
 useEffect(()=>{
  pulse.set(withRepeat(withTiming(1,{duration:1500,easing:Easing.inOut(Easing.sin)}),-1,true));
  return ()=>cancelAnimation(pulse);
 },[pulse]);
 const glow=useAnimatedStyle(()=>({opacity:0.16+0.2*pulse.value,transform:[{scale:0.9+0.12*pulse.value}]}));
 return <View style={styles.nodeCentre}>
  <Animated.View style={[styles.nodeGlow,glow]}/>
  <View style={styles.nodeCurrent}><View style={styles.nodeCurrentDot}/></View>
 </View>;
}

const Icon=({children}:{children:ReactNode})=><View style={styles.icon}>{children}</View>;
function GuardIcon({color}:{color:string}) {
 return <Icon><View style={{width:5,height:5,borderRadius:2.5,backgroundColor:color}}/>
  <View style={{width:10,height:4.5,marginTop:1,borderTopLeftRadius:5,borderTopRightRadius:5,backgroundColor:color}}/></Icon>;
}
function DiamondIcon({color}:{color:string}) {
 return <Icon><View style={{width:6.5,height:6.5,borderWidth:1.4,borderColor:color,transform:[{rotate:'45deg'}]}}/></Icon>;
}
function LockIcon({size,color}:{size:number;color:string}) {
 return <View style={{alignItems:'center',width:size,height:size*1.15}}>
  <View style={{width:size*0.62,height:size*0.5,borderWidth:Math.max(1,size*0.13),borderBottomWidth:0,borderColor:color,
   borderTopLeftRadius:size*0.32,borderTopRightRadius:size*0.32}}/>
  <View style={{width:size,height:size*0.65,borderRadius:Math.max(1.5,size*0.14),backgroundColor:color}}/>
 </View>;
}
function PlayIcon() {
 return <View style={styles.play}><View style={styles.playTriangle}/></View>;
}

const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:C.bg},
 chapterLabel:{color:C.cyan,fontSize:11,fontWeight:'700',letterSpacing:2.4},
 chapterName:{color:C.ivory,fontSize:25,lineHeight:31,fontWeight:'700',letterSpacing:1.2,marginTop:2},
 chapterNameCompact:{fontSize:21,lineHeight:25},
 chapterIntro:{color:C.sub,fontSize:11.5,lineHeight:16,letterSpacing:0.3,marginTop:3},
 chapterIntroCompact:{fontSize:10.5,lineHeight:14,marginTop:1},
 hero:{borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:C.border,backgroundColor:'#051019',justifyContent:'flex-end'},
 heroShade:{experimental_backgroundImage:'linear-gradient(180deg, rgba(3,13,21,0) 30%, rgba(3,13,21,0.55) 62%, rgba(3,13,21,0.94) 100%)'},
 progress:{paddingHorizontal:14,paddingBottom:12,gap:7},
 progressRow:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},
 progressCount:{color:C.text,fontSize:12,letterSpacing:0.8,fontWeight:'600'},
 progressDone:{color:C.cyan,fontSize:17,fontWeight:'800'},
 progressPct:{color:C.cyan,fontSize:12,fontWeight:'700',letterSpacing:1,fontVariant:['tabular-nums']},
 track:{height:4,borderRadius:2,backgroundColor:'rgba(95,122,136,0.35)',overflow:'hidden'},
 fill:{height:4,borderRadius:2,backgroundColor:C.cyan},
 line:{position:'absolute',left:16,width:2,backgroundColor:C.track},
 lineDone:{backgroundColor:'rgba(62,197,255,0.75)'},
 nodeBox:{position:'absolute',left:0,right:0,height:34,alignItems:'center',justifyContent:'center'},
 nodeCentre:{width:34,height:34,alignItems:'center',justifyContent:'center'},
 nodeCleared:{width:22,height:22,borderRadius:11,backgroundColor:C.cyan,alignItems:'center',justifyContent:'center'},
 check:{color:C.bg,fontSize:13,fontWeight:'900',lineHeight:15},
 nodeGlow:{position:'absolute',width:34,height:34,borderRadius:17,backgroundColor:C.cyan},
 nodeCurrent:{width:24,height:24,borderRadius:12,borderWidth:2,borderColor:C.cyan,backgroundColor:C.bg,alignItems:'center',justifyContent:'center'},
 nodeCurrentDot:{width:9,height:9,borderRadius:4.5,backgroundColor:C.cyan},
 nodeAvailable:{width:18,height:18,borderRadius:9,borderWidth:1.5,borderColor:C.muted,backgroundColor:C.bg,alignItems:'center',justifyContent:'center'},
 nodeAvailableDot:{width:5,height:5,borderRadius:2.5,backgroundColor:C.muted},
 nodeLocked:{width:20,height:20,borderRadius:10,borderWidth:1,borderColor:C.dim,backgroundColor:'#07131C',alignItems:'center',justifyContent:'center'},
 card:{flex:1,flexDirection:'row',alignItems:'center',borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.card,paddingLeft:13,paddingRight:6,gap:10},
 cardCleared:{borderColor:C.borderCleared},
 cardCurrent:{borderColor:C.cyan,borderWidth:1.6,backgroundColor:C.cardCurrent,boxShadow:'0 0 16px rgba(62,197,255,0.22)'},
 cardLocked:{backgroundColor:'#040D14',borderColor:'#172A37'},
 cardPressed:{backgroundColor:'#12313E',transform:[{scale:0.985}]},
 copy:{flex:1,justifyContent:'center',gap:2},
 topLine:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},
 id:{color:C.cyan,fontSize:11.5,fontWeight:'700',letterSpacing:1.6,fontVariant:['tabular-nums']},
 idCurrent:{fontSize:12.5},
 idLocked:{color:C.muted},
 name:{color:C.text,fontSize:15,fontWeight:'600',letterSpacing:0.4},
 nameCurrent:{color:C.ivory,fontSize:16.5,fontWeight:'700'},
 nameLocked:{color:'#6F8794'},
 meta:{flexDirection:'row',alignItems:'center',gap:4,marginTop:1},
 metaText:{color:C.sub,fontSize:10.5,letterSpacing:0.4},
 metaLocked:{color:C.dim},
 icon:{width:11,height:11,alignItems:'center',justifyContent:'center'},
 pill:{paddingHorizontal:7,paddingVertical:2.5,borderRadius:6,backgroundColor:'rgba(62,197,255,0.14)',borderWidth:1,borderColor:'rgba(62,197,255,0.45)'},
 pillText:{color:C.cyan,fontSize:9.5,fontWeight:'700',letterSpacing:1},
 best:{flexDirection:'row',alignItems:'baseline',gap:4},
 bestLabel:{color:C.cyan,fontSize:8.5,fontWeight:'800',letterSpacing:1.2},
 bestTime:{color:C.ivory,fontSize:11,fontWeight:'600',fontVariant:['tabular-nums']},
 clearedText:{color:C.cyan,fontSize:9.5,fontWeight:'700',letterSpacing:1.2},
 lockedStatus:{flexDirection:'row',alignItems:'center',gap:4},
 lockedText:{color:C.muted,fontSize:10,letterSpacing:0.8},
 thumb:{borderRadius:9,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,244,214,0.10)',backgroundColor:'#0A1620'},
 thumbCurrent:{borderColor:'rgba(62,197,255,0.55)'},
 thumbLocked:{backgroundColor:'rgba(3,13,21,0.66)'},
 affordance:{width:22,alignItems:'center',justifyContent:'center'},
 chevron:{color:C.sub,fontSize:24,lineHeight:26},
 play:{width:22,height:22,borderRadius:11,backgroundColor:C.cyan,alignItems:'center',justifyContent:'center'},
 playTriangle:{marginLeft:2,width:0,height:0,borderTopWidth:5,borderBottomWidth:5,borderLeftWidth:8,
  borderTopColor:'transparent',borderBottomColor:'transparent',borderLeftColor:C.bg},
 tagline:{textAlign:'center',textAlignVertical:'center',paddingTop:10,fontSize:8.5,letterSpacing:3,color:'#5B7482'},
});
