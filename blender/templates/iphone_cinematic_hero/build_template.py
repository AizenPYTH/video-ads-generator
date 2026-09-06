"""
Builds the "iPhone Cinematic Hero" template scene from scratch and saves it
as iphone_cinematic_hero.blend next to this file.

    blender/bin/bpy blender/templates/iphone_cinematic_hero/build_template.py

Everything is created by code so the scene is reproducible: the iPhone from
iphone_15_pro.glb at the repository root, a studio cyclorama, a five-light
rig, one camera with real depth of field, and a 10 s animation on Bezier
f-curves. The parts a generator will touch later are named and isolated:

    images     SCREEN_01, SCREEN_02, LOGO
    objects    iPhone_Screen, LOGO, TEXT_TAGLINE, TEXT_CTA, TEMPLATE_CONTROLLER
    nodes      SCREEN_01_FIT, SCREEN_02_FIT (mapping), SCREEN_PROGRESS,
               SCREEN_BRIGHTNESS, SCREEN_ZOOM, LOGO_ALPHA (values)

Swapping an image or a string never touches a keyframe.
"""
from __future__ import annotations

import math
import os
import sys

import bpy  # noqa: E402  (must come first: it sets up bmesh/mathutils)
import bmesh
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
MODEL = os.path.join(REPO, "iphone_15_pro.glb")
SCREENS = os.path.join(HERE, "screens")
BLEND = os.path.join(HERE, "iphone_cinematic_hero.blend")
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

FPS = 30
DURATION_S = 10.0
FRAME_START = 1
FRAME_END = FRAME_START + int(DURATION_S * FPS) - 1  # 300

# The model is in millimetres; the scene is in metres.
MM = 0.001
# Measured on the glass mesh's flat front face (mm).
GLASS_W, GLASS_H = 67.5, 143.77
# Real display panel (mm): 6.1" at 2556x1179, and where its corners and
# Dynamic Island sit inside the glass.
DISPLAY_W, DISPLAY_H = 65.1, 141.2
DISPLAY_RADIUS = 9.0
ISLAND_W, ISLAND_H, ISLAND_TOP = 24.5, 7.4, 3.1
PHONE_H_M = 145.9 * MM
PHONE_T_M = 10.77 * MM
FLOOR_GAP = 0.004
# The phone's centre when it rests: just above the floor.
REST_Z = FLOOR_GAP + PHONE_H_M / 2


def t(seconds: float) -> int:
    """Frame number for a time in seconds."""
    return FRAME_START + int(round(seconds * FPS))


# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------


def collection(name: str, parent: bpy.types.Collection | None = None) -> bpy.types.Collection:
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    holder = parent or bpy.context.scene.collection
    if col.name not in holder.children:
        holder.children.link(col)
    return col


def link_to(obj: bpy.types.Object, col: bpy.types.Collection) -> None:
    for other in list(obj.users_collection):
        other.objects.unlink(obj)
    col.objects.link(obj)


def empty(name: str, col: bpy.types.Collection, display: str = "PLAIN_AXES", size: float = 0.05) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = display
    obj.empty_display_size = size
    col.objects.link(obj)
    return obj


def parent(child: bpy.types.Object, target: bpy.types.Object) -> None:
    """Parents without moving the child in world space."""
    world = child.matrix_world.copy()
    child.parent = target
    child.matrix_parent_inverse = target.matrix_world.inverted()
    child.matrix_world = world


def fcurves_of(animated) -> list:
    """F-curves of an ID's action across the legacy and slotted action APIs."""
    anim = animated.animation_data
    if anim is None or anim.action is None:
        return []
    action = anim.action
    try:
        for layer in action.layers:
            for strip in layer.strips:
                bag = strip.channelbag(anim.action_slot, ensure=False)
                if bag is not None:
                    return list(bag.fcurves)
    except AttributeError:
        pass
    return list(action.fcurves)


def key(owner, path: str, frame: int, value, index: int = -1, interp: str = "BEZIER", easing: str = "AUTO") -> None:
    """Inserts one keyframe and sets how the segment leaving it behaves."""
    if index >= 0:
        current = list(getattr(owner, path))
        current[index] = value
        setattr(owner, path, current)
    else:
        setattr(owner, path, value)
    owner.keyframe_insert(data_path=path, index=index, frame=frame)
    animated = owner.id_data
    for fc in fcurves_of(animated):
        if fc.data_path != (path if not hasattr(owner, "path_from_id") or isinstance(owner, bpy.types.ID) else owner.path_from_id(path)):
            continue
        if index >= 0 and fc.array_index != index:
            continue
        for kp in fc.keyframe_points:
            if abs(kp.co.x - frame) < 0.5:
                kp.interpolation = interp
                kp.easing = easing
                kp.handle_left_type = "AUTO_CLAMPED"
                kp.handle_right_type = "AUTO_CLAMPED"


def key_vec(owner, path: str, frame: int, values, interp: str = "BEZIER", easing: str = "AUTO") -> None:
    for i, v in enumerate(values):
        key(owner, path, frame, v, index=i, interp=interp, easing=easing)


def deg(*values: float) -> tuple:
    return tuple(math.radians(v) for v in values)


def add_noise(obj: bpy.types.Object, path: str, strength: float, scale: float, phase: float) -> None:
    """A deterministic handheld drift on every channel of a location f-curve."""
    for fc in fcurves_of(obj):
        if fc.data_path == path:
            mod = fc.modifiers.new("NOISE")
            mod.strength = strength
            mod.scale = scale
            mod.phase = phase + fc.array_index * 7.3
            mod.blend_in = 12
            mod.blend_out = 12


