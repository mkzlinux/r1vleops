class_name CampusBuilding
extends Node3D
## One clickable department building with a floating label showing new/active counts.
## Emits `selected` on click and `hovered` on mouse enter/exit; it never reaches up to the campus.

signal selected(site_id: String)
signal hovered(site_id: String, is_over: bool)

const LABEL_HEIGHTS: Dictionary = {"security": 11.5, "intelligence": 11.2, "creative": 7.2, "hq": 4.6}
const HIT_SIZES: Dictionary = {
	"security": Vector3(7, 10, 7), "intelligence": Vector3(8, 10, 6),
	"creative": Vector3(9, 7, 7), "hq": Vector3(7, 4, 5),
}

var site_id: String = ""
var is_lit: bool = false:
	set(v):
		is_lit = v
		_apply_lit()

var _title: Label3D
var _counts: Label3D
var _glow_materials: Array[StandardMaterial3D] = []
var _spinner: Node3D


static func create(id: String) -> CampusBuilding:
	var b := CampusBuilding.new()
	b.site_id = id
	b.name = id.capitalize()
	return b


func _ready() -> void:
	position = WorldBuilder.SITE_POSITIONS.get(site_id, Vector3.ZERO)
	match site_id:
		"security": _build_security()
		"intelligence": _build_intelligence()
		"creative": _build_creative()
		_: _build_hq()
	_build_hitbox()
	_build_labels()


func _process(delta: float) -> void:
	var target: float = 1.05 if is_lit else 1.0
	scale = scale.lerp(Vector3.ONE * target, 1.0 - exp(-10.0 * delta))
	if _spinner != null:
		_spinner.rotate_y(delta * (0.7 if is_lit else 0.2))
	var pulse: float = 1.4 + sin(Time.get_ticks_msec() / 450.0) * 0.4 + (1.2 if is_lit else 0.0)
	for m: StandardMaterial3D in _glow_materials:
		m.emission_energy_multiplier = pulse


func set_counts(pending: int, active: int) -> void:
	if _counts == null:
		return
	var parts: PackedStringArray = []
	if pending > 0:
		parts.append("%d new" % pending)
	parts.append("%d active" % active)
	_counts.text = "  ·  ".join(parts)
	_counts.modulate = OpsUI.LIME if pending > 0 else Color(1, 1, 1, 0.85)


func _apply_lit() -> void:
	if _title != null:
		_title.modulate = Color.WHITE if is_lit else Color(1, 1, 1, 0.9)
		var accent: Color = OpsUI.ROOM_ACCENTS.get(site_id, Color.WHITE)
		_title.outline_modulate = Color(accent, 0.6) if is_lit else Color(0, 0, 0, 0.55)


func _build_hitbox() -> void:
	var body := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	var size: Vector3 = HIT_SIZES.get(site_id, Vector3(6, 6, 6))
	box.size = size
	shape.shape = box
	shape.position = Vector3(0, size.y / 2.0, 0)
	body.add_child(shape)
	body.input_ray_pickable = true
	body.mouse_entered.connect(func() -> void: hovered.emit(site_id, true))
	body.mouse_exited.connect(func() -> void: hovered.emit(site_id, false))
	body.input_event.connect(_on_input_event)
	add_child(body)


func _on_input_event(_camera: Node, event: InputEvent, _pos: Vector3, _normal: Vector3, _idx: int) -> void:
	var mb := event as InputEventMouseButton
	if mb != null and mb.button_index == MOUSE_BUTTON_LEFT and mb.pressed:
		selected.emit(site_id)
	var touch := event as InputEventScreenTouch
	if touch != null and touch.pressed:
		selected.emit(site_id)


func _build_labels() -> void:
	var h: float = LABEL_HEIGHTS.get(site_id, 6.0)
	_title = _make_label(OpsUI.ROOM_NAMES.get(site_id, site_id).to_upper(), 34, Vector3(0, h + 0.9, 0))
	_counts = _make_label("", 26, Vector3(0, h, 0))
	add_child(_title)
	add_child(_counts)
	_apply_lit()


func _make_label(text: String, font_size: int, pos: Vector3) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.position = pos
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.no_depth_test = true
	l.fixed_size = true
	l.pixel_size = 0.0005
	l.font_size = font_size
	l.outline_size = 10
	l.outline_modulate = Color(0, 0, 0, 0.55)
	return l


func _plinth(mesh: Mesh, y: float) -> void:
	add_child(WorldBuilder.mesh_instance(mesh, WorldBuilder.material(Color("#e9ebe6"), 0.75), Vector3(0, y, 0)))


## SECURITY: obsidian hexagonal vault in three tiers, banded with pulsing red light.
func _build_security() -> void:
	var base := CylinderMesh.new()
	base.top_radius = 4.4
	base.bottom_radius = 4.6
	base.height = 0.4
	base.radial_segments = 6
	_plinth(base, 0.2)
	var obsidian: StandardMaterial3D = WorldBuilder.material(Color("#1d1f24"), 0.18, 0.85)
	var band: StandardMaterial3D = WorldBuilder.emissive(Color("#ff4d3d"), 1.6)
	_glow_materials.append(band)
	var tiers: Array[Vector3] = [Vector3(2.9, 3.2, 1.6), Vector3(2.4, 2.7, 4.3), Vector3(1.9, 2.2, 7.0)]
	for t: Vector3 in tiers:
		var c := CylinderMesh.new()
		c.top_radius = t.x
		c.bottom_radius = t.y
		c.height = 2.6
		c.radial_segments = 6
		add_child(WorldBuilder.mesh_instance(c, obsidian, Vector3(0, t.z, 0)))
		var ring := CylinderMesh.new()
		ring.top_radius = t.x + 0.05
		ring.bottom_radius = t.x + 0.05
		ring.height = 0.12
		ring.radial_segments = 6
		add_child(WorldBuilder.mesh_instance(ring, band, Vector3(0, t.z + 1.32, 0)))
	var mast := CylinderMesh.new()
	mast.top_radius = 0.06
	mast.bottom_radius = 0.06
	mast.height = 2.2
	add_child(WorldBuilder.mesh_instance(mast, band, Vector3(0, 9.4, 0)))


