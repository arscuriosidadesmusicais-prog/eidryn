# PanelsWorld — painéis Mapa, Masmorras, Invocar, Loja, Missões, Ajustes | FASE 13
extends Object
class_name PanelsWorld

static func base() -> GDScript:
	return preload("res://scripts/ui/panel_base.gd")

## ================= MAPA =================
class MapPanel extends PanelBase:
	func get_panel_title() -> String:
		return DataManager.tr_key("regions")

	func build_content() -> void:
		_rebuild()

	func refresh() -> void:
		_rebuild()

	func _rebuild() -> void:
		for c in content.get_children():
			c.queue_free()
		content.add_child(_label("Fase atual: %d | Máxima: %d | Farm: %d" % [ProgressionManager.current_stage, ProgressionManager.max_stage, ProgressionManager.farm_stage()], 26, COLORS["teal"]))
		for r in DataManager.cfg_regions["regions"]:
			content.add_child(_region_card(r))

	func _region_card(r: Dictionary) -> PanelContainer:
		var card := _card()
		var v := _vbox()
		var rng_arr: Array = r["stages"]
		var unlocked := ProgressionManager.max_stage >= int(rng_arr[0])
		var color := COLORS["text"] if unlocked else COLORS["dim"]
		v.add_child(_label(String(r["name"]) + ("  [%d–%s]" % [int(rng_arr[0]), "∞" if int(rng_arr[1]) > 9000 else str(int(rng_arr[1]))]), 30, color))
		v.add_child(_label(String(r["desc"]), 20, COLORS["dim"], true))
		if unlocked:
			var actions := _row()
			var target := int(rng_arr[0])
			var jump := _btn("Ir para %d" % target, func():
				ProgressionManager.jump_to_stage(target)
				CombatManager.mode = "campaign"
				CombatManager.start_campaign(ProgressionManager.current_stage)
				UIManager.close_panel(), COLORS["accent"], 24, 240)
			if ProgressionManager.current_stage == target:
				jump.disabled = true
			actions.add_child(jump)
			# fases-chave clicáveis (a cada 10)
			var stage_step := maxi(int(rng_arr[0]), 10)
			for st in range(stage_step, mini(int(rng_arr[1]), 9000) + 1, 10):
				if st <= ProgressionManager.max_stage:
					var s := st
					actions.add_child(_btn(str(s), func():
						ProgressionManager.jump_to_stage(s)
						CombatManager.mode = "campaign"
						CombatManager.start_campaign(s)
						UIManager.close_panel(), COLORS["panel2"], 20, 110))
			v.add_child(actions)
		else:
			v.add_child(_label("Bloqueada — alcance a fase %d" % int(rng_arr[0]), 22, COLORS["dim"]))
		card.add_child(v)
		return card

