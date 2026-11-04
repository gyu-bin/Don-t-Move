import type { CatchCause } from './catchCause';

type Copy = { en: string; ko: string; ja: string };
type HintKind = 'approach' | 'escape' | 'contact' | 'camera';
export interface ChapterOneHint { id: string; title: string; body: string }
export interface ChapterOneHintInput {
  missionId: string;
  /** Captures in this mission in the current play session, including this capture. */
  failures: number;
  cause: CatchCause | null;
  secured: boolean;
  language?: string;
}

// Show help after a repeated capture, rather than interrupting a player's first attempt.
// This is a presentation threshold, not a difficulty or reward modifier.
export const REPEAT_FAILURE_HINT_THRESHOLD = 2;
const TITLE: Copy = { en: 'NEXT TRY', ko: '다음 도전에서는', ja: '次の挑戦では' };
const CONTACT: Copy = {
  en: 'Let the guard pass before entering the doorway. Standing still does not protect you from direct contact.',
  ko: '경비가 지나간 뒤 문을 통과해 보세요. 가만히 있어도 경비와 부딪히면 잡힙니다.',
  ja: '警備員が通り過ぎてから出入口を通りましょう。止まっていても、直接ぶつかると捕まります。',
};
const CAMERA: Copy = {
  en: 'Wait outside the camera cone until it sweeps away. Check the next wall corner before crossing the central gallery.',
  ko: '카메라 시야 밖에서 회전 방향이 바뀌길 기다려 보세요. 중앙 전시실을 건너기 전에 다음 벽 모퉁이를 확인하세요.',
  ja: 'カメラの視野の外で向きが変わるのを待ちましょう。中央展示室を横切る前に、次の壁の角を確認しましょう。',
};

