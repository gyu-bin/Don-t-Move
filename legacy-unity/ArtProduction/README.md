# Museum five-asset refinement candidate

Status: ART_REVIEW_REQUIRED. The visual target has not been met. This is not a release-quality approval.

See REFINEMENT_REVIEW.md for same-camera comparisons and known gaps.

Unity scene: Assets/Scenes/DM_Museum_ProductionTest.unity
Transfer: ArtProduction/Exports/DM_Museum_FiveAsset_TestKit.unitypackage
Editable source: ArtProduction/Exports/DM_Museum_Production.blend
Preserved original: ArtProduction/Exports/DM_Museum_BeforeRefinement.blend
Individual FBX: Assets/Art/**/Production/
Scene GLB: ArtProduction/Exports/DM_Museum_TestRoom.glb (different optimization budget from Unity FBX)

Rebuild from the preserved original with Tools/ArtProduction/dm_local_pipeline.py and DM_PROJECT_ROOT set to this project. Refinement is not cumulative. Then invoke DMProductionImporter.Build in Unity.

Measured specifications: Exports/DM_AssetSpecifications.json
Unity import evidence: Exports/DM_UnityImportAudit.txt
Rig/keyframe/camera/scale preservation: Exports/DM_RefinementStructureAudit.json
Play Mode evidence: Exports/DM_RefinementPlayAudit.txt

No iPhone performance measurement has been made for this refinement. Normal maps now encode subtle stone variation; they are not baked high-resolution sculpt detail. Character palette atlases remain 256x256, stone maps 512x512.
