# MainUI — top bar, bottom bar, toasts e popups globais | FASE 13
extends Control
## Montada pelo main.gd; UIManager guarda a referência.

const PanelBaseScript := preload("res://scripts/ui/panel_base.gd")
const CombatScreenScript := preload("res://scripts/ui/combat_screen.gd")

var combat_screen: Control
var overlay: Control
var top_bar: PanelContainer
var _cur_labels: Dictionary = {}
var _pc_label: Label
var _stage_chip: Label
var _toast_box: VBoxContainer
var _title_overlay: Control

func _ready() -> void:
        set_anchors_preset(Control.PRESET_FULL_RECT)
        _build_top_bar()
        _build_combat()
        _build_bottom_bar()
        _build_toasts()
        _build_title_overlay()
        UIManager.register_main_ui(self)
        EventBus.currency_changed.connect(_on_currency)
        EventBus.gold_changed.connect(func(_v): _on_currency("ouro", EconomyManager.get_cur("ouro")))
        EventBus.stats_recalculated.connect(func(_s): _refresh_pc())
        EventBus.stage_changed.connect(func(_st, _b, _m): _refresh_stage_chip())
        EventBus.loot_rare.connect(_on_loot_rare)
        EventBus.inventory_full.connect(func(): EventBus.toast_msg(DataManager.tr_key("inventory_full"), "#d0455f"))
        _refresh_all()

func _on_loot_rare(item: Dictionary) -> void:
        var rid := String(item.get("rarity", "rara"))
        var sfx_name := "loot_rare"
        if rid in ["epica"]:
                sfx_name = "loot_epic"
        elif rid in ["lendaria", "mitica", "divina"]:
                sfx_name = "loot_legend"
        AudioManager.play_sfx(sfx_name)
        if rid == "divina":
                EventBus.toast_msg("★ " + DataManager.tr_key("loot_divine"), "#f5e6c8")
        elif rid == "lendaria":
                EventBus.toast_msg("★ " + DataManager.tr_key("loot_legendary"), "#e8a33a")

## ---------- TOP BAR ----------
func _build_top_bar() -> void:
        top_bar = PanelContainer.new()
        top_bar.position = Vector2(0, 0)
        top_bar.size = Vector2(1080, 140)
        top_bar.add_theme_stylebox_override("panel", _sb(Color(0.09, 0.07, 0.14, 0.94), 0))
        add_child(top_bar)
        var v := VBoxContainer.new()
        v.add_theme_constant_override("separation", 2)
        top_bar.add_child(v)
        # linha 1: moedas principais
        var cur_row := HBoxContainer.new()
        cur_row.add_theme_constant_override("separation", 14)
        v.add_child(cur_row)
        for cid in ["ouro", "gemas", "essencia", "chaves"]:
                var chip := _currency_chip(cid)
                cur_row.add_child(chip)
        # linha 2: PC + fase + engrenagem
        var row2 := HBoxContainer.new()
        row2.add_theme_constant_override("separation", 16)
        v.add_child(row2)
        _pc_label = _mk_label(DataManager.tr_key("pc") + ": —", 26, "#e8a33a")
        row2.add_child(_pc_label)
        _stage_chip = _mk_label("—", 26, "#3a9e8f")
        row2.add_child(_stage_chip)
        var spacer := Control.new()
        spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
        row2.add_child(spacer)
        var mission_btn := _mk_btn("📋", func(): UIManager.open_panel("missions"), Vector2(70, 56))
        row2.add_child(mission_btn)
        var gear := _mk_btn("⚙", func(): UIManager.open_panel("settings"), Vector2(70, 56))
        row2.add_child(gear)

