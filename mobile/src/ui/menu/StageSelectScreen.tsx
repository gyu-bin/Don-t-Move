import {useUIAudio} from '../../game/audio/useGameAudio';
import {useState} from 'react';
import {FlatList,Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useMenu} from './MenuContext';
import {MenuHeading,menuStyles} from './MenuScreens';
import {formatTime} from './stageCard';
import {CHAPTERS,chapterMissionIndices,missionId,missionName} from '../../game/levels/campaignCatalog';
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
 const cardWidth=(Math.min(width,700)-48)/3;
 const chapterName=(index:number)=>progress.language==='ko'?CHAPTERS[index].ko:CHAPTERS[index].name;
 return <View style={[menuStyles.screen,{paddingTop:insets.top}]}>
  <MenuHeading title={t(chapter===null?'chapters':'missions')} onBack={chapter===null?onBack:()=>setChapter(null)}/>
  <Text style={styles.subtitle}>{chapter===null?t('choose'):String(chapter+1).padStart(2,'0')+' — '+chapterName(chapter)}</Text>
  {chapter===null?<FlatList data={indices} keyExtractor={String} numColumns={3}
   initialNumToRender={6} maxToRenderPerBatch={3} windowSize={3}
   contentContainerStyle={[styles.list,{paddingBottom:insets.bottom+24}]} columnWrapperStyle={styles.row}
   renderItem={({item:index})=>{
    const missions=chapterMissionIndices(index);
    const unlocked=missions.some(m=>canPlayMission(campaign,m,__DEV__));
    const current=campaign.lastMission.startsWith(String(index+1).padStart(2,'0')+'-');
    const clears=missions.filter(m=>campaign.records[missionId(m)]?.cleared).length;
    return <Pressable accessibilityRole="button" accessibilityLabel={String(index+1).padStart(2,'0')+' '+chapterName(index)}
     accessibilityState={{selected:current}} onPress={()=>{playUI('ui_select');setChapter(index);}}
     style={({pressed})=>[styles.card,{width:cardWidth},current&&styles.current,pressed&&{opacity:0.8}]}>
     <View style={{height:cardWidth*1.45}}>
      <Image source={thumbnails[index]} style={{width:'100%',height:'100%'}} resizeMode="cover" fadeDuration={0}/>
      {!unlocked&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,0.4)'}]}/>}
      <Text style={styles.number}>{String(index+1).padStart(2,'0')}</Text>
     </View>
     <View style={styles.caption}><Text style={styles.name}>{chapterName(index)}</Text>
      <Text style={styles.status}>{clears}/{missions.length} {t('clear')}</Text></View>
    </Pressable>;
   }}/>:<ScrollView contentContainerStyle={[styles.missions,{paddingBottom:insets.bottom+24}]}>
    <Image source={thumbnails[chapter]} style={styles.banner} resizeMode="cover"/>
    {chapterMissionIndices(chapter).map(index=>{
     const id=missionId(index),record=campaign.records[id];
     const unlocked=canPlayMission(campaign,index,__DEV__),current=campaign.lastMission===id;
     const status=record?.cleared?'clear':unlocked?'play':'locked';
     return <Pressable key={id} accessibilityRole="button" disabled={!unlocked}
      accessibilityLabel={id+' '+missionName(index,progress.language)+', '+t(status)}
      accessibilityState={{disabled:!unlocked,selected:current}}
      onPress={()=>{playUI('ui_select');onSelect(index);}} style={({pressed})=>[styles.mission,current&&styles.current,!unlocked&&{opacity:0.55},pressed&&{backgroundColor:'#12313E'}]}>
      <View style={styles.missionTop}><Text style={styles.id}>{id}</Text><Text style={styles.status}>{record?.cleared?'✓ ':''}{t(status)}</Text></View>
      <Text style={styles.missionName}>{missionName(index,progress.language)}</Text>
      {record?.cleared&&<Text style={styles.time}>{record.legacy?t('legacy')+' · ':''}{t('best')} {formatTime(record.bestTime)} · {t('alerts')} {record.alerts??'—'}</Text>}
     </Pressable>;
    })}
   </ScrollView>}
 </View>;
}
const styles=StyleSheet.create({
 subtitle:{textAlign:'center',color:'#9EB9C5',fontSize:9,letterSpacing:2,marginBottom:18},
 list:{paddingHorizontal:16,alignSelf:'center',width:'100%',maxWidth:700},row:{gap:8},
 card:{borderRadius:10,borderWidth:1,borderColor:'#344E5D',overflow:'hidden',backgroundColor:'#041019',marginBottom:12},
 current:{borderColor:'#39D5F8',borderWidth:2},
 number:{position:'absolute',bottom:5,left:7,fontSize:21,color:'#F4F8F9',fontWeight:'500',textShadowColor:'#000',textShadowRadius:5},
 caption:{padding:8,minHeight:68,gap:6},name:{fontSize:10,letterSpacing:0.7,color:'#F0F3EF',minHeight:26},
 status:{fontSize:9,letterSpacing:0.6,color:'#44D9F7'},time:{fontSize:10,color:'#BDD0D8',marginTop:6},
 missions:{paddingHorizontal:24,width:'100%',maxWidth:600,alignSelf:'center'},
 banner:{width:'100%',height:130,borderRadius:8,marginBottom:16},
 mission:{borderWidth:1,borderColor:'#344E5D',borderRadius:8,padding:16,marginBottom:12,backgroundColor:'#06131C'},
 missionTop:{flexDirection:'row',justifyContent:'space-between',marginBottom:7},
 id:{color:'#47D8F7',fontSize:15,letterSpacing:2},missionName:{color:'#F4F4EC',fontSize:13,letterSpacing:0.8},
});