# --------------------------------------------------------------------------
# Node helpers
# --------------------------------------------------------------------------


class Nodes:
    """Thin builder over a node tree so shader graphs read top to bottom."""

    def __init__(self, tree: bpy.types.NodeTree):
        self.tree = tree
        self.x = 0

    def add(self, kind: str, name: str | None = None, **props):
        node = self.tree.nodes.new(kind)
        if name:
            node.name = node.label = name
        for k, v in props.items():
            setattr(node, k, v)
        node.location = (self.x, 0)
        self.x += 200
        return node

    def link(self, out_socket, in_socket) -> None:
        self.tree.links.new(out_socket, in_socket)

    def math(self, op: str, a, b=None, c=None, name: str | None = None, clamp: bool = False):
        node = self.add("ShaderNodeMath", name, operation=op, use_clamp=clamp)
        self._feed(node.inputs[0], a)
        if b is not None:
            self._feed(node.inputs[1], b)
        if c is not None:
            self._feed(node.inputs[2], c)
        return node.outputs[0]

    def vmath(self, op: str, a, b=None, name: str | None = None):
        node = self.add("ShaderNodeVectorMath", name, operation=op)
        self._feed(node.inputs[0], a)
        if b is not None:
            self._feed(node.inputs[1], b)
        return node.outputs[0]

    def value(self, name: str, v: float):
        node = self.add("ShaderNodeValue", name)
        node.outputs[0].default_value = v
        return node.outputs[0]

    def _feed(self, socket, value) -> None:
        if isinstance(value, bpy.types.NodeSocket):
            self.link(value, socket)
        elif hasattr(value, "__len__"):
            socket.default_value = value
        else:
            socket.default_value = value


def smoothstep(n: Nodes, x, edge0: float, edge1: float):
    """Hermite step as nodes: 0 below edge0, 1 above edge1."""
    span = edge1 - edge0
    u = n.math("SUBTRACT", x, edge0)
    u = n.math("DIVIDE", u, span, clamp=True)
    u2 = n.math("MULTIPLY", u, u)
    inner = n.math("MULTIPLY_ADD", u, -2.0, 3.0)
    return n.math("MULTIPLY", u2, inner)


def rounded_rect_sdf(n: Nodes, px, pz, half_w: float, half_h: float, radius: float):
    """Signed distance (mm) to a rounded rectangle centred on the origin."""
    qx = n.math("SUBTRACT", n.math("ABSOLUTE", px), half_w - radius)
    qz = n.math("SUBTRACT", n.math("ABSOLUTE", pz), half_h - radius)
    ox = n.math("MAXIMUM", qx, 0.0)
    oz = n.math("MAXIMUM", qz, 0.0)
    outside = n.math("SQRT", n.math("ADD", n.math("MULTIPLY", ox, ox), n.math("MULTIPLY", oz, oz)))
    inside = n.math("MINIMUM", n.math("MAXIMUM", qx, qz), 0.0)
    return n.math("SUBTRACT", n.math("ADD", outside, inside), radius)


# --------------------------------------------------------------------------
# Scene
# --------------------------------------------------------------------------


def reset_scene() -> bpy.types.Scene:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    try:
        bpy.ops.preferences.addon_enable(module="cycles")
    except Exception:  # already registered in a full Blender
        pass
    scene = bpy.context.scene
    scene.name = "IPHONE_CINEMATIC_HERO"
    scene.render.fps = FPS
    scene.frame_start = FRAME_START
    scene.frame_end = FRAME_END
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    return scene


def configure_render(scene: bpy.types.Scene) -> None:
    r = scene.render
    r.engine = "CYCLES"
    r.resolution_x, r.resolution_y = 1920, 1080
    r.resolution_percentage = 100
    r.film_transparent = False
    r.filter_size = 1.5
    r.use_motion_blur = True
    r.motion_blur_shutter = 0.5
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGB"
    r.image_settings.color_depth = "8"
    r.image_settings.compression = 50

    c = scene.cycles
    c.device = "CPU"
    c.samples = 128
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.015
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    c.denoising_prefilter = "ACCURATE"
    c.seed = 7
    c.use_animated_seed = False
    c.max_bounces = 8
    c.diffuse_bounces = 3
    c.glossy_bounces = 6
    c.transmission_bounces = 8
    c.transparent_max_bounces = 8
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.sample_clamp_direct = 0.0
    c.sample_clamp_indirect = 8.0
    c.blur_glossy = 0.5
    c.use_light_tree = True
    c.film_exposure = 1.0

    vs = scene.view_settings
    vs.view_transform = "AgX"
    try:
        vs.look = "AgX - Medium High Contrast"
    except TypeError:
        vs.look = "None"
    vs.exposure = 0.0
    vs.gamma = 1.0
    scene.display_settings.display_device = "sRGB"


# --------------------------------------------------------------------------
# Device
# --------------------------------------------------------------------------

PART_NAMES = {
    "Object_2": "iPhone_CameraRings",
    "Object_3": "iPhone_Inner",
    "Object_4": "iPhone_Glass",
    "Object_5": "iPhone_LensGlass",
    "Object_6": "iPhone_Antenna",
    "Object_7": "iPhone_FrameEdge",
    "Object_8": "iPhone_Frame",
    "Object_9": "iPhone_CameraBump",
}