## ================= MASMORRAS =================
class DungeonsPanel extends PanelBase:
	func get_panel_title() -> String:
		return DataManager.tr_key("dungeons")

	func build_content() -> void:
		_rebuild()

	func refresh() -> void:
		_rebuild()

	func _rebuild() -> void:
		for c in content.get_children():
			c.queue_free()
		content.add_child(_label("Chaves: %d 🔑" % int(EconomyManager.get_cur("chaves")), 28, COLORS["gold"]))
		for mid in ["masmorra_ouro", "masmorra_xp", "masmorra_equip"]:
			content.add_child(_dungeon_card(mid))
		content.add_child(_tower_card())
		content.add_child(_wb_card())
		content.add_child(_arena_card())

	func _dungeon_card(mode_id: String) -> PanelContainer:
		var d: Dictionary = DataManager.cfg_dungeons[mode_id]
		var card := _card()
		var v := _vbox()
		v.add_child(_label(String(d["name"]), 30))
		v.add_child(_label(String(d["desc"]), 20, COLORS["dim"], true))
		var check: Dictionary = ModesManager.can_enter(mode_id)
		var actions := _row()
		var btn := _btn(DataManager.tr_key("enter"), func(): ModesManager.enter(mode_id); UIManager.close_panel(), COLORS["teal"], 26, 260)
		if not bool(check["ok"]):
			btn.disabled = true
			actions.add_child(_label(String(check.get("reason", "")), 22, COLORS["red"]))
		v.add_child(actions)
		v.add_child(btn)
		card.add_child(v)
		return card

	func _tower_card() -> PanelContainer:
		var d: Dictionary = DataManager.cfg_dungeons["torre_infinita"]
		var card := _card()
		var v := _vbox()
		v.add_child(_label(DataManager.tr_key("tower") + " — recorde: andar %d" % ModesManager.tower_record, 30, COLORS["gold"]))
		v.add_child(_label(String(d["desc"]), 20, COLORS["dim"], true))
		var btn := _btn(DataManager.tr_key("enter") + " (andar %d)" % ModesManager.tower_floor, func(): ModesManager.enter("torre_infinita"); UIManager.close_panel(), COLORS["accent"], 26, 300)
		if CombatManager.active and CombatManager.mode == "tower":
			btn.disabled = true
		v.add_child(btn)
		card.add_child(v)
		return card

	func _wb_card() -> PanelContainer:
		var d: Dictionary = DataManager.cfg_dungeons["world_boss"]
		var card := _card()
		var v := _vbox()
		v.add_child(_label(String(d["name"]), 30, COLORS["red"]))
		v.add_child(_label(String(d["desc"]), 20, COLORS["dim"], true))
		var btn := _btn(DataManager.tr_key("fight") + " (30s)", func(): ModesManager.enter("world_boss"); UIManager.close_panel(), COLORS["red"], 26, 260)
		if CombatManager.active and CombatManager.mode == "world_boss":
			btn.disabled = true
		v.add_child(btn)
		card.add_child(v)
		return card

	func _arena_card() -> PanelContainer:
		var d: Dictionary = DataManager.cfg_dungeons["arena"]
		var card := _card()
		var v := _vbox()
		var used := int(ModesManager.arena_attempts_today.get(TimeManager.day_key(), 0))
		v.add_child(_label(DataManager.tr_key("arena") + " — pontos: %d | tentativas: %d/%d" % [ModesManager.arena_points, used, int(d["attempts_free"])], 30, COLORS["teal"]))
		v.add_child(_label(DataManager.tr_key("vs_bots"), 20, COLORS["dim"], true))
		var actions := _row()
		var btn := _btn(DataManager.tr_key("fight"), func(): ModesManager.enter("arena"); refresh(), COLORS["teal"], 26, 200)
		if used >= int(d["attempts_free"]):
			btn.disabled = true
		actions.add_child(btn)
		if used >= int(d["attempts_free"]):
			actions.add_child(_btn("+1 (%d 💎)" % int(d["extra_attempt_gems"]), func():
				if EconomyManager.spend("gemas", float(d["extra_attempt_gems"])):
					var k := TimeManager.day_key()
					ModesManager.arena_attempts_today[k] = int(ModesManager.arena_attempts_today.get(k, 1)) - 1
				refresh(), COLORS["accent"], 24, 200))
		v.add_child(actions)
		# Loja da Glória
		v.add_child(_label(DataManager.tr_key("gloria_shop") + " — " + fmt(EconomyManager.get_cur("gloria")) + " 🏅", 26, COLORS["gold"]))
		for o in d["shop"]:
			var off: Dictionary = o
			var h := _row()
			h.add_child(_label(String(off["name"]), 24, COLORS["text"]))
			var b := _btn("%d 🏅" % int(off["cost"]), func(): ModesManager.buy_gloria(String(off["id"])); refresh(), COLORS["gold"], 22, 160)
			if not EconomyManager.can_spend("gloria", float(off["cost"])):
				b.disabled = true
			h.add_child(b)
			v.add_child(h)
		card.add_child(v)
		return card

