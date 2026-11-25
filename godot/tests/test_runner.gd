extends Node
## Headless smoke + unit tests. Run: godot --headless --path godot res://tests/test_runner.tscn
## Exits with code 0 when every check passes, 1 otherwise.

var _failures: int = 0
var _checks: int = 0


func _ready() -> void:
	await get_tree().process_frame
	_test_formatting()
	await _wait_for_snapshot()
	_test_snapshot()
	await _test_scene("res://scenes/campus.tscn", _check_campus)
	for room_id: String in ["security", "intelligence", "creative", "hq"]:
		Session.room_id = room_id
		await _test_scene("res://scenes/room.tscn", _check_room.bind(room_id))
	print("[tests] %d checks, %d failures" % [_checks, _failures])
	get_tree().quit(1 if _failures > 0 else 0)


func _expect(condition: bool, message: String) -> void:
	_checks += 1
	if not condition:
		_failures += 1
		push_error("[tests] FAIL: " + message)


func _test_formatting() -> void:
	_expect(OpsUI.usd(0) == "$0", "usd zero")
	_expect(OpsUI.usd(1500) == "$1,500", "usd thousands")
	_expect(OpsUI.usd(1234567.5) == "$1,234,567.50", "usd millions with cents")
	_expect(OpsUI.usd(-20) == "-$20", "usd negative")
	_expect(OpsUI.short_date("2026-11-05T10:00:00.000Z") == "5 Nov", "short date")
	_expect(OpsUI.order_title({"lines": [{"name": "A"}, {"name": "B"}]}) == "A +1", "order title")
	_expect(OpsUI.client_name({"client": {"name": "Rudo", "company": ""}}) == "Rudo", "client name fallback")


func _wait_for_snapshot() -> void:
	var tries: int = 0
	while OpsApi.snapshot.is_empty() and tries < 60:
		await get_tree().process_frame
		tries += 1


func _test_snapshot() -> void:
	_expect(not OpsApi.snapshot.is_empty(), "demo snapshot loaded: " + OpsApi.last_error)
	_expect(OpsApi.workers_for("hq").size() == 5, "five AI workers on campus")
	_expect(OpsApi.orders_for("intelligence").size() == 2, "intelligence orders filtered")
	_expect(OpsApi.stage_label("awaiting_deposit").contains("deposit"), "stage label from snapshot")
	var res: Dictionary = await OpsApi.request("advanceOrder", {})
	_expect(res.get("ok", true) == false, "demo mode refuses writes")


func _test_scene(path: String, check: Callable) -> void:
	var packed: PackedScene = load(path)
	_expect(packed != null, "scene loads: " + path)
	if packed == null:
		return
	var scene: Node = packed.instantiate()
	get_tree().root.add_child(scene)
	for i: int in 10:
		await get_tree().process_frame
	check.call(scene)
	scene.queue_free()
	await get_tree().process_frame


## Recursively collects nodes that are instances of a script class (find_children only matches native classes).
func _find(root: Node, cls: Script) -> Array[Node]:
	var out: Array[Node] = []
	for child: Node in root.get_children():
		if is_instance_of(child, cls):
			out.append(child)
		out.append_array(_find(child, cls))
	return out


func _check_campus(scene: Node) -> void:
	var buildings: Array = scene.get_children().filter(func(n: Node) -> bool: return n is CampusBuilding)
	_expect(buildings.size() == 4, "campus has 4 buildings")
	_expect(_find(scene, CampusHud).size() == 1, "campus HUD present")
	var drones: Array[Node] = _find(scene, WorkerDrones)
	_expect(drones.size() == 1, "drones present")
	if drones.size() == 1:
		_expect(drones[0].get_child_count() == 5, "one drone per AI worker")


func _check_room(scene: Node, room_id: String) -> void:
	var huds: Array[Node] = _find(scene, RoomHud)
	_expect(huds.size() == 1, "room HUD present in " + room_id)
	_expect(scene.get("room_id") == room_id, "room id applied for " + room_id)
