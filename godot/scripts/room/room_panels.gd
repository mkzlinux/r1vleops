class_name RoomPanels
extends RefCounted
## Builders for the room workspace tabs: clients, team (with hiring) and pricing.

const STATUS_COLORS: Dictionary = {"online": Color("#c8f53b"), "busy": Color("#ff9f3d"), "idle": Color("#9aa0a6"), "invited": Color("#7b8cff")}
const STAGE_COLORS: Dictionary = {
	"awaiting_deposit": Color("#ff5a4f"), "deposit_confirmed": Color("#c8f53b"), "in_progress": Color("#c8f53b"),
	"in_review": Color("#7b8cff"), "delivered": Color(1, 1, 1, 0.3), "closed": Color(1, 1, 1, 0.18),
}
const DEPT_OPTIONS: Array[Array] = [["security", "Security"], ["intelligence", "Intelligence"], ["creative", "Creative Studio"], ["hq", "Founder HQ"]]


## A full-width list row with hover outline. Add content via row_content().
static func row_button() -> Button:
	var btn := Button.new()
	btn.custom_minimum_size.y = 76
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var normal := OpsUI.box(Color(0, 0, 0, 0.3), 16, Color(0, 0, 0, 0), 12)
	var hover := OpsUI.box(Color(0, 0, 0, 0.38), 16, Color(1, 1, 1, 0.55), 12)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", hover)
	btn.add_theme_stylebox_override("focus", hover)
	return btn


static func row_content(btn: Control) -> HBoxContainer:
	var row := OpsUI.hbox(10)
	row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	row.offset_left = 14
	row.offset_right = -14
	row.offset_top = 10
	row.offset_bottom = -10
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	btn.add_child(row)
	return row


static func plain_row() -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", OpsUI.box(Color(0, 0, 0, 0.3), 16, Color(0, 0, 0, 0), 12))
	return p


static func stage_pill(stage: String) -> Control:
	var color: Color = STAGE_COLORS.get(stage, Color(1, 1, 1, 0.2))
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", OpsUI.box(color, 999, Color(0, 0, 0, 0), 3))
	p.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var dark_text: bool = color.get_luminance() > 0.6
	p.add_child(OpsUI.label("  %s  " % OpsApi.stage_label(stage).to_upper(), 10, OpsUI.INK if dark_text else Color.WHITE))
	return p


static func clients(list: VBoxContainer, rows: Array) -> void:
	if rows.is_empty():
		list.add_child(OpsUI.muted("No clients yet.", 14))
		return
	for c: Dictionary in rows:
		var p := plain_row()
		var row := OpsUI.hbox(10)
		var info := OpsUI.vbox(2)
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		info.add_child(OpsUI.label(str(c.get("name", "")), 14))
		var company: String = str(c.get("company", ""))
		info.add_child(OpsUI.muted("%s · %d order(s)" % [company if company != "" else "Individual", int(c.get("orders", 0))], 12))
		row.add_child(info)
		var right := OpsUI.vbox(4)
		right.add_child(OpsUI.label(OpsUI.usd(float(c.get("lifetimeUsd", 0))), 14))
		var wa: String = str(c.get("whatsapp", "")).replace(" ", "").replace("+", "")
		if wa != "":
			var b := OpsUI.pill("WhatsApp")
			b.pressed.connect(func() -> void: OpsApi.open_url("https://wa.me/%s" % wa))
			right.add_child(b)
		row.add_child(right)
		p.add_child(row)
		list.add_child(p)


static func team(list: VBoxContainer, workers: Array, default_dept: String) -> void:
	for w: Dictionary in workers:
		var p := plain_row()
		var row := OpsUI.hbox(10)
		row.add_child(OpsUI.label("AI" if w.get("kind", "") == "ai" else "HU", 14, OpsUI.LIME if w.get("kind", "") == "ai" else Color.WHITE))
		var info := OpsUI.vbox(2)
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		info.add_child(OpsUI.label(str(w.get("name", "")), 14))
		info.add_child(OpsUI.muted(str(w.get("role", "")), 12))
		row.add_child(info)
		var status: String = str(w.get("status", ""))
		row.add_child(OpsUI.label(status.to_upper(), 11, STATUS_COLORS.get(status, Color.WHITE)))
		p.add_child(row)
		list.add_child(p)
	list.add_child(_hire_form(default_dept))


static func _hire_form(default_dept: String) -> Control:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", OpsUI.box(Color(0, 0, 0, 0.25), 16, Color(1, 1, 1, 0.2), 14))
	var col := OpsUI.vbox(8)
	panel.add_child(col)
	col.add_child(OpsUI.label("+ Employ someone", 15, OpsUI.LIME))
	var name_in := _field(col, "Full name")
	var role_in := _field(col, "Role, e.g. Motion designer")
	var email_in := _field(col, "Email (optional)")
	var dept := OptionButton.new()
	OpsUI.style_input(dept)
	for i: int in DEPT_OPTIONS.size():
		dept.add_item(DEPT_OPTIONS[i][1], i)
		if DEPT_OPTIONS[i][0] == default_dept:
			dept.select(i)
	col.add_child(dept)
	col.add_child(OpsUI.muted("Saved as \"invited\". Their own room login comes in a later release.", 12))
	var status := OpsUI.label("", 12, OpsUI.RED)
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	col.add_child(status)
	var save := OpsUI.pill("Save employee", true, OpsUI.LIME)
	save.pressed.connect(func() -> void:
		save.disabled = true
		var err: String = await OpsApi.mutate("hireWorker", {
			"name": name_in.text.strip_edges(), "role": role_in.text.strip_edges(),
			"email": email_in.text.strip_edges(), "departmentId": DEPT_OPTIONS[dept.selected][0],
		})
		if is_instance_valid(save):
			save.disabled = false
		if is_instance_valid(status):
			status.text = err)
	col.add_child(save)
	return panel


static func _field(parent: Control, placeholder: String) -> LineEdit:
	var e := LineEdit.new()
	e.placeholder_text = placeholder
	OpsUI.style_input(e)
	parent.add_child(e)
	return e


static func pricing(list: VBoxContainer, services: Array) -> void:
	list.add_child(OpsUI.muted("Changes show on the public pricing page and apply to new orders.", 12))
	for s: Dictionary in services:
		var p := plain_row()
		var row := OpsUI.hbox(8)
		var info := OpsUI.vbox(2)
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		info.add_child(OpsUI.label(str(s.get("name", "")), 14))
		var unit: String = {"from": "Starting at", "monthly": "Per month", "each": "Per piece"}.get(s.get("unit", ""), "Fixed")
		var note := OpsUI.muted("%s · ~%d days" % [unit, int(s.get("deliveryDays", 0))], 12)
		info.add_child(note)
		row.add_child(info)
		var price := SpinBox.new()
		price.min_value = 0
		price.max_value = 1000000
		price.step = 5
		price.prefix = "$"
		price.value = float(s.get("priceUsd", 0))
		price.custom_minimum_size.x = 110
		OpsUI.style_input(price.get_line_edit())
		row.add_child(price)
		var save := OpsUI.pill("Save")
		var service_id: String = str(s.get("id", ""))
		save.pressed.connect(func() -> void:
			var err: String = await OpsApi.mutate("updateServicePrice", {"serviceId": service_id, "priceUsd": price.value})
			if is_instance_valid(note):
				note.text = err if err != "" else "Saved")
		row.add_child(save)
		p.add_child(row)
		list.add_child(p)
