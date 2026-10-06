# V11 Phase B — 결과

**V11 PHASE B IMPLEMENTED — FULL-HEIST PLAYTEST PENDING**

## HUD CONSISTENCY

1. 기존 Escape Timer: Museum 일부 미션만 28초/20초 설정이었다.
2. 기존 Chapter-specific branch: Chapter 1에만 Alert/Timer HUD를 표시했다.
3. 최종 공통 Rule: 확인된 Theft Alert부터 28초를 한 번만 시작한다. 미확인 pickup/Spotted 단독은 시작하지 않는다. Search/Spotted는 재시작하지 않으며 만료는 기존 lockdown 압박이다. UI는 runtime phase/countdown/finished로 판단한다. Theft로 숨은 Player LKP를 생성하지 않는다.
4. Chapter 1: 공통 규칙/HUD 상태 테스트 PASS; 실제 Full-Heist 미검증.
5. Chapter 2: 동일 규칙, 02-10 high-security 1.5초 유지; 실제 Full-Heist 미검증.
6. Chapter 3: 동일 규칙, 03-10 high-security 유지; 실제 Full-Heist 미검증. 자동 HUD 계약은 Chapter 1–9를 검사한다.

## PARTIAL REBUILDS

7. 01-04: 보물 이후 동일 Guard LOS를 받는 직행 문제 → 동쪽 inspection bay와 북쪽 return 연결. Guard/CCTV 수·속도 유지. 실제 opaque corner가 첫 LOS를 끊는다. 공유 runtime scripted Theft/CLEAR27.82s; Simulator 증거 아님.
8. 01-08: Objective 이중 압박 → 서쪽 refuge/portal shoulder, g3 동쪽 inspection, CCTV checkpoint 방향, 지역별 search. 수·속도·0.85초 reaction 유지. opaque refuge 검증, scripted Theft/CLEAR37.40s. Native 두 시도는 pickup 전 capture.
9. 01-10: Exit search 집중 → 서쪽 escape refuge와 동쪽 inspection 분리, g5 동쪽 patrol/search. 수·속도 유지. 기존 first break 유지. g5 중간 patrol 충돌을 추가 검사로 찾아 수정; 180초 검사에서 겹침0. Scripted CLEAR는 silent theft이므로 Theft full-heist 증거로 세지 않는다.
10. 02-10: Objective 복귀선이 custodian 쪽으로 되돌아감 → approved opaque white art screen, 지역별 search, backtrack 제거. Guard/CCTV 수·속도·1.5초 alarm 유지. (13.4,6.5) 실제 LOS break 검증. Scripted0/16CLEAR, 서쪽 return/exit 타이밍 검토 필요; Native도 pickup 전 capture.
11. 03-01: Objective/Exit이 인접해 STAFF 검증이 약함 → staff elbow와 dispatch Exit. 기존 Guard가 checkpoint 검사, 수·속도 유지. Objective→Exit8tiles 이상, gateway 닫으면 경로 분리. Scripted2/8CLEAR; Native 입력은 접근 중 정체.

## TUNE MISSIONS

12. TUNE12: 01-01/03/05, 02-02/03/06/07/08/09, 03-05/07/08.
13. 변경11: 01-01/05, 02-02/03/06/07/08/09, 03-05/07/08. Patrol look/wait/coverage와 지역별 search 중심; guard count/speed 변경 없음.
14. 01-03 유지: radius18 경로가 유효하고 Guard2/CCTV0. 실제 Tilt 문제 증거 없이 좁은 통로에 추가 장애물을 넣지 않았다. KEEP13 및 Chapter4–9의30개 정의 SHA 동일. Runtime60/Blueprint90 유지, legacy-unity 미수정.

## CHAPTER DIFFICULTY

15. Museum: safe-route exposure 평균0.10690→0.10172, objective0.19999→0.17249. EASY 체감 확정 아님.
16. Gallery: safe 평균0.06210→0.06009, objective0.09417→0.09333. EASY+ 체감 확정 아님.
17. Bank: safe 평균0.07811→0.07703, objective0.09085→0.09002. MEDIUM 체감 확정 아님.
18. Ch1<Ch2<Ch3: **미달성/REVIEW_REQUIRED**. Guard/safe/objective/escape 지표에서 Museum>Gallery가 남는다. 면적/독립 경로 표본을 인간 난이도 점수로 취급하지 않았다.
19. Chapter1: 통계적 outlier flag없음. 01-05/08/10 실제 Theft escape 체감은 미검증.
20. Chapter2: 02-07 patrol-visits outlier, 02-10 성공 full-heist witness없음.
21. Chapter3: 03-10 safe-exposure outlier. 사용자 기준을 존중하여 변경하지 않았다.

## USER FEEDBACK