## ================= INVOCAR (GACHA) =================
class SummonPanel extends PanelBase:
	func get_panel_title() -> String:
		return DataManager.tr_key("summon") + " — Portal do Crepúsculo"

	func build_content() -> void:
		_rebuild()

	func refresh() -> void:
		_rebuild()

	func _rebuild() -> void:
		for c in content.get_children():
			c.queue_free()
		var pity: Dictionary = GachaManager.pity_state()
		content.add_child(_label("Essência: %s ✦" % fmt(EconomyManager.get_cur("essencia")), 32, COLORS["teal"]))
		var rates: Dictionary = DataManager.cfg_gacha["rates"]
		content.add_child(_label("Rara %.0f%% | Épica %.0f%% | Lendária %.1f%% | Mítica %.1f%% | Divina %.1f%%" % [rates["rara"], rates["epica"], rates["lendaria"], rates["mitica"], rates["divina"]], 22, COLORS["dim"]))
		# Pity transparente
		var card := _card()
		var v := _vbox()
		v.add_child(_label(DataManager.tr_key("pity"), 28, COLORS["gold"]))
		v.add_child(_label("Rara+ : %d/10" % int(pity["since_rare"]), 26))
		v.add_child(_progress_like(int(pity["since_epic"]), 50, "#9b59d0"))
		v.add_child(_label("Épica+ : %d/50" % int(pity["since_epic"]), 26))
		v.add_child(_progress_like(int(pity["since_legend"]), 100, "#e8a33a"))
		v.add_child(_label("Lendária+ : %d/100" % int(pity["since_legend"]), 26))
		card.add_child(v)
		content.add_child(card)
		var actions := _row()
		var p1 := _btn(DataManager.tr_key("pull1") + " (10✦)", func(): _do_pull(1), COLORS["teal"], 28, 320)
		var p10 := _btn(DataManager.tr_key("pull10") + " (90✦)", func(): _do_pull(10), COLORS["accent"], 28, 380)
		if not EconomyManager.can_spend("essencia", 10.0):
			p1.disabled = true
		if not EconomyManager.can_spend("essencia", 90.0):
			p10.disabled = true
		actions.add_child(p1)
		actions.add_child(p10)
		content.add_child(actions)
		content.add_child(_label("Duplicados de pets viram fragmentos para evolução.", 22, COLORS["dim"], true))

	func _progress_like(cur: int, mx: int, color_hex: String) -> ProgressBar:
		var pb := ProgressBar.new()
		pb.max_value = mx
		pb.value = cur
		pb.show_percentage = false
		pb.custom_minimum_size = Vector2(0, 18)
		pb.add_theme_stylebox_override("fill", _sb(Color(color_hex), 8))
		pb.add_theme_stylebox_override("background", _sb(COLORS["panel2"], 8))
		return pb

	func _do_pull(n: int) -> void:
		var results: Array = GachaManager.pull(n)
		if results.is_empty():
			return
		AudioManager.play_sfx("gacha")
		for r in results:
			if String(r["rarity"]) in ["lendaria", "mitica", "divina"]:
				AudioManager.play_sfx("loot_legend")
		UIManager.show_gacha_results(results)
		refresh()

