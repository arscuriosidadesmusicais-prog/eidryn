# CombatScreen — apresentação do combate: parallax, sprites, barras, dano flutuante | FASE 2/13
extends Control
## Apresentação pura: escuta EventBus, nunca altera estado de jogo.

const FLOAT_POOL := 14
const BG_W := 1080.0

var _layers: Array = []           # parallax [node, speed]
var _hero_img: TextureRect
var _enemy_img: TextureRect
var _hero_bar: ColorRect
var _enemy_bar: ColorRect
var _hero_bar_ghost: ColorRect
var _enemy_bar_ghost: ColorRect
var _hero_hp_label: Label
var _enemy_name_label: Label
var _enemy_mods_label: Label
var _enemy_bar_label: Label
var _boss_timer_bar: ProgressBar
var _boss_timer_label: Label
var _stage_label: Label
var _region_label: Label
var _floats: Array = []
var _float_idx: int = 0
var _shake_amount: float = 0.0
var _auto_btn: Button
var _hero_hp_shown: float = 1.0
var _enemy_hp_shown: float = 1.0
var _region_tex: String = ""

func _ready() -> void:
        set_anchors_preset(Control.PRESET_FULL_RECT)
        _build_parallax()
        _build_entities()
        _build_bars()
        _build_floats()
        _connect_signals()
        _update_region_visual("bosque_vidro")

func _connect_signals() -> void:
        EventBus.enemy_spawned.connect(_on_enemy_spawned)
        EventBus.enemy_hp_changed.connect(_on_enemy_hp)
        EventBus.hero_hp_changed.connect(_on_hero_hp)
        EventBus.floating_damage.connect(_on_float)
        EventBus.boss_timer.connect(_on_boss_timer)
        EventBus.screenshake.connect(func(i): _shake_amount = maxf(_shake_amount, i))
        EventBus.stage_changed.connect(_on_stage_changed)
        EventBus.region_changed.connect(func(rid): _update_region_visual(rid))
        EventBus.combat_ended.connect(_on_combat_ended)
        EventBus.level_up.connect(func(_lv): _banner(DataManager.tr_key("level_up"), Color("#e8a33a")))
        EventBus.combat_started.connect(func(_s, is_boss): if is_boss: AudioManager.play_sfx("boss_roar"))

## ---------- CONSTRUÇÃO ----------
func _build_parallax() -> void:
        var sky := ColorRect.new()
        sky.set_anchors_preset(Control.PRESET_FULL_RECT)
        add_child(sky)
        _layers.append([sky, 0.0])

func _build_entities() -> void:
        _hero_img = TextureRect.new()
        _hero_img.custom_minimum_size = Vector2(480, 480)
        _hero_img.stretch_mode = TextureRect.STRETCH_SCALE
        _hero_img.position = Vector2(90, 1050)
        if ResourceLoader.exists("res://assets/sprites/hero/hero.png"):
                _hero_img.texture = load("res://assets/sprites/hero/hero.png")
        add_child(_hero_img)
        _enemy_img = TextureRect.new()
        _enemy_img.custom_minimum_size = Vector2(480, 480)
        _enemy_img.stretch_mode = TextureRect.STRETCH_SCALE
        _enemy_img.position = Vector2(540, 1050)
        add_child(_enemy_img)

