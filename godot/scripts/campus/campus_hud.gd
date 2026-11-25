class_name CampusHud
extends Control
## ORION-style HUD over the campus: top bar, title, pipeline card, department list,
## deposits/crew cards and the black order strip with progress rings. Pure view: emits intents.

signal room_requested(room_id: String)
signal room_hovered(room_id: String, is_over: bool)
signal order_requested(room_id: String, order_id: String)

const CARDS_PER_PAGE: int = 3
const FILTERS: Array[Array] = [
	["all", "All orders"], ["awaiting_deposit", "Awaiting deposit"], ["active", "In production"],
	["in_review", "Client review"], ["delivered", "Delivered"],
]

var _snapshot: Dictionary = {}
var _filter: String = "all"
var _page: int = 0
var _query: String = ""

var _pipeline_box: VBoxContainer
var _dept_list: VBoxContainer
var _deposits_box: VBoxContainer
var _crew_box: VBoxContainer
var _cards_row: HBoxContainer
var _filters_row: HBoxContainer
var _pager_label: Label
var _mode_pill: Label
var _error_label: Label


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var root := OpsUI.vbox(0)
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	root.add_child(_build_top_bar())
	root.add_child(_build_body())
	root.add_child(_build_strip())


func render(snapshot: Dictionary, error_text: String, is_live: bool) -> void:
	_snapshot = snapshot
	_mode_pill.text = "LIVE DATA" if is_live else "DEMO · READ-ONLY"
	_error_label.text = error_text
	_error_label.visible = error_text != ""
	_render_pipeline()
	_render_departments()
	_render_side_cards()
	_render_strip()


# ---------- builders ----------

func _build_top_bar() -> Control:
	var margin := MarginContainer.new()
	for side: String in ["left", "right"]:
		margin.add_theme_constant_override("margin_" + side, 28)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_bottom", 6)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var bar := OpsUI.hbox(12)
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_child(bar)
	bar.add_child(OpsUI.label("◐  R1VLE OPS", 16))
	bar.add_child(OpsUI.spacer())
	var search := LineEdit.new()
	search.placeholder_text = "Search client, code, invoice…"
	search.custom_minimum_size = Vector2(300, 38)
	OpsUI.style_input(search)
	search.text_changed.connect(func(t: String) -> void:
		_query = t.strip_edges().to_lower()
		_page = 0
		_render_strip())
	bar.add_child(search)
	bar.add_child(OpsUI.spacer())
	_mode_pill = OpsUI.label("", 11, OpsUI.LIME)
	bar.add_child(_mode_pill)
	var site := OpsUI.pill("Public site ↗")
	site.pressed.connect(func() -> void: OpsApi.open_site("/"))
	bar.add_child(site)
	return margin


func _build_body() -> Control:
	var margin := MarginContainer.new()
	margin.size_flags_vertical = Control.SIZE_EXPAND_FILL
	for side: String in ["left", "right"]:
		margin.add_theme_constant_override("margin_" + side, 28)
	margin.add_theme_constant_override("margin_bottom", 16)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var row := OpsUI.hbox(16)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_child(row)

	var left := OpsUI.vbox(12)
	left.custom_minimum_size.x = 320
	left.mouse_filter = Control.MOUSE_FILTER_IGNORE
	left.add_child(OpsUI.label("R1VLE\nCAMPUS", 60))
	left.add_child(OpsUI.muted("Drag to orbit · scroll to zoom · click a building to enter", 13))
	_error_label = OpsUI.label("", 13, OpsUI.RED)
	_error_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	left.add_child(_error_label)
	var pipeline := OpsUI.glass()
	_pipeline_box = OpsUI.vbox(10)
	pipeline.add_child(_pipeline_box)
	left.add_child(pipeline)
	row.add_child(left)

	row.add_child(OpsUI.spacer())

	var right := OpsUI.vbox(12)
	right.custom_minimum_size.x = 360
	var depts := OpsUI.glass()
	_dept_list = OpsUI.vbox(8)
	depts.add_child(_dept_list)
	right.add_child(depts)
	var minis := OpsUI.hbox(12)
	var dep_card := OpsUI.glass()
	dep_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_deposits_box = OpsUI.vbox(6)
	dep_card.add_child(_deposits_box)
	var crew_card := OpsUI.glass()
	crew_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_crew_box = OpsUI.vbox(6)
	crew_card.add_child(_crew_box)
	minis.add_child(dep_card)
	minis.add_child(crew_card)
	right.add_child(minis)
	row.add_child(right)
	return margin


