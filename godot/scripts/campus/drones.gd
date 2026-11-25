class_name WorkerDrones
extends Node3D
## The AI workers as glowing drones commuting between their department and HQ.

const DRONE_COLORS: Dictionary = {
	"security": Color("#ff6a5c"), "intelligence": Color("#d6ff5c"),
	"creative": Color("#9aa6ff"), "hq": Color("#ffffff"),
}

var _curves: Array[Curve3D] = []
var _drones: Array[Node3D] = []


## Rebuilds drones for the given workers (only AI workers fly).
func set_workers(workers: Array) -> void:
	OpsUI.clear(self)
	_curves.clear()
	_drones.clear()
	var i: int = 0
	for w: Dictionary in workers:
		if w.get("kind", "") != "ai":
			continue
		var home_id: String = str(w.get("departmentId", "hq"))
		var color: Color = DRONE_COLORS.get(home_id, Color.WHITE)
		_curves.append(_route(home_id, i))
		_drones.append(_make_drone(str(w.get("name", "AI")), color))
		i += 1


func _process(_delta: float) -> void:
	var t: float = Time.get_ticks_msec() / 1000.0
	for i: int in _drones.size():
		var curve: Curve3D = _curves[i]
		var length: float = curve.get_baked_length()
		var offset: float = fmod(t * 1.4 + i * length * 0.21, length)
		_drones[i].position = curve.sample_baked(offset, true)


func _route(home_id: String, i: int) -> Curve3D:
	var home_pos: Vector3 = WorldBuilder.SITE_POSITIONS.get(home_id, Vector3.ZERO)
	var home := Vector3(home_pos.x, 11.0 + i * 0.6, home_pos.z)
	var hq := Vector3(0, 6.0 + i * 0.4, 0)
	var mid: Vector3 = home.lerp(hq, 0.5) + Vector3(i - 2, 5, 2 - i)
	if home_id == "hq":
		home = Vector3(6, 9, -6)
		mid = Vector3(-6, 10, -4)
	var curve := Curve3D.new()
	for p: Vector3 in [home, mid, hq, mid + Vector3(3, -1, -3), home]:
		curve.add_point(p)
	curve.bake_interval = 0.5
	return curve


func _make_drone(worker_name: String, color: Color) -> Node3D:
	var root := Node3D.new()
	var orb := SphereMesh.new()
	orb.radius = 0.32
	orb.height = 0.64
	root.add_child(WorldBuilder.mesh_instance(orb, WorldBuilder.emissive(color, 3.0)))
	var glow := OmniLight3D.new()
	glow.light_color = color
	glow.light_energy = 1.5
	glow.omni_range = 5.0
	root.add_child(glow)
	var tag := Label3D.new()
	tag.text = worker_name
	tag.position = Vector3(0, 0.9, 0)
	tag.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	tag.no_depth_test = true
	tag.fixed_size = true
	tag.pixel_size = 0.001
	tag.font_size = 24
	tag.outline_size = 8
	tag.outline_modulate = Color(0, 0, 0, 0.6)
	root.add_child(tag)
	add_child(root)
	return root
