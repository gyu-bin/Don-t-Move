import bpy, math, numpy as np
from mathutils import Vector
from math import sin, cos, pi
scene=bpy.context.scene

def material(name,c,rough=.5,metal=0,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if emission:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emission
    return m

def mesh(name,v,f,m,smooth=False):
    me=bpy.data.meshes.new(name+'_Mesh');me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(m)
    for p in me.polygons:p.use_smooth=smooth
    uv=me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        axis=max(range(3),key=lambda i:abs(p.normal[i]))
        for i in p.loop_indices:
            co=me.vertices[me.loops[i].vertex_index].co
            uv.data[i].uv=(co.x,co.y) if axis==2 else ((co.x,co.z) if axis==1 else (co.y,co.z))
    return o

def bevel(o,w=.012,segments=3):
    b=o.modifiers.new('Crafted edge profiles','BEVEL');b.width=w;b.segments=segments
    b=o.modifiers.new('Weighted architectural normals','WEIGHTED_NORMAL');b.keep_sharp=True
    return o

def solid(name,c,s,m,w=.012):
    x,y,z=c;a,b,d=[i*.5 for i in s]
    v=[(x+sx*a,y+sy*b,z+sz*d) for sz in [-1,1] for sy in [-1,1] for sx in [-1,1]]
    f=[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]
    return bevel(mesh(name,v,f,m),w)

def root(name):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);return o

def profile(name,layers,m,shape='square',n=32):
    v=[]
    for z,a,b in layers:
        for i in range(n):
            t=2*pi*i/n
            if shape=='square':
                rx=math.copysign(abs(cos(t))**.25,cos(t));ry=math.copysign(abs(sin(t))**.25,sin(t))
            else:rx=cos(t);ry=sin(t)
            v.append((a*rx,b*ry,z))
    f=[]
    for j in range(len(layers)-1):
        for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    f.extend([tuple(reversed(range(n))),tuple((len(layers)-1)*n+i for i in range(n))])
    return bevel(mesh(name,v,f,m),.004,2)

def frame(name,width,height,thick,depth,y,z,m):
    # Closed extruded rectangular moulding, with a true opening.
    v=[]
    for yy in [y-depth/2,y+depth/2]:
        for w,h in [(width,height),(width-2*thick,height-2*thick)]:
            v +=[(-w/2,yy,z-h/2),(w/2,yy,z-h/2),(w/2,yy,z+h/2),(-w/2,yy,z+h/2)]
    f=[]
    for i in range(4):
        j=(i+1)%4;f.extend([(i,j,4+j,4+i),(8+i,12+i,12+j,8+j),(i,8+i,8+j,j),(4+i,4+j,12+j,12+i)])
    return bevel(mesh(name,v,f,m),min(.007,thick*.25),3)

def path_tube(name,points,radii,m,n=12):
    v=[]
    for j,p in enumerate(points):
        tangent=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)])
        tangent.normalize();axis=tangent.cross(Vector((0,1,0))).normalized();other=tangent.cross(axis).normalized()
        for i in range(n):
            co=Vector(p)+radii[j]*(cos(i*2*pi/n)*axis+sin(i*2*pi/n)*other);v.append(tuple(co))
    f=[]
    for j in range(len(points)-1):
        for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    f +=[tuple(reversed(range(n))),tuple((len(points)-1)*n+i for i in range(n))]
    o=mesh(name,v,f,m,True);su=o.modifiers.new('Sculpted contours','SUBSURF');su.levels=1;return o

