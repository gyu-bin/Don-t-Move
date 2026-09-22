import bpy, math
from mathutils import Vector
from math import sin, cos, pi

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1200
scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.media_type='IMAGE'
scene.render.fps=30
scene.frame_start=1
scene.frame_end=31
if scene.world is None: scene.world=bpy.data.worlds.new('DM_World_Navy')
scene.world.color=(.012,.02,.038)

def mat(name, color, rough=.5, metal=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    return m
M={
 'suit':mat('DM_Material_Agent_Wool',(.022,.029,.039),.62),
 'lapel':mat('DM_Material_Agent_Lapel',(.042,.054,.068),.36),
 'shirt':mat('DM_Material_Agent_Shirt',(.008,.016,.024),.7),
 'leather':mat('DM_Material_BlackLeather',(.015,.020,.026),.3),
 'skin':mat('DM_Material_WarmSkin',(.47,.285,.18),.58),
 'hair':mat('DM_Material_ChestnutHair',(.058,.027,.013),.65),
 'hairlight':mat('DM_Material_HairRidges',(.095,.045,.022),.7),
 'lens':mat('DM_Material_SmokedLens',(.003,.009,.017),.13,.25),
 'metal':mat('DM_Material_Gunmetal',(.09,.12,.15),.27,.75),
 'gold':mat('DM_Material_Brass',(.48,.30,.105),.27,.8),
 'navy':mat('DM_Material_Guard_Trousers',(.018,.035,.069),.62),
 'blue':mat('DM_Material_Guard_Uniform',(.085,.16,.29),.65),
 'seam':mat('DM_Material_UniformSeams',(.038,.075,.145),.62),
 'eye':mat('DM_Material_Eye',(.012,.015,.019),.24),
}

def mesh(name,verts,faces,material,smooth=True,sub=0):
    me=bpy.data.meshes.new(name+'_Mesh');me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    for p in me.polygons:p.use_smooth=smooth
    if sub:
        mod=ob.modifiers.new('Silhouette refinement','SUBSURF');mod.levels=sub;mod.render_levels=sub
    return ob

def rings(name,profiles,material,n=16,sub=1):
    # Each measured cross section is (z, center_x, center_y, half_width, half_depth).
    verts=[]
    for z,x,y,rx,ry in profiles:
        for i in range(n):
            a=2*pi*i/n;verts.append((x+rx*cos(a),y+ry*sin(a),z))
    faces=[]
    for j in range(len(profiles)-1):
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    faces += [tuple(reversed(range(n))),tuple((len(profiles)-1)*n+i for i in range(n))]
    return mesh(name,verts,faces,material,True,sub)

def ellipsoid(name,center,scale,material):
    x,y,z=center;rx,ry,rz=scale
    profiles=[]
    for j in range(1,12):
        a=-pi/2+pi*j/12
        profiles.append((z+rz*sin(a),x,y,rx*cos(a),ry*cos(a)))
    return rings(name,profiles,material,16,1)

def patch(name,points,material,thickness=.003):
    ob=mesh(name,points,[tuple(range(len(points)))],material,False)
    mod=ob.modifiers.new('Fabric thickness','SOLIDIFY');mod.thickness=thickness
    mod=ob.modifiers.new('Soft tailored edge','BEVEL');mod.width=.003;mod.segments=2
    return ob

def line(name,pts,material,radius=.002):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=12
    sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
    for p,v in zip(sp.bezier_points,pts):p.co=v;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    cu.bevel_depth=radius;cu.bevel_resolution=2
    ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);cu.materials.append(material)
    bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.convert(target='MESH');ob.select_set(False)
    return ob