## INTELLIGENCE: a cluster of glass blocks with lime frames and rooftop gardens.
func _build_intelligence() -> void:
	var base := BoxMesh.new()
	base.size = Vector3(8, 0.3, 6)
	add_child(WorldBuilder.mesh_instance(base, WorldBuilder.material(Color("#e9ebe6"), 0.75), Vector3(0, 0.15, -0.5)))
	var glass: StandardMaterial3D = WorldBuilder.glass(Color("#dfe9e2"), 0.45)
	var frame: StandardMaterial3D = WorldBuilder.emissive(OpsUI.LIME, 0.9)
	_glow_materials.append(frame)
	var garden: StandardMaterial3D = WorldBuilder.material(Color("#4d6b3c"), 0.9)
	var blocks: Array[Vector4] = [  # x, z, height, (unused)
		Vector4(-2.2, -1.6, 6, 0), Vector4(0, -1.6, 9.5, 0), Vector4(2.2, -1.6, 4.5, 0),
		Vector4(-2.2, 0.6, 3.5, 0), Vector4(0, 0.6, 7, 0), Vector4(2.2, 0.6, 5.5, 0),
	]
	for i: int in blocks.size():
		var b: Vector4 = blocks[i]
		var box := BoxMesh.new()
		box.size = Vector3(2, b.z, 2)
		add_child(WorldBuilder.mesh_instance(box, glass, Vector3(b.x, b.z / 2.0 + 0.3, b.y)))
		var cap := BoxMesh.new()
		cap.size = Vector3(2.06, 0.08, 2.06)
		add_child(WorldBuilder.mesh_instance(cap, frame, Vector3(b.x, b.z + 0.3, b.y)))
		if i % 2 == 0:
			var bush := SphereMesh.new()
			bush.radius = 0.8
			bush.height = 1.2
			bush.radial_segments = 6
			bush.rings = 3
			add_child(WorldBuilder.mesh_instance(bush, garden, Vector3(b.x, b.z + 0.8, b.y)))


## CREATIVE STUDIO: curved white pavilion beside a slowly turning violet portal.
func _build_creative() -> void:
	var base := CylinderMesh.new()
	base.top_radius = 4.6
	base.bottom_radius = 4.8
	base.height = 0.3
	_plinth(base, 0.15)
	var shell := CSGCylinder3D.new()
	shell.radius = 2.4
	shell.height = 6.0
	shell.sides = 40
	shell.rotation_degrees = Vector3(0, 0, 90)
	shell.position = Vector3(-0.8, 0.3, 0)
	shell.material = WorldBuilder.material(Color("#f6f6f4"), 0.35)
	var cut := CSGBox3D.new()
	cut.size = Vector3(5, 7, 5)
	cut.position = Vector3(-2.5, 0, 0)  # rotated 90° about Z, local -X is world down: removes the lower half
	cut.operation = CSGShape3D.OPERATION_SUBTRACTION
	shell.add_child(cut)
	add_child(shell)

	_spinner = Node3D.new()
	_spinner.position = Vector3(2.6, 3.6, 0.4)
	var frame := CSGBox3D.new()
	frame.size = Vector3(5, 5, 0.6)
	frame.material = WorldBuilder.emissive(OpsUI.VIOLET, 0.8)
	_glow_materials.append(frame.material as StandardMaterial3D)
	var hole := CSGBox3D.new()
	hole.size = Vector3(3.6, 3.6, 1.0)
	hole.operation = CSGShape3D.OPERATION_SUBTRACTION
	frame.add_child(hole)
	_spinner.add_child(frame)
	add_child(_spinner)


## FOUNDER HQ: glass box under a floating white roof slab with a red core.
func _build_hq() -> void:
	var base := BoxMesh.new()
	base.size = Vector3(7, 0.3, 5)
	_plinth(base, 0.15)
	var body := BoxMesh.new()
	body.size = Vector3(5, 2.6, 3.2)
	add_child(WorldBuilder.mesh_instance(body, WorldBuilder.glass(Color("#cfe0ff"), 0.5), Vector3(0, 1.6, 0)))
	var roof := BoxMesh.new()
	roof.size = Vector3(6.4, 0.35, 4.4)
	add_child(WorldBuilder.mesh_instance(roof, WorldBuilder.material(Color.WHITE, 0.4), Vector3(0, 3.1, 0)))
	var core := SphereMesh.new()
	core.radius = 0.45
	core.height = 0.9
	var core_mat: StandardMaterial3D = WorldBuilder.emissive(Color("#e0403a"), 1.2)
	_glow_materials.append(core_mat)
	add_child(WorldBuilder.mesh_instance(core, core_mat, Vector3(0, 1.4, 0)))