def marble_maps(m,name,base,size=512):
    yy,xx=np.mgrid[0:1:complex(size),0:1:complex(size)]
    warp=.18*np.sin(2*pi*(xx*1.8+yy*1.3))+.09*np.sin(2*pi*(xx*4.4-yy*2.1))+.027*np.sin(2*pi*(xx*12+yy*7))
    veins=np.abs(np.sin(2*pi*(xx*1.4+yy*1.1+warp)))
    vein=np.exp(-veins*45)*.20+np.exp(-veins*8)*.035
    cloud=.025*np.sin(2*pi*(xx*2.7-yy*2))+.018*np.sin(2*pi*(xx*7+yy*4))
    rgb=np.clip(np.asarray(base)[None,None,:]+cloud[:,:,None]-vein[:,:,None],0,1)
    def img(label,data,noncolor=False):
        im=bpy.data.images.new(name+'_'+label,width=size,height=size,alpha=True)
        if noncolor:im.colorspace_settings.name='Non-Color'
        rgba=np.ones((size,size,4),dtype=np.float32)
        if data.ndim==2:rgba[:,:,:3]=data[:,:,None]
        else:rgba[:,:,:3]=data
        im.pixels.foreach_set(rgba.ravel());im.pack();return im
    baseim=img('BaseColor',rgb)
    rough=img('Roughness',np.clip(.26+vein*.3+cloud,.19,.42),True)
    dx,dy=np.gradient(vein*.06)
    norm=np.stack([-dy*20,-dx*20,np.ones_like(dx)],-1);norm/=np.linalg.norm(norm,axis=-1)[:,:,None]
    normal=img('Normal',norm*.5+.5,True)
    nt=m.node_tree;p=nt.nodes.get('Principled BSDF')
    for image,label in [(baseim,'Base Color'),(rough,'Roughness')]:
        t=nt.nodes.new('ShaderNodeTexImage');t.image=image;nt.links.new(t.outputs['Color'],p.inputs[label])
    t=nt.nodes.new('ShaderNodeTexImage');t.image=normal;n=nt.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.3;nt.links.new(t.outputs['Color'],n.inputs['Color']);nt.links.new(n.outputs['Normal'],p.inputs['Normal'])

navy=material('DM_Material_Museum_LacquerNavy',(.021,.032,.050),.34)
panel=material('DM_Material_Museum_DeepPanels',(.012,.021,.034),.58)
gold=bpy.data.materials['DM_Material_Brass']
stone=material('DM_Material_Museum_CarvedLimestone',(.42,.405,.34),.48)
marble=material('DM_Material_Museum_FloorMarble',(.34,.35,.36),.26)
marble_maps(marble,'DM_Texture_Marble',(.36,.355,.35))
statue_mat=material('DM_Material_Statue_Carrara',(.64,.60,.50),.45)
marble_maps(statue_mat,'DM_Texture_Statue',(.66,.63,.55),512)
dark=material('DM_Material_Display_Obsidian',(.012,.019,.026),.22,.2)
velvet=material('DM_Material_Display_Velvet',(.013,.04,.061),.9)
lamp=material('DM_Material_Architecture_WarmGlass',(1,.50,.14),.3,0,4)
glass=material('DM_Material_Display_Glass',(.58,.81,.90),.08)
p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=.94;p.inputs['IOR'].default_value=1.46;p.inputs['Alpha'].default_value=.13
glass.surface_render_method='DITHERED'
gem_mats=[]
for i,c in enumerate([(.018,.28,.72),(.04,.58,.95),(.12,.80,1),(.012,.12,.36),(.37,.85,.98)]):gem_mats.append(material('DM_Material_Diamond_Facet'+str(i),c,.11,.3,.24))

kit=root('DM_Environment_Museum_ArchitectureTestKit')
floor=root('DM_Environment_Museum_MarbleFloor_A')
floor.parent=kit
tile=solid('DM_Floor_MarbleSlab',(0,0,-.045),(.992,.992,.09),marble,.008);tile.parent=floor
# Diamond corner inlays and a very thin brass outline frame each modular slab.
for x in [-.486,.486]:
    for y in [-.486,.486]:
        v=[(x-.043,y,.003),(x,y-.043,.003),(x+.043,y,.003),(x,y+.043,.003)]
        o=mesh('DM_Floor_BrassInlay',v,[(0,1,2,3)],gold);o.parent=floor
for x in [-.486,.486]:solid('DM_Floor_EdgeInlay',(x,0,.001),(.003,.94,.002),gold,.0005).parent=floor
for y in [-.486,.486]:solid('DM_Floor_EdgeInlay',(0,y,.001),(.94,.003,.002),gold,.0005).parent=floor

