# Museum refinement comparison

**상태: Art Guide 기준 미달 — 출시용 완료 / 스타일 LOCK 아님.**

기존 5종만 수정했습니다. 캐릭터 클로즈업은 Blender 렌더이며, Test Room·gameplay distance·조명 비교는 실제 Unity 렌더입니다. 각 전후 쌍의 카메라와 해상도는 같습니다. 조명 비교는 수정된 모델·재질을 고정하고 이전/수정 조명 설정을 적용했습니다.

## Agent Zero close-up

| 수정 전 | 수정 후 |
|---|---|
| ![Before](</Users/mungyubin/Desktop/Coding/Don't Move/ArtProduction/Previews/BeforeRefinement/DM_AgentZero_Closeup.png>) | ![After](</Users/mungyubin/Desktop/Coding/Don't Move/ArtProduction/Previews/DM_AgentZero_Closeup.png>) |

## Museum Guard close-up

| 수정 전 | 수정 후 |
|---|---|
| ![Before](</Users/mungyubin/Desktop/Coding/Don't Move/ArtProduction/Previews/BeforeRefinement/DM_MuseumGuard_Closeup.png>) | ![After](</Users/mungyubin/Desktop/Coding/Don't Move/ArtProduction/Previews/DM_MuseumGuard_Closeup.png>) |

## Test Room

| 수정 전 | 수정 후 |
|---|---|
| ![Before](</Users/mungyubin/Desktop/Coding/Don't Move/ArtProduction/Previews/BeforeRefinement/DM_Unity_TestRoom.png>) | ![After](</Users/mungyubin/Desktop/Coding/Don't Move/ArtProduction/Previews/DM_Unity_TestRoom.png>) |

## Gameplay distance

| 수정 전 | 수정 후 |
|---|---|
| ![Before](</Users/mungyubin/Desktop/Coding/Don't Move/ArtProduction/Previews/BeforeRefinement/DM_Unity_Gameplay_Portrait.png>) | ![After](</Users/mungyubin/Desktop/Coding/Don't Move/ArtProduction/Previews/DM_Unity_Gameplay_Portrait.png>) |

## Lighting

| 수정 전 | 수정 후 |
|---|---|
| ![Before](</Users/mungyubin/Desktop/Coding/Don't Move/ArtProduction/Previews/DM_Lighting_Before.png>) | ![After](</Users/mungyubin/Desktop/Coding/Don't Move/ArtProduction/Previews/DM_Lighting_After.png>) |

## 변경 및 검증

- 얼굴 표면 연결, 헤어 재구성, 수트 라펠·허리·칼라와 장갑·구두·통신장비 디테일 수정.
- 기존 벽·기둥에 몰딩 디테일을 보강하고 바닥의 석재 패턴·roughness·normal을 수정.
- 조각상 접합부 통합, 유리 반사 및 cyan emission, 집중 조명·그림자 bias 수정.
- Unity 6000.3.24f1: C# compile error/warning 0. 9개 애니메이션의 Play Mode 변형 검사 통과.
- 리그 행렬·부모 관계, 애니메이션 키, 단위 스케일 및 카메라 보존 검사 통과.
- 캐릭터 각 16 bones / 1 material 유지. 캐릭터 약 18,000 tris, 조각상 18,000 tris, Unity 전체 약 166,800 tris. 텍스처 슬롯·해상도 유지.
- iPhone FPS 미측정. 현재 게임플레이 Scene에 새 에셋을 연결한 상태가 아님.

## 아직 해결하지 못한 시각적 차이

얼굴·헤어·옷의 조형과 표면 디테일은 여전히 단순하며 캐릭터에 마네킹 같은 인상이 남습니다. 조각상 역시 기준 이미지의 인체·드레이프 수준에 도달하지 못했습니다. 환경의 패턴과 대비는 개선했지만 기준 이미지의 고급스러운 재질과 조명 깊이를 완전히 재현하지 못했습니다. 이번 비교 결과를 완성본으로 취급하지 않습니다.