def character(guard=False):
    tag='MuseumGuard' if guard else 'AgentZero'
    root=bpy.data.objects.new('DM_Character_'+tag,None);bpy.context.collection.objects.link(root)
    parts=[]
    def add(ob,bone='chest',weights=None):
        ob.parent=root;parts.append((ob,bone,weights));return ob
    cloth=M['blue'] if guard else M['suit'];pants=M['navy'] if guard else M['suit']
    add(rings(tag+'_TailoredTorso',[(.89,0,0,.15,.075),(.92,0,0,.168,.088),(1.02,0,0,.158,.091),(1.12,0,0,.15,.087),(1.25,0,0,.19,.103),(1.38,0,0,.223,.105),(1.43,0,0,.212,.097),(1.46,0,0,.14,.079),(1.49,0,0,.079,.060)],cloth,20,1))
    add(rings(tag+'_Neck',[(1.455,0,0,.051,.05),(1.50,0,0,.052,.05),(1.55,0,-.003,.06,.055)],M['skin']), 'neck')
    # Cheek, jaw, brow and crown are separate anatomical cross sections, not a sphere head.
    add(rings(tag+'_Face',[(1.515,0,-.028,.030,.035),(1.53,0,-.021,.050,.053),(1.565,0,-.006,.073,.067),(1.60,0,0,.083,.079),(1.64,0,.004,.09,.084),(1.683,0,.007,.09,.083),(1.72,0,.01,.083,.075),(1.757,0,.014,.065,.06),(1.776,0,.014,.034,.032)],M['skin'],24,1),'head')
    add(rings(tag+'_Nose',[(1.60,0,-.079,.021,.014),(1.613,0,-.090,.019,.029),(1.626,0,-.094,.014,.023),(1.655,0,-.082,.010,.012),(1.674,0,-.075,.009,.007)],M['skin'],12,1),'head')
    add(line(tag+'_Mouth',[(-.023,-.078,1.582),(0,-.084,1.578),(.023,-.078,1.582)],M['hair'],.0014),'head')
    for s in [-1,1]:
        add(ellipsoid(tag+'_Ear'+str(s),(s*.089,.002,1.631),(.018,.016,.031),M['skin']),'head')
        add(line(tag+'_Brow'+str(s),[(s*.013,-.084,1.685),(s*.042,-.086,1.691),(s*.068,-.072,1.681)],M['hair'],.004),'head')
        if guard:
            add(ellipsoid(tag+'_Eye'+str(s),(s*.041,-.081,1.662),(.014,.006,.006),M['eye']),'head')
        else:
            lens=[(s*.009,-.093,1.678),(s*.068,-.083,1.68),(s*.073,-.086,1.648),(s*.024,-.100,1.642),(s*.012,-.10,1.653)]
            add(patch(tag+'_SunglassLens'+str(s),lens,M['lens'],.004),'head')
            add(line(tag+'_GlassesRim'+str(s),lens+[lens[0]],M['metal'],.0022),'head')
            add(line(tag+'_GlassesArm'+str(s),[(s*.070,-.084,1.678),(s*.091,-.027,1.68),(s*.092,.012,1.67)],M['metal'],.002),'head')
    if not guard:add(line(tag+'_GlassesBridge',[(-.012,-.096,1.668),(0,-.10,1.673),(.012,-.096,1.668)],M['metal'],.002),'head')
    # Swept hair cap follows the skull; tapered locks give a readable side and rear silhouette.
    add(rings(tag+'_SculptedHair',[(1.67,0,.045,.068,.045),(1.71,0,.018,.091,.078),(1.75,0,.017,.087,.077),(1.78,-.005,.012,.070,.066),(1.794,-.010,.010,.03,.03)],M['hair'],24,1),'head')
    if not guard:
        for i in range(6):
            x=-.070+i*.026
            add(line(tag+'_SweptHairLock'+str(i),[(x,-.064,1.72),(x-.01,-.046,1.769),(x-.025,.015,1.791),(x-.02,.065,1.746)],M['hairlight'],.005),'head')
        for s in [-1,1]:
            add(patch(tag+'_JacketLapel'+str(s),[(s*.062,-.069,1.476),(s*.168,-.094,1.405),(s*.121,-.108,1.335),(s*.148,-.112,1.32),(s*.025,-.098,1.143),(s*.049,-.101,1.356)],M['lapel']),'chest')
        add(patch(tag+'_DarkShirt',[(0,-.073,1.473),(-.066,-.073,1.45),(-.04,-.105,1.31),(0,-.107,1.16),(.04,-.105,1.31),(.066,-.073,1.45)],M['shirt']),'chest')
        add(line(tag+'_JacketClosure',[(.012,-.101,1.16),(.012,-.100,1.02),(.025,-.092,.92)],M['lapel'],.0015),'chest')
        for z in [1.13,1.04]:add(ellipsoid(tag+'_Button'+str(z),(.027,-.100,z),(.009,.004,.009),M['metal']),'chest')
        for s in [-1,1]:add(line(tag+'_WeltPocket'+str(s),[(s*.057,-.095,1.038),(s*.13,-.075,1.05)],M['lapel'],.003),'chest')
    else:
        for s in [-1,1]:
            add(patch(tag+'_Collar'+str(s),[(s*.008,-.069,1.474),(s*.07,-.070,1.469),(s*.106,-.09,1.42),(s*.063,-.109,1.387)],M['navy']),'chest')
            add(patch(tag+'_BreastPocket'+str(s),[(s*.057,-.103,1.33),(s*.137,-.088,1.33),(s*.137,-.096,1.245),(s*.08,-.109,1.239),(s*.057,-.111,1.25)],M['blue']),'chest')
            add(line(tag+'_PocketFlap'+str(s),[(s*.058,-.111,1.32),(s*.101,-.11,1.305),(s*.138,-.097,1.32)],M['seam'],.003),'chest')
            add(line(tag+'_Epaulette'+str(s),[(s*.09,0,1.473),(s*.207,0,1.449)],M['navy'],.012),'chest')
        add(line(tag+'_Placket',[(0,-.071,1.46),(0,-.110,1.31),(0,-.1,1.04)],M['seam'],.004),'chest')
        for z in [1.38,1.28,1.18,1.08]:add(ellipsoid(tag+'_UniformButton'+str(z),(0,-.114,z),(.005,.003,.005),M['metal']),'chest')
        add(patch(tag+'_SecurityBadge',[(-.114,-.104,1.364),(-.079,-.110,1.364),(-.075,-.111,1.341),(-.096,-.11,1.325),(-.116,-.104,1.341)],M['gold']),'chest')
        add(rings(tag+'_CapBand',[(1.718,0,.01,.096,.085),(1.735,0,.01,.097,.086),(1.75,0,.01,.102,.088)],M['navy'],24,1),'head')
        add(rings(tag+'_CapCrown',[(1.747,0,.015,.10,.09),(1.79,0,.018,.12,.099),(1.823,0,.026,.103,.084),(1.828,0,.028,.065,.054)],M['navy'],24,1),'head')
        visor=[]
        for j in range(13):
            a=pi+pi*j/12;visor.append((.098*cos(a),.01+.152*sin(a),1.73-.008*sin(a)))
        visor +=[(.079,-.044,1.741),(-.079,-.044,1.741)]
        add(patch(tag+'_CapVisor',visor,M['leather'],.007),'head')
        add(ellipsoid(tag+'_CapBadge',(0,-.093,1.776),(.016,.004,.021),M['gold']),'head')
    add(rings(tag+'_UtilityBelt',[(.976,0,0,.165,.094),(1.017,0,0,.16,.096)],M['leather'],24,0),'hips')
    add(patch(tag+'_BeltBuckle',[(-.025,-.098,.982),(.025,-.098,.982),(.025,-.1,1.01),(-.025,-.1,1.01)],M['metal'],.006),'hips')
    for s in [-1,1]:
        side='L' if s>0 else 'R'
        # Continuous trouser topology tapering through hip, knee, calf and cuff.
        leg=[(.13,s*.105,0,.065,.067),(.17,s*.105,0,.066,.067),(.34,s*.108,.013,.064,.069),(.51,s*.106,-.018,.072,.081),(.57,s*.105,-.02,.08,.087),(.77,s*.097,0,.091,.09),(.93,s*.091,0,.096,.096),(.97,s*.087,0,.084,.084)]
        add(rings(tag+'_Trouser_'+side,leg,pants,16,1),'thigh.'+side,('leg',side))
        add(line(tag+'_PressedCrease_'+side,[(s*.105,-.066,.18),(s*.106,-.102,.54),(s*.097,-.09,.86)],M['seam'] if guard else M['lapel'],.0012),'thigh.'+side,('leg',side))
        add(rings(tag+'_OxfordShoe_'+side,[(.022,s*.105,-.048,.069,.127),(.035,s*.105,-.055,.074,.137),(.070,s*.105,-.051,.072,.137),(.099,s*.105,-.014,.064,.099),(.147,s*.105,.018,.050,.058),(.16,s*.105,.02,.048,.049)],M['leather'],20,1),'foot.'+side)
        add(line(tag+'_ShoeWelt_'+side,[(s*.105-.061,-.13,.049),(s*.105,-.188,.047),(s*.105+.061,-.13,.049)],M['metal'],.0015),'foot.'+side)
        arm=[(.995,s*.328,-.001,.039,.041),(1.035,s*.325,0,.044,.047),(1.16,s*.309,0,.047,.054),(1.23,s*.294,0,.058,.063),(1.34,s*.264,0,.071,.076),(1.415,s*.228,0,.081,.077),(1.44,s*.208,0,.067,.067)]
        if guard:
            upper=[p for p in arm if p[0]>=1.23];upper.insert(0,(1.232,s*.294,0,.059,.065))
            add(rings(tag+'_ShortSleeve_'+side,upper,cloth,16,1),'upper_arm.'+side)
            add(rings(tag+'_Forearm_'+side,[(1.005,s*.327,0,.035,.032),(1.07,s*.322,0,.040,.042),(1.17,s*.307,0,.049,.046),(1.235,s*.293,0,.049,.052)],M['skin'],16,1),'forearm.'+side)
        else:add(rings(tag+'_SuitSleeve_'+side,arm,cloth,16,1),'upper_arm.'+side,('arm',side))
        handmat=M['skin'] if guard else M['leather']
        add(rings(tag+'_Hand_'+side,[(.916,s*.343,-.007,.028,.021),(.94,s*.339,-.006,.039,.025),(.989,s*.33,-.002,.037,.026),(1.022,s*.327,0,.028,.029)],handmat,12,1),'hand.'+side)
        for j in range(4):
            x=s*.341+(j-1.5)*.016
            add(rings(tag+'_Finger_'+side+str(j),[(.883+abs(j-1.5)*.006,x,-.005,.006,.008),(.912,x,-.014,.008,.010),(.943,x,-.006,.008,.011)],handmat,8,1),'hand.'+side)
        add(rings(tag+'_Thumb_'+side,[(.928,s*.302,-.021,.011,.01),(.952,s*.294,-.018,.012,.013),(.984,s*.304,-.003,.016,.016)],handmat,10,1),'hand.'+side)
        if guard or s<0:
            add(rings(tag+'_BeltPouch_'+side,[(.925,s*.169,.015,.025,.034),(.94,s*.178,.01,.035,.042),(1.012,s*.171,.01,.035,.04),(1.018,s*.166,.01,.027,.036)],M['leather'],12,1),'hips')
    # Editable, exported skeletal rig, with measured joints and continuous limb weights.
    ad=bpy.data.armatures.new('DM_Rig_'+tag);rig=bpy.data.objects.new('DM_Rig_'+tag,ad);bpy.context.collection.objects.link(rig);rig.parent=root
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,h,t,parent=None):
        b=ad.edit_bones.new(name);b.head=h;b.tail=t
        if parent:b.parent=ad.edit_bones[parent]
    bone('hips',(0,0,.88),(0,0,1.04));bone('chest',(0,0,1.04),(0,0,1.46),'hips');bone('neck',(0,0,1.46),(0,0,1.55),'chest');bone('head',(0,0,1.55),(0,0,1.80),'neck')
    for s in [-1,1]:
        side='L' if s>0 else 'R'
        bone('upper_arm.'+side,(s*.218,0,1.423),(s*.298,0,1.225),'chest')
        bone('forearm.'+side,(s*.298,0,1.225),(s*.33,0,1.018),'upper_arm.'+side)
        bone('hand.'+side,(s*.33,0,1.018),(s*.344,0,.9),'forearm.'+side)
        bone('thigh.'+side,(s*.095,0,.94),(s*.106,-.02,.54),'hips')
        bone('calf.'+side,(s*.106,-.02,.54),(s*.105,.016,.15),'thigh.'+side)
        bone('foot.'+side,(s*.105,.016,.15),(s*.105,-.15,.05),'calf.'+side)
    bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
    for ob,bn,w in parts:
        if w:
            kind,side=w
            names=['thigh.'+side,'calf.'+side] if kind=='leg' else ['upper_arm.'+side,'forearm.'+side]
            groups=[ob.vertex_groups.new(name=n) for n in names]
            for v in ob.data.vertices:
                z=v.co.z;t=max(0,min(1,((.61-z)/.14 if kind=='leg' else (1.275-z)/.10)))
                groups[0].add([v.index],1-t,'REPLACE');groups[1].add([v.index],t,'REPLACE')
        else:
            g=ob.vertex_groups.new(name=bn);g.add(list(range(len(ob.data.vertices))),1,'REPLACE')
        mod=ob.modifiers.new('DM skeletal deformation','ARMATURE');mod.object=rig
        bpy.context.view_layer.objects.active=ob
        # Deform first, then refine silhouette.
        if len(ob.modifiers)>1:bpy.ops.object.modifier_move_up(modifier=mod.name)
    def action(name,mode):
        rig.animation_data_create();act=bpy.data.actions.new('DM_Animation_'+tag+'_'+name);rig.animation_data.action=act
        for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0)
        for f in range(1,32,3):
            a=(f-1)/30*2*pi
            for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
            if mode in ['walk','run']:
                amp=.47 if mode=='walk' else .83
                for side,phase in [('L',0),('R',pi)]:
                    wave=sin(a+phase)
                    rig.pose.bones['thigh.'+side].rotation_euler.x=amp*wave
                    rig.pose.bones['calf.'+side].rotation_euler.x=-max(0,-wave)*(.6 if mode=='walk' else 1.10)
                    rig.pose.bones['upper_arm.'+side].rotation_euler.x=-amp*.75*wave
                    rig.pose.bones['forearm.'+side].rotation_euler.x=-.18 if mode=='walk' else -.8
                rig.pose.bones['hips'].location.y=.012*(1-cos(2*a))
                rig.pose.bones['chest'].rotation_euler.x=.04 if mode=='walk' else .13
            elif mode=='idle':rig.pose.bones['chest'].rotation_euler.x=.012*sin(a)
            elif mode=='freeze':
                rig.pose.bones['thigh.L'].rotation_euler.x=.20;rig.pose.bones['thigh.R'].rotation_euler.x=-.20
                rig.pose.bones['upper_arm.L'].rotation_euler.x=-.15;rig.pose.bones['forearm.R'].rotation_euler.x=-.4
            elif mode=='detected':
                t=min(1,(f-1)/12)
                rig.pose.bones['chest'].rotation_euler.x=-.16*t
                rig.pose.bones['upper_arm.L'].rotation_euler.z=-.35*t;rig.pose.bones['upper_arm.R'].rotation_euler.z=.35*t
                rig.pose.bones['forearm.L'].rotation_euler.x=-.7*t;rig.pose.bones['forearm.R'].rotation_euler.x=-.7*t
            elif mode=='alert':
                rig.pose.bones['upper_arm.R'].rotation_euler.x=-.7;rig.pose.bones['forearm.R'].rotation_euler.x=-1.2
                rig.pose.bones['head'].rotation_euler.z=.12*sin(a)
            elif mode=='turn':rig.pose.bones['hips'].rotation_euler.z=(f-1)/30*pi/2
            for p in rig.pose.bones:
                p.keyframe_insert('rotation_euler',frame=f);p.keyframe_insert('location',frame=f)
        track=rig.animation_data.nla_tracks.new();track.name=act.name;strip=track.strips.new(act.name,1,act);track.mute=True
        return act
    actions=[]
    for name,mode in ([('Idle','idle'),('Walk','walk'),('Turn','turn'),('Alert','alert')] if guard else [('Idle','idle'),('Walk','walk'),('Run','run'),('Freeze','freeze'),('Detected','detected')]):actions.append(action(name,mode))
    rig.animation_data.action=actions[0];root.location.x=1.0 if guard else -1.0
    return root,rig