wall=root('DM_Environment_Museum_WallStraight_A');wall.parent=kit
for o in [solid('DM_Wall_Structure',(0,.02,1.40),(2,.32,2.8),navy,.016),solid('DM_Wall_Recess',(0,-.151,1.48),(1.67,.025,1.66),panel,.009),frame('DM_Wall_OuterMoulding',1.76,1.83,.055,.05,-.176,1.48,stone),frame('DM_Wall_GoldFillet',1.62,1.68,.009,.012,-.206,1.48,gold)]:o.parent=wall
for z,h,depth,m in [( .07,.14,.41,stone),(.185,.045,.39,stone),(.222,.018,.40,gold),(.50,.14,.34,navy),(.59,.026,.39,stone),(2.44,.04,.36,gold),(2.53,.12,.40,stone),(2.64,.1,.44,navy),(2.72,.06,.49,stone),(2.78,.06,.53,navy)]:solid('DM_Wall_ProfileTrim',(0,-.025,z),(2,depth,h),m,.008).parent=wall

pillar=root('DM_Environment_Museum_Pillar_A');pillar.parent=kit
o=profile('DM_Pillar_Plinth',[(0,.27,.27),(.07,.27,.27),(.08,.24,.24),(.15,.24,.24),(.20,.20,.20),(.25,.185,.185)],stone);o.parent=pillar
o=profile('DM_Pillar_Capital',[(2.37,.185,.185),(2.43,.22,.22),(2.47,.24,.24),(2.53,.24,.24),(2.56,.28,.28),(2.65,.28,.28),(2.68,.30,.30),(2.76,.30,.30)],stone);o.parent=pillar
solid('DM_Pillar_Shaft',(0,0,1.31),(.36,.36,2.14),navy,.013).parent=pillar
for ang in [0,pi/2,pi,3*pi/2]:
    o=frame('DM_Pillar_RecessMoulding',.275,1.83,.025,.018,-.185,1.31,stone)
    o.rotation_euler.z=ang;o.parent=pillar
    for x in [-.075,0,.075]:
        o=solid('DM_Pillar_Flute',(x,-.193,1.30),(.009,.013,1.65),gold,.003);o.rotation_euler.z=ang;o.parent=pillar
for z in [.26,2.39]:profile('DM_Pillar_GoldCollar',[(z,.199,.199),(z+.018,.199,.199)],gold).parent=pillar

door=root('DM_Environment_Museum_DoorFrame_A');door.parent=kit
for x in [-.77,.77]:
    solid('DM_Door_Jamb',(x,0,1.13),(.27,.42,2.26),stone,.014).parent=door
    solid('DM_Door_Recess',(x,-.219,1.2),(.14,.018,1.83),navy,.007).parent=door
    solid('DM_Door_GoldLine',(x,-.232,1.2),(.022,.014,1.78),gold,.004).parent=door
    solid('DM_Door_Foot',(x,0,.12),(.34,.48,.24),stone,.015).parent=door
for z,h,w,d,m in [(2.28,.18,1.81,.43,stone),(2.405,.07,1.91,.49,gold),(2.48,.10,2,.54,stone),(2.58,.1,2.06,.58,navy)]:solid('DM_Door_Cornice',(0,0,z),(w,d,h),m,.012).parent=door
corner=root('DM_Environment_Museum_WallCorner_A');corner.parent=kit
for a in [0,pi/2]:
    for source in wall.children:
        ob=source.copy();ob.data=source.data;bpy.context.collection.objects.link(ob);ob.parent=corner;ob.rotation_euler.z=a
        ob.location=Vector((.85,0,0)) if a==0 else Vector((0,.85,0))

case=root('DM_Prop_DisplayCase_Diamond_A')
profile('DM_Display_MouldedFoot',[(0,.59,.49),(.08,.59,.49),(.10,.55,.45),(.15,.53,.43)],dark).parent=case
profile('DM_Display_BrassFoot',[(.145,.545,.445),(.17,.545,.445)],gold).parent=case
profile('DM_Display_Pedestal',[(.17,.50,.40),(.21,.50,.40),(.68,.46,.36),(.73,.51,.41),(.78,.54,.44)],dark).parent=case
for s in [-1,1]:
    o=frame('DM_Display_PedestalInlay',.83,.36,.012,.008,s*.399,.44,gold);o.parent=case