def import_phone(col: bpy.types.Collection) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Imports the GLB and returns (model root, glass mesh) in world mm."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=MODEL)
    imported = [o for o in bpy.data.objects if o not in before]
    for obj in imported:
        link_to(obj, col)
        if obj.name in PART_NAMES:
            obj.name = PART_NAMES[obj.name]
    root = next(o for o in imported if o.parent is None)
    root.name = "IPHONE_MODEL"
    for obj in imported:
        if obj.type == "EMPTY" and obj is not root:
            obj.name = "IPHONE_MESHES"
    glass = bpy.data.objects["iPhone_Glass"]
    for obj in imported:
        if obj.type == "MESH":
            obj.data.name = obj.name
    return root, glass


def split_screen(glass: bpy.types.Object, col: bpy.types.Collection) -> bpy.types.Object:
    """
    Cuts the flat front of the glass into its own object, iPhone_Screen,
    with planar UVs that run 0..1 across the glass. The glass keeps its
    curved edges so the phone silhouette does not change.
    """
    mw = glass.matrix_world
    rot = mw.to_3x3()
    bm = bmesh.new()
    bm.from_mesh(glass.data)
    bm.faces.ensure_lookup_table()

    front = []
    for f in bm.faces:
        n = (rot @ f.normal).normalized()
        c = mw @ f.calc_center_median()
        if n.y < -0.98 and c.y < 0.6:
            front.append(f)
    if len(front) < 50:
        raise RuntimeError(f"screen detection failed: {len(front)} faces")

    # Build the screen mesh in world millimetres.
    verts_world = {}
    screen_bm = bmesh.new()
    for f in front:
        new_verts = []
        for v in f.verts:
            if v.index not in verts_world:
                verts_world[v.index] = screen_bm.verts.new(mw @ v.co)
            new_verts.append(verts_world[v.index])
        try:
            screen_bm.faces.new(new_verts)
        except ValueError:
            pass  # duplicate face in the source
    screen_bm.verts.ensure_lookup_table()
    xs = [v.co.x for v in screen_bm.verts]
    zs = [v.co.z for v in screen_bm.verts]
    min_x, max_x, min_z, max_z = min(xs), max(xs), min(zs), max(zs)
    uv_layer = screen_bm.loops.layers.uv.new("UVMap")
    for f in screen_bm.faces:
        for loop in f.loops:
            loop[uv_layer].uv = (
                (loop.vert.co.x - min_x) / (max_x - min_x),
                (loop.vert.co.z - min_z) / (max_z - min_z),
            )
    # Face normals must point toward the viewer (-Y).
    bmesh.ops.recalc_face_normals(screen_bm, faces=screen_bm.faces[:])
    for f in screen_bm.faces:
        if f.normal.y > 0:
            f.normal_flip()
    screen_mesh = bpy.data.meshes.new("iPhone_Screen")
    screen_bm.to_mesh(screen_mesh)
    screen_bm.free()

    bmesh.ops.delete(bm, geom=front, context="FACES")
    bm.to_mesh(glass.data)
    bm.free()

    screen = bpy.data.objects.new("iPhone_Screen", screen_mesh)
    col.objects.link(screen)
    screen["glass_size_mm"] = [round(max_x - min_x, 3), round(max_z - min_z, 3)]
    screen["display_size_mm"] = [DISPLAY_W, DISPLAY_H]
    print(f"screen: {len(front)} faces, {max_x - min_x:.2f} x {max_z - min_z:.2f} mm")
    return screen


def principled(mat: bpy.types.Material) -> bpy.types.ShaderNodeBsdfPrincipled:
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def set_input(node, name: str, value) -> None:
    """Sets a socket value, dropping whatever was linked into it."""
    socket = node.inputs[name]
    for link in list(socket.links):
        node.id_data.links.remove(link)
    socket.default_value = value


def refine_materials() -> None:
    """
    The Sketchfab materials are a good start with generic values. These are
    the real surfaces: brushed titanium band, polished chamfer, frosted
    back glass, sapphire lens covers. Textures stay.
    """
    m = bpy.data.materials
    b = principled(m["Titanium_-_Satin"])
    set_input(b, "Metallic", 1.0)
    set_input(b, "Roughness", 0.36)
    set_input(b, "Coat Weight", 0.0)

    b = principled(m["Titanium_-_Polished"])
    set_input(b, "Metallic", 1.0)
    set_input(b, "Roughness", 0.12)

    b = principled(m["Glass_-_Heavy_Color"])
    set_input(b, "Roughness", 0.42)
    set_input(b, "Metallic", 0.0)
    set_input(b, "Coat Weight", 0.45)
    set_input(b, "Coat Roughness", 0.12)

    b = principled(m["Glass_-_Light_Color"])
    set_input(b, "Base Color", (0.9, 0.92, 0.95, 1.0))
    set_input(b, "Roughness", 0.03)
    set_input(b, "Transmission Weight", 1.0)
    set_input(b, "Alpha", 1.0)
    set_input(b, "IOR", 1.52)
    m["Glass_-_Light_Color"].surface_render_method = "DITHERED"

    b = principled(m["Aluminum_-_Bead_Blasted"])
    set_input(b, "Metallic", 1.0)
    set_input(b, "Roughness", 0.48)

    b = principled(m["Aluminum_-_Polished"])
    set_input(b, "Metallic", 1.0)
    set_input(b, "Roughness", 0.10)

    b = principled(m["Aluminum_-_Satin"])
    set_input(b, "Roughness", 0.7)

    b = principled(m["Plastic_-_Translucent_Matte_White"])
    set_input(b, "Roughness", 0.6)
    set_input(b, "Base Color", (0.55, 0.55, 0.56, 1.0))


