extends CanvasLayer
## Scene navigation with a fade curtain (autoload "Session").
## Holds which room is open and which order should be pre-selected there.

const CAMPUS_SCENE: String = "res://scenes/campus.tscn"
const ROOM_SCENE: String = "res://scenes/room.tscn"
const FADE_SECONDS: float = 0.45

var room_id: String = ""
var order_id: String = ""

var _curtain: ColorRect


func _ready() -> void:
	layer = 100
	_curtain = ColorRect.new()
	_curtain.color = Color(0.043, 0.043, 0.043, 0.0)
	_curtain.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_curtain.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_curtain)


func go_to_room(id: String, preselect_order: String = "") -> void:
	room_id = id
	order_id = preselect_order
	await _change_scene(ROOM_SCENE)


func go_to_campus() -> void:
	order_id = ""
	await _change_scene(CAMPUS_SCENE)


func _change_scene(path: String) -> void:
	await _fade(1.0)
	get_tree().change_scene_to_file(path)
	await get_tree().process_frame
	await get_tree().process_frame
	await _fade(0.0)


func _fade(alpha: float) -> void:
	_curtain.mouse_filter = Control.MOUSE_FILTER_STOP if alpha > 0.0 else Control.MOUSE_FILTER_IGNORE
	var tween: Tween = create_tween()
	tween.tween_property(_curtain, "color:a", alpha, FADE_SECONDS)
	await tween.finished
