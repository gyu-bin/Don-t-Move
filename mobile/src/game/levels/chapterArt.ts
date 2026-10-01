import type {PropKind,StageTheme} from './StageDefinition';
export const CHAPTER_AREAS=[
 ['Entrance Hall','Main Gallery','Archive','Security Wing','Restricted Collection','Conservation Lab','Private Gallery','Security Core','Master Exhibition','Grand Heist'],
 ['Front Exhibition','Portrait Hall','Sculpture Studio','Modern Wing',"Collector's Room",'Glass Gallery',"Curator's Floor",'Grand Atrium','Private Collection','Masterpiece'],
 ['Public Lobby','Teller Hall','Staff Offices','Records Room','Deposit Boxes','Security Checkpoint','Cash Processing','Inner Security','Vault Antechamber','Main Vault'],
 ['Observation Lobby','Research Wing','Specimen Lab','Containment Sector','Prototype Chamber'],
 ['Hotel Reception','Gaming Floor','Service Lounge','VIP Salon','Royal Jewel Room'],
 ['Garden Vestibule','Drawing Room','Library Wing','Family Apartments','Heirloom Gallery'],
 ['Loading Entrance','Cargo Sorting','Storage Aisles','Inspection Bay','Secured Shipment'],
 ['Security Reception','Monitoring Room','Server Wing','Restricted Corridor','Black Site Archive'],
 ['Outer Checkpoint','Vault Antechamber','Mechanism Hall','Security Ring','Master Diamond Chamber'],
];
export const CHAPTER_AREAS_KO=[
 ['입구 홀','중앙 갤러리','수장고','보안 구역','제한 컬렉션','보존 연구실','비공개 갤러리','보안 중심부','마스터 전시실','그랜드 하이스트'],
 ['정면 전시실','초상화 홀','조각 스튜디오','현대 전시동','컬렉터의 방','유리 갤러리','큐레이터 층','그랜드 아트리움','비공개 컬렉션','마스터피스'],
 ['은행 로비','창구 홀','직원 사무실','기록실','대여 금고','보안 검문소','현금 처리실','내부 보안','금고 전실','중앙 금고'],
 ['관찰 로비','연구 구역','표본 연구실','격리 구역','시제품 실험실'],
 ['호텔 접견실','게임 플로어','서비스 라운지','VIP 살롱','왕실 보석실'],
 ['정원 현관','응접실','서재동','가족 거주실','가보 전시실'],
 ['하역 입구','화물 분류실','보관 통로','검사 구역','보안 화물실'],
 ['보안 접견실','관제실','서버동','제한 통로','비밀 시설 기록실'],
 ['외곽 검문소','금고 전실','기계 장치 홀','보안 순환로','마스터 다이아몬드실'],
];
export const LANDMARKS=[
 ['Grand Statue','Central Rotunda','Archive Shelves','Security Control Room','Diamond Chamber'],
 ['Signature Canvas','Portrait Triptych','Sculpture Plinth','Private Screens','Collector Wall'],
 ['Stone Teller Desk','Brass Counter','Deposit Safe','Security Gate','Vault Mechanism'],
 ['Observation Tank','Research Console','Specimen Cylinder','Containment Array','Prototype Reactor'],
 ['Gold Reception Desk','Roulette Table','Card Table','VIP Sofa','Royal Display'],
 ['Grand Stair','Library Cabinet','Reading Alcove','Family Sofa','Antique Cabinet'],
 ['Pallet Stack','Cargo Shelf','Shipping Crates','Inspection Desk','Secured Container'],
 ['Security Desk','Monitor Wall','Server Rack','Security Gate','Archive Terminal'],
 ['Heavy Door','Vault Wheel','Mechanism Rack','Security Pillar','Master Display'],
];
export const LANDMARK_KINDS:PropKind[][]=[
 ['statue','pillar','shelf','equipment','diamondPedestal'],['painting','painting','statue','partition','painting'],
 ['counter','counter','displayCase','partition','equipment'],['equipment','table','equipment','partition','equipment'],
 ['counter','table','table','sofa','displayCase'],['equipment','shelf','table','sofa','displayCase'],
 ['crate','shelf','crate','counter','equipment'],['counter','equipment','shelf','partition','equipment'],
 ['equipment','equipment','shelf','pillar','displayCase'],
];
export const MATERIALS:Record<StageTheme,{floor:string;seam:string;trim:string;inlay:string}>={
 museum:{floor:'#454a4c',seam:'#262d31',trim:'#b8a987',inlay:'#616669'},
 gallery:{floor:'#92948a',seam:'#787c72',trim:'#d0c9b8',inlay:'#a5a798'},
 bank:{floor:'#343e40',seam:'#202b30',trim:'#ad9563',inlay:'#5b686a'},
 lab:{floor:'#29424b',seam:'#1b313b',trim:'#83bfc7',inlay:'#4a6d76'},
 casino:{floor:'#382433',seam:'#4d3340',trim:'#be9860',inlay:'#604350'},
 mansion:{floor:'#47382c',seam:'#2b211d',trim:'#ad8b61',inlay:'#72533a'},
 warehouse:{floor:'#444744',seam:'#323837',trim:'#b5a06d',inlay:'#636759'},
 security:{floor:'#263641',seam:'#182832',trim:'#7195ab',inlay:'#425965'},
 blacksite:{floor:'#26323a',seam:'#162129',trim:'#788993',inlay:'#435059'},
 vault:{floor:'#323b48',seam:'#1b2532',trim:'#9facbf',inlay:'#515c6f'},
};
