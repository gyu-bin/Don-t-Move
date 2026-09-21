import bpy, math, numpy as np
from mathutils import Vector
scene=bpy.context.scene
for o in bpy.data.objects:
    if o.name.startswith('DM_Room_LeftWall'):o.rotation_euler.z=math.pi/2
for rig in [o for o in bpy.data.objects if o.type=='ARMATURE']:
    for ob in rig.children:
        if ob.type!='MESH':continue
        group=ob.vertex_groups.get('head')
        if group:
            for v in ob.data.vertices:
                if any(g.group==group.index and g.weight>.9 for g in v.groups):
                    v.co.x*=1.13;v.co.y*=1.13;v.co.z=1.52+(v.co.z-1.52)*1.13
    root=rig.parent
    if 'AgentZero' in root.name:root.scale=(.975,.975,.975)
    else:root.scale=(.97,.97,.97)
for ob in bpy.data.objects:
    if ob.type!='MESH':continue
    if ob.name.startswith('MuseumGuard_CapCrown'):
        for v in ob.data.vertices:v.co.z-=.021
    elif ob.name.startswith('MuseumGuard_CapBadge'):
        for v in ob.data.vertices:v.co.y+=.025;v.co.z-=.012
    elif ob.name.startswith('MuseumGuard_CapBand'):
        for v in ob.data.vertices:
            if v.co.z>1.76:v.co.z+=.022
    elif ob.name.endswith('_Nose'):
        for v in ob.data.vertices:
            if v.co.y<-.095:v.co.y=-.095+(v.co.y+.095)*.55
glass=bpy.data.materials['DM_Material_Display_Glass'];glass.surface_render_method='BLENDED'
p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=0;p.inputs['Alpha'].default_value=.075;p.inputs['Roughness'].default_value=.09
for m in bpy.data.materials:
    if m.name.startswith('DM_Material_Diamond_Facet'):
        p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Strength'].default_value=.8
# Sparse, narrow mineral veins in smooth marble instead of high contrast cellular noise.
for prefix,base,rough in [('DM_Texture_Marble',(.39,.395,.405),.27),('DM_Texture_Statue',(.67,.65,.60),.44)]:
    im=bpy.data.images[prefix+'_BaseColor'];size=im.size[0]
    y,x=np.mgrid[0:1:complex(size),0:1:complex(size)]
    phase=x*.84+y*.39+.036*np.sin(y*19)+.012*np.sin(y*49+x*8)
    vein=np.exp(-(np.sin(phase*math.pi*3)/.022)**2)
    fine=np.exp(-(np.sin((phase+.027*np.sin(y*32))*math.pi*3)/.010)**2)
    cloud=.008*np.sin(x*13+y*8)+.006*np.sin(x*21-y*6)
    rgb=np.asarray(base)[None,None,:]+cloud[:,:,None]+vein[:,:,None]*.043-fine[:,:,None]*.025
    rgba=np.ones((size,size,4),np.float32);rgba[:,:,:3]=np.clip(rgb,0,1);im.pixels.foreach_set(rgba.ravel());im.pack()
    im=bpy.data.images[prefix+'_Roughness'];rgba[:,:,:3]=(rough+cloud+vein*.035)[:,:,None];im.pixels.foreach_set(rgba.ravel());im.pack()
    im=bpy.data.images[prefix+'_Normal'];rgba[:,:,0]=.5;rgba[:,:,1]=.5;rgba[:,:,2]=1;im.pixels.foreach_set(rgba.ravel());im.pack()
scene.eevee.taa_render_samples=96
scene.render.resolution_x=1400;scene.render.resolution_y=1100
scene.view_settings.view_transform='AgX'
target=artifacts.file(name='DM_Museum_TestRoom_Refined.png',media_type='image/png');scene.render.filepath=target.path;scene.render.image_settings.media_type='IMAGE';bpy.ops.render.render(write_still=True);target.publish()
result={'notes':'Reoriented wall faces, refined marble, clear glass, readable head proportions, cyan focal diamond','asset_families':5}
