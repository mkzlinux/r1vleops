class_name MiniBars
extends Control
## Tiny bar chart (ORION "Vacancies" style). The last bar is highlighted in lime.

var values: Array = []:
	set(v):
		values = v
		queue_redraw()
var highlight_last: bool = true


func _init() -> void:
	custom_minimum_size = Vector2(120, 56)
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _draw() -> void:
	if values.is_empty():
		return
	var top: float = 1.0
	for v: Variant in values:
		top = maxf(top, float(v))
	var gap: float = 5.0
	var bar_w: float = (size.x - gap * (values.size() - 1)) / values.size()
	for i: int in values.size():
		var h: float = maxf(4.0, size.y * float(values[i]) / top)
		var is_last: bool = highlight_last and i == values.size() - 1
		var color: Color = OpsUI.LIME if is_last else Color(1, 1, 1, 0.75)
		draw_rect(Rect2(i * (bar_w + gap), size.y - h, bar_w, h), color)