22. 01-08: objective approach exposure0.3217→0.0950, objective pressure0.3667→0.1000, search overlap0.0144→0.0025. 실제 Tilt 체감은 미검증.
23. 01-10: search 지역 분산과 Exit 옆 opaque 분리 적용. Search overlap0.0023→0.0018; 이 값만으로 Exit 공정성을 확정하지 않았다.
24. 03-10: map 전체 정의·guard/security 설정·측정축 동일. Native Touch 시도는 완주하지 못했으므로 기존 체감을 재확인했다고 주장하지 않는다.

## FULL-HEIST

아래는 실제 iPhone17Pro **Simulator Touch**의 이번 실행 결과다. Observer는 읽기만 사용했다. 저장된 과거 clear badge는 현재 검증으로 세지 않았다. 각 행의 pickup/Theft/escape LOS/Exit/CLEAR는 모두 미확인이다. 최대2회·45초 관측 한도, UI observation 지연에 따른 수초 초과는 로그에 표시했다. 자동 입력의 실패만으로 맵을 변경하지 않았다.

25. 01-05: FAIL / INPUT TEST LIMITATION. 2회, 마지막46.3초 접근 중 종료. Pickup없음, Theft없음, LOS/Exit/CLEAR미검증.
26. 01-08: FAIL / INPUT TEST LIMITATION. 2회, 마지막13.82초 pickup 전 capture. 현재 경로 입력의 timing 실패, level unfair 증거 아님.
27. 01-10: FAIL / INPUT TEST LIMITATION. 변경 후 마지막44.08초 objective 인근, pickup 범위 진입 미성공. Escape/CLEAR미검증.
28. 02-06: FAIL / INPUT TEST LIMITATION. 실제 입력42.25초 approach. 도구 점유 중 unattended launch는 driven play로 세지 않음. Pickup/escape미검증.
29. 02-10: FAIL / INPUT TEST LIMITATION. 첫 입력 전 대기20.48초 capture, 두 번째32.75초 capture. Native pickup없음. 별도로 scripted0/16은 미해결 review항목.
30. 03-01: FAIL / INPUT TEST LIMITATION. 2회, 마지막42.43초(291.46,390.99) approach 정체. Pickup없음, crash없음.
31. 03-08: FAIL / INPUT TEST LIMITATION. 36.57초(514.17,433.18) pickup 전 capture. CAUGHT UI정상, crash없음.
32. 03-10: FAIL / INPUT TEST LIMITATION. 47.03초 관측 중단, pickup없음. 실제 clear나 Tilt 공정성 검증으로 세지 않음.

## REGRESSION

33. Mission Loading: prepared loading 코드는 변경하지 않았다. 실제 메뉴→미션 정상 진입; 100–250ms 정밀 시간 재측정은 하지 않았다.
34. Wall Slide: stability23/23PASS. Compiled radius18 geometry 및 optimized/full-blocker navigation PASS.
35. CCTVV9: runtime source parity, gait/detection/occlusion/LKP regression PASS. 01-08 escalation 입력 witness만 Run/departure3s로 갱신하여 실제 Theft→Spotted→Search 실행, assertions 유지.
36. Theft/Search: high-security1.5초, hidden-player LKP없음, phase priority/countdown/reset tests PASS.
37. Direct Chase: 속도/AI core 미수정. Chase/empty-path/worklet fallback/animation bounds/crash-hotfix PASS. Simulator capture 시 앱 종료없음.
38. TypeScript: app PASS, campaign-tools PASS. 기존 replay attempts implicit-any는 타입 명시만 추가하여 해결; 입력/게임 동작 변화없음.
39. Lint: errors0, 기존 OTA require-import warnings2. 변경한 tools lint도 PASS.
40. Tests: 최종 npm test exit0; campaign213/213PASS, theft-support36/36PASS, crash8+14PASS, environment10PASS. 별도 stability23/23PASS. Full-Heist native 성공0/8 및 difficulty ordering미달성은 unit-test PASS와 구분한다.
41. iPhone Tilt: 미검증. 연결 목록의 실기기는 iPhone14Pro이며 이번 증거는 iPhone17Pro Simulator Touch다. Production Ready/VERIFIED 선언 없음.

## 증거 위치

- `NATIVE_PLAYTEST.json`: 실제 시도/제한/상태 기록.
- `../PHASE_B_INDEPENDENT_REVIEW.md`: scope/geometry/difficulty 독립 검토.
- `../../../../Reports/V11B/final-suite.log`: 최종 전체 자동검증 exit0.
- `../../../../Reports/V11B/pressure-before.json`, `pressure-final.json`: 동일 측정 방법 비교.
- `../../../../Reports/V11B/native-01-08-caught.png`, `native-01-10-paused.png`: 실제 Simulator 화면.

**V11 PHASE B IMPLEMENTED — FULL-HEIST PLAYTEST PENDING**
