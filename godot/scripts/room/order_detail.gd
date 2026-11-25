class_name OrderDetail
extends VBoxContainer
## Editor for one order: quick stage actions, stage/progress/note update, worker assignment,
## and links to the invoice, the client's tracking view and WhatsApp.

signal back_requested

const QUICK: Array[Array] = [
	["deposit_confirmed", 5, "Confirm deposit", "Deposit received. Work is scheduled."],
	["in_progress", 15, "Start work", "Work has started."],
	["in_review", 85, "Send for review", "First delivery sent for your review."],
	["delivered", 100, "Mark delivered", "Final files delivered. Balance due."],
	["closed", 100, "Balance paid · close", "Balance received. Thank you!"],
]

var order: Dictionary = {}
var workers: Array = []

var _stage: OptionButton
var _progress: HSlider
var _progress_label: Label
var _note: TextEdit
var _error: Label
var _busy: bool = false


func _ready() -> void:
	add_theme_constant_override("separation", 10)
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var back := OpsUI.pill("< Back to list")
	back.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	back.pressed.connect(func() -> void: back_requested.emit())
	add_child(back)

	add_child(RoomPanels.stage_pill(str(order.get("stage", ""))))
	var title := OpsUI.label(_lines_text(), 20)
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(title)
	var client: Dictionary = order.get("client", {})
	var meta := OpsUI.muted("%s%s · %s · %s" % [client.get("name", ""), (" · " + str(client.get("company", ""))) if str(client.get("company", "")) != "" else "", order.get("trackingCode", ""), order.get("invoiceNo", "")], 12)
	meta.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(meta)
	var totals: Dictionary = order.get("totals", {})
	var kpis := OpsUI.hbox(24)
	kpis.add_child(OpsUI.kpi(OpsUI.usd(float(totals.get("total", 0))), "Contract", 24))
	kpis.add_child(OpsUI.kpi(OpsUI.usd(float(totals.get("deposit", 0))), "%d%% deposit" % int(order.get("depositPct", 50)), 24))
	add_child(kpis)
	var brief: String = str(order.get("brief", ""))
	if brief != "":
		var b := OpsUI.muted(brief, 13)
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		add_child(b)
	if str(client.get("email", "")) != "" or str(client.get("whatsapp", "")) != "":
		add_child(OpsUI.muted("%s · %s" % [client.get("email", ""), client.get("whatsapp", "")], 12))

	add_child(OpsUI.label("Quick actions", 13, OpsUI.MUTE))
	var quick := HFlowContainer.new()
	quick.add_theme_constant_override("h_separation", 6)
	quick.add_theme_constant_override("v_separation", 6)
	for q: Array in QUICK:
		var b := OpsUI.pill(q[2])
		var q_stage: String = q[0]
		var q_progress: int = maxi(int(q[1]), int(order.get("progress", 0)))
		var q_note: String = q[3]
		b.pressed.connect(func() -> void: _submit(q_stage, q_progress, q_note))
		quick.add_child(b)
	add_child(quick)

	add_child(_build_editor())
	_error = OpsUI.label("", 13, OpsUI.RED)
	_error.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(_error)
	var post := OpsUI.pill("Post update", true, OpsUI.LIME)
	post.pressed.connect(func() -> void: _submit(_selected_stage(), int(_progress.value), _note.text))
	add_child(post)
	add_child(_build_links())


func _build_editor() -> Control:
	var col := OpsUI.vbox(8)
	var row := OpsUI.hbox(8)
	_stage = OptionButton.new()
	_stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	OpsUI.style_input(_stage)
	var stages: Array = OpsApi.snapshot.get("stages", [])
	for i: int in stages.size():
		_stage.add_item(OpsApi.stage_label(str(stages[i])), i)
		if stages[i] == order.get("stage", ""):
			_stage.select(i)
	row.add_child(_stage)
	var assign := OptionButton.new()
	assign.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	OpsUI.style_input(assign)
	assign.add_item("Unassigned", 0)
	var current: String = str(order.get("assignedWorkerId", "")) if order.get("assignedWorkerId") != null else ""
	for i: int in workers.size():
		var w: Dictionary = workers[i]
		assign.add_item("%s · %s" % [w.get("name", ""), "AI" if w.get("kind", "") == "ai" else "Human"], i + 1)
		if w.get("id", "") == current:
			assign.select(i + 1)
	assign.item_selected.connect(func(index: int) -> void:
		var worker_id: Variant = null if index == 0 else workers[index - 1].get("id", "")
		var err: String = await OpsApi.mutate("assignWorker", {"orderId": order.get("id", ""), "workerId": worker_id})
		if is_instance_valid(_error):
			_error.text = err)
	row.add_child(assign)
	col.add_child(row)

	_progress_label = OpsUI.muted("Progress · %d%%" % int(order.get("progress", 0)), 12)
	col.add_child(_progress_label)
	_progress = HSlider.new()
	_progress.min_value = 0
	_progress.max_value = 100
	_progress.step = 5
	_progress.value = float(order.get("progress", 0))
	_progress.value_changed.connect(func(v: float) -> void: _progress_label.text = "Progress · %d%%" % int(v))
	col.add_child(_progress)
	_note = TextEdit.new()
	_note.placeholder_text = "Update note: the client sees this on their tracking page."
	_note.custom_minimum_size.y = 72
	_note.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	OpsUI.style_input(_note)
	col.add_child(_note)
	return col


func _build_links() -> Control:
	var links := HFlowContainer.new()
	links.add_theme_constant_override("h_separation", 6)
	links.add_theme_constant_override("v_separation", 6)
	var code: String = str(order.get("trackingCode", ""))
	var invoice := OpsUI.pill("Open invoice")
	invoice.pressed.connect(func() -> void: OpsApi.open_url("/invoice/%s" % code))
	links.add_child(invoice)
	var track := OpsUI.pill("Client tracking view")
	track.pressed.connect(func() -> void: OpsApi.open_url("/track?code=%s" % code))
	links.add_child(track)
	var wa: String = str(order.get("client", {}).get("whatsapp", "")).replace(" ", "").replace("+", "")
	if wa != "":
		var msg: String = "Hi %s, update on your R1VLE project (%s): %s, %d%% complete. Track it here: %s" % [
			str(order.get("client", {}).get("name", "")).get_slice(" ", 0), code, OpsApi.stage_label(str(order.get("stage", ""))), int(order.get("progress", 0)), OpsApi.site_url("/track?code=%s" % code)]
		var chat := OpsUI.pill("Message client")
		chat.pressed.connect(func() -> void: OpsApi.open_url("https://wa.me/%s?text=%s" % [wa, msg.uri_encode()]))
		links.add_child(chat)
	return links


func _selected_stage() -> String:
	var stages: Array = OpsApi.snapshot.get("stages", [])
	return str(stages[_stage.selected]) if _stage.selected >= 0 and _stage.selected < stages.size() else str(order.get("stage", ""))


func _submit(stage: String, progress: int, note: String) -> void:
	if _busy:
		return
	_busy = true
	var err: String = await OpsApi.mutate("advanceOrder", {"orderId": order.get("id", ""), "stage": stage, "progress": progress, "note": note.strip_edges()})
	_busy = false
	if is_instance_valid(_error):
		_error.text = err


func _lines_text() -> String:
	var names: PackedStringArray = []
	for l: Dictionary in order.get("lines", []):
		names.append(str(l.get("name", "")))
	return " + ".join(names)
