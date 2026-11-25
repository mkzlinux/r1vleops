class_name WorldBuilder
extends RefCounted
## Builds the campus landscape procedurally: island, river, roads, farm field and trees.
## Pure construction helpers — no per-frame logic.

const ISLAND_RADIUS: float = 34.0
const SITE_POSITIONS: Dictionary = {
	"hq": Vector3(0, 0, 0),
	"security": Vector3(-10, 0, -3),
	"intelligence": Vector3(10, 0, -6),
	"creative": Vector3(5, 0, 7),
}
const FARM_POSITION: Vector3 = Vector3(-9, 0, 7)


## River bank as world z for a given x. Land is where z < bank_z(x).
static func bank_z(x: float) -> float:
	return 13.0 + sin(x * 0.12) * 2.2


static func material(color: Color, roughness: float = 0.9, metallic: float = 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = roughness
	m.metallic = metallic
	return m


static func emissive(color: Color, energy: float = 2.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.emission_enabled = true
	m.emission = color
	m.emission_energy_multiplier = energy
	return m


static func glass(color: Color, alpha: float = 0.45) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(color, alpha)
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.roughness = 0.05
	m.metallic = 0.2
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	return m


static func mesh_instance(mesh: Mesh, mat: Material, pos: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	return mi


## Island outline in world XZ: a disc clipped by the river bank.
static func island_outline(steps: int = 120) -> PackedVector2Array:
	var poly := PackedVector2Array()
	for i: int in steps:
		var a: float = float(i) / steps * TAU
		var x: float = cos(a) * ISLAND_RADIUS
		poly.append(Vector2(x, minf(sin(a) * ISLAND_RADIUS, bank_z(x))))
	return poly


## Island mesh: triangulated top face at y=0 plus vertical banks down to y=-1.2.
static func build_island() -> MeshInstance3D:
	var outline: PackedVector2Array = island_outline()
	var tris: PackedInt32Array = Geometry2D.triangulate_polygon(outline)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_normal(Vector3.UP)
	for i: int in range(0, tris.size(), 3):
		var a: Vector2 = outline[tris[i]]
		var b: Vector2 = outline[tris[i + 1]]
		var c: Vector2 = outline[tris[i + 2]]
		var pa := Vector3(a.x, 0, a.y)
		var pb := Vector3(b.x, 0, b.y)
		var pc := Vector3(c.x, 0, c.y)
		if (pb - pa).cross(pc - pa).y < 0.0:  # keep every top triangle facing up
			var tmp: Vector3 = pb
			pb = pc
			pc = tmp
		for p: Vector3 in [pa, pb, pc]:
			st.add_vertex(p)
	var depth: float = 1.2
	for i: int in outline.size():
		var p0: Vector2 = outline[i]
		var p1: Vector2 = outline[(i + 1) % outline.size()]
		var normal := Vector3(p1.y - p0.y, 0, -(p1.x - p0.x)).normalized()
		var mid: Vector2 = (p0 + p1) / 2.0
		if normal.dot(Vector3(mid.x, 0, mid.y)) < 0.0:
			normal = -normal
		st.set_normal(normal)
		var top0 := Vector3(p0.x, 0, p0.y)
		var top1 := Vector3(p1.x, 0, p1.y)
		var bot0: Vector3 = top0 + Vector3(0, -depth, 0)
		var bot1: Vector3 = top1 + Vector3(0, -depth, 0)
		for p: Vector3 in [top0, bot0, top1, top1, bot0, bot1]:
			st.add_vertex(p)
	var mat: StandardMaterial3D = material(Color("#7f9168"), 0.95)
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return mesh_instance(st.commit(), mat)


static func build_water() -> MeshInstance3D:
	var slab := BoxMesh.new()
	slab.size = Vector3(400, 0.2, 400)
	var water: StandardMaterial3D = material(Color("#4a5f63"))
	water.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED  # lit water mirrors the pale sky and washes out
	return mesh_instance(slab, water, Vector3(0, -1.0, 0))


static func build_roads() -> Node3D:
	var root := Node3D.new()
	var road_mat: StandardMaterial3D = material(Color("#d6d8d1"), 0.9)
	var ring := TorusMesh.new()
	ring.inner_radius = 6.2
	ring.outer_radius = 7.2
	ring.rings = 48
	var ring_mi: MeshInstance3D = mesh_instance(ring, road_mat, Vector3(0, 0.02, 0))
	ring_mi.scale = Vector3(1, 0.02, 1)
	root.add_child(ring_mi)
	for id: String in SITE_POSITIONS:
		var p: Vector3 = SITE_POSITIONS[id]
		var length: float = Vector2(p.x, p.z).length()
		if length < 1.0:
			continue
		var strip := BoxMesh.new()
		strip.size = Vector3(1.0, 0.04, length)
		var mi: MeshInstance3D = mesh_instance(strip, road_mat, Vector3(p.x / 2.0, 0.02, p.z / 2.0))
		mi.rotation.y = atan2(p.x, p.z)
		root.add_child(mi)
	return root


static func build_farm() -> Node3D:
	var root := Node3D.new()
	root.position = FARM_POSITION
	root.rotation.y = 0.35
	var rows: int = 9
	for i: int in rows:
		var row := BoxMesh.new()
		row.size = Vector3(8, 0.12, 0.5)
		var color: Color = Color("#a7b85c") if i % 2 == 1 else Color("#6f8b3a")
		root.add_child(mesh_instance(row, material(color, 1.0), Vector3(0, 0.06, (i - rows / 2.0) * 0.75)))
	var tag := Label3D.new()
	tag.text = "ZIFARMCHAIN\npre-launch"
	tag.position = Vector3(0, 1.6, 0)
	tag.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	tag.no_depth_test = true
	tag.fixed_size = true
	tag.pixel_size = 0.0005
	tag.font_size = 30
	tag.outline_size = 8
	tag.outline_modulate = Color(0, 0, 0, 0.55)
	root.add_child(tag)
	return root


## Low-poly trees as one MultiMesh, scattered deterministically away from sites, roads and river.
static func build_trees(count: int = 320) -> MultiMeshInstance3D:
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var keepouts: Array[Vector3] = []
	for id: String in SITE_POSITIONS:
		keepouts.append(SITE_POSITIONS[id])
	keepouts.append(FARM_POSITION)
	var palette: Array[Color] = [Color("#3f5a35"), Color("#4c6b3e"), Color("#5a7a45"), Color("#34492d"), Color("#6b8a4e")]
	var transforms: Array[Transform3D] = []
	var colors: Array[Color] = []
	var guard: int = 0
	while transforms.size() < count and guard < count * 20:
		guard += 1
		var a: float = rng.randf() * TAU
		var r: float = sqrt(rng.randf()) * (ISLAND_RADIUS - 1.5)
		var x: float = cos(a) * r
		var z: float = sin(a) * r
		if z > bank_z(x) - 1.2:
			continue
		var d: float = Vector2(x, z).length()
		if d > 5.5 and d < 8.0:
			continue
		var blocked: bool = false
		for k: Vector3 in keepouts:
			if Vector2(x - k.x, z - k.z).length() < 6.0:
				blocked = true
				break
		if blocked:
			continue
		var s: float = 0.5 + rng.randf() * 0.9
		var basis := Basis.from_scale(Vector3(s, s * 1.25, s)).rotated(Vector3.UP, rng.randf() * TAU)
		transforms.append(Transform3D(basis, Vector3(x, s * 0.9, z)))
		colors.append(palette[rng.randi() % palette.size()])

	var sphere := SphereMesh.new()
	sphere.radial_segments = 6
	sphere.rings = 3
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.vertex_color_is_srgb = true
	mat.roughness = 0.9
	sphere.material = mat

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = sphere
	mm.instance_count = transforms.size()
	for i: int in transforms.size():
		mm.set_instance_transform(i, transforms[i])
		mm.set_instance_color(i, colors[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	return mmi


static func build_environment(sky_top: Color, horizon: Color, fog_color: Color, fog_density: float = 0.0035) -> WorldEnvironment:
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = sky_top
	sky_mat.sky_horizon_color = horizon
	sky_mat.ground_bottom_color = horizon.darkened(0.2)
	sky_mat.ground_horizon_color = horizon
	var sky := Sky.new()
	sky.sky_material = sky_mat
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.45
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 0.95
	env.fog_enabled = true
	env.fog_light_color = fog_color
	env.fog_density = fog_density
	env.glow_enabled = true
	env.glow_intensity = 0.25
	var we := WorldEnvironment.new()
	we.environment = env
	return we


static func build_sun(energy: float = 1.15) -> DirectionalLight3D:
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-52, 35, 0)
	sun.light_energy = energy
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 90.0
	return sun