func _currency_chip(cid: String) -> HBoxContainer:
        var h := HBoxContainer.new()
        h.add_theme_constant_override("separation", 6)
        var icon_path := "res://assets/sprites/ui/currency_%s.png" % cid
        if ResourceLoader.exists(icon_path):
                var tr := TextureRect.new()
                tr.texture = load(icon_path)
                tr.custom_minimum_size = Vector2(44, 44)
                tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
                tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
                h.add_child(tr)
        var l := _mk_label("0", 26, "#e8e0d0")
        h.add_child(l)
        _cur_labels[cid] = l
        return h

func _mk_label(txt: String, size: int, hex: String) -> Label:
        var l := Label.new()
        l.text = txt
        l.add_theme_font_size_override("font_size", size)
        l.add_theme_color_override("font_color", Color(hex))
        return l

func _mk_btn(txt: String, cb: Callable, min_size: Vector2 = Vector2(120, 90)) -> Button:
        var b := Button.new()
        b.text = txt
        b.custom_minimum_size = min_size
        b.add_theme_font_size_override("font_size", 30)
        var sb := StyleBoxFlat.new()
        sb.bg_color = Color("#2a2140")
        sb.set_corner_radius_all(14)
        b.add_theme_stylebox_override("normal", sb)
        b.add_theme_stylebox_override("hover", _sb_light())
        b.pressed.connect(func(): AudioManager.play_sfx("click"); cb.call())
        return b

func _sb_light() -> StyleBoxFlat:
        var sb := StyleBoxFlat.new()
        sb.bg_color = Color("#3a2f55")
        sb.set_corner_radius_all(14)
        return sb

func _sb(color: Color, radius: int) -> StyleBoxFlat:
        var sb := StyleBoxFlat.new()
        sb.bg_color = color
        sb.set_corner_radius_all(radius)
        return sb

## ---------- COMBATE ----------
func _build_combat() -> void:
        combat_screen = CombatScreenScript.new()
        combat_screen.set_anchors_preset(Control.PRESET_FULL_RECT)
        add_child(combat_screen)

## ---------- BOTTOM BAR ----------
func _build_bottom_bar() -> void:
        var bar := PanelContainer.new()
        bar.name = "BottomBar"
        bar.position = Vector2(0, 1700)
        bar.size = Vector2(1080, 220)
        bar.add_theme_stylebox_override("panel", _sb(Color(0.09, 0.07, 0.14, 0.97), 0))
        add_child(bar)
        var grid := GridContainer.new()
        grid.columns = 4
        grid.add_theme_constant_override("h_separation", 12)
        grid.add_theme_constant_override("v_separation", 12)
        bar.add_child(grid)
        var buttons := [
                ["hero", "🗡", DataManager.tr_key("hero")],
                ["equip", "🛡", DataManager.tr_key("equipment")],
                ["skills", "✦", DataManager.tr_key("skills")],
                ["pets", "🐾", DataManager.tr_key("pets")],
                ["map", "🗺", DataManager.tr_key("map")],
                ["dungeons", "🌀", DataManager.tr_key("dungeons")],
                ["summon", "✧", DataManager.tr_key("summon")],
                ["shop", "🛒", DataManager.tr_key("shop")]
        ]
        for b in buttons:
                var bid := String(b[0])
                var btn := Button.new()
                btn.custom_minimum_size = Vector2(250, 92)
                btn.text = b[1] + " " + String(b[2])
                btn.add_theme_font_size_override("font_size", 26)
                var sb := StyleBoxFlat.new()
                sb.bg_color = Color("#241d3a")
                sb.set_corner_radius_all(16)
                btn.add_theme_stylebox_override("normal", sb)
                btn.add_theme_stylebox_override("hover", _sb_light())
                var pressed_sb := _sb_light()
                btn.add_theme_stylebox_override("pressed", pressed_sb)
                btn.pressed.connect(func():
                        AudioManager.play_sfx("click")
                        UIManager.open_panel(bid))
                grid.add_child(btn)

## ---------- TOASTS ----------
func _build_toasts() -> void:
        _toast_box = VBoxContainer.new()
        _toast_box.position = Vector2(140, 300)
        _toast_box.size = Vector2(800, 400)
        _toast_box.add_theme_constant_override("separation", 8)
        _toast_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
        add_child(_toast_box)

