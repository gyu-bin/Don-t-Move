import bpy, os, math
from pathlib import Path
from mathutils import Vector
basepath=Path(os.environ['DM_PROJECT_ROOT'])/'ArtProduction'/'Previews'
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=24
scene.render.resolution_x=1200;scene.render.resolution_y=940;scene.render.resolution_percentage=100
scene.render.image_settings.media_type='IMAGE';scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(basepath/'DM_Blender_TestRoom.png');bpy.ops.render.render(write_still=True)
for tag in ['AgentZero','MuseumGuard']:
    source=bpy.data.objects['DM_Character_'+tag]
    rig=bpy.data.objects['DM_Rig_'+tag];rig.data.pose_position='REST'
    source_scene=bpy.context.scene;deps=bpy.context.evaluated_depsgraph_get()
    source_mesh=next(o for o in rig.children if o.type=='MESH')
    me=bpy.data.meshes.new_from_object(source_mesh.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps)
    review=bpy.data.scenes.new('DM_Review_'+tag);bpy.context.window.scene=review
    review.world=bpy.data.worlds.new('DM_ReviewWorld_'+tag);review.world.use_nodes=True
    review.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.02,.028,.042,1)
    review.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.4
    for x,angle,label in [(-1.05,0,'FRONT'),(0,math.pi/2,'SIDE'),(1.05,math.pi,'BACK')]:
        ob=bpy.data.objects.new(tag+'_'+label,me);review.collection.objects.link(ob);ob.location=(x,0,0);ob.rotation_euler.z=angle;ob.scale=source.scale
        text=bpy.data.curves.new('ViewLabel','FONT');text.body=label;text.align_x='CENTER';text.size=.10
        t=bpy.data.objects.new('DM_Label_'+label,text);review.collection.objects.link(t);t.location=(x,0,-.16);t.rotation_euler.x=math.pi/2
    def light(name,loc,color,power,target=(0,0,1)):
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=4
        o=bpy.data.objects.new(name,d);review.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    light('WarmReviewKey',(-3,-4,4),(1,.82,.65),600)
    light('CoolReviewFill',(3,-2,3),(.50,.66,1),350)
    light('ReviewRim',(0,2,3),(1,.82,.6),700)
    d=bpy.data.cameras.new('DM_ReviewCamera');cam=bpy.data.objects.new(d.name,d);review.collection.objects.link(cam)
    cam.location=(0,-8,.92);cam.rotation_euler=(Vector((0,0,.92))-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=3.5;review.camera=cam
    review.render.engine='BLENDER_EEVEE';review.eevee.taa_render_samples=24;review.view_settings.view_transform='AgX'
    review.render.resolution_x=1400;review.render.resolution_y=900;review.render.resolution_percentage=100
    review.render.image_settings.media_type='IMAGE';review.render.image_settings.file_format='PNG';review.render.filepath=str(basepath/('DM_'+tag+'_FrontSideBack.png'))
    bpy.ops.render.render(write_still=True)
    bpy.context.window.scene=source_scene
    print('DM_REVIEW_RENDERED '+tag)

def asset_review(name,placements,camera_position,target,ortho):
    source_scene=bpy.context.scene;deps=bpy.context.evaluated_depsgraph_get()
    copies=[]
    for source_name,position,angle in placements:
        source=bpy.data.objects[source_name]
        for child in source.children_recursive:
            if child.type!='MESH':continue
            data=bpy.data.meshes.new_from_object(child.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps)
            copies.append((data,source.matrix_world.inverted()@child.matrix_world,position,angle))
    review=bpy.data.scenes.new(name);bpy.context.window.scene=review
    review.world=bpy.data.worlds.new(name+'_World');review.world.use_nodes=True
    review.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.015,.024,.04,1);review.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.4
    for data,matrix,position,angle in copies:
        parent=bpy.data.objects.new('ReviewPlacement',None);review.collection.objects.link(parent);parent.location=position;parent.rotation_euler.z=angle
        ob=bpy.data.objects.new(data.name,data);review.collection.objects.link(ob);ob.parent=parent;ob.matrix_basis=matrix
    for loc,color,power in [((-4,-4,7),(1,.76,.49),1200),((4,-2,5),(.42,.59,1),650),((1,4,6),(1,.76,.52),1300)]:
        d=bpy.data.lights.new('AssetReviewLight','AREA');d.energy=power;d.color=color;d.size=5
        ob=bpy.data.objects.new(d.name,d);review.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('AssetReviewCamera');cam=bpy.data.objects.new(d.name,d);review.collection.objects.link(cam);cam.location=camera_position;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=ortho;review.camera=cam
    review.render.engine='BLENDER_EEVEE';review.eevee.taa_render_samples=24;review.view_settings.view_transform='AgX'
    review.render.resolution_x=1400;review.render.resolution_y=1000;review.render.resolution_percentage=100
    review.render.image_settings.media_type='IMAGE';review.render.image_settings.file_format='PNG';review.render.filepath=str(basepath/(name+'.png'));bpy.ops.render.render(write_still=True)
    bpy.context.window.scene=source_scene

asset_review('DM_Architecture_TestKit',[
    ('DM_Environment_Museum_WallStraight_A',(-2.7,1,0),0),
    ('DM_Environment_Museum_WallCorner_A',(-.6,1.3,0),0),
    ('DM_Environment_Museum_DoorFrame_A',(2.5,1,0),0),
    ('DM_Environment_Museum_Pillar_A',(2,-1.4,0),0),
    ('DM_Environment_Museum_MarbleFloor_A',(-1.0,-1.3,0),0)
],(7,-12,8),(0,.4,1.2),9.4)
asset_review('DM_Statue_and_Diamond',[
    ('DM_Prop_MuseumStatue_A',(-1.05,0,0),-.12),
    ('DM_Prop_DisplayCase_Diamond_A',(1.15,0,0),.1)
],(4,-8,4),(0,0,1.05),4.8)
