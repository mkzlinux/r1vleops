class_name OrbitCamera
extends Node3D
## Orbit rig: drag to rotate, wheel/pinch to zoom, slow auto-rotate when idle,
## and a cinematic fly_to() used when entering a building.

signal arrived(site_id: String)

const MIN_DISTANCE: float = 12.0
const MAX_DISTANCE: float = 70.0
const MIN_PITCH: float = deg_to_rad(18.0)
const MAX_PITCH: float = deg_to_rad(70.0)
const IDLE_SECONDS: float = 4.0
const AUTO_ROTATE_SPEED: float = 0.06

var target: Vector3 = Vector3(0, 2, 0)
var yaw: float = deg_to_rad(40.0)
var pitch: float = deg_to_rad(34.0)
var distance: float = 46.0
var is_flying: bool = false

var _camera: Camera3D
var _idle: float = IDLE_SECONDS
var _dragging: bool = false
var _touches: Dictionary = {}


func _ready() -> void:
	_camera = Camera3D.new()
	_camera.fov = 40.0
	_camera.near = 0.5
	_camera.far = 400.0
	add_child(_camera)
	_camera.make_current()
	_apply()


func _process(delta: float) -> void:
	if is_flying:
		return
	_idle += delta
	if _idle > IDLE_SECONDS:
		yaw += AUTO_ROTATE_SPEED * delta
		_apply()


func _unhandled_input(event: InputEvent) -> void:
	if is_flying:
		return
	var mb := event as InputEventMouseButton
	if mb != null:
		if mb.button_index == MOUSE_BUTTON_LEFT or mb.button_index == MOUSE_BUTTON_RIGHT:
			_dragging = mb.pressed
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_UP:
			_zoom(0.9)
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			_zoom(1.1)
		_idle = 0.0
	var motion := event as InputEventMouseMotion
	if motion != null and _dragging:
		_rotate(motion.relative)
	var touch := event as InputEventScreenTouch
	if touch != null:
		if touch.pressed:
			_touches[touch.index] = touch.position
		else:
			_touches.erase(touch.index)
		_idle = 0.0
	var drag := event as InputEventScreenDrag
	if drag != null:
		_touches[drag.index] = drag.position
		if _touches.size() == 1:
			_rotate(drag.relative)
	var pinch := event as InputEventMagnifyGesture
	if pinch != null:
		_zoom(1.0 / pinch.factor)


## Glides to look at a site from close range, then emits `arrived`.
func fly_to(site_id: String, site_position: Vector3) -> void:
	if is_flying:
		return
	is_flying = true
	var dir: Vector3 = Vector3(site_position.x, 0, site_position.z)
	var new_yaw: float = atan2(dir.x, dir.z) if dir.length() > 0.5 else yaw
	var tween: Tween = create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	tween.set_parallel(true)
	tween.tween_property(self, "target", site_position + Vector3(0, 3, 0), 1.3)
	tween.tween_property(self, "yaw", new_yaw, 1.3)
	tween.tween_property(self, "pitch", deg_to_rad(24.0), 1.3)
	tween.tween_property(self, "distance", 16.0, 1.3)
	tween.tween_method(func(_v: float) -> void: _apply(), 0.0, 1.0, 1.3)
	await tween.finished
	arrived.emit(site_id)


func _rotate(relative: Vector2) -> void:
	yaw -= relative.x * 0.006
	pitch = clampf(pitch + relative.y * 0.004, MIN_PITCH, MAX_PITCH)
	_idle = 0.0
	_apply()


func _zoom(factor: float) -> void:
	distance = clampf(distance * factor, MIN_DISTANCE, MAX_DISTANCE)
	_idle = 0.0
	_apply()


func _apply() -> void:
	var offset := Vector3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * distance
	_camera.global_position = target + offset
	_camera.look_at(target, Vector3.UP)
