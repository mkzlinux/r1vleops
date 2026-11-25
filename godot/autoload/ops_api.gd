extends Node
## Client for the R1VLE ops bridge (autoload "OpsApi").
##
## In the browser the Godot build runs inside an iframe on the Next.js /ops page, which installs
## `window.r1vleOps.request(method, payloadJson, callback)`. All business rules live there, in
## TypeScript, so this game is only the view. Outside the browser (editor, desktop, headless tests)
## it serves a bundled read-only demo snapshot instead.

signal snapshot_changed(snapshot: Dictionary)
signal request_finished(id: int)

const DEMO_PATH: String = "res://data/demo_snapshot.json"

var snapshot: Dictionary = {}
var is_live: bool = false
var last_error: String = ""

var _bridge: JavaScriptObject = null
var _callbacks: Dictionary = {}  # id -> JavaScriptObject; held so the JS callback is not garbage collected
var _answers: Dictionary = {}    # id -> raw JSON string from the host
var _next_id: int = 0


func _ready() -> void:
	if OS.has_feature("web"):
		var parent_window: JavaScriptObject = JavaScriptBridge.get_interface("parent")
		if parent_window != null:
			var host: Variant = parent_window.get("r1vleOps")
			if host is JavaScriptObject:
				_bridge = host
	is_live = _bridge != null
	refresh()


## Reloads everything from the host and emits snapshot_changed.
func refresh() -> void:
	var res: Dictionary = await request("snapshot")
	if res.get("ok", false):
		snapshot = res.get("data", {})
		last_error = ""
	else:
		last_error = str(res.get("error", "Could not load data."))
	snapshot_changed.emit(snapshot)


## Runs a mutating call, then refreshes. Returns "" on success or a readable error.
func mutate(method: String, payload: Dictionary) -> String:
	var res: Dictionary = await request(method, payload)
	if not res.get("ok", false):
		return str(res.get("error", "Request failed."))
	await refresh()
	return ""


## Low-level request. Always resolves to {"ok": bool, "data" | "error"}.
func request(method: String, payload: Dictionary = {}) -> Dictionary:
	if _bridge == null:
		return _demo_request(method)
	_next_id += 1
	var id: int = _next_id
	var callback: JavaScriptObject = JavaScriptBridge.create_callback(_on_host_answer.bind(id))
	_callbacks[id] = callback
	_bridge.call("request", method, JSON.stringify(payload), callback)
	while not _answers.has(id):
		await request_finished
	var raw: String = str(_answers[id])
	_answers.erase(id)
	_callbacks.erase(id)
	var parsed: Variant = JSON.parse_string(raw)
	if typeof(parsed) != TYPE_DICTIONARY:
		return {"ok": false, "error": "Unexpected response from the host page."}
	return parsed


func room_stats(room_id: String) -> Dictionary:
	return snapshot.get("rooms", {}).get(room_id, {})


func orders_for(room_id: String) -> Array:
	var all: Array = snapshot.get("orders", [])
	if room_id == "hq":
		return all
	return all.filter(func(o: Dictionary) -> bool: return o.get("departmentId", "") == room_id)


func workers_for(room_id: String) -> Array:
	var all: Array = snapshot.get("workers", [])
	if room_id == "hq":
		return all
	return all.filter(func(w: Dictionary) -> bool: return w.get("departmentId", "") == room_id)


func find_order(order_id: String) -> Dictionary:
	for o: Dictionary in snapshot.get("orders", []):
		if o.get("id", "") == order_id:
			return o
	return {}


func stage_label(stage: String) -> String:
	return str(snapshot.get("stageLabels", {}).get(stage, stage.capitalize()))


## Opens a URL in a new tab from the web build (invoice, tracking page, WhatsApp).
func open_url(url: String) -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.open(%s, '_blank', 'noopener')" % JSON.stringify(url), true)
	else:
		OS.shell_open(url)


## Absolute URL on the site for a path, e.g. for links pasted into WhatsApp.
func site_url(path: String) -> String:
	if OS.has_feature("web"):
		return str(JavaScriptBridge.eval("window.location.origin", true)) + path
	return path


## Navigates the whole page (not just the iframe) to a site path such as "/".
func open_site(path: String) -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.top.location.href = %s" % JSON.stringify(path), true)


func _on_host_answer(args: Array, id: int) -> void:
	_answers[id] = args[0] if args.size() > 0 else ""
	request_finished.emit(id)


func _demo_request(method: String) -> Dictionary:
	if method != "snapshot":
		return {"ok": false, "error": "Read-only demo: open the dashboard in the browser to make changes."}
	var file: FileAccess = FileAccess.open(DEMO_PATH, FileAccess.READ)
	if file == null:
		return {"ok": false, "error": "Demo data missing at %s." % DEMO_PATH}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return {"ok": false, "error": "Demo data is not valid JSON."}
	return {"ok": true, "data": parsed}
