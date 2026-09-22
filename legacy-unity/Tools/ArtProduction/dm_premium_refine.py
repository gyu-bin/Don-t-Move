"""Refine existing five families without changing rigs, pivots, clips or cameras.
Run once against DM_Museum_BeforeRefinement.blend, never against its own output.
"""
import bpy, math, os, numpy as np
from pathlib import Path
from mathutils import Vector
from math import sin, cos, pi
base=Path(os.environ['DM_PROJECT_ROOT'])
scene=bpy.context.scene
# Reuse measured mesh construction helpers, without executing scene creation.
code=(base/'Tools/ArtProduction/dm_museum_room.py').read_text()
exec(code[code.index('def mesh('):code.index('def marble_maps(')])
materials=bpy.data.materials
def m(name):return materials['DM_Material_'+name]
def finish(ob,parent,bone=None):
    ob.parent=parent
    if bone:
        g=ob.vertex_groups.new(name=bone);g.add(list(range(len(ob.data.vertices))),1,'REPLACE')
        mod=ob.modifiers.new('DM skeletal deformation','ARMATURE');mod.object=parent
    return ob
def line(name,pts,radius,material,parent,bone=None):
    return finish(path_tube(name,pts,[radius]*len(pts),material,10),parent,bone)
def shape(name,verts,faces,material,parent,bone=None):
    return finish(mesh(name,verts,faces,material,True),parent,bone)
def recolor(name,color,rough=None,metal=None):
    p=m(name).node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1)
    if rough is not None:p.inputs['Roughness'].default_value=rough
    if metal is not None:p.inputs['Metallic'].default_value=metal
recolor('Agent_Wool',(.009,.014,.021),.73)
recolor('Agent_Lapel',(.018,.025,.036),.48)
recolor('SmokedLens',(.001,.002,.003),.62,0)
recolor('Gunmetal',(.036,.048,.06),.38,.60)
recolor('BlackLeather',(.008,.012,.017),.55)
recolor('ChestnutHair',(.022,.009,.004),.78)
recolor('Guard_Uniform',(.028,.068,.145),.82)
recolor('Guard_Trousers',(.012,.026,.055),.72)
recolor('Museum_CarvedLimestone',(.25,.255,.24),.42)
recolor('Brass',(.55,.33,.11),.23,.82)

