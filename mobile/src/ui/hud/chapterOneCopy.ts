export const chapterOneCopy = (language: string) => language === 'ko' ? {
  badges: '잠입 배지', badgeShort: '배지', earned: '새 배지 획득', next: '다음 목표', complete: '이 미션의 배지를 모두 모았습니다',
  earnedState: '획득', unearnedState: '미획득',
  firstEscape: '첫 탈출', cleanEscape: '깔끔한 탈출', personalBest: '기록 갱신',
  firstEscapeGoal: '목표물을 확보하고 출구로 탈출하세요.',
  cleanEscapeGoal: '경비·CCTV에 추가 발각되지 않고 탈출하세요. 도난 경보는 제외됩니다.',
  personalBestGoal: '다시 탈출해 최고 기록을 갱신하세요.',
} : {
  badges: 'HEIST BADGES', badgeShort: 'Badges', earned: 'BADGE EARNED', next: 'NEXT GOAL', complete: 'All badges earned for this mission',
  earnedState: 'earned', unearnedState: 'not earned',
  firstEscape: 'First escape', cleanEscape: 'Clean escape', personalBest: 'Personal best',
  firstEscapeGoal: 'Secure the target and reach the exit.',
  cleanEscapeGoal: 'Escape without extra guard or CCTV detections. The theft alarm does not count.',
  personalBestGoal: 'Replay this mission and beat your best escape time.',
};