func _build_bars() -> void:
        # Barras de vida — hero esquerda, inimigo direita
        var hero_panel := _bar_panel(Vector2(40, 950), Vector2(460, 60))
        _hero_bar_ghost = _bar_fill(hero_panel, Color("#7a3030"))
        _hero_bar = _bar_fill(hero_panel, Color("#3a9e5f"))
        _hero_hp_label = _bar_label(hero_panel)
        var enemy_panel := _bar_panel(Vector2(580, 950), Vector2(460, 60))
        _enemy_bar_ghost = _bar_fill(enemy_panel, Color("#7a3030"))
        _enemy_bar = _bar_fill(enemy_panel, Color("#d0455f"))
        _enemy_bar_label = _bar_label(enemy_panel)
        _enemy_name_label = _label(Vector2(580, 890), Vector2(460, 44), 30, Color("#e8e0d0"))
        _enemy_name_label.text = ""
        _enemy_mods_label = _label(Vector2(580, 926), Vector2(460, 30), 20, Color("#e8a33a"))
        _enemy_mods_label.text = ""
        # Timer de chefe
        var tp := _bar_panel(Vector2(240, 180), Vector2(600, 40))
        tp.visible = false
        _boss_timer_bar = ProgressBar.new()
        _boss_timer_bar.set_anchors_preset(Control.PRESET_FULL_RECT)
        _boss_timer_bar.max_value = 30.0
        _boss_timer_bar.value = 30.0
        _boss_timer_bar.show_percentage = false
        _boss_timer_bar.add_theme_stylebox_override("fill", _flat(Color("#e8833a")))
        _boss_timer_bar.add_theme_stylebox_override("background", _flat(Color("#241a33")))
        tp.add_child(_boss_timer_bar)
        _boss_timer_label = _label(Vector2(240, 150), Vector2(600, 36), 26, Color("#e8833a"))
        _boss_timer_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        _boss_timer_label.text = ""
        # Cabeçalho de fase
        _stage_label = _label(Vector2(40, 30), Vector2(700, 50), 40, Color("#e8e0d0"))
        _region_label = _label(Vector2(40, 84), Vector2(700, 36), 24, Color("#3a9e8f"))
        # Botão auto-avançar
        _auto_btn = Button.new()
        _auto_btn.text = "»"
        _auto_btn.position = Vector2(950, 30)
        _auto_btn.size = Vector2(90, 70)
        _auto_btn.toggle_mode = true
        _auto_btn.button_pressed = true
        _auto_btn.add_theme_font_size_override("font_size", 34)
        _auto_btn.toggled.connect(func(on): ProgressionManager.set_auto_advance(on); AudioManager.play_sfx("click"))
        add_child(_auto_btn)

func _bar_panel(pos: Vector2, size: Vector2) -> Control:
        var panel := Panel.new()
        panel.position = pos
        panel.size = size
        panel.add_theme_stylebox_override("panel", _flat(Color("#1a1526")))
        add_child(panel)
        return panel

func _bar_fill(panel: Control, color: Color) -> ColorRect:
        var fill := ColorRect.new()
        fill.color = color
        fill.position = Vector2(4, 4)
        fill.size = Vector2(panel.size.x - 8, panel.size.y - 8)
        panel.add_child(fill)
        return fill

func _bar_label(panel: Control) -> Label:
        var l := Label.new()
        l.set_anchors_preset(Control.PRESET_FULL_RECT)
        l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
        l.add_theme_font_size_override("font_size", 24)
        panel.add_child(l)
        return l

func _label(pos: Vector2, size: Vector2, font_size: int, color: Color) -> Label:
        var l := Label.new()
        l.position = pos
        l.size = size
        l.add_theme_font_size_override("font_size", font_size)
        l.add_theme_color_override("font_color", color)
        add_child(l)
        return l

func _flat(color: Color) -> StyleBoxFlat:
        var sb := StyleBoxFlat.new()
        sb.bg_color = color
        return sb

## ---------- DANO FLUTUANTE (pool) ----------
func _build_floats() -> void:
        for i in FLOAT_POOL:
                var l := Label.new()
                l.visible = false
                l.add_theme_font_size_override("font_size", 40)
                l.z_index = 50
                add_child(l)
                _floats.append(l)

func _on_float(amount: float, crit: bool, side: String, color: Color) -> void:
        var l: Label = _floats[_float_idx]
        _float_idx = (_float_idx + 1) % FLOAT_POOL
        var base_x := 250.0 if side == "hero" else 780.0
        var base_y := 1030.0
        l.text = _fmt_dmg(amount)
        l.add_theme_color_override("font_color", color)
        l.add_theme_font_size_override("font_size", 64 if crit else 40)
        l.position = Vector2(base_x + randf_range(-60, 60), base_y)
        l.visible = true
        l.modulate.a = 1.0
        var tw := create_tween()
        tw.set_parallel(true)
        tw.tween_property(l, "position:y", base_y - (160.0 if crit else 100.0), 0.8)
        tw.tween_property(l, "modulate:a", 0.0, 0.8).set_delay(0.25)
        tw.chain().tween_callback(func(): l.visible = false)

