class_name OpsUI
extends RefCounted
## Style + widget helpers for the ORION-style HUD: frosted glass panels, black strip cards,
## pill buttons and big thin numbers. Everything is built in code so scenes stay tiny.

const WHITE: Color = Color(1, 1, 1)
const MUTE: Color = Color(1, 1, 1, 0.7)
const LIME: Color = Color("#c8f53b")
const RED: Color = Color("#ff5a4f")
const VIOLET: Color = Color("#7b8cff")
const INK: Color = Color("#0b0b0b")
const CARD: Color = Color("#171717")
const ROOM_ACCENTS: Dictionary = {
	"security": Color("#ff4d3d"),
	"intelligence": Color("#c8f53b"),
	"creative": Color("#7b8cff"),
	"hq": Color("#ffffff"),
}
const ROOM_NAMES: Dictionary = {
	"security": "Security",
	"intelligence": "Intelligence",
	"creative": "Creative Studio",
	"hq": "Founder HQ",
}


static func box(bg: Color, radius: int = 22, border: Color = Color(0, 0, 0, 0), pad: int = 16) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(radius)
	s.set_content_margin_all(pad)
	if border.a > 0.0:
		s.border_color = border
		s.set_border_width_all(1)
	s.anti_aliasing = true
	return s


static func glass_style(pad: int = 18) -> StyleBoxFlat:
	return box(Color(1, 1, 1, 0.16), 22, Color(1, 1, 1, 0.34), pad)


static func glass(pad: int = 18) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", glass_style(pad))
	return p


static func dark_card(pad: int = 16) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", box(CARD, 22, Color(0, 0, 0, 0), pad))
	return p


static func label(text: String, size: int = 14, color: Color = WHITE) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


static func muted(text: String, size: int = 12) -> Label:
	return label(text, size, MUTE)


## A pill-shaped button. `filled` = solid accent background with dark text (selected state).
static func pill(text: String, filled: bool = false, accent: Color = WHITE) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_ALL
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	b.add_theme_font_size_override("font_size", 13)
	var border: Color = Color(0, 0, 0, 0) if filled else Color(1, 1, 1, 0.3)
	var normal := box(accent if filled else Color(0, 0, 0, 0), 999, border, 0)
	normal.content_margin_left = 14
	normal.content_margin_right = 14
	normal.content_margin_top = 7
	normal.content_margin_bottom = 7
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = accent.lightened(0.15) if filled else Color(1, 1, 1, 0.14)
	var focus := normal.duplicate() as StyleBoxFlat
	focus.border_color = LIME
	focus.set_border_width_all(2)
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", hover)
	b.add_theme_stylebox_override("focus", focus)
	b.add_theme_stylebox_override("disabled", normal)
	var text_color: Color = INK if filled else WHITE
	for key: String in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color", "font_hover_pressed_color"]:
		b.add_theme_color_override(key, text_color)
	return b


## A big thin number with a small caption, as in the ORION KPI cards.
static func kpi(value: String, caption: String, size: int = 28) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 0)
	v.add_child(label(value, size, WHITE))
	v.add_child(muted(caption, 11))
	return v


## Styles an input (LineEdit, TextEdit, OptionButton) for dark glass.
static func style_input(c: Control) -> void:
	var normal := box(Color(0, 0, 0, 0.35), 12, Color(1, 1, 1, 0.2), 10)
	var focus := box(Color(0, 0, 0, 0.45), 12, LIME, 10)
	for key: String in ["normal", "hover", "pressed", "read_only", "disabled"]:
		c.add_theme_stylebox_override(key, normal)
	c.add_theme_stylebox_override("focus", focus)
	for key: String in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		c.add_theme_color_override(key, WHITE)
	c.add_theme_color_override("font_placeholder_color", Color(1, 1, 1, 0.45))
	c.add_theme_font_size_override("font_size", 14)


static func spacer() -> Control:
	var c := Control.new()
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c


static func vbox(sep: int = 10) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", sep)
	return v


static func hbox(sep: int = 10) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", sep)
	return h


static func clear(node: Node) -> void:
	for child: Node in node.get_children():
		node.remove_child(child)
		child.queue_free()


## "$1,234" (whole dollars) or "$1,234.50".
static func usd(amount: float) -> String:
	var cents: int = int(round(amount * 100.0))
	var whole: int = absi(cents) / 100
	var frac: int = absi(cents) % 100
	var digits: String = str(whole)
	var grouped: String = ""
	while digits.length() > 3:
		grouped = "," + digits.substr(digits.length() - 3) + grouped
		digits = digits.substr(0, digits.length() - 3)
	var sign_text: String = "-" if cents < 0 else ""
	var out: String = "%s$%s%s" % [sign_text, digits, grouped]
	return out if frac == 0 else "%s.%02d" % [out, frac]


static func short_date(iso: String) -> String:
	var months: PackedStringArray = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	var parts: PackedStringArray = iso.substr(0, 10).split("-")
	if parts.size() < 3:
		return iso
	return "%d %s" % [int(parts[2]), months[clampi(int(parts[1]) - 1, 0, 11)]]


static func order_title(order: Dictionary) -> String:
	var lines: Array = order.get("lines", [])
	if lines.is_empty():
		return "Order"
	var first: String = str(lines[0].get("name", "Order"))
	return first if lines.size() == 1 else "%s +%d" % [first, lines.size() - 1]


static func client_name(order: Dictionary) -> String:
	var c: Dictionary = order.get("client", {})
	var company: String = str(c.get("company", ""))
	return company if company != "" else str(c.get("name", "Client"))
