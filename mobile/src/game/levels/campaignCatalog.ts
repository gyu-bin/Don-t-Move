import type {StageTheme,ValuableKind} from './StageDefinition';
import {CHAPTER_AREAS,CHAPTER_AREAS_KO} from './chapterArt';
export const CHAPTER_COUNT=9;
export const MISSIONS_PER_CHAPTER=5;
export const MISSION_COUNT=CHAPTER_COUNT*MISSIONS_PER_CHAPTER;
export const missionId=(index:number)=>`${String(Math.floor(index/5)+1).padStart(2,'0')}-${String(index%5+1).padStart(2,'0')}`;
export const missionIndex=(id:string)=>{const m=/^(0[1-9])-0([1-5])$/.exec(id);return m?(Number(m[1])-1)*5+Number(m[2])-1:-1;};
export interface Chapter {theme:StageTheme;name:string;ko:string;objective:ValuableKind[];names:string[];namesKo:string[];}
export const CHAPTERS:Chapter[]=[
 {theme:'museum',name:'MUSEUM',ko:'박물관',objective:['diamond','artifact'],names:['THE FIRST STEP','WATCH THE GUARD','DISTRACTION','EMPTY CASE','THE EXHIBITION'],namesKo:['첫걸음','경비를 관찰하라','주의 분산','빈 진열장','특별 전시']},
 {theme:'gallery',name:'ART GALLERY',ko:'미술관',objective:['painting','jewel'],names:['AFTER HOURS','BEHIND THE FRAME','THE BLIND WALL','CLOSING TIME','PRIVATE COLLECTION'],namesKo:['폐관 후','액자 뒤에서','보이지 않는 벽','마감 시간','개인 소장품']},
 {theme:'bank',name:'BANK',ko:'은행',objective:['vaultGem','case'],names:['THE COUNTER','DEPOSIT LANE','OFFICE DETOUR','SILENT AUDIT','THE STRONGROOM'],namesKo:['창구','금고 통로','사무실 우회','조용한 감사','보관실']},
 {theme:'lab',name:'LAB',ko:'연구소',objective:['prototype'],names:['COLD ENTRY','INNER ORBIT','FALSE SIGNAL','CONTAINMENT','THE PROTOTYPE'],namesKo:['차가운 입구','내부 궤도','거짓 신호','격리 구역','시제품']},
 {theme:'casino',name:'CASINO',ko:'카지노',objective:['jewel'],names:['SMALL STAKES','TABLE HOP','HOUSE DISTRACTION','VIP PRESSURE','THE ROYAL JEWEL'],namesKo:['작은 판돈','테이블 사이','시선 돌리기','VIP 구역','왕실의 보석']},
 {theme:'mansion',name:'MANSION',ko:'저택',objective:['artifact'],names:['SIDE ENTRANCE','THE LONG HALL','UPSTAIRS ECHO','NIGHT WATCH','THE HEIRLOOM'],namesKo:['옆문','긴 복도','위층의 메아리','야간 경비','가보']},
 {theme:'warehouse',name:'WAREHOUSE',ko:'창고',objective:['case'],names:['LOADING BAY','STACKED SHADOWS','WRONG AISLE','CARGO CHECK','LAST SHIPMENT'],namesKo:['하역장','쌓인 그림자','다른 통로','화물 검사','마지막 운송']},
 {theme:'security',name:'SECURITY HQ',ko:'보안 본부',objective:['data'],names:['CONTROL DESK','SERVER LOOP','BLIND FEED','RESTRICTED WING','BLACK SITE ARCHIVE'],namesKo:['관제 책상','서버 순환로','사각 영상','제한 구역','비밀 시설 기록']},
 {theme:'vault',name:'HIGH SECURITY VAULT',ko:'최고 보안 금고',objective:['masterDiamond'],names:['OUTER SEAL','INNER CHAMBERS','DECOY CORRIDOR','LOCKDOWN ROUTE','THE MASTER DIAMOND'],namesKo:['외곽 봉인','내부 방','위장 통로','봉쇄 탈출로','마스터 다이아몬드']},
];
export function missionName(index:number,language:'en'|'ko') {return (language==='ko'?CHAPTER_AREAS_KO:CHAPTER_AREAS)[Math.floor(index/5)][index%5];}