def load_image(name: str, filename: str) -> bpy.types.Image:
    image = bpy.data.images.load(os.path.join(SCREENS, filename), check_existing=False)
    image.name = name
    image.colorspace_settings.name = "sRGB"
    return image


def build_screen_material(screen: bpy.types.Object) -> bpy.types.Material:
    """
    Emissive display under a glass coat. In millimetre space from the UVs:
    a rounded rectangle is the panel, a capsule is the Dynamic Island, and
    two screenshots share the panel through an animated push transition
    (SCREEN_PROGRESS): the new one slides in from the right, the old one
    drifts left more slowly and dims. Zoom and brightness are values too.
    """
    mat = bpy.data.materials.new("SCREEN_MAT")
    mat.use_nodes = True
    tree = mat.node_tree
    for node in list(tree.nodes):
        tree.nodes.remove(node)
    n = Nodes(tree)

    uv = n.add("ShaderNodeUVMap", "UV")
    uv.uv_map = "UVMap"
    xyz = n.add("ShaderNodeSeparateXYZ", "UV_XYZ")
    n.link(uv.outputs[0], xyz.inputs[0])
    # Millimetres from the glass centre.
    px = n.math("MULTIPLY", n.math("SUBTRACT", xyz.outputs[0], 0.5), GLASS_W, name="PX_MM")
    pz = n.math("MULTIPLY", n.math("SUBTRACT", xyz.outputs[1], 0.5), GLASS_H, name="PZ_MM")

    panel_d = rounded_rect_sdf(n, px, pz, DISPLAY_W / 2, DISPLAY_H / 2, DISPLAY_RADIUS)
    panel = n.math("SUBTRACT", 1.0, smoothstep(n, panel_d, -0.12, 0.12), name="PANEL_MASK")
    island_cz = DISPLAY_H / 2 - ISLAND_TOP - ISLAND_H / 2
    island_d = rounded_rect_sdf(n, px, n.math("SUBTRACT", pz, island_cz), ISLAND_W / 2, ISLAND_H / 2, ISLAND_H / 2)
    island = smoothstep(n, island_d, -0.1, 0.1)  # 1 outside the island
    mask = n.math("MULTIPLY", panel, island, name="DISPLAY_MASK")

    # Content coordinates 0..1 across the panel, zoomed about the centre.
    zoom = n.value("SCREEN_ZOOM", 1.0)
    cu = n.math("ADD", n.math("DIVIDE", n.math("DIVIDE", px, zoom), DISPLAY_W), 0.5, name="CU")
    cv = n.math("ADD", n.math("DIVIDE", n.math("DIVIDE", pz, zoom), DISPLAY_H), 0.5, name="CV")

    progress = n.value("SCREEN_PROGRESS", 0.0)
    # Screen 1 drifts left at a third of the speed and dims.
    u1 = n.math("ADD", cu, n.math("MULTIPLY", progress, 0.33))
    dim1 = n.math("SUBTRACT", 1.0, n.math("MULTIPLY", progress, 0.45))
    # Screen 2 slides in from the right edge.
    u2 = n.math("SUBTRACT", cu, n.math("SUBTRACT", 1.0, progress))
    edge = n.math("SUBTRACT", 1.0, progress)
    wipe = smoothstep(n, n.math("SUBTRACT", cu, edge), -0.015, 0.015)  # 1 where screen 2 shows

    def sample(name: str, image: bpy.types.Image, u, v):
        combine = n.add("ShaderNodeCombineXYZ", f"{name}_UV")
        n.link(u, combine.inputs[0])
        n.link(v, combine.inputs[1])
        mapping = n.add("ShaderNodeMapping", f"{name}_FIT", vector_type="POINT")
        n.link(combine.outputs[0], mapping.inputs["Vector"])
        tex = n.add("ShaderNodeTexImage", f"{name}_TEX", interpolation="Cubic", extension="EXTEND")
        tex.image = image
        n.link(mapping.outputs[0], tex.inputs[0])
        return tex.outputs["Color"]

    color1 = sample("SCREEN_01", bpy.data.images["SCREEN_01"], u1, cv)
    color2 = sample("SCREEN_02", bpy.data.images["SCREEN_02"], u2, cv)
    color1d = n.vmath("SCALE", color1, None)
    tree.links.new(dim1, [s for s in color1d.node.inputs if s.name == "Scale"][0])
    mixed = n.add("ShaderNodeMix", "SCREEN_MIX", data_type="RGBA", blend_type="MIX")
    n.link(wipe, mixed.inputs["Factor"])
    n.link(color1d, mixed.inputs[6])
    n.link(color2, mixed.inputs[7])

    brightness = n.value("SCREEN_BRIGHTNESS", 1.0)
    emission = n.vmath("SCALE", mixed.outputs[2], None)
    tree.links.new(n.math("MULTIPLY", mask, brightness, name="EMIT_GAIN"), [s for s in emission.node.inputs if s.name == "Scale"][0])

    bsdf = n.add("ShaderNodeBsdfPrincipled", "SCREEN_BSDF")
    bsdf.inputs["Base Color"].default_value = (0.004, 0.004, 0.005, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.06
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["IOR"].default_value = 1.5
    bsdf.inputs["Coat Weight"].default_value = 1.0
    bsdf.inputs["Coat Roughness"].default_value = 0.02
    bsdf.inputs["Emission Strength"].default_value = 2.4
    n.link(emission, bsdf.inputs["Emission Color"])
    out = n.add("ShaderNodeOutputMaterial", "OUT")
    n.link(bsdf.outputs[0], out.inputs[0])

    screen.data.materials.append(mat)
    return mat


def build_device(scene: bpy.types.Scene, controller: bpy.types.Object) -> tuple[bpy.types.Object, bpy.types.Object]:
    col = collection("DEVICE")
    root, glass = import_phone(col)
    screen = split_screen(glass, col)
    refine_materials()

    # CONTROLLER > DEVICE_ROOT (animated) > DEVICE_PIVOT (mm -> m, centred)
    device_root = empty("DEVICE_ROOT", col, "ARROWS", 0.08)
    pivot = empty("DEVICE_PIVOT", col, "PLAIN_AXES", 0.02)
    pivot.parent = device_root
    pivot.scale = (MM, MM, MM)
    pivot.location = (0.0, -PHONE_T_M / 2, 0.0)
    for obj in (root, screen):
        obj.parent = pivot
    device_root.parent = controller
    device_root.location = (0.0, 0.0, REST_Z)

    for obj in bpy.data.objects:
        if obj.type == "MESH" and obj.name.startswith("iPhone_"):
            # The GLB carries its own custom normals; smooth shading keeps them.
            if not obj.data.has_custom_normals:
                for poly in obj.data.polygons:
                    poly.use_smooth = True
            obj.visible_shadow = True
    build_screen_material(screen)

    focus = empty("FOCUS", col, "SPHERE", 0.01)
    focus.parent = device_root
    focus.location = (0.0, -PHONE_T_M / 2, 0.0)
    return device_root, focus


# --------------------------------------------------------------------------
# Environment and lights
# --------------------------------------------------------------------------


def build_environment(scene: bpy.types.Scene) -> None:
    col = collection("ENVIRONMENT")
    # Cyclorama: floor, a 0.5 m cove, a wall. Profile in (y, z), extruded in x.
    profile = [(-4.0, 0.0), (1.0, 0.0)]
    cove_r, cove_y = 0.5, 1.0
    for i in range(1, 17):
        a = math.radians(-90 + 90 * i / 16)
        profile.append((cove_y + cove_r * math.cos(a), cove_r + cove_r * math.sin(a)))
    profile.append((cove_y + cove_r, 3.0))

    bm = bmesh.new()
    rows = []
    for x in (-4.0, 4.0):
        rows.append([bm.verts.new((x, y, z)) for (y, z) in profile])
    for i in range(len(profile) - 1):
        bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new("STUDIO_CYC")
    bm.to_mesh(mesh)
    bm.free()
    for poly in mesh.polygons:
        poly.use_smooth = True
    cyc = bpy.data.objects.new("STUDIO_CYC", mesh)
    col.objects.link(cyc)
    # Faces must face the camera side (-y / +z): flip if needed.
    if mesh.polygons[0].normal.z < 0:
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
        bm.to_mesh(mesh)
        bm.free()

    mat = bpy.data.materials.new("STUDIO_CYC_MAT")
    mat.use_nodes = True
    b = principled(mat)
    b.inputs["Base Color"].default_value = (0.04, 0.041, 0.045, 1.0)
    b.inputs["Roughness"].default_value = 0.42
    b.inputs["Specular IOR Level"].default_value = 0.2
    mesh.materials.append(mat)

    world = bpy.data.worlds.new("STUDIO_WORLD")
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.03, 0.032, 0.036, 1.0)
    bg.inputs["Strength"].default_value = 1.0
    scene.world = world