agent,arig=character(False)
guard,grig=character(True)

def light(name,kind,loc,color,power,target=(0,0,1)):
    data=bpy.data.lights.new(name,kind);data.energy=power;data.color=color
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=loc
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    if kind=='SPOT':data.spot_size=math.radians(75);data.spot_blend=.65;data.shadow_soft_size=.7
    return ob
light('DM_Light_WarmKey','SPOT',(-2,-4,5),(1,.72,.43),900)
light('DM_Light_CoolFill','SPOT',(3,-2,3),(.36,.55,1),420)
light('DM_Light_Rim','SPOT',(0,3,4),(1,.77,.5),1000)
camdata=bpy.data.cameras.new('DM_Camera_CharacterReview');cam=bpy.data.objects.new(camdata.name,camdata);bpy.context.collection.objects.link(cam)
cam.location=(3.7,-7,3.2);cam.rotation_euler=(Vector((0,0,.95))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=4.0;scene.camera=cam
scene.frame_set(1)
scene.view_settings.view_transform='AgX'
target=artifacts.file(name='DM_Characters_Review.png',media_type='image/png')
scene.render.filepath=target.path;bpy.ops.render.render(write_still=True);target.publish()
result={'characters':[agent.name,guard.name],'actions':[a.name for a in bpy.data.actions],'mesh_objects':len([o for o in bpy.data.objects if o.type=='MESH'])}
