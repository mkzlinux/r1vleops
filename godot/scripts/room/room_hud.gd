class_name RoomHud
extends Control
## HUD inside a department room: title + KPIs on the left, and a glass workspace on the right
## with tabs (Requests, Projects, Clients, Team, Pricing) or an open order's editor.

signal back_requested

const TABS: Array[Array] = [["requests", "Requests"], ["projects", "Projects"], ["clients", "Clients"], ["team", "Team"], ["pricing", "Pricing"]]
const BLURBS: Dictionary = {
	"security": "Audits, pentests and monitoring.",
	"intelligence": "Fintech, software, blockchain and AI.",
	"creative": "Graphics, motion and cinematics.",
	"hq": "Every client, the whole crew, hiring.",
}

var room_id: String = "hq"
var preselect_order_id: String = ""

var _tab: String = "requests"
var _open_order_id: String = ""
var _kpi_row: HBoxContainer
var _spotlight: PanelContainer
var _spot_box: VBoxContainer
var _tabs_row: HBoxContainer
var _tabs_bg: PanelContainer
var _list: VBoxContainer
var _scroll: ScrollContainer


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_open_order_id = preselect_order_id
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for side: String in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 24)
	add_child(margin)
	var row := OpsUI.hbox(16)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_child(row)
	row.add_child(_build_left())
	row.add_child(OpsUI.spacer())
	row.add_child(_build_right())


func render() -> void:
	if _kpi_row == null:
		return
	_render_kpis()
	_render_workspace()


func show_worker(worker: Dictionary) -> void:
	OpsUI.clear(_spot_box)
	var head := OpsUI.hbox()
	head.add_child(OpsUI.label(str(worker.get("name", "")), 18))
	head.add_child(OpsUI.spacer())
	head.add_child(OpsUI.label("AI worker" if worker.get("kind", "") == "ai" else "Employee", 11, OpsUI.LIME))
	_spot_box.add_child(head)
	_spot_box.add_child(OpsUI.muted(str(worker.get("role", "")), 13))
	var open_count: int = 0
	for o: Dictionary in OpsApi.snapshot.get("orders", []):
		if o.get("assignedWorkerId", "") == worker.get("id", "") and o.get("stage", "") != "closed":
			open_count += 1
	_spot_box.add_child(OpsUI.muted("Status: %s · %d open project(s)" % [worker.get("status", ""), open_count], 13))
	_spotlight.visible = true


# ---------- layout ----------

func _build_left() -> Control:
	var col := OpsUI.vbox(12)
	col.custom_minimum_size.x = 380
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var back := OpsUI.pill("←  Campus · Esc")
	back.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	back.pressed.connect(func() -> void: back_requested.emit())
	col.add_child(back)
	col.add_child(OpsUI.label(OpsUI.ROOM_NAMES.get(room_id, room_id), 58))
	col.add_child(OpsUI.muted(BLURBS.get(room_id, ""), 14))
	var kpis := OpsUI.glass()
	_kpi_row = OpsUI.hbox(22)
	kpis.add_child(_kpi_row)
	col.add_child(kpis)
	_spotlight = OpsUI.glass()
	_spot_box = OpsUI.vbox(6)
	_spotlight.add_child(_spot_box)
	_spotlight.visible = false
	col.add_child(_spotlight)
	col.add_child(OpsUI.muted("Click a worker at their desk to see what they're on.", 12))
	return col


func _build_right() -> Control:
	var panel := OpsUI.glass(16)
	panel.custom_minimum_size.x = 440
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var col := OpsUI.vbox(12)
	panel.add_child(col)
	_tabs_bg = PanelContainer.new()
	_tabs_bg.add_theme_stylebox_override("panel", OpsUI.box(Color(0, 0, 0, 0.45), 999, Color(0, 0, 0, 0), 4))
	_tabs_row = OpsUI.hbox(4)
	_tabs_bg.add_child(_tabs_row)
	col.add_child(_tabs_bg)
	_scroll = ScrollContainer.new()
	_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_list = OpsUI.vbox(8)
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_scroll.add_child(_list)
	col.add_child(_scroll)
	return panel


# ---------- rendering ----------

