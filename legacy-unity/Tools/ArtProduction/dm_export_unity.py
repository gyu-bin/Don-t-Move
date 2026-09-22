import bpy, os, json, math
from pathlib import Path
from mathutils import Vector

BASE=Path(os.environ['DM_PROJECT_ROOT'])
OUT=BASE/'ArtProduction'/'Exports'
ART=BASE/'Assets'/'Art'
TEXTURES=ART/'Textures'/'Production'
OUT.mkdir(parents=True,exist_ok=True);TEXTURES.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene;scene.frame_set(1)

def tris(ob):
    deps=bpy.context.evaluated_depsgraph_get();ev=ob.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles();n=len(me.loop_triangles);ev.to_mesh_clear();return n

def descendants(root):
    return [root]+list(root.children_recursive)

def select(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.hide_set(False);o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]

def export_fbx(objects,path,anim=False):
    select(objects)
    bpy.ops.export_scene.fbx(filepath=str(path),use_selection=True,object_types={'EMPTY','MESH','ARMATURE'},global_scale=1,apply_unit_scale=True,apply_scale_options='FBX_SCALE_UNITS',axis_forward='-Z',axis_up='Y',use_space_transform=True,bake_space_transform=False,add_leaf_bones=False,use_mesh_modifiers=True,mesh_smooth_type='FACE',bake_anim=anim,bake_anim_use_all_actions=False,bake_anim_use_nla_strips=False,bake_anim_simplify_factor=0,bake_anim_step=1,path_mode='COPY',embed_textures=False)

def evaluated_copy(root,name):
    dest=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(dest)
    deps=bpy.context.evaluated_depsgraph_get()
    for child in root.children_recursive:
        if child.type!='MESH':continue
        me=bpy.data.meshes.new_from_object(child.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps)
        ob=bpy.data.objects.new(child.name+'_Export',me);bpy.context.collection.objects.link(ob)
        ob.matrix_world=root.matrix_world.inverted()@child.matrix_world;ob.parent=dest
    obs=list(dest.children)
    def transparent(o):
        return all(m.use_nodes and m.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value<.99 for m in o.data.materials)
    opaque=[o for o in obs if not transparent(o)];clear=[o for o in obs if transparent(o)]
    joined=None
    budgets={'MarbleFloor':600,'WallStraight':6500,'WallCorner':12000,'Pillar':6500,'DoorFrame':4000,'MuseumStatue':18000,'DisplayCase':6500,'TestRoom':130000}
    budget=next((v for key,v in budgets.items() if key in name),None)
    for group,label in [(opaque,'Opaque'),(clear,'Glass')]:
        if not group:continue
        select(group);bpy.ops.object.join();obj=bpy.context.object;obj.name=name+'_'+label
        n=tris(obj)
        if budget and label=='Opaque' and n>budget:
            dec=obj.modifiers.new('Mobile silhouette preservation','DECIMATE');dec.ratio=budget/n;bpy.ops.object.modifier_apply(modifier=dec.name)
        if joined is None:joined=obj
    return dest,joined

audit={'models':[],'textures':[],'animations':[],'unity_scale':'1 unit = 1 metre','status':'ART_REVIEW_REQUIRED'}
for im in bpy.data.images:
    if not im.name.startswith('DM_Texture_'):continue
    im.filepath_raw=str(TEXTURES/(im.name+'.png'));im.file_format='PNG';im.save()
    audit['textures'].append({'name':im.name,'width':im.size[0],'height':im.size[1]})

materials=[]
for m in bpy.data.materials:
    if not m.use_nodes:continue
    p=m.node_tree.nodes.get('Principled BSDF')
    if not p:continue
    entry={'name':m.name,'color':list(p.inputs['Base Color'].default_value),'roughness':float(p.inputs['Roughness'].default_value),'metallic':float(p.inputs['Metallic'].default_value),'alpha':float(p.inputs['Alpha'].default_value),'emission':list(p.inputs['Emission Color'].default_value),'emissionStrength':float(p.inputs['Emission Strength'].default_value),'baseColorTexture':'','normalTexture':'','roughnessTexture':''}
    for node in m.node_tree.nodes:
        if node.type=='TEX_IMAGE' and node.image:
            n=node.image.name
            if n.endswith('BaseColor'):entry['baseColorTexture']=n+'.png'
            elif n.endswith('Normal'):entry['normalTexture']=n+'.png'
            elif n.endswith('Roughness'):entry['roughnessTexture']=n+'.png'
    materials.append(entry)