def light(name: str, col: bpy.types.Collection, kind: str, location, aim, energy: float, color=(1, 1, 1), **props) -> bpy.types.Object:
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    for k, v in props.items():
        setattr(data, k, v)
    obj = bpy.data.objects.new(name, data)
    col.objects.link(obj)
    obj.location = location
    direction = Vector(aim) - Vector(location)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    obj["base_energy"] = energy
    return obj


def drive_energy(obj: bpy.types.Object, controller: bpy.types.Object, extra: str | None = None) -> None:
    """energy = base * light_intensity [* rim_boost], read from the controller."""
    fcurve = obj.data.driver_add("energy")
    driver = fcurve.driver
    driver.type = "SCRIPTED"
    var = driver.variables.new()
    var.name = "li"
    var.type = "SINGLE_PROP"
    var.targets[0].id = controller
    var.targets[0].data_path = '["light_intensity"]'
    expression = f'{obj["base_energy"]} * li'
    if extra:
        boost = driver.variables.new()
        boost.name = "rb"
        boost.type = "SINGLE_PROP"
        boost.targets[0].id = controller
        boost.targets[0].data_path = f'["{extra}"]'
        expression += " * rb"
    driver.expression = expression


def build_lights(controller: bpy.types.Object) -> None:
    """
    A five-light studio. Powers are small because the set is 1 m across
    and the floor is graphite: what matters is the ratio. The rims sit at
    the phone's height with a narrow spread so their beams graze the edges
    and carry on toward the camera instead of landing on the floor.
    """
    col = collection("LIGHTS")
    c = (0.0, 0.0, REST_Z)
    key_l = light("KEY", col, "AREA", (-0.62, -0.72, 0.62), c, 14.0, (1.0, 0.975, 0.94), shape="RECTANGLE", size=0.9, size_y=1.3, spread=math.radians(150))
    fill = light("FILL", col, "AREA", (0.95, -0.8, 0.28), c, 4.0, (0.9, 0.94, 1.0), shape="RECTANGLE", size=1.6, size_y=1.6, spread=math.radians(170))
    top = light("TOP_STRIP", col, "AREA", (0.05, -0.28, 0.98), (0.0, 0.0, REST_Z + 0.02), 5.0, (1.0, 1.0, 1.0), shape="RECTANGLE", size=1.5, size_y=0.22, spread=math.radians(120))
    rim_l = light("RIM_LEFT", col, "AREA", (-0.6, 0.55, REST_Z + 0.04), c, 22.0, (0.92, 0.96, 1.0), shape="RECTANGLE", size=0.06, size_y=0.9, spread=math.radians(30))
    rim_r = light("RIM_RIGHT", col, "AREA", (0.62, 0.5, REST_Z + 0.07), c, 18.0, (1.0, 0.97, 0.93), shape="RECTANGLE", size=0.06, size_y=0.9, spread=math.radians(30))
    bg = light("BACKGROUND_WASH", col, "AREA", (0.1, 0.25, 1.7), (0.05, 1.45, 0.55), 28.0, (0.95, 0.96, 1.0), shape="RECTANGLE", size=1.4, size_y=1.0, spread=math.radians(100))
    for obj in (key_l, fill, top, bg):
        drive_energy(obj, controller)
    # The rims exist for the titanium edges and the glass: light-link them to
    # the phone so their beams never paint the floor.
    device = bpy.data.collections["DEVICE"]
    for obj in (rim_l, rim_r):
        drive_energy(obj, controller, "rim_boost")
        obj.light_linking.receiver_collection = device