func _build_strip() -> Control:
	var strip := PanelContainer.new()
	var style := OpsUI.box(OpsUI.INK, 0, Color(0, 0, 0, 0), 0)
	style.content_margin_left = 28
	style.content_margin_right = 28
	style.content_margin_top = 16
	style.content_margin_bottom = 20
	strip.add_theme_stylebox_override("panel", style)
	var col := OpsUI.vbox(14)
	strip.add_child(col)
	var tools := OpsUI.hbox(8)
	_filters_row = OpsUI.hbox(8)
	tools.add_child(_filters_row)
	tools.add_child(OpsUI.spacer())
	var prev := OpsUI.pill("←")
	prev.pressed.connect(func() -> void:
		_page = maxi(0, _page - 1)
		_render_strip())
	_pager_label = OpsUI.label("01 / 01", 20)
	var next := OpsUI.pill("→")
	next.pressed.connect(func() -> void:
		_page += 1
		_render_strip())
	tools.add_child(prev)
	tools.add_child(_pager_label)
	tools.add_child(next)
	col.add_child(tools)
	_cards_row = OpsUI.hbox(12)
	_cards_row.custom_minimum_size.y = 128
	col.add_child(_cards_row)
	return strip


# ---------- renderers ----------

func _render_pipeline() -> void:
	OpsUI.clear(_pipeline_box)
	var hq: Dictionary = _snapshot.get("rooms", {}).get("hq", {})
	var head := OpsUI.hbox()
	head.add_child(OpsUI.label("Pipeline", 15))
	_pipeline_box.add_child(head)
	var kpis := OpsUI.hbox(18)
	kpis.add_child(OpsUI.kpi(OpsUI.usd(float(hq.get("pipelineUsd", 0))), "Open value", 26))
	kpis.add_child(OpsUI.kpi(str(int(hq.get("active", 0))), "Active", 26))
	kpis.add_child(OpsUI.kpi(str(int(hq.get("clients", []).size())), "Clients", 26))
	_pipeline_box.add_child(kpis)
	var bars := MiniBars.new()
	bars.values = _snapshot.get("weekly", [])
	_pipeline_box.add_child(bars)
	_pipeline_box.add_child(OpsUI.muted("Orders per week · last 10 weeks", 11))


func _render_departments() -> void:
	OpsUI.clear(_dept_list)
	var head := OpsUI.hbox()
	head.add_child(OpsUI.label("Departments", 15))
	head.add_child(OpsUI.spacer())
	var hq: Dictionary = _snapshot.get("rooms", {}).get("hq", {})
	head.add_child(OpsUI.muted("%d new requests" % int(hq.get("requests", 0)), 12))
	_dept_list.add_child(head)
	for room_id: String in ["security", "intelligence", "creative", "hq"]:
		_dept_list.add_child(_dept_row(room_id))


func _dept_row(room_id: String) -> Control:
	var stats: Dictionary = _snapshot.get("rooms", {}).get(room_id, {})
	var btn := Button.new()
	btn.custom_minimum_size.y = 54
	btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var normal := OpsUI.box(Color(0, 0, 0, 0.2), 14, Color(0, 0, 0, 0), 12)
	var hover := OpsUI.box(Color(0, 0, 0, 0.32), 14, Color(1, 1, 1, 0.55), 12)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", hover)
	btn.add_theme_stylebox_override("focus", hover)
	var row := OpsUI.hbox(10)
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	row.offset_left = 12
	row.offset_right = -12
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var swatch := ColorRect.new()
	swatch.color = OpsUI.ROOM_ACCENTS[room_id]
	swatch.custom_minimum_size = Vector2(10, 10)
	swatch.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row.add_child(swatch)
	var text := OpsUI.vbox(0)
	text.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	text.add_child(OpsUI.label(OpsUI.ROOM_NAMES[room_id], 14))
	var sub: String = "Team, hiring & all clients" if room_id == "hq" else "%d active · %s" % [int(stats.get("active", 0)), OpsUI.usd(float(stats.get("pipelineUsd", 0)))]
	text.add_child(OpsUI.muted(sub, 12))
	row.add_child(text)
	row.add_child(OpsUI.spacer())
	var pending: int = int(stats.get("requests", 0))
	var badge_text: String = ("%d crew" % _snapshot.get("workers", []).size()) if room_id == "hq" else ("%d new" % pending if pending > 0 else "clear")
	var badge := OpsUI.label(badge_text, 11, OpsUI.INK)
	var badge_panel := PanelContainer.new()
	badge_panel.add_theme_stylebox_override("panel", OpsUI.box(OpsUI.RED if pending > 0 and room_id != "hq" else OpsUI.LIME, 999, Color(0, 0, 0, 0), 4))
	badge_panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	badge_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badge_panel.add_child(badge)
	row.add_child(badge_panel)
	btn.add_child(row)
	btn.pressed.connect(func() -> void: room_requested.emit(room_id))
	btn.mouse_entered.connect(func() -> void: room_hovered.emit(room_id, true))
	btn.mouse_exited.connect(func() -> void: room_hovered.emit(room_id, false))
	return btn


