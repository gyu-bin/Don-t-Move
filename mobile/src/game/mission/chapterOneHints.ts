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
      en: 'Use the display island in West Exhibit Walk to split the crossing. Watch the guard before moving north into Silver Collection Gallery.',
      ko: '서쪽 전시 산책로의 전시대를 이용해 이동을 나눠 보세요. 은빛 수집 갤러리로 올라가기 전에 경비를 확인하세요.',
      ja: '西展示通路の展示台を使い、移動を区切りましょう。北の銀のコレクション展示室へ進む前に警備員を確認しましょう。',
    },
    escape: {
      en: 'If the direct exit door closes, leave the collection chamber through the Packing Room below. Cross the east service wing, then turn north toward the exit.',
      ko: '출구로 가는 직통 문이 닫히면 아래쪽 포장실로 돌아가 보세요. 동쪽 직원 구역을 지나 북쪽 출구로 향할 수 있습니다.',
      ja: '出口への直通扉が閉じたら、下側の梱包室へ回りましょう。東の職員用区画を通り、北の出口へ進めます。',
    },
  },
  '01-07': {
    approach: {
      en: 'Use the statue in Sculpture Court to pause between crossings. Check the next doorway before entering Marble Study.',
      ko: '조각 안뜰의 조각상 뒤에서 이동을 나눠 보세요. 대리석 연구실에 들어가기 전 다음 문 쪽을 확인하세요.',
      ja: '彫刻の中庭の像を使い、移動の合間に待ちましょう。大理石研究室へ入る前に次の出入口を確認しましょう。',
    },
    escape: {
      en: 'If the direct exit door closes, return through the Sculpture Workshop below the collection. Use the east service wing to reach the exit from the south.',
      ko: '출구로 가는 직통 문이 닫히면 수집실 아래의 조각 작업실로 돌아가 보세요. 동쪽 직원 구역을 통해 출구에 남쪽에서 접근할 수 있습니다.',
      ja: '出口への直通扉が閉じたら、収蔵室の下側の彫刻工房へ回りましょう。東の職員用区画から出口に南側から近づけます。',
    },
  },
  '01-08': {
    approach: {
      en: 'Move between the exhibits in Conservation Display, then check the Conservation Archive doorway. The third guard also watches the east service return.',
      ko: '보존 전시실의 전시물 사이로 이동한 뒤 보존 기록실 입구를 확인하세요. 동쪽 직원 귀환로에는 세 번째 경비도 있습니다.',
      ja: '保存展示室の展示物の間を進み、保存資料室の出入口を確認しましょう。東の職員用帰路には3人目の警備員もいます。',
    },
    escape: {
      en: 'If the direct exit door closes, go down into Restoration Workshop. Check the east-wing guard before crossing the service route and heading north to the exit.',
      ko: '출구로 가는 직통 문이 닫히면 아래의 복원 작업실로 내려가 보세요. 동쪽 경비를 확인한 뒤 직원 통로를 지나 북쪽 출구로 향하세요.',
      ja: '出口への直通扉が閉じたら、下の修復工房へ進みましょう。東棟の警備員を確認し、職員用通路から北の出口へ向かいましょう。',
    },
  },
  '01-09': {
    camera: {
      en: 'Watch the camera sweep from outside its cone before entering Camera Crossing. Use the gallery screen to break the crossing into shorter moves.',
      ko: '카메라 시야 밖에서 회전을 관찰한 뒤 카메라 교차로에 들어가 보세요. 갤러리 가림벽을 이용해 이동을 나누세요.',
      ja: '視野の外からカメラの動きを観察してから監視交差路へ入りましょう。展示室の仕切りで移動を短く区切りましょう。',
    },
    approach: {
      en: 'Observe the guard and camera before leaving Observation Gallery for Camera Crossing. Reach the next screen before moving toward the collection.',
      ko: '관찰 갤러리에서 카메라 교차로로 가기 전 경비와 카메라를 확인하세요. 다음 가림벽에 도착한 뒤 수집실로 이동해 보세요.',
      ja: '観察展示室から監視交差路へ進む前に警備員とカメラを確認しましょう。次の仕切りまで進んでから収蔵室へ向かいましょう。',
    },
    escape: {
      en: 'If the direct exit door closes, leave through Monitoring Backroom below the collection. Turn east through the service wing, then north into the exit lobby.',
      ko: '출구로 가는 직통 문이 닫히면 수집실 아래의 관제 뒷방으로 돌아가 보세요. 직원 구역을 동쪽으로 지난 뒤 북쪽 출구 로비로 올라갈 수 있습니다.',
      ja: '出口への直通扉が閉じたら、収蔵室の下側の監視控室へ回りましょう。職員用区画を東へ進み、北の出口ロビーへ向かえます。',
    },
  },
  '01-10': {
    camera: {
      en: 'Wait outside the camera cone before crossing Crown Antechamber. Check the doorway guard as well; a camera blind spot does not prevent direct contact.',
      ko: '카메라 시야 밖에서 기다렸다가 왕관 전실을 건너 보세요. 카메라 사각에서도 경비와 부딪힐 수 있으니 입구 경비도 확인하세요.',
      ja: 'カメラの視野の外で待ってから王冠の前室を渡りましょう。カメラの死角でも警備員にはぶつかるため、出入口の警備員も確認しましょう。',
    },
    approach: {
      en: 'This collection has three guards and a camera. Check Crown Antechamber from cover, then approach the collection doorway only after watching its guard.',
      ko: '이번 수집실에는 경비 세 명과 카메라가 있습니다. 엄폐한 채 왕관 전실을 살피고, 수집실 입구 경비를 확인한 뒤 접근해 보세요.',
      ja: 'この収蔵区画には警備員3人とカメラがあります。遮蔽物から王冠の前室を観察し、収蔵室の警備員を確認してから近づきましょう。',
    },
    escape: {
      en: 'If the direct exit door closes, leave the collection through Collection Handling Room below. Check the east service guard before turning north to the final exit.',
      ko: '출구로 가는 직통 문이 닫히면 아래쪽 수집품 취급실로 나가 보세요. 동쪽 직원 구역의 경비를 확인한 뒤 북쪽 최종 출구로 향하세요.',
      ja: '出口への直通扉が閉じたら、下側の収蔵品取扱室へ出ましょう。東の職員用区画の警備員を確認してから、北の最終出口へ向かいましょう。',
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
