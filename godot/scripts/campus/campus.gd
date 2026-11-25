extends Node3D
## Campus scene root: builds the island world, places the department buildings,
## and wires building/HUD intents to camera flights and room transitions.

var _buildings: Dictionary = {}  # site_id -> CampusBuilding
var _camera: OrbitCamera
var _drones: WorkerDrones
var _hud: CampusHud
var _is_leaving: bool = false


func _ready() -> void:
	add_child(WorldBuilder.build_environment(Color("#b9c2bb"), Color("#9aa39b"), Color("#9aa39b")))
	add_child(WorldBuilder.build_sun())
	add_child(WorldBuilder.build_water())
	add_child(WorldBuilder.build_island())
	add_child(WorldBuilder.build_roads())
	add_child(WorldBuilder.build_farm())
	add_child(WorldBuilder.build_trees())

	for id: String in WorldBuilder.SITE_POSITIONS:
		var b: CampusBuilding = CampusBuilding.create(id)
		b.selected.connect(_enter)
		b.hovered.connect(_on_hover)
		add_child(b)
		_buildings[id] = b

	_drones = WorkerDrones.new()
	add_child(_drones)
	_camera = OrbitCamera.new()
	_camera.arrived.connect(_on_arrived)
	add_child(_camera)

	var layer := CanvasLayer.new()
	_hud = CampusHud.new()
	_hud.room_requested.connect(_enter)
	_hud.room_hovered.connect(_on_hover)
	_hud.order_requested.connect(func(room_id: String, order_id: String) -> void: Session.go_to_room(room_id, order_id))
	layer.add_child(_hud)
	add_child(layer)

	OpsApi.snapshot_changed.connect(_render)
	_render(OpsApi.snapshot)


func _render(snapshot: Dictionary) -> void:
	if snapshot.is_empty() and OpsApi.last_error == "":
		return
	for id: String in _buildings:
		var stats: Dictionary = OpsApi.room_stats(id)
		(_buildings[id] as CampusBuilding).set_counts(int(stats.get("requests", 0)), int(stats.get("active", 0)))
	_drones.set_workers(snapshot.get("workers", []))
	_hud.render(snapshot, OpsApi.last_error, OpsApi.is_live)


func _on_hover(site_id: String, is_over: bool) -> void:
	var b: CampusBuilding = _buildings.get(site_id)
	if b != null:
		b.is_lit = is_over
	Input.set_default_cursor_shape(Input.CURSOR_POINTING_HAND if is_over else Input.CURSOR_ARROW)


func _enter(site_id: String) -> void:
	if _is_leaving:
		return
	_is_leaving = true
	Input.set_default_cursor_shape(Input.CURSOR_ARROW)
	var b: CampusBuilding = _buildings.get(site_id)
	if b != null:
		b.is_lit = true
	_camera.fly_to(site_id, WorldBuilder.SITE_POSITIONS.get(site_id, Vector3.ZERO))


func _on_arrived(site_id: String) -> void:
	Session.go_to_room(site_id)
