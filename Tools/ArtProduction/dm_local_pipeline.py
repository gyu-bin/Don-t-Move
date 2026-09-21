import bpy, os
from pathlib import Path
dm_root=Path(os.environ['DM_PROJECT_ROOT'])
baseline=dm_root/'ArtProduction/Exports/DM_Museum_BeforeRefinement.blend'
if not baseline.exists():
    raise FileNotFoundError('The preserved refinement baseline is required; do not apply refinement twice.')
bpy.ops.wm.open_mainfile(filepath=str(baseline))
exec((dm_root/'Tools/ArtProduction/dm_premium_refine.py').read_text())