## ================= LOJA =================
class ShopPanel extends PanelBase:
	func get_panel_title() -> String:
		return DataManager.tr_key("shop")

	func build_content() -> void:
		_rebuild()

	func refresh() -> void:
		_rebuild()

	func _rebuild() -> void:
		for c in content.get_children():
			c.queue_free()
		content.add_child(_label("💎 Gemas: %s | %s" % [fmt(EconomyManager.get_cur("gemas")), "PREMIUM ativo" if EconomyManager.is_premium() else "grátis"], 28, COLORS["teal"]))
		# Loja de gemas
		content.add_child(_label("Trocas por Gemas", 30, COLORS["gold"]))
		for o in DataManager.cfg_shop["gem_shop"]:
			var off: Dictionary = o
			var card := _card()
			var h := _row()
			var v := _vbox()
			v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			v.add_child(_label(String(off["name"]), 26))
			v.add_child(_label(str(off["cost"]["gemas"]) + " 💎", 22, COLORS["dim"]))
			h.add_child(v)
			var b := _btn(DataManager.tr_key("buy"), func():
				if EconomyManager.spend("gemas", float(off["cost"]["gemas"])):
					if off["grant"].has("ouro_from_farm_min"):
						var g := ProgressionManager.gold_per_second(ProgressionManager.farm_stage()) * 60.0 * float(off["grant"]["ouro_from_farm_min"])
						EconomyManager.add("ouro", g)
					EconomyManager.add_dict(off["grant"])
					AudioManager.play_sfx("coin")
				refresh(), COLORS["teal"], 24, 180)
			if not EconomyManager.can_spend("gemas", float(off["cost"]["gemas"])):
				b.disabled = true
			h.add_child(b)
			card.add_child(h)
			content.add_child(card)
		# IAP stubs
		content.add_child(_label("Pacotes (" + DataManager.tr_key("iap_note") + ")", 30, COLORS["gold"]))
		for p in DataManager.cfg_shop["iap_stubs"]:
			var pack: Dictionary = p
			var card2 := _card()
			var h2 := _row()
			var v2 := _vbox()
			v2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			v2.add_child(_label(String(pack["name"]), 26))
			v2.add_child(_label(String(pack["desc"]), 20, COLORS["dim"], true))
			h2.add_child(v2)
			var b2 := _btn(String(pack["price_label"]), func():
				var res: Dictionary = Platform.purchase(String(pack["id"]))
				if bool(res["ok"]):
					Platform.apply_grant(res["grant"])
					AudioManager.play_sfx("coin")
				else:
					EventBus.toast_msg(String(res["reason"]), "#d0455f")
				refresh(), COLORS["accent"], 24, 200)
			b2.disabled = true # stub: habilitar junto com Platform.enabled_iap
			h2.add_child(b2)
			card2.add_child(h2)
			content.add_child(card2)
		content.add_child(_label("Anúncios recompensados: stub pronto (Platform.enabled_ads).", 22, COLORS["dim"], true))

## ================= MISSÕES/CONQUISTAS =================
class MissionsPanel extends PanelBase:
	func get_panel_title() -> String:
		return DataManager.tr_key("daily_missions") + " / " + DataManager.tr_key("achievements")

	func build_content() -> void:
		_rebuild()

	func refresh() -> void:
		_rebuild()

	func _rebuild() -> void:
		for c in content.get_children():
			c.queue_free()
		content.add_child(_mission_section("daily"))
		content.add_child(_mission_section("weekly"))
		content.add_child(_label(DataManager.tr_key("achievements") + " (%d/%d)" % [RetentionManager.achievements_done_count(), RetentionManager.achievements_list().size()], 32, COLORS["gold"]))
		for a in RetentionManager.achievements_list():
			content.add_child(_ach_card(a))
		content.add_child(_bp_card())

	func _mission_section(period: String) -> Control:
		var v := _vbox()
		var title := DataManager.tr_key("daily_missions") if period == "daily" else DataManager.tr_key("weekly_missions")
		v.add_child(_label(title, 32, COLORS["gold"]))
		var list: Array = DataManager.cfg_missions["daily"] if period == "daily" else DataManager.cfg_missions["weekly"]
		for m in list:
			var done := RetentionManager.mission_done(m, period)
			var claimed := RetentionManager.mission_claimed(m, period)
			var card := _card()
			var h := _row()
			var mv := _vbox()
			mv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			mv.add_child(_label(String(m["name"]), 26, COLORS["text"] if not claimed else COLORS["dim"]))
			mv.add_child(_label("%s / %s" % [fmt(RetentionManager.mission_progress(m, period)), fmt(float(m["goal"]))], 22, COLORS["teal"]))
			h.add_child(mv)
			var btn := _btn(DataManager.tr_key("claim") if not claimed else "✓", func(): RetentionManager.claim_mission(m, period); AudioManager.play_sfx("coin"); refresh(), COLORS["accent"], 24, 160)
			btn.disabled = claimed or not done
			h.add_child(btn)
			card.add_child(h)
			v.add_child(card)
		var wrap := _card()
		wrap.add_child(v)
		return wrap

	func _ach_card(a: Dictionary) -> PanelContainer:
		var card := _card()
		var h := _row()
		var v := _vbox()
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var claimed := bool(RetentionManager.achievements_claimed.get(String(a["id"]), false))
		v.add_child(_label(String(a["name"]), 26, COLORS["dim"] if claimed else COLORS["text"]))
		v.add_child(_label(String(a["desc"]) + " — %s/%s" % [fmt(RetentionManager.achievement_progress(a)), fmt(float(a["goal"]))], 20, COLORS["dim"]))
		h.add_child(v)
		var btn := _btn(DataManager.tr_key("claim"), func(): RetentionManager.achievement_claim(a); AudioManager.play_sfx("coin"); refresh(), COLORS["gold"], 22, 140)
		btn.disabled = claimed or RetentionManager.achievement_progress(a) < float(a["goal"])
		h.add_child(btn)
		card.add_child(h)
		return card

	func _bp_card() -> PanelContainer:
		var bp: Dictionary = DataManager.cfg_battlepass
		var card := _card()
		var v := _vbox()
		v.add_child(_label("🎖 " + DataManager.tr_key("battle_pass") + " — " + String(bp["season"]["name"]), 30, COLORS["gold"]))
		v.add_child(_label("Tier %d | XP %s" % [RetentionManager.bp_tier(), fmt(RetentionManager.bp_xp)], 24, COLORS["teal"]))
		for entry in bp["free_track"]:
			var tier := int(entry["tier"])
			var claimed: bool = tier in RetentionManager.bp_claimed_free
			var h := _row()
			h.add_child(_label("T%d — %s" % [tier, str(entry["reward"])], 22, COLORS["dim"]))
			var btn := _btn(DataManager.tr_key("claim"), func(): RetentionManager.bp_claim(tier, false); refresh(), COLORS["teal"], 22, 140)
			btn.disabled = claimed or tier > RetentionManager.bp_tier()
			h.add_child(btn)
			v.add_child(h)
		card.add_child(v)
		return card

