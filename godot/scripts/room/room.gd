extends Node3D
## Department room: a dark studio with a glowing grid floor, cove-lit back wall, an "open work"
## screen and one desk per worker. The camera dollies in on entry. Esc returns to campus.

const GRID_SHADER: String = """
shader_type spatial;
uniform vec3 base_color : source_color = vec3(0.105, 0.118, 0.137);
uniform vec3 minor_color : source_color = vec3(0.17, 0.18, 0.21);
uniform vec3 accent : source_color = vec3(0.78, 0.96, 0.23);
varying vec3 world_pos;
float grid_line(vec2 p) {
	vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
	return 1.0 - min(min(g.x, g.y), 1.0);
}
void vertex() { world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
	float fade = clamp(1.0 - length(world_pos.xz) / 26.0, 0.0, 1.0);
	ALBEDO = base_color + minor_color * grid_line(world_pos.xz) * 0.6 * fade;
	EMISSION = accent * grid_line(world_pos.xz / 4.0) * 0.9 * fade;
	ROUGHNESS = 0.6;
}
"""
const DESK_SPACING: float = 3.2
const CAMERA_START: Vector3 = Vector3(0, 9, 26)
const CAMERA_REST: Vector3 = Vector3(0, 4.4, 13)
const LOOK_AT: Vector3 = Vector3(0, 2.6, -3)

var room_id: String = "hq"
var _accent: Color = Color.WHITE
var _camera: Camera3D
var _screen_count: Label3D
var _desks: Node3D
var _avatars: Array[Dictionary] = []  # {node: MeshInstance3D, busy: bool, phase: float}
var _hud: RoomHud
var _entered: bool = false


func _ready() -> void:
	room_id = Session.room_id if Session.room_id != "" else "hq"
	_accent = OpsUI.ROOM_ACCENTS.get(room_id, Color.WHITE)
	_build_shell()
	_desks = Node3D.new()
	add_child(_desks)
	_build_camera()

	var layer := CanvasLayer.new()
	_hud = RoomHud.new()
	_hud.room_id = room_id
	_hud.preselect_order_id = Session.order_id
	_hud.back_requested.connect(func() -> void: Session.go_to_campus())
	layer.add_child(_hud)
	add_child(layer)

	OpsApi.snapshot_changed.connect(_render)
	_render(OpsApi.snapshot)


func _process(_delta: float) -> void:
	var t: float = Time.get_ticks_msec() / 1000.0
	for a: Dictionary in _avatars:
		var node: Node3D = a["node"]
		var speed: float = 3.0 if a["busy"] else 1.2
		node.position.y = 1.55 + sin(t * speed + float(a["phase"])) * 0.06
	if _entered:
		var view: Vector2 = get_viewport().get_visible_rect().size
		var mouse: Vector2 = get_viewport().get_mouse_position() / view - Vector2(0.5, 0.5)
		var sway: float = sin(t * 0.25) * 0.6
		_camera.position = _camera.position.lerp(CAMERA_REST + Vector3(sway + mouse.x * 2.4, -mouse.y * 0.8, 0), 0.04)
		_camera.look_at(LOOK_AT, Vector3.UP)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed(&"ui_cancel"):
		get_viewport().set_input_as_handled()
		Session.go_to_campus()


func _render(_snapshot: Dictionary) -> void:
	var stats: Dictionary = OpsApi.room_stats(room_id)
	_screen_count.text = "%02d" % (int(stats.get("requests", 0)) + int(stats.get("active", 0)))
	_build_desks(OpsApi.workers_for(room_id))
	_hud.render()


func _build_shell() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#14161a")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#2a2e35")
	env.ambient_light_energy = 1.0
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_light_color = Color("#14161a")
	env.fog_density = 0.03
	env.glow_enabled = true
	env.glow_intensity = 0.8
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	var spot := SpotLight3D.new()
	spot.position = Vector3(0, 12, 6)
	spot.rotation_degrees = Vector3(-62, 0, 0)
	spot.spot_angle = 45.0
	spot.light_energy = 6.0
	spot.spot_range = 30.0
	spot.shadow_enabled = true
	add_child(spot)
	var wash := OmniLight3D.new()
	wash.position = Vector3(0, 4, -4.5)
	wash.light_color = _accent
	wash.light_energy = 2.5
	wash.omni_range = 16.0
	add_child(wash)

	var floor_mesh := PlaneMesh.new()
	floor_mesh.size = Vector2(60, 60)
	var shader := Shader.new()
	shader.code = GRID_SHADER
	var grid := ShaderMaterial.new()
	grid.shader = shader
	grid.set_shader_parameter("accent", _accent)
	add_child(WorldBuilder.mesh_instance(floor_mesh, grid))

	var wall := BoxMesh.new()
	wall.size = Vector3(24, 8, 0.2)
	add_child(WorldBuilder.mesh_instance(wall, WorldBuilder.material(Color("#0f1114"), 0.25, 0.6), Vector3(0, 4, -6)))
	var strip_mat: StandardMaterial3D = WorldBuilder.emissive(_accent, 2.0)
	for y: float in [0.15, 7.85]:
		var strip := BoxMesh.new()
		strip.size = Vector3(24, 0.06, 0.05)
		add_child(WorldBuilder.mesh_instance(strip, strip_mat, Vector3(0, y, -5.85)))
	var frame := BoxMesh.new()
	frame.size = Vector3(7.4, 3.0, 0.04)
	add_child(WorldBuilder.mesh_instance(frame, WorldBuilder.emissive(_accent, 0.6), Vector3(0, 4.4, -5.88)))
	var screen := BoxMesh.new()
	screen.size = Vector3(7.2, 2.8, 0.05)
	add_child(WorldBuilder.mesh_instance(screen, WorldBuilder.material(Color("#07080a"), 0.3), Vector3(0, 4.4, -5.85)))

	var caption: Label3D = _wall_text("OPEN WORK", 40, Vector3(0, 5.3, -5.8))
	caption.modulate = Color(1, 1, 1, 0.7)
	add_child(caption)
	_screen_count = _wall_text("00", 220, Vector3(0, 4.1, -5.8))
	_screen_count.modulate = _accent
	add_child(_screen_count)


