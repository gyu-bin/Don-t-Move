import bpy, os
from pathlib import Path
from mathutils import Vector
base=Path(os.environ['DM_PROJECT_ROOT'])
for revision,file in [('BeforeRefinement','DM_Museum_BeforeRefinement.blend'),('','DM_Museum_Production_Optimized.blend')]:
    for tag in ['AgentZero','MuseumGuard']:
        bpy.ops.wm.open_mainfile(filepath=str(base/'ArtProduction/Exports'/file))
        root=bpy.data.objects['DM_Character_'+tag];rig=bpy.data.objects['DM_Rig_'+tag];rig.data.pose_position='REST'
        bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
        copies=[]
        for ob in rig.children:
            if ob.type=='MESH':copies.append((bpy.data.meshes.new_from_object(ob.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps),root.matrix_world.inverted()@ob.matrix_world))
        sc=bpy.data.scenes.new('DM_CloseupComparison');bpy.context.window.scene=sc
        sc.world=bpy.data.worlds.new('DM_CloseupWorld');sc.world.use_nodes=True
        bg=sc.world.node_tree.nodes['Background'];bg.inputs['Color'].default_value=(.02,.028,.042,1);bg.inputs['Strength'].default_value=.4
        holder=bpy.data.objects.new('DM_ReviewRoot',None);sc.collection.objects.link(holder);holder.scale=root.scale
        for data,mat in copies:
            ob=bpy.data.objects.new(data.name,data);sc.collection.objects.link(ob);ob.parent=holder;ob.matrix_basis=mat
        for loc,col,power in [((-3,-4,4),(1,.82,.65),600),((3,-2,3),(.50,.66,1),350),((0,2,3),(1,.82,.6),700)]:
            d=bpy.data.lights.new('DM_ReviewLight','AREA');d.energy=power;d.color=col;d.shape='DISK';d.size=4
            ob=bpy.data.objects.new(d.name,d);sc.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,1))-ob.location).to_track_quat('-Z','Y').to_euler()
        d=bpy.data.cameras.new('DM_FixedCloseupCamera');cam=bpy.data.objects.new(d.name,d);sc.collection.objects.link(cam)
        cam.location=(.45,-3,1.6);cam.rotation_euler=(Vector((0,0,1.40))-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=.95;sc.camera=cam
        sc.render.engine='BLENDER_EEVEE';sc.eevee.taa_render_samples=32;sc.view_settings.view_transform='AgX'
        sc.render.resolution_x=900;sc.render.resolution_y=1000;sc.render.resolution_percentage=100
        sc.render.image_settings.media_type='IMAGE';sc.render.image_settings.file_format='PNG'
        sc.render.filepath=str(base/'ArtProduction/Previews'/revision/('DM_'+tag+'_Closeup.png'));bpy.ops.render.render(write_still=True)