profile('DM_Display_Crown',[(.775,.555,.455),(.81,.555,.455),(.83,.53,.43)],gold).parent=case
solid('DM_Display_VelvetTray',(0,0,.834),(.97,.77,.025),velvet,.02).parent=case
for x in [-.513,.513]:
    for y in [-.413,.413]:solid('DM_Display_ThinMullion',(x,y,1.20),(.027,.027,.75),gold,.004).parent=case
for z in [.85,1.57]:
    for x in [-.517,.517]:solid('DM_Display_Perimeter',(x,0,z),(.026,.852,.028),gold,.004).parent=case
    for y in [-.417,.417]:solid('DM_Display_Perimeter',(0,y,z),(1.06,.026,.028),gold,.004).parent=case
for y in [-.412,.412]:solid('DM_Display_GlassPane',(0,y,1.21),(1.0,.005,.70),glass,.001).parent=case
for x in [-.512,.512]:solid('DM_Display_GlassPane',(x,0,1.21),(.005,.80,.70),glass,.001).parent=case
solid('DM_Display_GlassRoof',(0,0,1.555),(1.0,.80,.005),glass,.001).parent=case
profile('DM_Diamond_VelvetMount',[(.849,.22,.17),(.90,.20,.15),(.94,.13,.10)],velvet).parent=case
v=[]
for z,r,offset in [(1.005,.015,0),(1.23,.255,0),(1.255,.255,0),(1.39,.136,pi/8)]:
    for i in range(8):a=i*pi/4+offset;v.append((r*cos(a),r*sin(a),z))
f=[]
for j in range(3):
    for i in range(8):
        a=j*8+i;b=j*8+(i+1)%8;c=(j+1)*8+(i+1)%8;d=(j+1)*8+i
        f.extend([(a,b,c),(a,c,d)])
