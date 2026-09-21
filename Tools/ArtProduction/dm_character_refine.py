import bpy, math
from mathutils import Vector
from math import sin,cos,pi
scene=bpy.context.scene
scene.frame_set(1)
for rig in [o for o in bpy.data.objects if o.type=='ARMATURE']:
    rig.data.pose_position='REST'
    for ob in list(bpy.data.objects):
        if ob.type=='MESH' and any(m.type=='ARMATURE' and m.object==rig for m in ob.modifiers):
            ob.parent=rig
for material in bpy.data.materials:
    if 'Wool' in material.name or 'Uniform' in material.name or 'Trousers' in material.name:
        p=material.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.82
        p.inputs['Specular IOR Level'].default_value=.22
for ob in list(bpy.data.objects):
    if 'SweptHairLock' in ob.name:
        bpy.data.objects.remove(ob,do_unlink=True)
    elif ob.type=='MESH' and 'MuseumGuard_SculptedHair' in ob.name:
        for v in ob.data.vertices:v.co.z=min(v.co.z,1.737)
    elif ob.type=='MESH' and 'MuseumGuard_Forearm' in ob.name:
        for v in ob.data.vertices:
            if v.co.z>1.16:v.co.z+=.032
            if v.co.z<1.07:v.co.z-=.017
    elif ob.type=='MESH' and any(k in ob.name for k in ['SuitSleeve','ShortSleeve']):
        for v in ob.data.vertices:
            if v.co.z>1.34:
                t=(v.co.z-1.34)/.10;v.co.x-=math.copysign(.026*t,v.co.x);v.co.z+=.009*t
    elif ob.type=='MESH' and 'Hand_' in ob.name:
        for v in ob.data.vertices:
            if v.co.z>.97:v.co.z+=.012

def fuse(names,newname,rig,mode):
    objs=[bpy.data.objects[n] for n in names]
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objs:
        bpy.context.view_layer.objects.active=ob
        for mod in list(ob.modifiers):
            if mod.type=='ARMATURE':ob.modifiers.remove(mod)
            else:bpy.ops.object.modifier_apply(modifier=mod.name)
        ob.select_set(True)
    bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=newname
    rem=ob.modifiers.new('Continuous tailored surface','REMESH');rem.mode='VOXEL';rem.voxel_size=.007;rem.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=rem.name)
    smooth=ob.modifiers.new('Surface relaxation','SMOOTH');smooth.factor=.45;smooth.iterations=3;bpy.ops.object.modifier_apply(modifier=smooth.name)
    dec=ob.modifiers.new('Mobile topology','DECIMATE');dec.ratio=.28;bpy.ops.object.modifier_apply(modifier=dec.name)
    for g in list(ob.vertex_groups):ob.vertex_groups.remove(g)
    groups={b.name:ob.vertex_groups.new(name=b.name) for b in rig.data.bones}
    for v in ob.data.vertices:
        x,y,z=v.co;side='L' if x>0 else 'R'
        if mode=='upper':
            armweight=max(0,min(1,(abs(x)-.17)/.055))
            elbow=max(0,min(1,(1.275-z)/.10))
            weights={'chest':1-armweight,'upper_arm.'+side:armweight*(1-elbow),'forearm.'+side:armweight*elbow}
        else:
            legweight=max(0,min(1,(.94-z)/.09));knee=max(0,min(1,(.61-z)/.14))
            weights={'hips':1-legweight,'thigh.'+side:legweight*(1-knee),'calf.'+side:legweight*knee}
        for name,w in weights.items():
            if w>0:groups[name].add([v.index],w,'REPLACE')
    mod=ob.modifiers.new('DM skeletal deformation','ARMATURE');mod.object=rig;ob.parent=rig;ob.select_set(False)
    return ob

for tag in ['AgentZero','MuseumGuard']:
    rig=bpy.data.objects['DM_Rig_'+tag]
    sleeve='ShortSleeve' if tag=='MuseumGuard' else 'SuitSleeve'
    fuse([tag+'_TailoredTorso',tag+'_'+sleeve+'_L',tag+'_'+sleeve+'_R'],tag+'_TailoredUniform',rig,'upper')
    # Bridge the pelvis before joining trousers; the crotch remains anatomically recessed.
    verts=[];faces=[];n=20
    for z,rx,ry in [(.845,.14,.063),(.87,.164,.083),(.92,.177,.09),(.973,.16,.086)]:
        for i in range(n):a=2*pi*i/n;verts.append((rx*cos(a),ry*sin(a),z))
    for j in range(3):
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    faces.extend([tuple(reversed(range(n))),tuple(3*n+i for i in range(n))])
    me=bpy.data.meshes.new(tag+'_HipBridge');me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(me.name,me);bpy.context.collection.objects.link(ob);ob.parent=rig
    me.materials.append(bpy.data.materials['DM_Material_Guard_Trousers' if tag=='MuseumGuard' else 'DM_Material_Agent_Wool'])
    fuse([tag+'_Trouser_L',tag+'_Trouser_R',ob.name],tag+'_TailoredTrousers',rig,'lower')

# Front hairline and side sweep are formed as one sculpted surface.
ob=bpy.data.objects['AgentZero_SculptedHair']
for v in ob.data.vertices:
    if v.co.y<0:
        v.co.z+=.012*(1-v.co.x/.10)
    if v.co.z<1.71 and v.co.y<.02:v.co.z=1.711

for rig in [o for o in bpy.data.objects if o.type=='ARMATURE']:rig.data.pose_position='POSE'
scene.frame_set(1)
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.013,.022,.044,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.3
scene.render.resolution_x=1000;scene.render.resolution_y=900
target=artifacts.file(name='DM_Characters_Refined.png',media_type='image/png')
scene.render.filepath=target.path;scene.render.image_settings.media_type='IMAGE';bpy.ops.render.render(write_still=True);target.publish()
result={'mesh_count':len([o for o in bpy.data.objects if o.type=='MESH']), 'revision_notes':'Continuous shoulders and trousers; reduced plastic specular; fixed cap hair intersection; armature parenting fixed'}