## ================= AJUSTES =================
class SettingsPanel extends PanelBase:
	func get_panel_title() -> String:
		return DataManager.tr_key("settings")

	func build_content() -> void:
		_rebuild()

	func refresh() -> void:
		_rebuild()

	func _rebuild() -> void:
		for c in content.get_children():
			c.queue_free()
		content.add_child(_label("Eidryn — O Ciclo do Eclipse v" + DataManager.GAME_VERSION, 28, COLORS["gold"]))
		content.add_child(_label(DataManager.tr_key("save_version") + ": " + str(DataManager.SAVE_VERSION), 24, COLORS["dim"]))
		# volumes
		var mv := _card()
		var mvv := _vbox()
		mvv.add_child(_label(DataManager.tr_key("music"), 26))
		var ms := HSlider.new()
		ms.min_value = 0.0
		ms.max_value = 1.0
		ms.step = 0.05
		ms.value = AudioManager.music_vol
		ms.custom_minimum_size = Vector2(0, 50)
		ms.value_changed.connect(func(val): AudioManager.set_music_vol(val))
		mvv.add_child(ms)
		mv.add_child(mvv)
		content.add_child(mv)
		var sv := _card()
		var svv := _vbox()
		svv.add_child(_label(DataManager.tr_key("sfx"), 26))
		var ss := HSlider.new()
		ss.min_value = 0.0
		ss.max_value = 1.0
		ss.step = 0.05
		ss.value = AudioManager.sfx_vol
		ss.custom_minimum_size = Vector2(0, 50)
		ss.value_changed.connect(func(val): AudioManager.set_sfx_vol(val))
		svv.add_child(ss)
		sv.add_child(svv)
		content.add_child(sv)
		# idioma
		var lang_card := _card()
		var lv := _row()
		lv.add_child(_label(DataManager.tr_key("language"), 26))
		lv.add_child(_btn("PT-BR" if DataManager.language != "ptbr" else "EN", func():
			DataManager.language = "en" if DataManager.language == "ptbr" else "ptbr"
			EventBus.language_changed.emit(DataManager.language)
			refresh(), COLORS["teal"], 24, 160))
		lang_card.add_child(lv)
		content.add_child(lang_card)
		# reset
		var reset_card := _card()
		var rv := _vbox()
		rv.add_child(_label(DataManager.tr_key("reset_save"), 26, COLORS["red"]))
		rv.add_child(_btn(DataManager.tr_key("reset_save"), func(): GameManager.reset_all(), COLORS["red"], 24, 300))
		reset_card.add_child(rv)
		content.add_child(reset_card)
