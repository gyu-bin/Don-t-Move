import {chapterDifficulty,type DifficultyTier} from './chapterDifficulty';
import type {StageTheme,ValuableKind} from './StageDefinition';
import {CHAPTER_AREAS,CHAPTER_AREAS_KO} from './chapterArt';
export const CHAPTER_COUNT=9;
export const CHAPTER_MISSION_COUNTS=[5,5,5,5,5,5,5,5,5] as const;
export const MISSION_COUNT=CHAPTER_MISSION_COUNTS.reduce((sum,count)=>sum+count,0);
export const chapterStart=(chapter:number)=>CHAPTER_MISSION_COUNTS.slice(0,chapter).reduce((sum,count)=>sum+count,0);
export const chapterMissionIndices=(chapter:number)=>Array.from({length:CHAPTER_MISSION_COUNTS[chapter]??0},(_,i)=>chapterStart(chapter)+i);
export function missionLocation(index:number){
 if(!Number.isInteger(index)||index<0||index>=MISSION_COUNT)return null;
 let chapter=0,mission=index;
 while(mission>=CHAPTER_MISSION_COUNTS[chapter])mission-=CHAPTER_MISSION_COUNTS[chapter++];
 return {chapter,mission};
}
export function missionId(index:number){const location=missionLocation(index);return location?`${String(location.chapter+1).padStart(2,'0')}-${String(location.mission+1).padStart(2,'0')}`:'';}
export function missionIndex(id:string){
 const match=/^(0[1-9])-(\d{2})$/.exec(id);if(!match)return -1;
 const chapter=Number(match[1])-1,mission=Number(match[2])-1;
 return mission>=0&&mission<CHAPTER_MISSION_COUNTS[chapter]?chapterStart(chapter)+mission:-1;
}
export interface Chapter {difficultyTier:DifficultyTier;theme:StageTheme;name:string;ko:string;objective:ValuableKind[];names:string[];namesKo:string[];}
const authoredChapters:Omit<Chapter,'difficultyTier'>[]=[
 {theme:'museum',name:'MUSEUM',ko:'박물관',objective:['diamond','artifact'],names:CHAPTER_AREAS[0],namesKo:CHAPTER_AREAS_KO[0]},
 {theme:'gallery',name:'ART GALLERY',ko:'미술관',objective:['painting','jewel'],names:CHAPTER_AREAS[1],namesKo:CHAPTER_AREAS_KO[1]},
 {theme:'bank',name:'BANK',ko:'은행',objective:['vaultGem','case'],names:CHAPTER_AREAS[2],namesKo:CHAPTER_AREAS_KO[2]},
 {theme:'lab',name:'LAB',ko:'연구소',objective:['prototype'],names:['COLD ENTRY','INNER ORBIT','FALSE SIGNAL','CONTAINMENT','THE PROTOTYPE'],namesKo:['차가운 입구','내부 궤도','거짓 신호','격리 구역','시제품']},
 {theme:'casino',name:'CASINO',ko:'카지노',objective:['jewel'],names:['SMALL STAKES','TABLE HOP','HOUSE DISTRACTION','VIP PRESSURE','THE ROYAL JEWEL'],namesKo:['작은 판돈','테이블 사이','시선 돌리기','VIP 구역','왕실의 보석']},
 {theme:'mansion',name:'MANSION',ko:'저택',objective:['artifact'],names:['SIDE ENTRANCE','THE LONG HALL','UPSTAIRS ECHO','NIGHT WATCH','THE HEIRLOOM'],namesKo:['옆문','긴 복도','위층의 메아리','야간 경비','가보']},
 {theme:'warehouse',name:'WAREHOUSE',ko:'창고',objective:['case'],names:['LOADING BAY','STACKED SHADOWS','WRONG AISLE','CARGO CHECK','LAST SHIPMENT'],namesKo:['하역장','쌓인 그림자','다른 통로','화물 검사','마지막 운송']},
 {theme:'security',name:'SECURITY HQ',ko:'보안 본부',objective:['data'],names:['CONTROL DESK','SERVER LOOP','BLIND FEED','RESTRICTED WING','BLACK SITE ARCHIVE'],namesKo:['관제 책상','서버 순환로','사각 영상','제한 구역','비밀 시설 기록']},
 {theme:'vault',name:'HIGH SECURITY VAULT',ko:'최고 보안 금고',objective:['masterDiamond'],names:['OUTER SEAL','INNER CHAMBERS','DECOY CORRIDOR','LOCKDOWN ROUTE','THE MASTER DIAMOND'],namesKo:['외곽 봉인','내부 방','위장 통로','봉쇄 탈출로','마스터 다이아몬드']},
];
export const CHAPTERS:Chapter[]=authoredChapters.map((chapter,i)=>({...chapter,difficultyTier:chapterDifficulty(i+1).difficultyTier}));
export function missionName(index:number,language:'en'|'ko') {const location=missionLocation(index);return location?(language==='ko'?CHAPTER_AREAS_KO:CHAPTER_AREAS)[location.chapter][location.mission]:'';}
