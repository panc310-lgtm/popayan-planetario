import bpy
import math
import random

# ==============================================================================
# 1. LIMPIEZA NO DESTRUCTIVA DE LA ESCENA (Recarga en vivo instantánea)
# ==============================================================================
COLLECTION_NAME = "Popayan_Planetario_3D"

def reset_collection(name):
    if name in bpy.data.collections:
        col = bpy.data.collections[name]
        for obj in list(col.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
    else:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for curve in list(bpy.data.curves):
        if curve.users == 0:
            bpy.data.curves.remove(curve)
    return col

main_col = reset_collection(COLLECTION_NAME)

def link_to_main(obj):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    main_col.objects.link(obj)

def ensure_node_tree(id_block):
    # Compatible con Blender 5.x/6.0 (evita DeprecationWarning de use_nodes)
    if getattr(id_block, "node_tree", None) is None:
        id_block.use_nodes = True
    return id_block.node_tree

# ==============================================================================
# 2. CONFIGURACIÓN DEL MOTOR DE RENDER (EEVEE)
# ==============================================================================
scene = bpy.context.scene
engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    if eng in engines:
        scene.render.engine = eng
        break

# ==============================================================================
# 3. CIELO CREPUSCULAR (18:30) + VACÍO ABISAL (#020308)
# ==============================================================================
def setup_world_shader():
    world = scene.world or bpy.data.worlds.new("World_Popayan")
    scene.world = world
    nt = ensure_node_tree(world)
    nodes = nt.nodes
    links = nt.links
    nodes.clear()

    out = nodes.new('ShaderNodeOutputWorld')
    bg = nodes.new('ShaderNodeBackground')
    bg.inputs['Strength'].default_value = 1.3

    tex_coord = nodes.new('ShaderNodeTexCoord')
    sep_xyz = nodes.new('ShaderNodeSeparateXYZ')
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'B_SPLINE'

    elements = ramp.color_ramp.elements
    elements[0].position = 0.0
    elements[0].color = (0.004, 0.006, 0.015, 1.0)   # Vacío negro abisal (#020308)
    
    e1 = elements.new(0.018)
    e1.color = (0.006, 0.010, 0.025, 1.0)            # Penumbra de suelo espacial
    
    e2 = elements.new(0.048)
    e2.color = (1.0, 0.32, 0.04, 1.0)                # Horizonte Atardecer 18:30 (Ámbar/Naranja)
    
    e3 = elements.new(0.095)
    e3.color = (0.07, 0.15, 0.35, 1.0)               # Transición Azul Cobalto
    
    elements[1].position = 0.22
    elements[1].color = (0.005, 0.008, 0.02, 1.0)    # Espacio profundo nocturno

    links.new(tex_coord.outputs['Generated'], sep_xyz.inputs['Vector'])
    links.new(sep_xyz.outputs['Z'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bg.inputs['Color'])
    links.new(bg.outputs['Background'], out.inputs['Surface'])

setup_world_shader()

# ==============================================================================
# 4. SHADERS HOLOGRÁFICOS (ESTILO 100,000 STARS)
# ==============================================================================
def set_material_transparency(mat):
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = 'BLENDED'
    elif hasattr(mat, "blend_method"):
        mat.blend_method = 'BLEND'

def create_hologram_material(name, edge_color=(0.0, 0.85, 1.0, 1.0), emission_strength=4.5, wire_size=1.2):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    nt = ensure_node_tree(mat)
    set_material_transparency(mat)
    nodes = nt.nodes
    links = nt.links
    nodes.clear()

    out = nodes.new('ShaderNodeOutputMaterial')
    mix_shader = nodes.new('ShaderNodeMixShader')
    transp = nodes.new('ShaderNodeBsdfTransparent')
    transp.inputs['Color'].default_value = (0.12, 0.18, 0.30, 1.0)

    emiss = nodes.new('ShaderNodeEmission')
    emiss.inputs['Color'].default_value = edge_color
    emiss.inputs['Strength'].default_value = emission_strength

    wire = nodes.new('ShaderNodeWireframe')
    wire.use_pixel_size = True
    wire.inputs['Size'].default_value = wire_size

    layer_w = nodes.new('ShaderNodeLayerWeight')
    layer_w.inputs['Blend'].default_value = 0.35

    math_add = nodes.new('ShaderNodeMath')
    math_add.operation = 'ADD'
    math_add.use_clamp = True

    links.new(wire.outputs['Fac'], math_add.inputs[0])
    links.new(layer_w.outputs['Fresnel'], math_add.inputs[1])
    links.new(math_add.outputs['Value'], mix_shader.inputs['Fac'])
    links.new(transp.outputs['BSDF'], mix_shader.inputs[1])
    links.new(emiss.outputs['Emission'], mix_shader.inputs[2])
    links.new(mix_shader.outputs['Shader'], out.inputs['Surface'])
    return mat

def create_plasma_star_material(name, color_rgba, strength=40.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    nt = ensure_node_tree(mat)
    nodes = nt.nodes
    links = nt.links
    nodes.clear()

    out = nodes.new('ShaderNodeOutputMaterial')
    emiss = nodes.new('ShaderNodeEmission')
    emiss.inputs['Color'].default_value = color_rgba

    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 7.0
    noise.inputs['Detail'].default_value = 10.0

    math_mult = nodes.new('ShaderNodeMath')
    math_mult.operation = 'MULTIPLY'
    math_mult.inputs[1].default_value = strength

    links.new(noise.outputs['Fac'], math_mult.inputs[0])
    links.new(math_mult.outputs['Value'], emiss.inputs['Strength'])
    links.new(emiss.outputs['Emission'], out.inputs['Surface'])
    return mat

mat_holo_ciudad = create_hologram_material("M_Holo_CiudadBlanca", edge_color=(0.25, 0.78, 1.0, 1.0), emission_strength=3.5, wire_size=1.0)
mat_holo_catedral = create_hologram_material("M_Holo_Catedral", edge_color=(0.88, 0.96, 1.0, 1.0), emission_strength=7.0, wire_size=1.4)
mat_holo_morro = create_hologram_material("M_Holo_MorroTulcan", edge_color=(0.08, 0.92, 0.78, 1.0), emission_strength=4.2, wire_size=1.2)
mat_silueta_purace = create_hologram_material("M_Silueta_Purace", edge_color=(0.02, 0.04, 0.10, 1.0), emission_strength=0.12, wire_size=0.5)
mat_rio_molino = create_plasma_star_material("M_Rio_Molino_Data", (0.0, 0.75, 1.0, 1.0), strength=14.0)

# ==============================================================================
# 5. HITOS DE POPAYÁN + EXTENSIÓN HOLOGRÁFICA UNIFORME
# ==============================================================================
random.seed(42)

# A. Damero Colonial y expansión hacia el norte
for gx in range(-7, 8):
    for gy in range(-4, 11):
        if gy == 1 or (gx == 0 and gy == 0):
            continue
        bx = gx * 7.5 + random.uniform(-0.35, 0.35)
        by = gy * 7.5 + random.uniform(-0.35, 0.35)
        bh = random.uniform(1.2, 2.5) if gy < 3 else random.uniform(0.9, 1.9)
        
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, by, bh / 2))
        block = bpy.context.active_object
        block.name = f"Manzana_Popayan_{gx}_{gy}"
        block.scale = (random.uniform(4.8, 5.8), random.uniform(4.8, 5.8), bh)
        block.data.materials.append(mat_holo_ciudad)
        link_to_main(block)

# B. Catedral Basílica y Torre del Reloj (Parque Caldas)
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-6.5, -2.5, 2.5))
catedral = bpy.context.active_object
catedral.name = "Hito_Catedral_Popayan"
catedral.scale = (6.5, 4.2, 5.0)
catedral.data.materials.append(mat_holo_catedral)
link_to_main(catedral)

bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=2.2, location=(-6.5, -3.5, 5.5))
cupula = bpy.context.active_object
cupula.name = "Hito_Cupula_Catedral"
cupula.data.materials.append(mat_holo_catedral)
link_to_main(cupula)

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-4.2, -7.8, 3.8))
torre = bpy.context.active_object
torre.name = "Hito_Torre_Del_Reloj"
torre.scale = (1.6, 1.6, 7.6)
torre.data.materials.append(mat_holo_catedral)
link_to_main(torre)

# C. Río Molino Bioluminiscente y Puente del Humilladero
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(10.0, 7.5, 1.6))
puente = bpy.context.active_object
puente.name = "Hito_Puente_Humilladero"
puente.scale = (2.2, 9.5, 3.2)
puente.rotation_euler = (0, 0, math.radians(-18))
puente.data.materials.append(mat_holo_catedral)
link_to_main(puente)

# Filamento de luz del Río Molino
curve_data = bpy.data.curves.new('Rio_Molino_Curve', type='CURVE')
curve_data.dimensions = '3D'
curve_data.bevel_depth = 0.65
polyline = curve_data.splines.new('NURBS')
pts = [(-45, 9, 0.2), (-15, 7.8, 0.2), (10, 7.5, 0.2), (22, 4.0, 0.2), (35, -18, 0.2)]
polyline.points.add(len(pts) - 1)
for idx, pt in enumerate(pts):
    polyline.points[idx].co = (pt[0], pt[1], pt[2], 1.0)
