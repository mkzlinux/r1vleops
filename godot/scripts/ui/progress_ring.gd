class_name ProgressRing
extends Control
## Circular progress gauge ("79% Strong match" style) drawn with arcs.

@export_range(0, 100) var value: float = 0.0:
	set(v):
		value = clampf(v, 0.0, 100.0)
		queue_redraw()
@export var ring_color: Color = OpsUI.LIME
@export var track_color: Color = Color(1, 1, 1, 0.12)
@export var caption: String = "progress"
@export var thickness: float = 7.0


func _init() -> void:
	custom_minimum_size = Vector2(92, 92)
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _draw() -> void:
	var center: Vector2 = size / 2.0
	var radius: float = minf(size.x, size.y) / 2.0 - thickness
	draw_arc(center, radius, 0.0, TAU, 64, track_color, thickness, true)
	if value > 0.0:
		var end_angle: float = -PI / 2.0 + TAU * value / 100.0
		draw_arc(center, radius, -PI / 2.0, end_angle, 64, ring_color, thickness, true)
	var font: Font = get_theme_default_font()
	var big: int = int(radius * 0.62)
	var text: String = "%d%%" % int(round(value))
	var w: float = font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, big).x
	draw_string(font, center + Vector2(-w / 2.0, big * 0.3), text, HORIZONTAL_ALIGNMENT_LEFT, -1, big, Color.WHITE)
	var small: int = maxi(9, int(radius * 0.22))
	var cw: float = font.get_string_size(caption, HORIZONTAL_ALIGNMENT_LEFT, -1, small).x
	draw_string(font, center + Vector2(-cw / 2.0, big * 0.3 + small + 4.0), caption, HORIZONTAL_ALIGNMENT_LEFT, -1, small, Color(1, 1, 1, 0.55))