func _fmt_dmg(amount: float) -> String:
        if amount == 0.0:
                return "MISS"
        var v := absf(amount)
        var sign_txt := "-" if amount < 0.0 else ""
        if v >= 1_000_000_000.0:
                return sign_txt + "%.2fB" % (v / 1_000_000_000.0)
        if v >= 1_000_000.0:
                return sign_txt + "%.2fM" % (v / 1_000_000.0)
        if v >= 10_000.0:
                return sign_txt + "%.1fK" % (v / 1000.0)
        return sign_txt + str(int(v))

## ---------- EVENTOS ----------
func _on_enemy_spawned(enemy: Dictionary) -> void:
        var tex: Texture2D = _enemy_texture(enemy)
        _enemy_img.texture = tex
        _enemy_name_label.text = String(enemy.get("name", "?"))
        var mods: Array = enemy.get("modifiers", [])
        var tags := ""
        for m in mods:
                tags += "[" + m + "] "
        _enemy_mods_label.text = tags
        _enemy_hp_shown = 1.0
        _enemy_bar.size.x = 0
        _hero_hp_shown = 1.0
        _hero_bar.size.x = 0
        if bool(enemy.get("boss", false)):
                _boss_timer_bar.get_parent().visible = true
                _boss_timer_bar.max_value = float(DataManager.cfg_enemies["boss_timer_s"])
                _boss_timer_bar.value = _boss_timer_bar.max_value
        else:
                _boss_timer_bar.get_parent().visible = false
                _boss_timer_label.text = ""

func _enemy_texture(enemy: Dictionary) -> Texture2D:
        var sprite := String(enemy.get("sprite", "enemy_bosque_vidro_0"))
        var path := "res://assets/sprites/enemies/%s.png" % sprite
        if ResourceLoader.exists(path):
                return load(path)
        return load("res://assets/sprites/enemies/enemy_generic.png")

func _on_enemy_hp(hp: float, max_hp: float) -> void:
        _enemy_hp_shown = clampf(hp / maxf(max_hp, 1.0), 0.0, 1.0)
        _enemy_bar_label.text = _fmt_dmg(maxf(hp, 0.0)) + " / " + _fmt_dmg(max_hp)

func _on_hero_hp(hp: float, max_hp: float) -> void:
        _hero_hp_shown = clampf(hp / maxf(max_hp, 1.0), 0.0, 1.0)
        _hero_hp_label.text = _fmt_dmg(maxf(hp, 0.0)) + " / " + _fmt_dmg(max_hp)

func _on_boss_timer(seconds: float) -> void:
        _boss_timer_bar.value = maxf(seconds, 0.0)
        _boss_timer_label.text = DataManager.tr_key("boss_timer") + ": %.1fs" % maxf(seconds, 0.0)

func _on_stage_changed(stage: int, is_boss: bool, is_miniboss: bool) -> void:
        var prefix := ""
        if is_boss:
                prefix = "☠ " + DataManager.tr_key("boss") + " — "
        elif is_miniboss:
                prefix = "⚔ " + DataManager.tr_key("miniboss") + " — "
        _stage_label.text = prefix + DataManager.tr_key("stage") + " " + str(stage)
        _update_region_visual(ProgressionManager.current_region()["id"])

func _on_combat_ended(result: String, _stage: int) -> void:
        if result == "win":
                AudioManager.play_sfx("coin")
        else:
                AudioManager.play_sfx("fail")
                _banner(DataManager.tr_key("combat_fail"), Color("#d0455f"))

func _banner(txt: String, color: Color) -> void:
        var l := Label.new()
        l.text = txt
        l.add_theme_font_size_override("font_size", 56)
        l.add_theme_color_override("font_color", color)
        l.position = Vector2(140, 500)
        l.size = Vector2(800, 80)
        l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        l.z_index = 60
        l.modulate.a = 0.0
        add_child(l)
        var tw := create_tween()
        tw.tween_property(l, "modulate:a", 1.0, 0.2)
        tw.tween_interval(1.0)
        tw.tween_property(l, "modulate:a", 0.0, 0.5)
        tw.tween_callback(l.queue_free)