func _render_kpis() -> void:
	OpsUI.clear(_kpi_row)
	var s: Dictionary = OpsApi.room_stats(room_id)
	_kpi_row.add_child(OpsUI.kpi(str(int(s.get("requests", 0))), "New requests"))
	_kpi_row.add_child(OpsUI.kpi(str(int(s.get("active", 0))), "In production"))
	_kpi_row.add_child(OpsUI.kpi(OpsUI.usd(float(s.get("pipelineUsd", 0))), "Open value"))


func _render_workspace() -> void:
	OpsUI.clear(_list)
	var order: Dictionary = OpsApi.find_order(_open_order_id) if _open_order_id != "" else {}
	_tabs_bg.visible = order.is_empty()
	if not order.is_empty():
		var detail := OrderDetail.new()
		detail.order = order
		detail.workers = OpsApi.snapshot.get("workers", [])
		detail.back_requested.connect(func() -> void:
			_open_order_id = ""
			_render_workspace())
		_list.add_child(detail)
		return
	_render_tabs()
	var orders: Array = OpsApi.orders_for(room_id)
	match _tab:
		"requests":
			_order_rows(orders.filter(func(o: Dictionary) -> bool: return o.get("stage", "") == "awaiting_deposit"), "No new requests. Orders awaiting deposit land here.")
		"projects":
			_order_rows(orders.filter(func(o: Dictionary) -> bool: return o.get("stage", "") in ["deposit_confirmed", "in_progress", "in_review", "delivered"]), "Nothing in production yet.")
		"clients":
			RoomPanels.clients(_list, OpsApi.room_stats(room_id).get("clients", []))
		"team":
			RoomPanels.team(_list, OpsApi.workers_for(room_id), "hq" if room_id == "hq" else room_id)
		"pricing":
			var services: Array = OpsApi.snapshot.get("services", [])
			if room_id != "hq":
				services = services.filter(func(s: Dictionary) -> bool: return s.get("departmentId", "") == room_id)
			RoomPanels.pricing(_list, services)


func _render_tabs() -> void:
	OpsUI.clear(_tabs_row)
	var orders: Array = OpsApi.orders_for(room_id)
	var counts: Dictionary = {
		"requests": orders.filter(func(o: Dictionary) -> bool: return o.get("stage", "") == "awaiting_deposit").size(),
		"projects": orders.filter(func(o: Dictionary) -> bool: return o.get("stage", "") in ["deposit_confirmed", "in_progress", "in_review", "delivered"]).size(),
	}
	for t: Array in TABS:
		var id: String = t[0]
		var text: String = t[1] if not counts.has(id) else "%s %d" % [t[1], counts[id]]
		var b := OpsUI.pill(text, _tab == id)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.pressed.connect(func() -> void:
			_tab = id
			_render_workspace())
		_tabs_row.add_child(b)


func _order_rows(orders: Array, empty_text: String) -> void:
	if orders.is_empty():
		var empty := OpsUI.muted(empty_text, 14)
		empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_list.add_child(empty)
		return
	for o: Dictionary in orders:
		var btn := RoomPanels.row_button()
		var row := RoomPanels.row_content(btn)
		var info := OpsUI.vbox(2)
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		info.mouse_filter = Control.MOUSE_FILTER_IGNORE
		info.add_child(OpsUI.label(OpsUI.client_name(o), 14))
		var sub := OpsUI.muted("%s · %s" % [OpsUI.order_title(o), o.get("trackingCode", "")], 12)
		sub.clip_text = true
		sub.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		info.add_child(sub)
		info.add_child(RoomPanels.stage_pill(str(o.get("stage", ""))))
		row.add_child(info)
		var amt := OpsUI.vbox(2)
		amt.mouse_filter = Control.MOUSE_FILTER_IGNORE
		amt.add_child(OpsUI.label(OpsUI.usd(float(o.get("totals", {}).get("total", 0))), 14))
		amt.add_child(OpsUI.muted("%d%%" % int(o.get("progress", 0)), 12))
		row.add_child(amt)
		var order_id: String = str(o.get("id", ""))
		btn.pressed.connect(func() -> void:
			_open_order_id = order_id
			_render_workspace())
		_list.add_child(btn)