func _render_side_cards() -> void:
	OpsUI.clear(_deposits_box)
	var dep: Dictionary = _snapshot.get("deposits", {})
	var collected: float = float(dep.get("collected", 0))
	var pending: float = float(dep.get("pending", 0))
	_deposits_box.add_child(OpsUI.label("Deposits", 15))
	_deposits_box.add_child(OpsUI.kpi(OpsUI.usd(collected), "Collected · %s pending" % OpsUI.usd(pending), 24))
	var meter := ProgressBar.new()
	meter.show_percentage = false
	meter.custom_minimum_size.y = 8
	meter.value = 0.0 if collected + pending <= 0.0 else 100.0 * collected / (collected + pending)
	meter.add_theme_stylebox_override("background", OpsUI.box(Color(0, 0, 0, 0.35), 8, Color(0, 0, 0, 0), 0))
	meter.add_theme_stylebox_override("fill", OpsUI.box(Color.WHITE, 8, Color(0, 0, 0, 0), 0))
	_deposits_box.add_child(meter)

	OpsUI.clear(_crew_box)
	var workers: Array = _snapshot.get("workers", [])
	var ai: int = workers.filter(func(w: Dictionary) -> bool: return w.get("kind", "") == "ai").size()
	_crew_box.add_child(OpsUI.label("Crew", 15))
	_crew_box.add_child(OpsUI.kpi("%d AI · %d people" % [ai, workers.size() - ai], "Workers on campus", 22))
	var bars := MiniBars.new()
	bars.highlight_last = false
	bars.custom_minimum_size.y = 36
	bars.values = workers.map(func(w: Dictionary) -> float: return {"busy": 3.0, "online": 2.0}.get(w.get("status", ""), 1.0))
	_crew_box.add_child(bars)


func _matches(order: Dictionary) -> bool:
	var stage: String = str(order.get("stage", ""))
	var stage_ok: bool = _filter == "all" or stage == _filter or (_filter == "active" and stage in ["deposit_confirmed", "in_progress"])
	if not stage_ok:
		return false
	if _query == "":
		return true
	var c: Dictionary = order.get("client", {})
	var hay: String = "%s %s %s %s %s" % [c.get("name", ""), c.get("company", ""), order.get("trackingCode", ""), order.get("invoiceNo", ""), OpsUI.order_title(order)]
	return hay.to_lower().contains(_query)


func _render_strip() -> void:
	OpsUI.clear(_filters_row)
	for f: Array in FILTERS:
		var id: String = f[0]
		var b := OpsUI.pill(f[1], _filter == id)
		b.pressed.connect(func() -> void:
			_filter = id
			_page = 0
			_render_strip())
		_filters_row.add_child(b)
	var list: Array = _snapshot.get("orders", []).filter(_matches)
	var pages: int = maxi(1, ceili(list.size() / float(CARDS_PER_PAGE)))
	_page = clampi(_page, 0, pages - 1)
	_pager_label.text = "%02d / %02d" % [_page + 1, pages]
	OpsUI.clear(_cards_row)
	if list.is_empty():
		_cards_row.add_child(OpsUI.muted("No orders in this view.", 13))
		return
	for order: Dictionary in list.slice(_page * CARDS_PER_PAGE, _page * CARDS_PER_PAGE + CARDS_PER_PAGE):
		_cards_row.add_child(_order_card(order))


func _order_card(order: Dictionary) -> Control:
	var btn := Button.new()
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.custom_minimum_size = Vector2(240, 124)
	btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var normal := OpsUI.box(OpsUI.CARD, 22, Color(0, 0, 0, 0), 14)
	var hover := OpsUI.box(OpsUI.CARD, 22, Color(1, 1, 1, 0.25), 14)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", hover)
	btn.add_theme_stylebox_override("focus", hover)
	var row := OpsUI.hbox(10)
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	row.offset_left = 16
	row.offset_right = -12
	row.offset_top = 12
	row.offset_bottom = -12
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var info := OpsUI.vbox(4)
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var title := OpsUI.label(OpsUI.order_title(order), 15)
	title.clip_text = true
	title.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	info.add_child(title)
	info.add_child(OpsUI.label("%s · %s" % [OpsUI.client_name(order), OpsUI.short_date(str(order.get("createdAt", "")))], 12, Color(1, 1, 1, 0.55)))
	var totals: Dictionary = order.get("totals", {})
	info.add_child(OpsUI.label("%s  ·  %s" % [OpsUI.usd(float(totals.get("total", 0))), OpsApi.stage_label(str(order.get("stage", "")))], 12, Color(1, 1, 1, 0.85)))
	info.add_child(OpsUI.label(str(order.get("trackingCode", "")), 11, Color(1, 1, 1, 0.5)))
	row.add_child(info)
	var ring := ProgressRing.new()
	ring.value = float(order.get("progress", 0))
	ring.caption = "pending" if order.get("stage", "") == "awaiting_deposit" else "progress"
	ring.track_color = Color("#2a2a2a")
	row.add_child(ring)
	btn.add_child(row)
	var room_id: String = str(order.get("departmentId", "hq"))
	var order_id: String = str(order.get("id", ""))
	btn.pressed.connect(func() -> void: order_requested.emit(room_id, order_id))
	return btn