# --------------------------------------------------------------------------
# Camera
# --------------------------------------------------------------------------


def build_camera(scene: bpy.types.Scene, focus: bpy.types.Object) -> tuple[bpy.types.Object, bpy.types.Object]:
    col = collection("CAMERA")
    data = bpy.data.cameras.new("CAMERA")
    data.sensor_fit = "HORIZONTAL"
    data.sensor_width = 36.0
    data.lens = 65.0
    data.clip_start = 0.02
    data.clip_end = 50.0
    data.dof.use_dof = True
    data.dof.focus_object = focus
    data.dof.aperture_fstop = 2.8
    data.dof.aperture_blades = 9
    data.dof.aperture_rotation = math.radians(10)
    cam = bpy.data.objects.new("CAMERA", data)
    col.objects.link(cam)
    target = empty("CAMERA_TARGET", col, "SPHERE", 0.02)
    track = cam.constraints.new("TRACK_TO")
    track.target = target
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"
    scene.camera = cam
    return cam, target


# --------------------------------------------------------------------------
# Logo and text
# --------------------------------------------------------------------------


def emission_material(name: str, color=(1, 1, 1, 1), strength: float = 1.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    for node in list(tree.nodes):
        tree.nodes.remove(node)
    n = Nodes(tree)
    emit = n.add("ShaderNodeEmission", "EMIT")
    emit.inputs["Color"].default_value = color
    emit.inputs["Strength"].default_value = strength
    out = n.add("ShaderNodeOutputMaterial", "OUT")
    n.link(emit.outputs[0], out.inputs[0])
    return mat


def build_logo(cam: bpy.types.Object) -> bpy.types.Object:
    col = collection("LOGO")
    image = bpy.data.images["LOGO"]
    aspect = image.size[0] / image.size[1] if image.size[1] else 1.0
    # A unit quad with its origin on the left edge: scaling to any aspect
    # keeps the logo flush with the text under it.
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    for v in bm.verts:
        v.co.x += 0.5
    uv_layer = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for loop in f.loops:
            loop[uv_layer].uv = (loop.vert.co.x, loop.vert.co.y + 0.5)
    mesh = bpy.data.meshes.new("LOGO")
    bm.to_mesh(mesh)
    bm.free()
    logo = bpy.data.objects.new("LOGO", mesh)
    col.objects.link(logo)

    mat = bpy.data.materials.new("LOGO_MAT")
    mat.use_nodes = True
    mat.surface_render_method = "DITHERED"
    tree = mat.node_tree
    for node in list(tree.nodes):
        tree.nodes.remove(node)
    n = Nodes(tree)
    tex = n.add("ShaderNodeTexImage", "LOGO_TEX", interpolation="Cubic", extension="CLIP")
    tex.image = image
    alpha = n.value("LOGO_ALPHA", 1.0)
    emit = n.add("ShaderNodeEmission", "EMIT")
    emit.inputs["Strength"].default_value = 1.0
    n.link(tex.outputs["Color"], emit.inputs["Color"])
    transparent = n.add("ShaderNodeBsdfTransparent", "TRANSPARENT")
    mix = n.add("ShaderNodeMixShader", "MIX")
    n.link(n.math("MULTIPLY", tex.outputs["Alpha"], alpha, name="ALPHA_GAIN"), mix.inputs[0])
    n.link(transparent.outputs[0], mix.inputs[1])
    n.link(emit.outputs[0], mix.inputs[2])
    out = n.add("ShaderNodeOutputMaterial", "OUT")
    n.link(mix.outputs[0], out.inputs[0])
    mesh.materials.append(mat)

    logo.parent = cam
    logo.visible_shadow = False
    logo.visible_diffuse = False
    logo.visible_glossy = False
    logo["aspect"] = aspect
    return logo


def overlay_text_material(name: str, color=(1, 1, 1, 1)) -> bpy.types.Material:
    """Emissive and see-through: TEXT_ALPHA fades it in without ever going black."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.surface_render_method = "DITHERED"
    tree = mat.node_tree
    for node in list(tree.nodes):
        tree.nodes.remove(node)
    n = Nodes(tree)
    alpha = n.value("TEXT_ALPHA", 1.0)
    emit = n.add("ShaderNodeEmission", "EMIT")
    emit.inputs["Color"].default_value = color
    emit.inputs["Strength"].default_value = 1.0
    transparent = n.add("ShaderNodeBsdfTransparent", "TRANSPARENT")
    mix = n.add("ShaderNodeMixShader", "MIX")
    n.link(alpha, mix.inputs[0])
    n.link(transparent.outputs[0], mix.inputs[1])
    n.link(emit.outputs[0], mix.inputs[2])
    out = n.add("ShaderNodeOutputMaterial", "OUT")
    n.link(mix.outputs[0], out.inputs[0])
    return mat


def text_object(name: str, body: str, font_path: str, size: float, cam: bpy.types.Object, col: bpy.types.Collection, color=(1, 1, 1, 1)) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, type="FONT")
    curve.body = body
    curve.size = size
    curve.align_x = "LEFT"
    curve.align_y = "BOTTOM"
    curve.resolution_u = 6
    curve.fill_mode = "BOTH"
    try:
        curve.font = bpy.data.fonts.load(font_path, check_existing=True)
    except RuntimeError:
        pass
    obj = bpy.data.objects.new(name, curve)
    col.objects.link(obj)
    obj.data.materials.append(overlay_text_material(f"{name}_MAT", color))
    obj.parent = cam
    obj.visible_shadow = False
    obj.visible_diffuse = False
    obj.visible_glossy = False
    return obj


# --------------------------------------------------------------------------
# Animation
# --------------------------------------------------------------------------

OVERLAY_DEPTH = -0.66  # metres in front of the lens; matches the wide shots' focus


def animate(scene, device_root, cam, target, controller, logo, tagline, cta, screen_mat: bpy.types.Material) -> None:
    # ---- the phone --------------------------------------------------------
    R = REST_Z
    lying_z = FLOOR_GAP + PHONE_T_M / 2
    key_vec(device_root, "location", t(0.0), (0.00, 0.22, lying_z))
    key_vec(device_root, "rotation_euler", t(0.0), deg(-87, 0, 12))
    key_vec(device_root, "location", t(0.5), (0.00, 0.19, lying_z + 0.03))
    key_vec(device_root, "rotation_euler", t(0.5), deg(-70, 0, 34))
    key_vec(device_root, "location", t(1.8), (0.00, 0.00, R + 0.006))
    key_vec(device_root, "rotation_euler", t(1.8), deg(2.0, 0, -9))
    key_vec(device_root, "location", t(2.8), (0.00, 0.00, R))
    key_vec(device_root, "rotation_euler", t(2.8), deg(0, 0, 0))
    key_vec(device_root, "location", t(4.0), (0.00, 0.00, R))
    key_vec(device_root, "rotation_euler", t(4.0), deg(0, 0, 1.5))
    key_vec(device_root, "location", t(5.2), (-0.004, 0.00, R + 0.002))
    key_vec(device_root, "rotation_euler", t(5.2), deg(1.0, 0, -4))
    key_vec(device_root, "location", t(6.5), (0.00, 0.00, R))
    key_vec(device_root, "rotation_euler", t(6.5), deg(0.0, 0, -11))
    key_vec(device_root, "location", t(7.5), (0.00, 0.00, R + 0.003))
    key_vec(device_root, "rotation_euler", t(7.5), deg(2.0, 0, -19))
    key_vec(device_root, "location", t(10.0), (0.00, 0.00, R + 0.006))
    key_vec(device_root, "rotation_euler", t(10.0), deg(2.5, 0, -23))

    # ---- the camera -------------------------------------------------------
    key_vec(cam, "location", t(0.0), (0.06, -0.66, R + 0.13))
    key_vec(target, "location", t(0.0), (0.0, 0.03, R - 0.02))
    key_vec(cam, "location", t(1.8), (0.045, -0.62, R + 0.09))
    key_vec(target, "location", t(1.8), (0.0, 0.0, R + 0.005))
    key_vec(cam, "location", t(2.8), (0.03, -0.54, R + 0.05))
    key_vec(target, "location", t(2.8), (0.0, 0.0, R + 0.01))
    key_vec(cam, "location", t(4.0), (0.006, -0.37, R + 0.014))
    key_vec(target, "location", t(4.0), (0.0, 0.0, R + 0.012))
    key_vec(cam, "location", t(5.2), (-0.04, -0.385, R + 0.006))
    key_vec(target, "location", t(5.2), (-0.004, 0.0, R + 0.006))
    key_vec(cam, "location", t(6.5), (0.13, -0.64, R + 0.10))
    key_vec(target, "location", t(6.5), (-0.085, 0.0, R + 0.012))
    key_vec(cam, "location", t(7.5), (0.15, -0.66, R + 0.095))
    key_vec(target, "location", t(7.5), (-0.09, 0.0, R + 0.012))
    key_vec(cam, "location", t(10.0), (0.17, -0.72, R + 0.11))
    key_vec(target, "location", t(10.0), (-0.095, 0.0, R + 0.014))
    add_noise(cam, "location", strength=0.0035, scale=38.0, phase=1.0)

    dof = cam.data.dof
    key(dof, "aperture_fstop", t(0.0), 2.8)
    key(dof, "aperture_fstop", t(2.8), 2.8)
    key(dof, "aperture_fstop", t(4.0), 5.0)
    key(dof, "aperture_fstop", t(5.2), 5.0)
    key(dof, "aperture_fstop", t(6.5), 3.2)
    key(dof, "aperture_fstop", t(7.5), 4.5)
    key(dof, "aperture_fstop", t(10.0), 4.5)

    # ---- the screen -------------------------------------------------------
    nodes = screen_mat.node_tree.nodes
    brightness = nodes["SCREEN_BRIGHTNESS"].outputs[0]
    zoom = nodes["SCREEN_ZOOM"].outputs[0]
    progress = nodes["SCREEN_PROGRESS"].outputs[0]
    key(brightness, "default_value", t(0.0), 0.0)
    key(brightness, "default_value", t(2.7), 0.0, interp="CUBIC", easing="EASE_IN_OUT")
    key(brightness, "default_value", t(3.25), 1.0)
    key(zoom, "default_value", t(2.7), 1.07, interp="QUART", easing="EASE_OUT")
    key(zoom, "default_value", t(4.0), 1.0)
    key(progress, "default_value", t(4.05), 0.0, interp="QUART", easing="EASE_IN_OUT")
    key(progress, "default_value", t(5.0), 1.0)

    # ---- rim lights breathe up for the edge beat ---------------------------
    key(controller, '["rim_boost"]', t(6.4), 1.0, interp="SINE", easing="EASE_IN_OUT")
    key(controller, '["rim_boost"]', t(7.4), 1.7)
    key(controller, '["rim_boost"]', t(10.0), 1.5)

    # ---- logo, tagline, CTA in camera space --------------------------------
    logo_alpha = logo.data.materials[0].node_tree.nodes["LOGO_ALPHA"].outputs[0]
    logo_size = 0.052
    key(logo_alpha, "default_value", t(7.5), 0.0, interp="QUART", easing="EASE_OUT")
    key(logo_alpha, "default_value", t(8.2), 1.0)
    key_vec(logo, "location", t(7.5), (-0.176, 0.062, OVERLAY_DEPTH), interp="QUART", easing="EASE_OUT")
    key_vec(logo, "location", t(8.2), (-0.176, 0.052, OVERLAY_DEPTH))
    key_vec(logo, "scale", t(7.5), (logo_size * 0.86 * logo["aspect"], logo_size * 0.86, 1.0), interp="QUART", easing="EASE_OUT")
    key_vec(logo, "scale", t(8.2), (logo_size * logo["aspect"], logo_size, 1.0))

    for obj, start, end, y in ((tagline, 7.9, 8.6, -0.004), (cta, 8.5, 9.2, -0.040)):
        alpha = obj.data.materials[0].node_tree.nodes["TEXT_ALPHA"].outputs[0]
        key(alpha, "default_value", t(start), 0.0, interp="QUART", easing="EASE_OUT")
        key(alpha, "default_value", t(end), 1.0)
        key_vec(obj, "location", t(start), (-0.176, y - 0.008, OVERLAY_DEPTH), interp="QUART", easing="EASE_OUT")
        key_vec(obj, "location", t(end), (-0.176, y, OVERLAY_DEPTH))

    # ---- exit: the set goes to black under the last camera drift -----------
    key(scene.view_settings, "exposure", t(9.45), 0.0, interp="SINE", easing="EASE_IN")
    key(scene.view_settings, "exposure", t(10.0), -9.0)


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------


def build() -> None:
    scene = reset_scene()
    configure_render(scene)

    controls = collection("CONTROLS")
    controller = empty("TEMPLATE_CONTROLLER", controls, "CUBE", 0.03)
    controller["light_intensity"] = 1.0
    controller["rim_boost"] = 1.0
    controller.id_properties_ui("light_intensity").update(min=0.0, max=5.0, description="Multiplies every light")
    controller.id_properties_ui("rim_boost").update(min=0.0, max=5.0, description="Multiplies the two rim lights (animated)")

    screens = collection("SCREENS")
    load_image("SCREEN_01", "SCREEN_01.png")
    load_image("SCREEN_02", "SCREEN_02.png")
    load_image("LOGO", "LOGO.png")
    # A reference holder so the images have a home in the outliner.
    holder = empty("SCREENS_ANCHOR", screens, "PLAIN_AXES", 0.01)
    holder.hide_render = True
    holder.hide_viewport = True

    device_root, focus = build_device(scene, controller)
    build_environment(scene)
    build_lights(controller)
    cam, target = build_camera(scene, focus)
    logo = build_logo(cam)
    texts = collection("TEXT")
    tagline = text_object("TEXT_TAGLINE", "Do more, faster.", FONT_BOLD, 0.021, cam, texts)
    cta = text_object("TEXT_CTA", "Download on the App Store", FONT_REGULAR, 0.0105, cam, texts, (0.82, 0.84, 0.9, 1))

    animate(scene, device_root, cam, target, controller, logo, tagline, cta, bpy.data.materials["SCREEN_MAT"])

    scene.frame_set(FRAME_START)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND, relative_remap=True, compress=True)
    print("saved", BLEND, os.path.getsize(BLEND), "bytes")


if __name__ == "__main__":
    build()
