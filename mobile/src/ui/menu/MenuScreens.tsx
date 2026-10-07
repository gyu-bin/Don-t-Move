import { useEffect, useRef } from 'react';
import { useUIAudio } from '../../game/audio/useGameAudio';
import { MUSIC_CREDIT } from '../../game/audio/audioCredits';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {migrateCampaign} from '../../game/progress/campaignProgress';
import { useMenu } from './MenuContext';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { openingLayout } from '../branding/openingLayout';
import { buttonReveal, useLobbyReveal } from '../branding/lobbyReveal';
import { useMonetization } from '../../game/monetization/MonetizationContext';
import { RemoveAdsCard } from './RemoveAdsCard';
import { QA_UNLOCK_ALL } from '../../game/progress/qaUnlock';
import { normalizeControlMode } from '../../game/input/controlMode';
import { tiltSensorMissing } from '../../game/input/sensorPresence';
import { track } from '../../game/analytics/track';

const SENSOR_MISSING = tiltSensorMissing();

export function MenuButton({label,detail,onPress,primary=false,disabled=false,compact=false}:{label:string;detail?:string;onPress:()=>void;primary?:boolean;disabled?:boolean;compact?:boolean}) {
 const playUI=useUIAudio();
 return <Pressable accessibilityRole="button" accessibilityLabel={detail ? `${label}, ${detail}` : label}
  accessibilityState={{disabled}} disabled={disabled} onPress={()=>{playUI('ui_select');onPress();}}
  style={({pressed})=>[menuStyles.button,compact&&menuStyles.compact,primary&&menuStyles.primary,pressed&&menuStyles.pressed,disabled&&{opacity:0.45}]}>
  <Text style={menuStyles.buttonText}>{label}</Text>
  {detail&&<Text style={menuStyles.detail}>{detail}</Text>}
 </Pressable>;
}
function LobbyItem({index,top,height,left,width,children}:{index:number;top:number;height:number;left:number;width:number;children:import('react').ReactNode}) {
 const reveal=useLobbyReveal();
 const style=useAnimatedStyle(()=>{const r=buttonReveal(reveal?reveal.value:1e6,index);return {opacity:r.opacity,transform:[{translateY:r.translateY}]};});
 return <Animated.View style={[{position:'absolute',top,left,width,minHeight:height},style]}>{children}</Animated.View>;
}
/** Lobby menu: three centred buttons over the frozen intro scene (same layout function as the scene). */
export function HomeMenu({onPlay,onStages,onSettings,ready,error,onRetry}:{onPlay:()=>void;onStages:()=>void;onSettings:()=>void;ready:boolean;error?:string;onRetry:()=>void}) {
 const {t,progress}=useMenu();
 const playUI=useUIAudio();
 const insets=useSafeAreaInsets();
 const {width,height}=useWindowDimensions();
 const {menu,taglineBottom}=openingLayout(width,height,insets);
 const primaryLabel=error?t('retryLoading'):!ready?t('preparing'):progress.hasStarted?t('continue'):t('start');
 const detail=!error&&ready&&progress.hasStarted?`${t('missionLabel')} ${migrateCampaign(progress).lastMission}`:undefined;
 const secondary=[{label:t('chapters'),onPress:onStages},{label:t('settings'),onPress:onSettings}];
 const primaryDisabled=!ready&&!error;
 return <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
  <LobbyItem index={0} top={menu.y} height={menu.primaryH} left={menu.x} width={menu.w}>
   <Pressable accessibilityRole="button" accessibilityLabel={detail?`${primaryLabel}, ${detail}`:primaryLabel} accessibilityState={{disabled:primaryDisabled}}
    disabled={primaryDisabled} onPress={()=>{playUI('ui_select');(error?onRetry:onPlay)();}}
    style={({pressed})=>[lobbyStyles.button,lobbyStyles.primary,{minHeight:menu.primaryH},pressed&&lobbyStyles.pressed,primaryDisabled&&{opacity:0.5}]}>
    <Text maxFontSizeMultiplier={1.3} style={lobbyStyles.primaryText}>{primaryLabel}</Text>
    {detail&&<Text maxFontSizeMultiplier={1.3} style={lobbyStyles.detail}>{detail}</Text>}
    <Text allowFontScaling={false} style={lobbyStyles.chevron}>›</Text>
   </Pressable>
  </LobbyItem>
  {secondary.map((item,i)=><LobbyItem key={item.label} index={i+1} height={menu.secondaryH} left={menu.x} width={menu.w}
   top={menu.y+menu.primaryH+menu.gap+i*(menu.secondaryH+menu.gap)}>
   <Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{disabled:!ready}} disabled={!ready}
    onPress={()=>{playUI('ui_select');item.onPress();}}
    style={({pressed})=>[lobbyStyles.button,{minHeight:menu.secondaryH},pressed&&lobbyStyles.pressed,!ready&&{opacity:0.5}]}>
    <Text maxFontSizeMultiplier={1.3} style={lobbyStyles.secondaryText}>{item.label}</Text>
   </Pressable>
  </LobbyItem>)}
  <LobbyItem index={3} top={height-taglineBottom-12} height={12} left={0} width={width}>
   <Text allowFontScaling={false} style={lobbyStyles.tagline}>{t('silence')}</Text>
  </LobbyItem>
 </View>;
}
const lobbyStyles=StyleSheet.create({
 button:{justifyContent:'center',alignItems:'center',borderRadius:16,borderWidth:1,borderColor:'#3A5260',backgroundColor:'rgba(3,12,20,0.66)',paddingVertical:8,paddingHorizontal:44},
 primary:{borderWidth:1.6,borderColor:'#3EC5FF',backgroundColor:'rgba(3,12,20,0.8)'},
 pressed:{backgroundColor:'rgba(18,49,62,0.9)'},
 primaryText:{color:'#FFF4D6',fontSize:17,fontWeight:'700',letterSpacing:1,textAlign:'center'},
 secondaryText:{color:'#FFF4D6',fontSize:15,fontWeight:'600',letterSpacing:1,textAlign:'center'},
 detail:{color:'#9FB6C0',fontSize:10,letterSpacing:1.4,marginTop:3,textAlign:'center'},
 chevron:{position:'absolute',right:18,color:'#FFF4D6',fontSize:26,lineHeight:30},
 tagline:{textAlign:'center',fontSize:8.5,letterSpacing:3,color:'#7B929D'},
});
export function MenuHeading({title,onBack,height}:{title:string;onBack:()=>void;height?:number}) {
 const playUI=useUIAudio();
 const {t}=useMenu();
 return <View style={[menuStyles.heading,height!==undefined&&{height}]}>
  <Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={()=>{playUI('ui_back');onBack();}} style={menuStyles.back}><Text style={menuStyles.backText}>‹</Text></Pressable>
  <Text accessibilityRole="header" style={menuStyles.title}>{title}</Text>
 </View>;
}
export function SettingsScreen({onBack,onIntro}:{onBack:()=>void;onIntro:()=>void}) {
 const {t,progress,preferences}=useMenu();
 const playUI=useUIAudio();
 const insets=useSafeAreaInsets();
 const monetization=useMonetization();
 // Clear only the previous visit's feedback. The provider callback identity may
 // change as a purchase progresses, so it must not re-trigger this entry effect.
 const clearEntryPurchaseMessage=useRef(monetization.clearPurchaseMessage);
 useEffect(()=>{clearEntryPurchaseMessage.current();},[]);
 const control=normalizeControlMode(progress.controlMode);
 return <View style={[menuStyles.screen,{paddingTop:insets.top}]}>
  <MenuHeading title={t('settings')} onBack={onBack}/>
  <ScrollView contentContainerStyle={menuStyles.settingsBody}>
   <View style={menuStyles.setting}>
    <Text style={menuStyles.label}>{t('language')}</Text>
    <View style={menuStyles.languages}>{(['ko','en'] as const).map(language=><Pressable key={language}
     accessibilityRole="radio" accessibilityState={{checked:progress.language===language}}
     onPress={()=>preferences({language})} style={[menuStyles.language,progress.language===language&&menuStyles.selected]}>
     <Text style={[menuStyles.label,progress.language===language&&{color:'#03111B'}]}>{language==='ko'?'한국어':'English'}</Text>
    </Pressable>)}</View>
   </View>
   <View style={menuStyles.setting}>
    <Text style={menuStyles.label}>{t('controlMode')}</Text>
    <View accessibilityRole="radiogroup" style={menuStyles.languages}>{(['tilt','touch'] as const).map(mode=><Pressable key={mode}
     accessibilityRole="radio" accessibilityState={{checked:control===mode}}
     onPress={()=>{playUI('ui_select');if(mode!==control)track('control_mode_change',{from:control,to:mode});preferences({controlMode:mode});}} style={[menuStyles.language,control===mode&&menuStyles.selected]}>
     <Text style={[menuStyles.label,control===mode&&{color:'#03111B'}]}>{t(mode==='tilt'?'controlTilt':'controlTouch')}</Text>
    </Pressable>)}</View>
    {control==='tilt'&&SENSOR_MISSING&&<Text style={[menuStyles.detail,{marginTop:-8}]}>{t('controlFallback')}</Text>}
   </View>
   <View style={menuStyles.setting}><RemoveAdsCard/></View>
   <View style={[menuStyles.setting,menuStyles.row]}><Text style={menuStyles.label}>{t('sfx')}</Text>
    <Switch accessibilityLabel={t('sfx')} value={progress.soundEnabled} onValueChange={soundEnabled=>preferences({soundEnabled})} trackColor={{false:'#293B48',true:'#35BFE8'}}/></View>
   <View style={[menuStyles.setting,menuStyles.row]}><Text style={menuStyles.label}>{t('music')}</Text>
    <Switch accessibilityLabel={t('music')} value={progress.musicEnabled} onValueChange={musicEnabled=>preferences({musicEnabled})} trackColor={{false:'#293B48',true:'#35BFE8'}}/></View>
   <Pressable accessibilityRole="button" onPress={()=>{playUI('ui_select');onIntro();}} style={[menuStyles.setting,menuStyles.row]}><Text style={menuStyles.label}>{t('intro')}</Text><Text style={menuStyles.backText}>›</Text></Pressable>
   <Text accessibilityLabel="Music credits" style={menuStyles.credit}>{MUSIC_CREDIT}</Text>
   {__DEV__&&QA_UNLOCK_ALL&&<Text style={menuStyles.qaNote}>{t('qaUnlockAll')}</Text>}
  </ScrollView>
 </View>;
}
export const menuStyles=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#030D15'},
 button:{minHeight:47,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'#60727B',borderRadius:17,backgroundColor:'#020C14ED',padding:12},
 compact:{minHeight:44,paddingVertical:9,backgroundColor:'#020C14CE',borderRadius:14},
 primary:{borderColor:'#3ED5FA',borderWidth:1.5},pressed:{backgroundColor:'#12313E'},
 buttonText:{color:'#F7F5EC',fontSize:13,fontWeight:'600',letterSpacing:1.5,textAlign:'center'},
 detail:{color:'#BFD8E1',fontSize:9,letterSpacing:1.5,marginTop:4},
 footer:{textAlign:'center',fontSize:8,letterSpacing:3,color:'#A0B4BF',marginTop:10},
 heading:{height:82,justifyContent:'center',alignItems:'center'},title:{color:'#F7F5EC',fontSize:18,letterSpacing:3,fontWeight:'600'},
 back:{position:'absolute',left:16,padding:12,minWidth:44,minHeight:44},backText:{color:'#D7E6EB',fontSize:30,lineHeight:30},
 settingsBody:{paddingHorizontal:28,paddingTop:25,paddingBottom:48},setting:{paddingVertical:26,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#24404E',gap:20},
 label:{color:'#EFF5F6',fontSize:15},credit:{color:'#7F95A1',fontSize:10,lineHeight:15,marginTop:28},qaNote:{color:'#FFD23F',fontSize:11,letterSpacing:1,marginTop:14},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 price:{color:'#3EC5FF',fontSize:14,fontWeight:'700'},owned:{color:'#8FDB9A',fontSize:13,fontWeight:'700'},
 languages:{flexDirection:'row',borderWidth:1,borderColor:'#526975',borderRadius:5,overflow:'hidden'},language:{flex:1,alignItems:'center',padding:13},selected:{backgroundColor:'#38C9ED'},
});