f +=[tuple(range(24,32))]
gem=mesh('DM_Item_BlueDiamond',v,f,gem_mats[0]);gem.parent=case
for m in gem_mats[1:]:gem.data.materials.append(m)
for i,p in enumerate(gem.data.polygons):p.material_index=(i*3+i//8)%5
for s in [-1,1]:path_tube('DM_Diamond_Claw',[(s*.12,0,.91),(s*.12,0,1.06),(s*.16,0,1.08)],[.016,.01,.006],gold).parent=case

statue=root('DM_Prop_MuseumStatue_A')
profile('DM_Statue_Pedestal',[(0,.43,.40),(.08,.43,.40),(.10,.40,.37),(.16,.37,.34),(.44,.34,.31),(.49,.39,.36),(.55,.41,.38),(.58,.40,.37)],stone).parent=statue
for z in [.12,.49]:profile('DM_Statue_PedestalFillet',[(z,.397,.367),(z+.012,.397,.367)],gold).parent=statue
# Contrapposto drapery, with uneven hem, compressed folds at the hip, and a diagonally wrapped mantle.
levels=[(.59,.27,.18,-.035),(.63,.285,.19,-.03),(.80,.245,.175,-.01),(1.02,.205,.16,.035),(1.22,.18,.148,.06),(1.40,.205,.15,.065),(1.51,.165,.128,.03),(1.64,.178,.145,.015),(1.78,.24,.138,0),(1.84,.19,.12,0),(1.88,.076,.065,-.01)]
v=[];n=64
for j,(z,rx,ry,cx) in enumerate(levels):
    for i in range(n):
        a=2*pi*i/n
        fold=(.014+.014*(1-min(1,(z-.6)/1.2)))*cos(12*a+z*3)+.006*cos(23*a-z*4)
        hem=.008*sin(a*9) if j<2 else 0
        v.append((cx+(rx+fold)*cos(a),(.01+(ry+fold)*sin(a)),z+hem))
f=[]
for j in range(len(levels)-1):
    for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
f+=[tuple(reversed(range(n))),tuple((len(levels)-1)*n+i for i in range(n))]
o=mesh('DM_Statue_CarvedDrapery',v,f,statue_mat,True);o.parent=statue
su=o.modifiers.new('Sculpted folds','SUBSURF');su.levels=1
for k in range(5):
    z=1.37+k*.067
    path_tube('DM_Statue_MantleFold',[(-.16,-.09,z+.20),(-.10,-.151,z+.11),(.04,-.154,z),(.17,-.09,z-.07)],[.017,.017,.014,.008],statue_mat).parent=statue
path_tube('DM_Statue_Neck',[(-.01,0,1.85),(-.02,0,1.95),(-.03,-.006,1.99)],[.059,.052,.063],statue_mat).parent=statue
# Classical head with defined jaw, cheeks, nose and brow.
head_levels=[(1.956,.027,.032),(1.975,.047,.049),(2.01,.07,.059),(2.05,.081,.069),(2.10,.079,.066),(2.14,.065,.056),(2.16,.032,.031)]
v=[]
for z,rx,ry in head_levels:
    for i in range(24):a=i*pi/12;v.append((-.035+rx*cos(a),-.017+ry*sin(a),z))
f=[]
for j in range(len(head_levels)-1):
    for i in range(24):f.append((j*24+i,j*24+(i+1)%24,(j+1)*24+(i+1)%24,(j+1)*24+i))
f +=[tuple(reversed(range(24))),tuple((len(head_levels)-1)*24+i for i in range(24))]
o=mesh('DM_Statue_ClassicalFace',v,f,statue_mat,True);o.parent=statue;su=o.modifiers.new('Soft carved anatomy','SUBSURF');su.levels=1
path_tube('DM_Statue_Nose',[(-.035,-.074,2.09),(-.035,-.096,2.042),(-.035,-.086,2.027)],[.01,.016,.014],statue_mat).parent=statue
for s in [-1,1]:path_tube('DM_Statue_Brow',[(s*.047-.035,-.071,2.087),(s*.026-.035,-.083,2.092),(s*.010-.035,-.08,2.087)],[.008,.007,.005],statue_mat).parent=statue
for i in range(9):
    x=-.10+i*.016
    path_tube('DM_Statue_CarvedHair',[(x,-.062,2.105),(x-.012,-.018,2.168),(x-.004,.051,2.13),(x+.01,.047,2.04)],[.012,.015,.016,.009],statue_mat).parent=statue
path_tube('DM_Statue_RightArm',[(.18,.005,1.80),(.26,-.005,1.65),(.24,-.115,1.56),(.145,-.21,1.66),(.07,-.21,1.76)],[.073,.061,.052,.04,.035],statue_mat).parent=statue
path_tube('DM_Statue_LeftArm',[(-.18,.007,1.80),(-.245,0,1.62),(-.25,-.03,1.47),(-.30,-.12,1.38)],[.072,.063,.049,.035],statue_mat).parent=statue
for s in [-1,1]:
    for j in range(4):
        if s>0:pts=[(.07+j*.012,-.21,1.77),(.05+j*.012,-.218,1.80),(.04+j*.012,-.211,1.82)]
        else:pts=[(-.31+j*.012,-.12,1.39),(-.325+j*.012,-.143,1.36),(-.32+j*.012,-.15,1.34)]
        path_tube('DM_Statue_Fingers',pts,[.008,.007,.005],statue_mat,8).parent=statue
tablet=solid('DM_Statue_Tablet',(-.30,-.10,1.28),(.18,.058,.31),statue_mat,.014);tablet.rotation_euler.y=-.12;tablet.parent=statue

# Assemble a single 7 x 6 metre museum test room from only the five requested asset families.
room=root('DM_Museum_TestRoom')
def instance(source,name,loc,angle=0):
    r=root(name);r.parent=room;r.location=loc;r.rotation_euler.z=angle
    for child in source.children:
        o=child.copy();o.data=child.data;bpy.context.collection.objects.link(o);o.parent=r
    return r
for x in range(7):
    for y in range(6):instance(floor,'DM_Room_Floor_%d_%d'%(x,y),(x-3,y-2.5,0))
for x in [-2.5,2.5]:instance(wall,'DM_Room_Wall',(x,3,0))
instance(door,'DM_Room_DoorFrame',(0,3,0))
for y in [-2,-0,2]:instance(wall,'DM_Room_LeftWall',(-3.5,y,0),-pi/2)
for x,y in [(-3.5,3),(-1.1,3),(1.1,3),(3.5,3),(-3.5,-3)]:instance(pillar,'DM_Room_Pillar',(x,y,0))
instance(statue,'DM_Room_Statue',(-1.5,1.2,0),-.15)
instance(case,'DM_Room_DisplayCase',(1.15,.85,0),.10)
solid('DM_Room_Foundation',(0,0,-.21),(7.25,6.24,.32),navy,.075).parent=room
for source in [kit,case,statue]:
    # Source assets stay editable in separate collections and are excluded from the presentation.
    source.location=(20,0,0)
for source in [floor,wall,pillar,corner,door]:source.hide_render=True
bpy.data.objects['DM_Character_AgentZero'].location=(-1.35,-1.5,0)
bpy.data.objects['DM_Character_AgentZero'].rotation_euler.z=-.25
bpy.data.objects['DM_Character_MuseumGuard'].location=(1.6,-1.1,0)
bpy.data.objects['DM_Character_MuseumGuard'].rotation_euler.z=.65
for o in list(bpy.data.objects):
    if o.type=='LIGHT':bpy.data.objects.remove(o,do_unlink=True)
def light(name,kind,loc,color,power,target=(0,0,0),size=65):
    d=bpy.data.lights.new(name,kind);d.energy=power;d.color=color
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    if kind=='SPOT':d.spot_size=math.radians(size);d.spot_blend=.55;d.shadow_soft_size=.25
    return o
light('DM_Light_StatueExhibit','SPOT',(-1.7,.2,3.6),(1,.71,.40),650,(-1.5,1.2,.6),57)
light('DM_Light_DiamondExhibit','SPOT',(1.3,.25,3.7),(1,.72,.42),650,(1.15,.85,.8),54)
light('DM_Light_AgentPath','SPOT',(-1.8,-2.7,3.5),(1,.72,.43),450,(-1.35,-1.5,.5),63)
light('DM_Light_GuardPath','SPOT',(3,-1.4,3.4),(1,.68,.38),450,(1.6,-1.1,.6),65)
light('DM_Light_DiamondCyan','POINT',(1.15,.85,1.28),(.08,.6,1),9)
light('DM_Light_MoonFill','SUN',(0,0,8),(.32,.46,.80),.32,(0,1,0))
# Practical fixtures are part of the wall kit's test-room presentation.
for x in [-2.5,2.5]:
    solid('DM_Wall_PracticalBackplate',(x,2.76,1.80),(.16,.07,.44),gold,.025).parent=room
    o=profile('DM_Wall_PracticalGlow',[(1.61,.065,.065),(1.66,.075,.075),(1.93,.075,.075),(1.98,.065,.065)],lamp,'round',16);o.location=(x,2.64,0);o.parent=room
    for z in [1.64,1.96]:
        o=profile('DM_Wall_PracticalCrown',[(z,.088,.088),(z+.038,.088,.088)],gold,'round',16);o.location=(x,2.64,0);o.parent=room
    light('DM_Light_WallPractical','POINT',(x,2.46,1.80),(1,.49,.19),42)
cam=scene.camera;cam.name='DM_Camera_Gameplay_Orthographic';cam.location=(8.5,-11,11)
cam.rotation_euler=(Vector((0,.2,.65))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=10.3
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.014,.024,.048,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.22
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=.25
scene.frame_set(1)
target=artifacts.file(name='DM_Museum_TestRoom_FirstReview.png',media_type='image/png');scene.render.filepath=target.path;scene.render.image_settings.media_type='IMAGE';bpy.ops.render.render(write_still=True);target.publish()
result={'requested_asset_families':5,'floor_module_m':1,'wall_module_m':2,'door_opening_m':1.27,'textures':[{'name':i.name,'size':list(i.size)} for i in bpy.data.images if i.name.startswith('DM_')],'scene_objects':len(bpy.data.objects)}