## ---------- REGIÃO/PARALLAX ----------
func _update_region_visual(region_id: String) -> void:
        if _region_tex == region_id:
                return
        var region := _find_region(region_id)
        if region.is_empty():
                return
        _region_tex = region_id
        var pal: Dictionary = region["palette"]
        var sky: ColorRect = _layers[0][0]
        sky.color = Color(String(pal["sky_top"]))

        # Descarta referências dos layers antigos antes de enfileirar os nós para liberação.
        _layers.resize(1)
        _clear_layer_children(sky)

        # Usa os backgrounds importados (270×480, escalados 4×) em vez de gerar
        # três imagens RGBA 1080×1920 por troca de região.
        var sky_path := "res://assets/sprites/ui/bg_%s_sky.png" % region_id
        if ResourceLoader.exists(sky_path):
                var sky_layer := TextureRect.new()
                sky_layer.set_anchors_preset(Control.PRESET_FULL_RECT)
                sky_layer.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
                sky_layer.stretch_mode = TextureRect.STRETCH_SCALE
                sky_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
                sky_layer.texture = load(sky_path)
                sky.add_child(sky_layer)

        var keys := ["far", "mid", "near"]
        var speeds := [8.0, 20.0, 42.0]
        for i in keys.size():
                var key: String = keys[i]
                var texture_path := "res://assets/sprites/ui/bg_%s_%s.png" % [region_id, key]
                if not ResourceLoader.exists(texture_path):
                        continue
                var texture: Texture2D = load(texture_path)
                var layer := Control.new()
                layer.size = Vector2(BG_W * 2.0, 1920.0)
                layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
                var texture_height := texture.get_height() * 4.0
                var layer_y := 1524.0 - texture_height
                # Duas cópias lado a lado garantem parallax contínuo sem faixa vazia.
                for copy in 2:
                        var rect := TextureRect.new()
                        rect.texture = texture
                        rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
                        rect.stretch_mode = TextureRect.STRETCH_SCALE
                        rect.position = Vector2(float(copy) * BG_W, layer_y)
                        rect.size = Vector2(BG_W, texture_height)
                        rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
                        layer.add_child(rect)
                sky.add_child(layer)
                _layers.append([layer, speeds[i]])

        # Chão e névoa continuam leves e sobrepostos às silhuetas.
        var ground := ColorRect.new()
        ground.color = Color(String(pal["ground"]))
        ground.position = Vector2(0, 1520)
        ground.size = Vector2(BG_W, 400)
        ground.mouse_filter = Control.MOUSE_FILTER_IGNORE
        sky.add_child(ground)
        var glow := ColorRect.new()
        glow.color = Color(String(pal["accent"]), 0.08)
        glow.position = Vector2(0, 1400)
        glow.size = Vector2(BG_W, 120)
        glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
        sky.add_child(glow)

func _clear_layer_children(n: Node) -> void:
        for c in n.get_children():
                if not c.is_queued_for_deletion():
                        c.queue_free()

func _find_region(rid: String) -> Dictionary:
        for r in DataManager.cfg_regions["regions"]:
                if r["id"] == rid:
                        return r
        return {}

## ---------- LOOP VISUAL ----------
func _process(delta: float) -> void:
        # parallax
        for entry in _layers:
                if float(entry[1]) <= 0.0:
                        continue
                var node: Control = entry[0]
                node.position.x -= float(entry[1]) * delta
                if node.position.x <= -BG_W:
                        node.position.x += BG_W
        # barras animadas (ghost trail)
        _tween_bar(_hero_bar, _hero_hp_shown, _hero_bar_ghost, delta, true)
        _tween_bar(_enemy_bar, _enemy_hp_shown, _enemy_bar_ghost, delta, false)
        # screenshake
        if _shake_amount > 0.001:
                position = Vector2(randf_range(-_shake_amount, _shake_amount) * 14.0, randf_range(-_shake_amount, _shake_amount) * 14.0)
                _shake_amount = maxf(0.0, _shake_amount - delta * 2.0)
        else:
                position = Vector2.ZERO

func _tween_bar(fill: ColorRect, target: float, ghost: ColorRect, delta: float, is_hero: bool) -> void:
        if fill == null:
                return
        var max_w := 452.0
        var cur := fill.size.x / max_w
        var lerp_speed := 8.0 if is_hero else 8.0
        cur = lerpf(cur, target, minf(delta * lerp_speed, 1.0))
        fill.size.x = max_w * cur
        var g := ghost.size.x / max_w
        if target < g:
                g = maxf(target, g - delta * 0.35)
        else:
                g = target
        ghost.size.x = max_w * g