for tag in ['AgentZero','MuseumGuard']:
    rig=bpy.data.objects['DM_Rig_'+tag];rig.data.pose_position='REST'
    # Reduce elongated chin and sculpt cheek/jaw planes while retaining head weights.
    face=bpy.data.objects[tag+'_Face']
    bpy.context.view_layer.objects.active=face
    for mod in list(face.modifiers):
        if mod.type=='SUBSURF':mod.levels=2;bpy.ops.object.modifier_apply(modifier=mod.name)
    for v in face.data.vertices:
        x,y,z=v.co
        if z<1.65:
            v.co.x*=1-.05*math.exp(-((z-1.55)/.055)**2)
            v.co.z=z
        if y<-.025:
            v.co.y-=.008*math.exp(-((z-1.64)/.024)**2)*(abs(x)/.09)
            # Orbital recess, malar planes, philtrum and squared chin.
            front=max(0,min(1,(-y-.025)/.045))
            orbital=.006*math.exp(-((abs(x)-.044)/.024)**2-((z-1.679)/.017)**2)
            cheek=.006*math.exp(-((abs(x)-.052)/.026)**2-((z-1.635)/.022)**2)
            chin=.004*math.exp(-(x/.033)**2-((z-1.551)/.018)**2)
            v.co.y+=front*(orbital-cheek-chin)
    for ob in rig.children:
        if ob.type!='MESH':continue
        if '_Mouth' in ob.name:
            for v in ob.data.vertices:v.co.z+=.004-.002*(abs(v.co.x)/.03);v.co.y-=.012
        if tag=='AgentZero' and '_JacketLapel' in ob.name:
            for v in ob.data.vertices:v.co.x*=.77
        if tag=='AgentZero' and '_UtilityBelt' in ob.name:
            for v in ob.data.vertices:v.co.x*=.90;v.co.y*=.77
        if tag=='AgentZero' and '_BeltBuckle' in ob.name:
            for v in ob.data.vertices:v.co.y+=.035
        if '_GlassesRim' in ob.name or '_GlassesArm' in ob.name or '_GlassesBridge' in ob.name:
            ob.data.materials.clear();ob.data.materials.append(m('BlackLeather'))
        if '_Ear' in ob.name:
            for v in ob.data.vertices:v.co.x*=.95
        if '_TailoredUniform' in ob.name:
            for v in ob.data.vertices:
                x,y,z=v.co
                # Carved cloth creases at waist and sleeve bend; no bone edits.
                if abs(x)<.17 and .96<z<1.34:
                    v.co.x*=1-.085*math.exp(-((z-1.12)/.14)**2)
                    v.co.y+=.0015*sin(z*35+x*22)*math.exp(-((z-1.04)/.075)**2)
                if abs(x)>.24 and 1.12<z<1.31:
                    v.co.y+=.001*sin(z*55)*math.exp(-((z-1.23)/.05)**2)
        if '_TailoredTrousers' in ob.name:
            for v in ob.data.vertices:
                x,y,z=v.co
                v.co.y+=.0015*sin(z*45+x*18)*(math.exp(-((z-.51)/.045)**2)+math.exp(-((z-.18)/.04)**2))
    if tag=='AgentZero':
        # Raised dark shirt collar and fitted jacket replace the jumpsuit-like waist.
        verts=[];faces=[]
        for z in [1.478,1.505,1.522]:
            for i in range(32):
                a=2*pi*i/32;verts.append((.057*cos(a),.054*sin(a),z-.009*max(0,-sin(a))))
        for j in range(2):
            for i in range(32):faces.append((j*32+i,j*32+(i+1)%32,(j+1)*32+(i+1)%32,(j+1)*32+i))
        shape(tag+'_ShirtCollar',verts,faces,m('Agent_Shirt'),rig,'chest')
        # Replace helmet-like hair with a swept, ridged scalp surface.
        old=bpy.data.objects[tag+'_SculptedHair'];bpy.data.objects.remove(old,do_unlink=True)
        verts=[];faces=[];n=64;rows=18
        for j in range(rows):
            t=j/(rows-1)
            for i in range(n):
                a=2*pi*i/n;front=max(0,-sin(a))
                z0=1.712+.055*front+.005*cos(a*2)
                z=z0+(1.816-z0)*t
                radius=math.sqrt(max(0,1-t**2.8))
                ridge=.004*sin(a*12+t*5)*sin(t*pi)
                verts.append((-.017*t+(.103*radius+ridge)*cos(a),.023+(.091*radius+ridge)*sin(a),z+.008*sin(a+t*2)*sin(t*pi)))
        for j in range(rows-1):
            for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
        shape(tag+'_SculptedHair',verts,faces,m('ChestnutHair'),rig,'head')
        for s in [-1,1]:
            line(tag+'_Sideburn_'+str(s),[(s*.093,.0,1.729),(s*.091,-.02,1.701),(s*.088,-.02,1.683)],.007,m('ChestnutHair'),rig,'head')
            # Narrow tailored lapel edge, cuff straps and shoe toe caps.
            line(tag+'_LapelStitch_'+str(s),[(s*.046,-.072,1.47),(s*.121,-.096,1.405),(s*.087,-.111,1.334),(s*.019,-.10,1.15)],.0014,m('Agent_Lapel'),rig,'chest')
    for s in [-1,1]:
        side='L' if s>0 else 'R'
        # Brow planes and restrained lower lids, not painted dots.
        line(tag+'_LowerLid_'+side,[(s*.023,-.099,1.675),(s*.046,-.096,1.670),(s*.064,-.086,1.677)],.0025,m('WarmSkin'),rig,'head')
        line(tag+'_EarHelix_'+side,[(s*.100,.005,1.661),(s*.108,-.010,1.647),(s*.104,-.012,1.626)],.003,m('WarmSkin'),rig,'head')
        line(tag+'_ToeCap_'+side,[(s*.105-.059,-.110,.074),(s*.105,-.129,.092),(s*.105+.059,-.110,.074)],.0018,m('Gunmetal'),rig,'foot.'+side)
        for k in range(4):
            y=-.05+k*.012
            line(tag+'_ShoeLace_'+side+str(k),[(s*.105-.020,y,.121-k*.002),(s*.105,y+.003,.126-k*.002),(s*.105+.020,y,.121-k*.002)],.0015,m('Gunmetal'),rig,'foot.'+side)
        if tag=='AgentZero':
            for k in range(3):
                x=s*.339+(k-1)*.014
                line(tag+'_GloveSeam_'+side+str(k),[(x,-.032,.95),(x,-.033,.977),(x,-.027,1.0)],.0015,m('Gunmetal'),rig,'hand.'+side)
            line(tag+'_Cuff_'+side,[(s*.29,-.025,1.035),(s*.323,-.047,1.03),(s*.36,-.024,1.026)],.004,m('BlackLeather'),rig,'forearm.'+side)
    # Small professional earpiece/radio; part of existing skinned asset.
    if tag=='AgentZero':
        line(tag+'_CommsWire',[(.102,.005,1.66),(.107,.022,1.61),(.075,.022,1.56)],.0025,m('Gunmetal'),rig,'head')
    else:
        ob=solid(tag+'_Radio',(.123,-.105,1.355),(.038,.029,.058),m('BlackLeather'),.004);finish(ob,rig,'chest')
        line(tag+'_RadioCable',[(.13,-.1,1.38),(.16,-.07,1.43),(.19,-.02,1.445)],.002,m('Gunmetal'),rig,'chest')
    # Weld overlapping face, nose and ear surfaces; retain the original head bone.
    skinparts=[o for o in rig.children if o.type=='MESH' and (o.name==tag+'_Face' or o.name==tag+'_Nose' or o.name.startswith(tag+'_Ear'))]
    bpy.ops.object.select_all(action='DESELECT')
    for ob in skinparts:
        bpy.context.view_layer.objects.active=ob
        for mod in list(ob.modifiers):
            if mod.type=='ARMATURE':ob.modifiers.remove(mod)
            else:bpy.ops.object.modifier_apply(modifier=mod.name)
        ob.select_set(True)
    bpy.context.view_layer.objects.active=skinparts[0];bpy.ops.object.join();face=bpy.context.object;face.name=tag+'_Face'
    rem=face.modifiers.new('Continuous facial anatomy','REMESH');rem.mode='VOXEL';rem.voxel_size=.0015;rem.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=face.modifiers.new('Facial surface polish','SMOOTH');sm.factor=.25;sm.iterations=2;bpy.ops.object.modifier_apply(modifier=sm.name)
    dec=face.modifiers.new('Facial topology','DECIMATE');dec.ratio=.18;bpy.ops.object.modifier_apply(modifier=dec.name)
    for group in list(face.vertex_groups):face.vertex_groups.remove(group)
    g=face.vertex_groups.new(name='head');g.add(list(range(len(face.data.vertices))),1,'REPLACE')
    mod=face.modifiers.new('DM skeletal deformation','ARMATURE');mod.object=rig
    rig.data.pose_position='POSE'