def palette_character(tag):
    root=bpy.data.objects['DM_Character_'+tag];rig=bpy.data.objects['DM_Rig_'+tag]
    rig.data.pose_position='REST'
    savedloc=root.location.copy();savedrot=root.rotation_euler.copy();root.location=(0,0,0);root.rotation_euler=(0,0,0)
    meshes=[o for o in rig.children if o.type=='MESH']
    for o in meshes:
        bpy.context.view_layer.objects.active=o
        for mod in list(o.modifiers):
            if mod.type!='ARMATURE':bpy.ops.object.modifier_apply(modifier=mod.name)
    select(meshes);bpy.ops.object.join();ob=bpy.context.object;ob.name='DM_Character_'+tag+'_SkinnedMesh'
    # Keep the palette's distinct roughness/metalness while reducing character draw calls.
    old=list(ob.data.materials);count=len(old);grid=math.ceil(math.sqrt(count));size=256
    import numpy as np
    rgba=np.ones((size,size,4),np.float32);mr=np.zeros_like(rgba);mr[:,:,3]=1
    for index,m in enumerate(old):
        p=m.node_tree.nodes.get('Principled BSDF');row=index//grid;col=index%grid
        x0=round(col*size/grid);x1=round((col+1)*size/grid);y0=round(row*size/grid);y1=round((row+1)*size/grid)
        color=np.asarray(p.inputs['Base Color'].default_value,dtype=np.float32)
        color[:3]=np.where(color[:3]<=.0031308,color[:3]*12.92,1.055*np.maximum(color[:3],0)**(1/2.4)-.055)
        rgba[y0:y1,x0:x1,:]=color
        mr[y0:y1,x0:x1,0]=p.inputs['Metallic'].default_value;mr[y0:y1,x0:x1,3]=1-p.inputs['Roughness'].default_value
    for layer in list(ob.data.uv_layers):ob.data.uv_layers.remove(layer)
    uv=ob.data.uv_layers.new(name='UVMap');uv.active_render=True
    for face in ob.data.polygons:
        index=face.material_index
        for li in face.loop_indices:uv.data[li].uv=((index%grid+.5)/grid,(index//grid+.5)/grid)
    def image(name,data):
        im=bpy.data.images.new(name,width=size,height=size,alpha=True);im.pixels.foreach_set(data.ravel());im.filepath_raw=str(TEXTURES/(name+'.png'));im.file_format='PNG';im.save();im.pack();audit['textures'].append({'name':name,'width':size,'height':size});return im
    base=image('DM_Texture_'+tag+'_BaseColor',rgba);packed=image('DM_Texture_'+tag+'_MetallicSmoothness',mr)
    mat=bpy.data.materials.new('DM_Material_'+tag+'_Atlas');mat.use_nodes=True;p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.6;p.inputs['Specular IOR Level'].default_value=.22
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=base;mat.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
    packed.colorspace_settings.name='Non-Color'
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=packed
    separate=mat.node_tree.nodes.new('ShaderNodeSeparateColor');mat.node_tree.links.new(tex.outputs['Color'],separate.inputs['Color']);mat.node_tree.links.new(separate.outputs['Red'],p.inputs['Metallic'])
    invert=mat.node_tree.nodes.new('ShaderNodeMath');invert.operation='SUBTRACT';invert.inputs[0].default_value=1
    mat.node_tree.links.new(tex.outputs['Alpha'],invert.inputs[1]);mat.node_tree.links.new(invert.outputs[0],p.inputs['Roughness'])
    ob.data.materials.clear();ob.data.materials.append(mat)
    for face in ob.data.polygons:face.material_index=0
    n=tris(ob)
    if n>18000:
        bpy.context.view_layer.objects.active=ob;dec=ob.modifiers.new('Mobile silhouette preservation','DECIMATE');dec.ratio=18000/n
        bpy.ops.object.modifier_apply(modifier=dec.name)
    matspec={'name':mat.name,'color':[1,1,1,1],'roughness':.6,'metallic':0,'alpha':1,'emission':[0,0,0,1],'emissionStrength':0,'baseColorTexture':base.name+'.png','normalTexture':'','roughnessTexture':'','metallicSmoothnessTexture':packed.name+'.png'}
    materials.append(matspec)
    folder=ART/'Characters'/'Production';folder.mkdir(parents=True,exist_ok=True)
    export_fbx([root,rig,ob],folder/(root.name+'.fbx'))
    audit['models'].append({'name':root.name,'triangles':tris(ob),'bones':len(rig.data.bones),'materials':1,'format':'FBX'})
    rig.data.pose_position='POSE'
    oldaction=rig.animation_data.action
    for tr in rig.animation_data.nla_tracks:tr.mute=True
    for act in list(bpy.data.actions):
        if not act.name.startswith('DM_Animation_'+tag+'_'):continue
        rig.animation_data.action=act;scene.frame_start=1;scene.frame_end=31;scene.frame_set(1)
        clip=act.name.split('_')[-1]
        export_fbx([root,rig],folder/(root.name+'@'+clip+'.fbx'),True)
        audit['animations'].append({'name':act.name,'fps':30,'frames':31,'file':root.name+'@'+clip+'.fbx'})
    rig.animation_data.action=oldaction;scene.frame_set(1);root.location=savedloc;root.rotation_euler=savedrot
    return root

for tag in ['AgentZero','MuseumGuard']:palette_character(tag)

specs=[('DM_Environment_Museum_MarbleFloor_A','Environment/Museum'),('DM_Environment_Museum_WallStraight_A','Environment/Museum'),('DM_Environment_Museum_WallCorner_A','Environment/Museum'),('DM_Environment_Museum_Pillar_A','Environment/Museum'),('DM_Environment_Museum_DoorFrame_A','Environment/Museum'),('DM_Prop_MuseumStatue_A','Props/Museum'),('DM_Prop_DisplayCase_Diamond_A','Props/Museum')]
for name,category in specs:
    source=bpy.data.objects[name];dest,ob=evaluated_copy(source,name+'_Delivery');folder=ART/category/'Production';folder.mkdir(parents=True,exist_ok=True)
    export_fbx(descendants(dest),folder/(name+'.fbx'))
    audit['models'].append({'name':name,'triangles':sum(tris(o) for o in dest.children),'materials':sum(len(o.data.materials) for o in dest.children),'format':'FBX'})
    for child in list(dest.children):bpy.data.objects.remove(child,do_unlink=True)
    bpy.data.objects.remove(dest,do_unlink=True)

room=bpy.data.objects['DM_Museum_TestRoom'];dest,ob=evaluated_copy(room,'DM_Museum_TestRoom')
folder=ART/'Environment'/'Museum'/'Production';folder.mkdir(parents=True,exist_ok=True)
export_fbx(descendants(dest),folder/'DM_Museum_TestRoom.fbx')
audit['models'].append({'name':'DM_Museum_TestRoom','triangles':sum(tris(o) for o in dest.children),'materials':sum(len(o.data.materials) for o in dest.children),'format':'FBX'})
for child in list(dest.children):bpy.data.objects.remove(child,do_unlink=True)
bpy.data.objects.remove(dest,do_unlink=True)

def pos(v):return [float(-v.x),float(v.z),float(-v.y)]
lights=[]
for o in bpy.data.objects:
    if o.type!='LIGHT':continue
    d=o.data;direction=o.rotation_euler.to_matrix()@Vector((0,0,-1))
    lights.append({'name':o.name,'type':d.type,'position':pos(o.location),'direction':pos(direction),'color':list(d.color),'power':d.energy,'spotAngle':math.degrees(d.spot_size) if d.type=='SPOT' else 0})
cam=scene.camera;direction=cam.rotation_euler.to_matrix()@Vector((0,0,-1))
characters=[]
for tag in ['AgentZero','MuseumGuard']:
    o=bpy.data.objects['DM_Character_'+tag];characters.append({'name':o.name,'position':pos(o.location),'yaw':-math.degrees(o.rotation_euler.z)})
metadata={'materials':materials,'lights':lights,'characters':characters,'camera':{'position':pos(cam.location),'direction':pos(direction),'orthographicSize':cam.data.ortho_scale*.5}}
(OUT/'DM_UnityScene.json').write_text(json.dumps(metadata,indent=2));(OUT/'DM_AssetSpecifications.json').write_text(json.dumps(audit,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'DM_Museum_Production_Optimized.blend'))
delivery=descendants(room)
for tag in ['AgentZero','MuseumGuard']:delivery+=descendants(bpy.data.objects['DM_Character_'+tag])
delivery += [o for o in bpy.data.objects if o.type in {'LIGHT','CAMERA'}]
select(delivery)
bpy.ops.export_scene.gltf(filepath=str(OUT/'DM_Museum_TestRoom.glb'),export_format='GLB',use_selection=True,export_animations=True,export_apply=True)
print('DM_EXPORT_COMPLETE '+json.dumps(audit))
