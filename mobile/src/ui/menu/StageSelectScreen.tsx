import {useUIAudio} from '../../game/audio/useGameAudio';
import {useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useMenu} from './MenuContext';
import {MenuHeading,menuStyles} from './MenuScreens';
import {MissionSelect} from './MissionSelect';
import {CHAPTERS,chapterMissionIndices,missionId} from '../../game/levels/campaignCatalog';
import {canPlayMission,migrateCampaign} from '../../game/progress/campaignProgress';

// Reuse optimized venue artwork. Black Site is now a mission in Security HQ.
const thumbnails=[
 require('../../../assets/branding/stages/01.jpg'),require('../../../assets/branding/stages/02.jpg'),
 require('../../../assets/branding/stages/03.jpg'),require('../../../assets/branding/stages/04.jpg'),
 require('../../../assets/branding/stages/05.jpg'),require('../../../assets/branding/stages/06.jpg'),
 require('../../../assets/branding/stages/07.jpg'),require('../../../assets/branding/stages/08.jpg'),
 require('../../../assets/branding/stages/10.jpg'),
];
const indices=CHAPTERS.map((_,i)=>i);
export default function StageSelectScreen({onBack,onSelect}:{onBack:()=>void;onSelect:(mission:number)=>void}) {
 const playUI=useUIAudio();
 const {progress,t}=useMenu();const insets=useSafeAreaInsets();const {width}=useWindowDimensions();
 const [chapter,setChapter]=useState<number|null>(null);
 const campaign=migrateCampaign(progress);
 const cardImageHeight=Math.min(190,Math.max(118,width*0.27));
 const chapterName=(index:number)=>progress.language==='ko'?CHAPTERS[index].ko:CHAPTERS[index].name;
 if(chapter!==null)return <MissionSelect chapter={chapter} art={thumbnails[chapter]} onBack={()=>setChapter(null)} onSelect={onSelect}/>;
 return <View style={[menuStyles.screen,{paddingTop:insets.top}]}>
  <MenuHeading title={t('chapters')} onBack={onBack}/>
  <Text style={styles.subtitle}>{t('choose')}</Text>
  <ScrollView contentContainerStyle={[styles.list,{paddingBottom:insets.bottom+28}]} showsVerticalScrollIndicator={false}>
   {indices.map(index=>{
    const missions=chapterMissionIndices(index);
    const unlocked=missions.some(m=>canPlayMission(campaign,m,__DEV__));
    const current=campaign.lastMission.startsWith(String(index+1).padStart(2,'0')+'-');
    const clears=missions.filter(m=>campaign.records[missionId(m)]?.cleared).length;
    return <Pressable key={index} accessibilityRole="button" disabled={!unlocked} accessibilityLabel={String(index+1).padStart(2,'0')+' '+chapterName(index)}
     accessibilityState={{selected:current,disabled:!unlocked}} onPress={()=>{playUI('ui_select');setChapter(index);}}
     style={({pressed})=>[styles.card,current&&styles.current,!unlocked&&styles.lockedCard,pressed&&styles.pressedCard]}>
     <View style={[styles.cardImage,{height:cardImageHeight}]}>
      <Image source={thumbnails[index]} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={0}/>
      {!unlocked&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,0.4)'}]}/>}
      <View style={styles.chapterTag}><Text style={styles.number}>CHAPTER {String(index+1).padStart(2,'0')}</Text></View>
      {!unlocked&&<View pointerEvents="none" style={styles.lock}><Text style={styles.lockGlyph}>🔒</Text></View>}
     </View>
     <View style={styles.caption}><View style={styles.cardCopy}><Text style={styles.name}>{chapterName(index)}</Text>
      <Text style={[styles.status,!unlocked&&styles.lockedText]}>{clears}/{missions.length} {t('clear')}</Text></View>
      <Text style={styles.chevron}>{unlocked?'›':'🔒'}</Text></View>
    </Pressable>;
   })}
  </ScrollView>
 </View>;
}
const styles=StyleSheet.create({
 subtitle:{textAlign:'center',color:'#9EB9C5',fontSize:9,letterSpacing:2,marginBottom:18},
 list:{paddingHorizontal:18,alignSelf:'center',width:'100%',maxWidth:620},
 card:{borderRadius:13,borderWidth:1,borderColor:'#344E5D',overflow:'hidden',backgroundColor:'#041019',marginBottom:16},
 current:{borderColor:'#39D5F8',borderWidth:2},
 pressedCard:{opacity:0.82},
 cardImage:{position:'relative'},chapterTag:{position:'absolute',left:12,bottom:10,paddingHorizontal:7,paddingVertical:4,borderRadius:5,backgroundColor:'#020A10CC'},
 number:{fontSize:10,letterSpacing:1.8,color:'#F4F8F9',fontWeight:'700',textShadowColor:'#000',textShadowRadius:5},
 lock:{position:'absolute',right:14,bottom:10,width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'#020A10CC'},lockGlyph:{fontSize:18,color:'#D9E5E8'},
 caption:{minHeight:70,paddingHorizontal:14,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},cardCopy:{gap:6},name:{fontSize:14,letterSpacing:0.7,color:'#F0F3EF'},
 status:{fontSize:10,letterSpacing:0.8,color:'#44D9F7'},lockedCard:{opacity:0.86},lockedText:{color:'#81939C'},chevron:{fontSize:29,lineHeight:30,color:'#E8F0F1',paddingLeft:10},
});