func _wall_text(text: String, size: int, pos: Vector3) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.font_size = size
	l.pixel_size = 0.006
	l.position = pos
	l.shaded = false
	return l


func _build_camera() -> void:
	_camera = Camera3D.new()
	_camera.fov = 42.0
	_camera.position = CAMERA_START
	add_child(_camera)
	_camera.make_current()
	_camera.look_at(LOOK_AT, Vector3.UP)
	var tween: Tween = create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_method(_dolly, 0.0, 1.0, 2.2)
	tween.finished.connect(func() -> void: _entered = true)


func _dolly(t: float) -> void:
	_camera.position = CAMERA_START.lerp(CAMERA_REST, t)
	_camera.look_at(LOOK_AT, Vector3.UP)


func _build_desks(workers: Array) -> void:
	OpsUI.clear(_desks)
	_avatars.clear()
	var offset: float = (workers.size() - 1) * DESK_SPACING / 2.0
	_desks.position = Vector3(-offset, 0, -1.5)
	var desk_mat: StandardMaterial3D = WorldBuilder.material(Color("#e9e9e6"), 0.4)
	var leg_mat: StandardMaterial3D = WorldBuilder.material(Color("#c9c9c5"), 0.6)
	for i: int in workers.size():
		var w: Dictionary = workers[i]
		var x: float = i * DESK_SPACING
		var is_busy: bool = w.get("status", "") == "busy"
		var top := BoxMesh.new()
		top.size = Vector3(2.4, 0.12, 1.2)
		_desks.add_child(WorldBuilder.mesh_instance(top, desk_mat, Vector3(x, 0.95, 0.4)))
		for side: float in [-1.05, 1.05]:
			var leg := BoxMesh.new()
			leg.size = Vector3(0.08, 0.95, 1.1)
			_desks.add_child(WorldBuilder.mesh_instance(leg, leg_mat, Vector3(x + side, 0.48, 0.4)))
		var monitor := BoxMesh.new()
		monitor.size = Vector3(1.5, 0.85, 0.05)
		_desks.add_child(WorldBuilder.mesh_instance(monitor, WorldBuilder.emissive(_accent, 0.55 if is_busy else 0.25), Vector3(x, 1.5, -0.05)))
		var capsule := CapsuleMesh.new()
		capsule.radius = 0.32
		capsule.height = 1.24
		var is_human: bool = w.get("kind", "") == "human"
		var body_mat: StandardMaterial3D = WorldBuilder.material(Color("#f2e3d5"), 0.5) if is_human else WorldBuilder.emissive(_accent.lerp(Color.WHITE, 0.4), 1.2)
		var avatar: MeshInstance3D = WorldBuilder.mesh_instance(capsule, body_mat, Vector3(x, 1.55, 1.3))
		_desks.add_child(avatar)
		_avatars.append({"node": avatar, "busy": is_busy, "phase": x})
		_add_click_target(avatar, w)
		var tag := Label3D.new()
		tag.text = "%s\n%s" % [str(w.get("name", "")), str(w.get("status", ""))]
		tag.position = Vector3(x, 2.7, 1.3)
		tag.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		tag.no_depth_test = true
		tag.fixed_size = true
		tag.pixel_size = 0.001
		tag.font_size = 24
		tag.outline_size = 8
		tag.outline_modulate = Color(0, 0, 0, 0.6)
		_desks.add_child(tag)


func _add_click_target(avatar: MeshInstance3D, worker: Dictionary) -> void:
	var body := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.45
	capsule.height = 1.4
	shape.shape = capsule
	body.add_child(shape)
	body.input_event.connect(func(_c: Node, event: InputEvent, _p: Vector3, _n: Vector3, _i: int) -> void:
		var mb := event as InputEventMouseButton
		if mb != null and mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT:
			_hud.show_worker(worker))
	body.mouse_entered.connect(func() -> void: Input.set_default_cursor_shape(Input.CURSOR_POINTING_HAND))
	body.mouse_exited.connect(func() -> void: Input.set_default_cursor_shape(Input.CURSOR_ARROW))
	avatar.add_child(body)