func _push_toast(msg: String, color: Color) -> void:
        var l := Label.new()
        l.text = msg
        l.add_theme_font_size_override("font_size", 30)
        l.add_theme_color_override("font_color", color)
        l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        l.size = Vector2(800, 44)
        l.mouse_filter = Control.MOUSE_FILTER_IGNORE
        _toast_box.add_child(l)
        var tw := create_tween()
        tw.tween_interval(1.6)
        tw.tween_property(l, "modulate:a", 0.0, 0.4)
        tw.tween_callback(l.queue_free)
        if _toast_box.get_child_count() > 6:
                _toast_box.get_child(0).queue_free()

## ---------- TITLE OVERLAY ----------
func _build_title_overlay() -> void:
        _title_overlay = Control.new()
        _title_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
        add_child(_title_overlay)
        var bg := ColorRect.new()
        bg.set_anchors_preset(Control.PRESET_FULL_RECT)
        bg.color = Color("#0d0a14")
        _title_overlay.add_child(bg)
        var title := _mk_label("☾ " + DataManager.tr_key("app_title") + " ☽", 52, "#e8833a")
        title.position = Vector2(90, 620)
        title.size = Vector2(900, 80)
        title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        _title_overlay.add_child(title)
        var sub := _mk_label(DataManager.tr_key("tap_to_start"), 34, "#e8e0d0")
        sub.position = Vector2(90, 760)
        sub.size = Vector2(900, 60)
        sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        _title_overlay.add_child(sub)
        var tw := create_tween().set_loops()
        tw.tween_property(sub, "modulate:a", 0.35, 0.8)
        tw.tween_property(sub, "modulate:a", 1.0, 0.8)
        _title_overlay.gui_input.connect(func(ev):
                if ev is InputEventMouseButton and ev.pressed:
                        _start_game())

func _start_game() -> void:
        GameManager.start_game()
        AudioManager.play_sfx("levelup")
        var tw := create_tween()
        tw.tween_property(_title_overlay, "modulate:a", 0.0, 0.4)
        tw.tween_callback(func():
                _title_overlay.visible = false
                _check_boot_popups())

func _check_boot_popups() -> void:
        if OfflineManager.has_pending():
                _show_offline_popup()
        elif not RetentionManager.login_claimed_today():
                _show_daily_login()

## ---------- POPUPS ----------
func _show_offline_popup() -> void:
        var p := OfflineManager.pending
        if p.is_empty():
                return
        var popup := _popup_base("☾ " + DataManager.tr_key("offline_title"))
        var v: VBoxContainer = popup.get_meta("vbox")
        var hours := float(p["seconds"]) / 3600.0
        v.add_child(_mk_label(DataManager.tr_key("offline_desc") + " %.1fh (%s %s)" % [hours, DataManager.tr_key("farming"), str(p["stage"])], 28, "#e8e0d0"))
        v.add_child(_mk_label("🪙 %s   ✦ XP %s" % [_fmt(float(p["gold"])), _fmt(float(p["xp"]))], 40, "#e8a33a"))
        var actions := HBoxContainer.new()
        actions.add_theme_constant_override("separation", 20)
        actions.alignment = BoxContainer.ALIGNMENT_CENTER
        var collect_btn := _mk_btn(DataManager.tr_key("collect"), func():
                OfflineManager.collect(false)
                AudioManager.play_sfx("coin")
                popup.queue_free(), Vector2(380, 100))
        actions.add_child(collect_btn)
        if OfflineManager.ad_stub_available():
                var dbl := _mk_btn(DataManager.tr_key("collect_double"), func():
                        OfflineManager.collect(true)
                        popup.queue_free(), Vector2(380, 100))
                actions.add_child(dbl)
        v.add_child(actions)

