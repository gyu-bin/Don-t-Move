import bpy, json, os
from pathlib import Path
base=Path(os.environ['DM_PROJECT_ROOT'])
def snapshot(path):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    rigs={}
    for ob in bpy.data.objects:
        if ob.type!='ARMATURE':continue
        rigs[ob.name]={
            'bones':[(b.name,b.parent.name if b.parent else None,[round(float(v),6) for row in b.matrix_local for v in row]) for b in ob.data.bones],
            'rootTransform':[round(float(v),6) for row in ob.parent.matrix_world for v in row]
        }
    actions={}
    for a in bpy.data.actions:
        values=[]
        for layer in a.layers:
            for strip in layer.strips:
                for slot in a.slots:
                    bag=strip.channelbag(slot)
                    if bag:
                        for f in bag.fcurves:
                            values.append((f.data_path,f.array_index,[(round(float(k.co.x),6),round(float(k.co.y),6)) for k in f.keyframe_points]))
        actions[a.name]=values
    camera={'matrix':[round(float(v),6) for row in bpy.context.scene.camera.matrix_world for v in row], 'ortho':bpy.context.scene.camera.data.ortho_scale}
    return {'rigs':rigs,'actions':actions,'camera':camera,'scale':bpy.context.scene.unit_settings.scale_length}
before=snapshot(base/'ArtProduction/Exports/DM_Museum_BeforeRefinement.blend')
after=snapshot(base/'ArtProduction/Exports/DM_Museum_Production.blend')
result={key:before[key]==after[key] for key in before}
result['status']='PASS' if all(result.values()) else 'FAIL'
(base/'ArtProduction/Exports/DM_RefinementStructureAudit.json').write_text(json.dumps(result,indent=2))
print('DM_STRUCTURE_CHECK',result)
if result['status']!='PASS':raise RuntimeError('Preserved structure changed')
