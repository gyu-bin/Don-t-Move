import { Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {migrateCampaign} from '../../game/progress/campaignProgress';
import { useMenu } from './MenuContext';
import { HOME_COMPOSITION, homeComposition } from '../branding/homeLayout';

export function MenuButton({label,detail,onPress,primary=false,disabled=false,compact=false}:{label:string;detail?:string;onPress:()=>void;primary?:boolean;disabled?:boolean;compact?:boolean}) {
 return <Pressable accessibilityRole="button" accessibilityLabel={detail ? `${label}, ${detail}` : label}
  accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
  style={({pressed})=>[menuStyles.button,compact&&menuStyles.compact,primary&&menuStyles.primary,pressed&&menuStyles.pressed,disabled&&{opacity:0.45}]}>
  <Text style={menuStyles.buttonText}>{label}</Text>
  {detail&&<Text style={menuStyles.detail}>{detail}</Text>}
 </Pressable>;
}
export function HomeMenu({onPlay,onStages,onSettings,ready,error,onRetry}:{onPlay:()=>void;onStages:()=>void;onSettings:()=>void;ready:boolean;error?:string;onRetry:()=>void}) {
 const {t,progress}=useMenu();
 const insets=useSafeAreaInsets();
 const {width,height,fontScale}=useWindowDimensions();
 const layout=homeComposition(width,height,insets,fontScale);
 return <ScrollView style={[menuStyles.home,{top:layout.menuTop,height:layout.menuHeight,left:layout.menuLeft,width:layout.menuWidth}]}
  contentContainerStyle={{gap:8,flexGrow:1,justifyContent:'center'}} showsVerticalScrollIndicator={false}>
  <MenuButton compact primary label={error?t('retryLoading'):!ready?t('preparing'):progress.hasStarted?t('continue'):t('start')}
   detail={ready&&progress.hasStarted?`${t('missionLabel')} ${migrateCampaign(progress).lastMission}`:undefined}
   onPress={error?onRetry:onPlay} disabled={!ready&&!error}/>
  <MenuButton compact label={t('chapters')} onPress={onStages} disabled={!ready}/>
  <MenuButton compact label={t('settings')} onPress={onSettings} disabled={!ready}/>
  <Text style={menuStyles.footer}>{t('silence')}</Text>
 </ScrollView>;
}
export function MenuHeading({title,onBack}:{title:string;onBack:()=>void}) {
 const {t}=useMenu();
 return <View style={menuStyles.heading}>
  <Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={onBack} style={menuStyles.back}><Text style={menuStyles.backText}>‹</Text></Pressable>
  <Text accessibilityRole="header" style={menuStyles.title}>{title}</Text>
 </View>;
}
export function SettingsScreen({onBack,onIntro}:{onBack:()=>void;onIntro:()=>void}) {
 const {t,progress,preferences}=useMenu();
 const insets=useSafeAreaInsets();
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
   <View style={[menuStyles.setting,menuStyles.row]}><Text style={menuStyles.label}>{t('sfx')}</Text>
    <Switch accessibilityLabel={t('sfx')} value={progress.soundEnabled} onValueChange={soundEnabled=>preferences({soundEnabled})} trackColor={{false:'#293B48',true:'#35BFE8'}}/></View>
   <View style={[menuStyles.setting,menuStyles.row]}><Text style={menuStyles.label}>{t('music')}</Text>
    <Switch accessibilityLabel={t('music')} value={progress.musicEnabled} onValueChange={musicEnabled=>preferences({musicEnabled})} trackColor={{false:'#293B48',true:'#35BFE8'}}/></View>
   <Pressable accessibilityRole="button" onPress={onIntro} style={[menuStyles.setting,menuStyles.row]}><Text style={menuStyles.label}>{t('intro')}</Text><Text style={menuStyles.backText}>›</Text></Pressable>
  </ScrollView>
 </View>;
}
export const menuStyles=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#030D15'},
 home:{position:'absolute',left:`${HOME_COMPOSITION.menuLeftPercent}%`,width:`${HOME_COMPOSITION.menuWidthPercent}%`,maxWidth:350,gap:10},
 button:{minHeight:47,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'#60727B',borderRadius:17,backgroundColor:'#020C14ED',padding:12},
 compact:{minHeight:44,paddingVertical:9,backgroundColor:'#020C14CE',borderRadius:14},
 primary:{borderColor:'#3ED5FA',borderWidth:1.5},pressed:{backgroundColor:'#12313E'},
 buttonText:{color:'#F7F5EC',fontSize:13,fontWeight:'600',letterSpacing:1.5,textAlign:'center'},
 detail:{color:'#BFD8E1',fontSize:9,letterSpacing:1.5,marginTop:4},
 footer:{textAlign:'center',fontSize:8,letterSpacing:3,color:'#A0B4BF',marginTop:10},
 heading:{height:82,justifyContent:'center',alignItems:'center'},title:{color:'#F7F5EC',fontSize:18,letterSpacing:3,fontWeight:'600'},
 back:{position:'absolute',left:16,padding:12,minWidth:44,minHeight:44},backText:{color:'#D7E6EB',fontSize:30,lineHeight:30},
 settingsBody:{paddingHorizontal:28,paddingTop:25,paddingBottom:48},setting:{paddingVertical:26,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#24404E',gap:20},
 label:{color:'#EFF5F6',fontSize:15},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 languages:{flexDirection:'row',borderWidth:1,borderColor:'#526975',borderRadius:5,overflow:'hidden'},language:{flex:1,alignItems:'center',padding:13},selected:{backgroundColor:'#38C9ED'},
});