# Add relief within the existing architectural module families.
gold=m('Brass');stone=m('Museum_CarvedLimestone');navy=m('Museum_LacquerNavy')
additions=[]
def detail(ob,parent):finish(ob,parent);additions.append((ob,parent));return ob
wall=bpy.data.objects['DM_Environment_Museum_WallStraight_A']
for x in np.linspace(-.9,.9,13):
    detail(solid('DM_Wall_CorniceDentil',(x,-.217,2.50),(.055,.075,.069),stone,.006),wall)
for z in [.28,.41]:detail(frame('DM_Wall_DadoPanel',1.71,.09,.012,.016,-.20,z,gold),wall)
pillar=bpy.data.objects['DM_Environment_Museum_Pillar_A']
for angle in [0,pi/2,pi,3*pi/2]:
    for x in [-.11,0,.11]:
        o=solid('DM_Pillar_CapitalDentil',(x,-.243,2.51),(.034,.045,.066),stone,.005);o.rotation_euler.z=angle;detail(o,pillar)
case=bpy.data.objects['DM_Prop_DisplayCase_Diamond_A']
for s in [-1,1]:
    detail(solid('DM_Display_CornerShoe',(s*.49,-.395,.84),(.044,.038,.084),gold,.009),case)
# Drapery now has dense varying folds; unify the shoulder ribbons with carved body.
statue=bpy.data.objects['DM_Prop_MuseumStatue_A']
body=bpy.data.objects['DM_Statue_CarvedDrapery'];body.modifiers['Sculpted folds'].levels=2
for v in body.data.vertices:
    x,y,z=v.co
    if z<1.45:
        a=math.atan2(y-.01,x-.03)
        # Break mechanically periodic flutes, imply the supporting knee.
        v.co.x+=.010*sin(a*5+z*10)*sin((z-.59)*pi)
        if y<0:v.co.y-=.025*math.exp(-((x-.095)/.095)**2-((z-1.0)/.21)**2)
