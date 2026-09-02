# PanelBase — base para todos os painéis full-screen do menu | FASE 13
extends Control
class_name PanelBase

const COLORS := {
	"bg": Color("#140f1e"), "panel": Color("#1d1730"), "panel2": Color("#241d3a"),
	"border": Color("#3a2f55"), "text": Color("#e8e0d0"), "dim": Color("#9a92b0"),
	"accent": Color("#e8833a"), "teal": Color("#3a9e8f"), "red": Color("#d0455f"),
	"gold": Color("#e8a33a"), "divine": Color("#f5e6c8")
}
const RARITY_COLORS := {"comum": "#9aa0a6", "incomum": "#58c46a", "rara": "#3a7bd5", "epica": "#9b59d0", "lendaria": "#e8a33a", "mitica": "#d0455f", "divina": "#f5e6c8"}

var title_label: Label
var content: VBoxContainer
var scroll: ScrollContainer

func _init(p_title: String = "") -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)

func _ready() -> void:
	_build_chrome()
	build_content()
	visible = false

func _build_chrome() -> void:
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = COLORS["bg"]
	add_child(bg)
	# header
	var header := Panel.new()
	header.position = Vector2(0, 0)
	header.size = Vector2(1080, 130)
	header.add_theme_stylebox_override("panel", _sb(COLORS["panel"]))
	add_child(header)
	title_label = Label.new()
	title_label.position = Vector2(40, 34)
	title_label.size = Vector2(840, 60)
	title_label.add_theme_font_size_override("font_size", 44)
	title_label.add_theme_color_override("font_color", COLORS["text"])
	title_label.text = get_panel_title()
	header.add_child(title_label)
	var close := Button.new()
	close.text = "✕"
	close.position = Vector2(940, 25)
	close.size = Vector2(110, 80)
	close.add_theme_font_size_override("font_size", 40)
	close.pressed.connect(func(): UIManager.close_panel(); AudioManager.play_sfx("click"))
	header.add_child(close)
	# scroll
	scroll = ScrollContainer.new()
	scroll.position = Vector2(0, 130)
	scroll.size = Vector2(1080, 1570)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)
	content = VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 14)
	scroll.add_child(content)

func get_panel_title() -> String:
	return "Painel"

func build_content() -> void:
	pass

func refresh() -> void:
	pass

## ---------- HELPERS DE UI ----------
func _sb(color: Color, radius: int = 12) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = color
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = 20
	sb.content_margin_right = 20
	sb.content_margin_top = 14
	sb.content_margin_bottom = 14
	return sb

func _card() -> PanelContainer:
	var c := PanelContainer.new()
	c.add_theme_stylebox_override("panel", _sb(COLORS["panel"]))
	return c

func _vbox() -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	return v

func _hbox() -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	return h

func _label(txt: String, size: int = 28, color: Color = COLORS["text"], wrap: bool = false) -> Label:
	var l := Label.new()
	l.text = txt
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if wrap else TextServer.AUTOWRAP_OFF
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return l

func _btn(txt: String, cb: Callable, color: Color = COLORS["accent"], size: int = 28, min_w: int = 180) -> Button:
	var b := Button.new()
	b.text = txt
	b.add_theme_font_size_override("font_size", size)
	b.custom_minimum_size = Vector2(min_w, 76)
	var sb := _sb(color, 14)
	sb.content_margin_top = 10
	sb.content_margin_bottom = 10
	b.add_theme_stylebox_override("normal", sb)
	var sbp := _sb(color.lightened(0.2), 14)
	sbp.content_margin_top = 10
	sbp.content_margin_bottom = 10
	b.add_theme_stylebox_override("hover", sbp)
	b.add_theme_stylebox_override("pressed", _sb(color.darkened(0.2), 14))
	b.pressed.connect(func():
		AudioManager.play_sfx("click")
		cb.call())
	return b

func _row() -> HBoxContainer:
	var h := _hbox()
	h.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return h

func _spacer(w: int = 20) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(w, 10)
	return c

func fmt(v: float) -> String:
	var a := absf(v)
	if a >= 1_000_000_000_000.0:
		return "%.2fT" % (v / 1_000_000_000_000.0)
	if a >= 1_000_000_000.0:
		return "%.2fB" % (v / 1_000_000_000.0)
	if a >= 1_000_000.0:
		return "%.2fM" % (v / 1_000_000.0)
	if a >= 10_000.0:
		return "%.1fK" % (v / 1000.0)
	if a == int(a):
		return str(int(v))
	return "%.1f" % v

func rarity_color(rid: String) -> Color:
	return Color(RARITY_COLORS.get(rid, "#e8e0d0"))