// Authored against the Museum layouts, functional zones and post-lockdown escapeRoutes.
// Directions describe route choices; they do not promise a route is safe from moving guards.
const MISSIONS: Readonly<Record<string, { approach: Copy; escape: Copy; camera?: Copy }>> = {
  '01-01': {
    approach: {
      en: 'Watch the entrance guard before crossing the central court. Check the collection-room doorway before approaching the diamond.',
      ko: '중앙 홀을 건너기 전에 입구 경비의 움직임을 보세요. 다이아몬드로 다가가기 전 수집실 입구도 확인하세요.',
      ja: '中央ホールを横切る前に入口の警備員を観察しましょう。ダイヤに近づく前に収蔵室の出入口も確認しましょう。',
    },
    escape: {
      en: 'If the upper shortcut closes, return through the side galleries and approach the north exit from the west.',
      ko: '위쪽 지름길이 닫히면 옆 전시실들로 돌아가 보세요. 북쪽 출구에는 서쪽에서도 접근할 수 있습니다.',
      ja: '上側の近道が閉じたら、脇の展示室を回りましょう。北の出口には西側からも近づけます。',
    },
  },
  '01-02': {
    approach: {
      en: 'Use the rotunda pillars to break the crossing into shorter moves. Check the private-exhibit guard before entering.',
      ko: '원형 홀의 기둥을 이용해 이동 구간을 나눠 보세요. 개인 전시실에 들어가기 전 그 안의 경비도 확인하세요.',
      ja: '円形ホールの柱を使い、移動を短い区間に分けましょう。個人展示室に入る前に、中の警備員も確認しましょう。',
    },
    escape: {
      en: 'If the upper shortcut closes, leave the private exhibit and cross toward the east wing. Approach the exit from below.',
      ko: '위쪽 지름길이 닫히면 개인 전시실에서 나와 동쪽 전시실 쪽으로 돌아가 보세요. 출구에는 아래쪽에서도 접근할 수 있습니다.',
      ja: '上側の近道が閉じたら、個人展示室を出て東棟へ回りましょう。出口には下側からも近づけます。',
    },
  },
  '01-03': {
    approach: {
      en: 'Cross the archive in short sections. Check the conservation-room guard before turning into the secure archive.',
      ko: '기록 보관소를 한 번에 가로지르지 말고 이동을 나눠 보세요. 보안 기록실로 꺾기 전에 보존 작업실 경비를 확인하세요.',
      ja: '資料保管庫では移動を短い区間に分けましょう。機密保管室へ曲がる前に、保存作業室の警備員を確認しましょう。',
    },
    escape: {
      en: 'If the direct door north of the objective closes, loop east through the passage, then turn north toward the exit lobby.',
      ko: '목표물 북쪽의 문이 닫히면 동쪽 통로로 돌아가 보세요. 그 뒤 북쪽으로 꺾어 출구 로비로 향할 수 있습니다.',
      ja: '目標の北側の扉が閉じたら、東側の通路へ回りましょう。その先で北へ曲がり、出口ロビーを目指せます。',
    },
  },
  '01-04': {
    camera: CAMERA,
    approach: {
      en: 'Observe the camera sweep before crossing the central gallery. Stay outside its cone and check the collection-room guard too.',
      ko: '중앙 전시실을 건너기 전 카메라의 회전을 살펴보세요. 시야 범위를 피하면서 수집실 경비도 확인하세요.',
      ja: '中央展示室を横切る前にカメラの動きを観察しましょう。視野を避けながら、収蔵室の警備員も確認しましょう。',
    },
    escape: {
      en: 'If the right-hand exit door closes, return through the staff passage and approach the exit lobby from the left.',
      ko: '오른쪽 출구 통로의 문이 닫히면 직원 통로로 돌아가 보세요. 출구 로비에는 왼쪽에서도 접근할 수 있습니다.',
      ja: '右側の出口通路の扉が閉じたら、職員用通路へ回りましょう。出口ロビーには左側からも近づけます。',
    },
  },
  '01-05': {
    approach: {
      en: 'This heist has three guards. Watch each doorway separately instead of crossing the exhibition and collection rooms in one move.',
      ko: '이번 임무의 경비는 세 명입니다. 전시실과 수집실을 한 번에 지나가지 말고 문마다 경비를 다시 확인해 보세요.',
      ja: 'この任務の警備員は3人です。展示室と収蔵室を一気に通らず、出入口ごとに警備員を確認しましょう。',
    },
    escape: {
      en: 'If the door below the diamond closes, leave the chamber to the right. The service corridor loops back toward the lower-left exit.',
      ko: '다이아몬드 아래쪽 문이 닫히면 방의 오른쪽으로 나가 보세요. 직원 통로는 왼쪽 아래 출구 쪽으로 이어집니다.',
      ja: 'ダイヤの下側の扉が閉じたら、部屋の右側へ出ましょう。職員用通路は左下の出口へ回り込めます。',
    },
  },
  '01-06': {
    approach: {
      en: 'From Staggered Exhibit Hall, choose the north portrait rooms or time the east crossing. Check the collection guard again at the next doorway.',
      ko: '엇갈린 전시 홀에서 북쪽 초상화 방으로 돌아가거나, 경비가 지나간 뒤 동쪽 통로를 건너 보세요. 수집실 문에서는 경비를 다시 확인하세요.',
      ja: 'ずれた展示ホールから北の肖像画室を回るか、警備員が通り過ぎてから東の通路を渡りましょう。収蔵室の扉で再び警備員を確認しましょう。',
    },
    escape: {
      en: 'If the collection shortcut closes, leave east through the handling room and descend into Packing Workroom. Follow the south return west to West Dispatch Exit.',
      ko: '수집실 지름길이 닫히면 동쪽 운송실로 나와 포장 작업실로 내려가세요. 남쪽 귀환 전시실을 따라 서쪽의 반출 출구로 돌아갈 수 있습니다.',
      ja: '収蔵室の近道が閉じたら、東の運搬室から梱包作業室へ下りましょう。南の帰路を西へ進むと、西搬出口へ回れます。',
    },
  },
  '01-07': {
    approach: {
      en: 'The central Marble Pavilion has two approaches. Watch the north-arc patrol before choosing the long east arcade or the short west courtyard bridge.',
      ko: '중앙 대리석 전시관에는 두 방향으로 접근할 수 있습니다. 북쪽 경비를 살핀 뒤 긴 동쪽 회랑과 짧은 서쪽 안뜰 다리 중 하나를 고르세요.',
      ja: '中央の大理石展示館には二方向から近づけます。北側の巡回を見て、長い東の回廊か短い西の中庭橋を選びましょう。',
    },
    escape: {
      en: 'If the east pavilion bridge closes, leave by the west bridge and descend into Sculpture Workshop. Follow the south exhibition walk toward the lower-right exit.',
      ko: '전시관 동쪽 다리가 닫히면 서쪽 다리로 나와 조각 작업실로 내려가세요. 남쪽 전시 회랑을 따라 오른쪽 아래 출구로 향할 수 있습니다.',
      ja: '展示館の東橋が閉じたら、西橋から彫刻工房へ下りましょう。南の展示回廊を進み、右下の出口を目指せます。',
    },
  },
  '01-08': {
    approach: {
      en: 'From the east arrival, compare the upper observation rooms with the direct T-junction branch. Stop behind the study screen and read the archive guard before entering.',
      ko: '동쪽 입구에서 위쪽 관찰실 경로와 T자 교차로의 직통 경로를 비교해 보세요. 연구실 가림벽 뒤에서 보존 기록실 경비를 확인한 뒤 들어가세요.',
      ja: '東の入口から、上の観察室経由とT字路の直通経路を比べましょう。研究室の遮蔽物で止まり、保存資料室の警備員を確認してから入りましょう。',
    },
    escape: {
      en: 'If the west archive shortcut closes, return to the T junction and turn into Restoration Workshop. Pass the lower crate room to reach the lower-left exit.',
      ko: '기록실 서쪽 지름길이 닫히면 T자 교차로로 돌아와 복원 작업실로 꺾으세요. 아래쪽 상자 운송실을 지나 왼쪽 아래 출구로 갈 수 있습니다.',
      ja: '資料室の西の近道が閉じたら、T字路へ戻って修復工房へ曲がりましょう。下の木箱運搬室を通ると、左下の出口へ進めます。',
    },
  },
  '01-09': {
    camera: {
      en: 'Observe the East Camera Gallery from outside the camera cone. The north observation balcony offers another approach; neither route replaces checking the crossing guard.',
      ko: '동쪽 카메라 전시실에 들어가기 전 시야 밖에서 회전을 관찰하세요. 북쪽 관찰 회랑으로 돌아갈 수도 있습니다. 어느 쪽이든 교차로 경비를 다시 확인하세요.',
      ja: '東の監視展示室へ入る前に、視野の外でカメラの動きを観察しましょう。北の観察回廊からも回れます。どちらの経路でも交差路の警備員を確認しましょう。',
    },
    approach: {
      en: 'From the upper-right arrival, choose the north observation balcony or the East Camera Gallery crossing. Check the central Crossing Spine before descending toward the lower-right collection.',
      ko: '오른쪽 위 입구에서 북쪽 관찰 회랑과 동쪽 카메라 전시실 경로를 비교해 보세요. 중앙 교차 통로의 경비를 확인한 뒤 오른쪽 아래 수집실로 내려가세요.',
      ja: '右上の入口から、北の観察回廊と東の監視展示室の経路を比べましょう。中央交差路の警備員を確認してから、右下の収蔵室へ下りましょう。',
    },
    escape: {
      en: 'If the south dispatch shortcut closes, return north to Crossing Spine, then west through West Crossing Hall. Descend the west steps to Southwest Dispatch Exit.',
      ko: '남쪽 반출 지름길이 닫히면 북쪽 중앙 교차 통로로 돌아와 서쪽 교차 홀로 꺾으세요. 서쪽 계단을 내려가면 왼쪽 아래 반출 출구로 갈 수 있습니다.',
      ja: '南の搬出近道が閉じたら、北の中央交差路へ戻って西交差ホールへ曲がりましょう。西の階段を下りると、左下の搬出口へ進めます。',
    },
  },
  '01-10': {
    camera: {
      en: 'Watch the west-facing camera in Royal Promenade before taking the west visitor bridge. The east reception leads toward the handling rooms; check its guard before descending.',
      ko: '왕실 회랑에서 서쪽을 향하는 카메라를 살핀 뒤 서쪽 연결 다리를 건너세요. 동쪽 접견실에서는 경비를 확인한 뒤 취급실 쪽으로 내려가세요.',
      ja: '王室回廊の西向きのカメラを観察してから、西の連絡橋を渡りましょう。東の応接室では警備員を確認してから取扱室へ下りましょう。',
    },
    approach: {
      en: 'The crown lies deep in the lower collection. Compare the Royal Promenade and east handling rooms with the west security and portrait rooms; check each of the three guards separately.',
      ko: '왕관은 아래쪽 깊은 수집실에 있습니다. 왕실 회랑과 동쪽 취급실 경로, 서쪽 보안·초상화실 경로를 비교해 보세요. 세 경비를 각각 확인하세요.',
      ja: '王冠は下側の奥の収蔵室にあります。王室回廊と東の取扱室の経路、西の警備・肖像画室の経路を比べ、3人の警備員をそれぞれ確認しましょう。',
    },
    escape: {
      en: 'If the east collection shortcut closes, leave west through Portrait Antechamber and climb to West Security Gallery. Cross Upper Collection Return east to Royal Dispatch Exit.',
      ko: '수집실 동쪽 지름길이 닫히면 서쪽 초상화 전실로 나와 보안 전시실로 올라가세요. 위쪽 수집실 귀환로를 동쪽으로 건너면 왕실 반출 출구로 갈 수 있습니다.',
      ja: '収蔵室の東の近道が閉じたら、西の肖像画前室から警備展示室へ上がりましょう。上の収蔵室帰路を東へ渡ると、王室搬出口へ進めます。',
    },
  },
};

/** Presentation-only advice. Never changes detection, navigation, mission state or purchases. */
export function chapterOneHint(input: ChapterOneHintInput): ChapterOneHint | null {
  const mission = Object.hasOwn(MISSIONS, input.missionId) ? MISSIONS[input.missionId] : undefined;
  if (!mission || !Number.isInteger(input.failures) || input.failures < REPEAT_FAILURE_HINT_THRESHOLD) return null;
  const language = input.language === 'ko' || input.language === 'ja' ? input.language : 'en';
  const kind: HintKind = input.secured ? 'escape'
    : input.cause === 'guardContact' ? 'contact'
    : input.cause === 'cameraChase' && mission.camera ? 'camera' : 'approach';
  const copy = kind === 'contact' ? CONTACT : kind === 'camera' ? mission.camera! : mission[kind];
  return { id: `${input.missionId}:${kind}`, title: TITLE[language], body: copy[language] };
}