for ob in bpy.data.objects:
    if ob.type=='MESH' and ob.name.startswith('DM_Statue_MantleFold'):
        for v in ob.data.vertices:v.co.y+=.017
for s in [-1,1]:
    detail(path_tube('DM_Statue_Eyelid',[(s*.052-.035,-.076,2.073),(s*.031-.035,-.085,2.066),(s*.014-.035,-.082,2.073)],[.003,.003,.002],m('Statue_Carrara')),statue)
detail(path_tube('DM_Statue_Lips',[(-.054,-.078,2.012),(-.035,-.086,2.009),(-.016,-.078,2.012)],[.003,.004,.003],m('Statue_Carrara')),statue)
for k in range(16):
    a=2*pi*k/16
    pts=[]
    for j in range(9):
        t=j/8;aa=a+.3*sin(t*pi)
        pts.append((-.035+(.076+.008*sin(t*pi))*cos(aa),-.006+.062*sin(aa),2.08+.070*sin(t*pi)))
    detail(path_tube('DM_Statue_HairCurls',pts,[.005]*9,m('Statue_Carrara'),8),statue)
# Connect the carved anatomy into a continuous marble surface.
for side,pts in [('Left',[(-.30,-.12,1.40),(-.305,-.133,1.375),(-.29,-.138,1.35)]),('Right',[(.07,-.21,1.76),(.07,-.21,1.79),(.065,-.213,1.815)])]:
    detail(path_tube('DM_Statue_Palm'+side,pts,[.033,.03,.018],m('Statue_Carrara')),statue)
sculpt=[o for o in statue.children if o.type=='MESH' and any(mat.name=='DM_Material_Statue_Carrara' for mat in o.data.materials) and 'Tablet' not in o.name]
# Remove copied source parts before rebuilding from the refined sculpture.
room_statue=bpy.data.objects['DM_Room_Statue']
for ob in list(room_statue.children):bpy.data.objects.remove(ob,do_unlink=True)
additions=[(o,p) for o,p in additions if p!=statue]
bpy.ops.object.select_all(action='DESELECT')
for ob in sculpt:
    bpy.context.view_layer.objects.active=ob
    for mod in list(ob.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    ob.select_set(True)
bpy.context.view_layer.objects.active=sculpt[0];bpy.ops.object.join();sculpture=bpy.context.object;sculpture.name='DM_Statue_ContinuousCarving'
rem=sculpture.modifiers.new('Unified carved marble','REMESH');rem.mode='VOXEL';rem.voxel_size=.0055;rem.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=rem.name)
sm=sculpture.modifiers.new('Carved surface finishing','SMOOTH');sm.factor=.35;sm.iterations=2;bpy.ops.object.modifier_apply(modifier=sm.name)
dec=sculpture.modifiers.new('Sculpt topology','DECIMATE');dec.ratio=.2;bpy.ops.object.modifier_apply(modifier=dec.name)
# Restore the existing marble UV convention after volumetric joining.
uv=sculpture.data.uv_layers.new(name='UVMap')
for poly in sculpture.data.polygons:
    for li in poly.loop_indices:
        co=sculpture.data.vertices[sculpture.data.loops[li].vertex_index].co;uv.data[li].uv=(co.x,co.z)
for ob in statue.children:
    copy=ob.copy();copy.data=ob.data;bpy.context.collection.objects.link(copy);copy.parent=room_statue