rio_obj = bpy.data.objects.new('Hito_Rio_Molino', curve_data)
rio_obj.data.materials.append(mat_rio_molino)
link_to_main(rio_obj)

# D. Pirámide de El Morro de Tulcán + Monumento
bpy.ops.mesh.primitive_cone_add(vertices=36, radius1=14.5, radius2=3.2, depth=9.5, location=(26.0, 16.0, 4.75))
morro = bpy.context.active_object
morro.name = "Hito_Morro_De_Tulcan"
morro.data.materials.append(mat_holo_morro)
link_to_main(morro)

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(26.0, 16.0, 10.5))
estatua = bpy.context.active_object
estatua.name = "Hito_Monumento_Morro"
estatua.scale = (1.4, 2.2, 2.4)
estatua.data.materials.append(mat_holo_catedral)
link_to_main(estatua)

# E. Cordillera Central y Volcán Puracé al fondo
bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=65.0, radius2=4.0, depth=28.0, location=(-15.0, 135.0, 14.0))
purace = bpy.context.active_object
purace.name = "Topografia_Volcan_Purace"
purace.scale = (1.8, 0.8, 1.0)
purace.data.materials.append(mat_silueta_purace)
link_to_main(purace)

# ==============================================================================
# 6. SISTEMA PLANETARIO COMERCIAL DE POPAYÁN (Soles, Órbitas y Planetas)
# ==============================================================================
soles_config = [
    {"nombre": "Estrella_Dorada_Centro",   "pos": (-8.0, 2.0, 12.0),  "r": 4.2, "color": (1.0, 0.62, 0.12, 1.0), "orbitas": 4},
    {"nombre": "Estrella_Cian_ZonaNorte",  "pos": (6.0, 42.0, 18.0),  "r": 4.0, "color": (0.0, 0.85, 1.0, 1.0),  "orbitas": 4},
    {"nombre": "Estrella_Violeta_Tulcan",  "pos": (36.0, 24.0, 15.5), "r": 3.5, "color": (0.78, 0.18, 1.0, 1.0), "orbitas": 3},
    {"nombre": "Estrella_Ambar_Bolivar",   "pos": (-32.0, 28.0, 16.0),"r": 3.2, "color": (1.0, 0.42, 0.08, 1.0), "orbitas": 3},
]

for sol in soles_config:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=sol["r"], location=sol["pos"])
    s_obj = bpy.context.active_object
    s_obj.name = sol["nombre"]
    bpy.ops.object.shade_smooth()
    s_mat = create_plasma_star_material(f"Mat_{sol['nombre']}", sol["color"], strength=45.0)
    s_obj.data.materials.append(s_mat)
    link_to_main(s_obj)

    orb_mat = create_plasma_star_material(f"Mat_Orb_{sol['nombre']}", sol["color"], strength=9.0)
    for i in range(1, sol["orbitas"] + 1):
        r_orb = sol["r"] + (i * 3.4)
        bpy.ops.curve.primitive_bezier_circle_add(radius=r_orb, location=sol["pos"])
        c_obj = bpy.context.active_object
        c_obj.name = f"{sol['nombre']}_Orbita_{i}"
        c_obj.data.bevel_depth = 0.05
        c_obj.data.materials.append(orb_mat)
        link_to_main(c_obj)

        for p in range(2):
            ang = random.uniform(0, 2 * math.pi)
            px = sol["pos"][0] + math.cos(ang) * r_orb
            py = sol["pos"][1] + math.sin(ang) * r_orb
            pz = sol["pos"][2]
            bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.55, location=(px, py, pz))
            p_obj = bpy.context.active_object
            p_obj.name = f"Planeta_{sol['nombre']}_O{i}_{p+1}"
            bpy.ops.object.shade_smooth()
            p_obj.data.materials.append(orb_mat)
            link_to_main(p_obj)

# ==============================================================================
# 7. CÁMARA PRINCIPAL EN EL ENCUADRE EXACTO
# ==============================================================================
bpy.ops.object.camera_add(location=(2.0, -36.0, 22.0), rotation=(math.radians(66.0), 0.0, math.radians(4.0)))
cam = bpy.context.active_object
cam.name = "Camara_Popayan_Planetario"
cam.data.lens = 24.0
cam.data.clip_end = 500.0
scene.camera = cam
link_to_main(cam)

print(">>> Escena Popayán Planetario (Blender 5.x Ready) actualizada sin warnings.")