func _show_daily_login() -> void:
        var info := RetentionManager.login_day_info()
        if info.is_empty():
                return
        var popup := _popup_base(DataManager.tr_key("daily_login"))
        var v: VBoxContainer = popup.get_meta("vbox")
        v.add_child(_mk_label("Dia %d de 7" % int(info["day"]), 30, "#3a9e8f"))
        v.add_child(_mk_label(str(info["reward"]), 34, "#e8a33a"))
        v.add_child(_mk_btn(DataManager.tr_key("claim"), func():
                RetentionManager.claim_login()
                AudioManager.play_sfx("coin")
                popup.queue_free(), Vector2(300, 96)))

func _show_gacha_results(results: Array) -> void:
        var popup := _popup_base("✧ " + DataManager.tr_key("summon"))
        var v: VBoxContainer = popup.get_meta("vbox")
        var rc := {"comum": "#9aa0a6", "incomum": "#58c46a", "rara": "#3a7bd5", "epica": "#9b59d0", "lendaria": "#e8a33a", "mitica": "#d0455f", "divina": "#f5e6c8"}
        for r in results:
                var hex: String = rc.get(String(r["rarity"]), "#e8e0d0")
                var line := _mk_label("%s %s — %s%s" % [String(r["kind"]).capitalize(), String(r["name"]), String(r["rarity"]).capitalize(), " (frag+)" if String(r["detail"]) == "duplicate" else ""], 28, hex)
                v.add_child(line)
        v.add_child(_mk_btn(DataManager.tr_key("close"), func(): popup.queue_free(), Vector2(300, 90)))

func _popup_base(title: String) -> Control:
        var popup := Control.new()
        popup.set_anchors_preset(Control.PRESET_FULL_RECT)
        popup.z_index = 100
        add_child(popup)
        var dim := ColorRect.new()
        dim.set_anchors_preset(Control.PRESET_FULL_RECT)
        dim.color = Color(0, 0, 0, 0.7)
        popup.add_child(dim)
        var panel := PanelContainer.new()
        panel.position = Vector2(90, 500)
        panel.size = Vector2(900, 700)
        var sb := StyleBoxFlat.new()
        sb.bg_color = Color("#1d1730")
        sb.set_corner_radius_all(24)
        sb.content_margin_left = 40
        sb.content_margin_right = 40
        sb.content_margin_top = 30
        sb.content_margin_bottom = 30
        panel.add_theme_stylebox_override("panel", sb)
        popup.add_child(panel)
        var v := VBoxContainer.new()
        v.add_theme_constant_override("separation", 18)
        panel.add_child(v)
        var t := _mk_label(title, 40, "#e8833a")
        v.add_child(t)
        popup.set_meta("vbox", v)
        return popup

func _fmt(v: float) -> String:
        if v >= 1_000_000.0:
                return "%.2fM" % (v / 1_000_000.0)
        if v >= 10_000.0:
                return "%.1fK" % (v / 1000.0)
        return str(int(v))

## ---------- REFRESH ----------
func _on_currency(cid: String, _val: float) -> void:
        _refresh_all()

func _refresh_all() -> void:
        for cid in _cur_labels.keys():
                var v := EconomyManager.get_cur(String(cid))
                _cur_labels[cid].text = _fmt(v)
        _refresh_pc()
        _refresh_stage_chip()

func _refresh_pc() -> void:
        _pc_label.text = DataManager.tr_key("pc") + ": " + _fmt(CharacterManager.pc())

func _refresh_stage_chip() -> void:
        var reg: Dictionary = ProgressionManager.current_region()
        var boss_txt := " ☠" if DataManager.is_boss_stage(ProgressionManager.current_stage) else ""
        _stage_chip.text = String(reg["name"]) + " — " + DataManager.tr_key("stage") + " " + str(ProgressionManager.current_stage) + boss_txt

func _process(_delta: float) -> void:
        # atualização leve periódica dos valores (ouro muda a cada abate)
        _cur_labels["ouro"].text = _fmt(EconomyManager.get_cur("ouro"))