# Propagate extra details to the existing room instances, preserving all placements.
for ob,parent in additions:
    token={'DM_Environment_Museum_WallStraight_A':['DM_Room_Wall','DM_Room_LeftWall'],
           'DM_Environment_Museum_Pillar_A':['DM_Room_Pillar'],
           'DM_Prop_MuseumStatue_A':['DM_Room_Statue'],
           'DM_Prop_DisplayCase_Diamond_A':['DM_Room_DisplayCase']}[parent.name]
    for dst in list(bpy.data.objects):
        if dst.type=='EMPTY' and any(dst.name.startswith(t) for t in token):
            copy=ob.copy();copy.data=ob.data;bpy.context.collection.objects.link(copy);copy.parent=dst
    if parent==wall:
        corner=bpy.data.objects['DM_Environment_Museum_WallCorner_A']
        for a in [0,pi/2]:
            copy=ob.copy();copy.data=ob.data;bpy.context.collection.objects.link(copy);copy.parent=corner;copy.rotation_euler.z=a;copy.location=Vector((.85,0,0)) if a==0 else Vector((0,.85,0))

# Existing PBR texture slots, richer stone/inlay and roughness variation.
for prefix,basecolor in [('DM_Texture_Marble',(.36,.37,.40)),('DM_Texture_Statue',(.66,.64,.58))]:
    im=bpy.data.images[prefix+'_BaseColor'];size=im.size[0]
    y,x=np.mgrid[0:1:complex(size),0:1:complex(size)]
    warp=x*.9+y*.37+.032*np.sin(y*24)+.009*np.sin(y*65+x*14)
    vein=np.exp(-(np.sin(warp*pi*4)/.043)**2)
    cloud=.018*np.sin(x*17+y*14)+.009*np.sin(x*36-y*21)
    rgb=np.asarray(basecolor)[None,None,:]+cloud[:,:,None]-vein[:,:,None]*.085
    rough=.27+cloud+vein*.10
    if 'Marble' in prefix:
        # Octagonal field with small corner diamonds, an inlaid stone pattern.
        u=np.minimum(x,1-x);v=np.minimum(y,1-y)
        edge=(u<.024)|(v<.024);corner=(u+v)<.15
        rgb[edge|corner]=(.060,.078,.105)
        border=((u+v)>.148)&((u+v)<.156)
        rgb[border]=(.46,.34,.17);rough[edge|corner]=.22
    else:rough=.40+cloud+vein*.035
    rgba=np.ones((size,size,4),np.float32);rgba[:,:,:3]=np.clip(rgb,0,1);im.pixels.foreach_set(rgba.ravel());im.pack()
    im=bpy.data.images[prefix+'_Roughness'];rgba[:,:,:3]=rough[:,:,None];im.pixels.foreach_set(rgba.ravel());im.pack()
    gy,gx=np.gradient(vein*.003+cloud*.004);normal=np.stack([-gx*12,-gy*12,np.ones_like(x)],axis=-1);normal/=np.linalg.norm(normal,axis=-1)[:,:,None]
    im=bpy.data.images[prefix+'_Normal'];rgba[:,:,:3]=normal*.5+.5;im.pixels.foreach_set(rgba.ravel());im.pack()
for name in materials.keys():
    if name.startswith('DM_Material_Diamond_Facet'):
        p=materials[name].node_tree.nodes['Principled BSDF'];p.inputs['Emission Strength'].default_value=2.2;p.inputs['Roughness'].default_value=.08
p=m('Display_Glass').node_tree.nodes['Principled BSDF'];p.inputs['Alpha'].default_value=.13;p.inputs['Roughness'].default_value=.055
for ob in bpy.data.objects:
    if ob.type!='LIGHT':continue
    d=ob.data
    if 'MoonFill' in ob.name:
        d.energy=.24;d.color=(.24,.38,.72);ob.location=(3,-4,7);ob.rotation_euler=(-ob.location).to_track_quat('-Z','Y').to_euler()
    elif 'StatueExhibit' in ob.name:d.energy=820;d.spot_size=math.radians(43);d.spot_blend=.65
    elif 'DiamondExhibit' in ob.name:d.energy=780;d.spot_size=math.radians(45);d.spot_blend=.6
    elif 'Path' in ob.name:d.energy=340;d.spot_size=math.radians(54)
    elif 'DiamondCyan' in ob.name:d.energy=45
    elif 'WallPractical' in ob.name:d.energy=70
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.15
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(base/'ArtProduction/Exports/DM_Museum_Production.blend'))
exec((base/'Tools/ArtProduction/dm_export_unity.py').read_text())
