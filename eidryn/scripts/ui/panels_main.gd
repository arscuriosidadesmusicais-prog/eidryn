# PanelsMain — painéis Herói, Equipamento, Habilidades, Pets | FASE 13
extends Object
class_name PanelsMain

static func base() -> GDScript:
	return preload("res://scripts/ui/panel_base.gd")

## ================= HERÓI =================
class HeroPanel extends PanelBase:
	var _pc_label: Label
	var _xp_bar: ProgressBar
	var _xp_label: Label

	func get_panel_title() -> String:
		return DataManager.tr_key("hero") + " — " + DataManager.tr_key("stats")

	func build_content() -> void:
		_rebuild()

	func refresh() -> void:
		_rebuild()

	func _rebuild() -> void:
		for c in content.get_children():
			c.queue_free()
		var stats: Dictionary = CharacterManager.stats()
		# Cabeçalho de poder
		var card := _card()
		var v := _vbox()
		var pc := CharacterManager.pc()
		v.add_child(_label("⚔ %s: %s" % [DataManager.tr_key("pc"), fmt(pc)], 40, COLORS["gold"]))
		v.add_child(_label("%s: %s | ATK %s | HP %s | DEF %s" % [
			DataManager.tr_key("level"), str(CharacterManager.level), fmt(stats["atk"]), fmt(stats["hp"]), fmt(stats["def"])], 26))
		var crit_row := _row()
		crit_row.add_child(_label("Crit %.1f%% ×%.0f%% | LS %.1f%% | Int %.0f/s" % [stats["crit_rate"], stats["crit_damage"], stats["lifesteal"], stats["regen"]], 24, COLORS["dim"]))
		v.add_child(crit_row)
		card.add_child(v)
		content.add_child(card)
		# Barra de XP
		var xp_card := _card()
		var xv := _vbox()
		var need := DataManager.level_xp_cost(CharacterManager.level)
		_xp_bar = ProgressBar.new()
		_xp_bar.max_value = need
		_xp_bar.value = CharacterManager.xp
		_xp_bar.show_percentage = false
		_xp_bar.custom_minimum_size = Vector2(0, 26)
		_xp_bar.add_theme_stylebox_override("fill", _sb(COLORS["teal"], 8))
		_xp_bar.add_theme_stylebox_override("background", _sb(COLORS["panel2"], 8))
		xv.add_child(_xp_bar)
		xv.add_child(_label("XP %s / %s" % [fmt(CharacterManager.xp), fmt(need)], 22, COLORS["dim"]))
		xp_card.add_child(xv)
		content.add_child(xp_card)
		# Atributos
		for a in DataManager.cfg_attributes["attributes"]:
			content.add_child(_attr_row(a))
		# Ascensão
		content.add_child(_ascension_card())

	func _attr_row(a: Dictionary) -> PanelContainer:
		var card := _card()
		var h := _row()
		var v := _vbox()
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var top := _row()
		top.add_child(_label(String(a["name"]), 28))
		top.add_child(_label("Lv %d" % CharacterManager.attr_level(String(a["id"])), 28, COLORS["teal"]))
		v.add_child(top)
		v.add_child(_label(String(a["desc"]), 20, COLORS["dim"], true))
		h.add_child(v)
		var cost := CharacterManager.attr_cost(String(a["id"]))
		var btn := _btn(fmt(cost) + " 🪙", func(): CharacterManager.upgrade_attribute(String(a["id"])); refresh(), COLORS["accent"], 24, 220)
		if not EconomyManager.can_spend("ouro", cost):
			btn.disabled = true
		h.add_child(btn)
		card.add_child(h)
		return card

	func _ascension_card() -> PanelContainer:
		var card := _card()
		var v := _vbox()
		v.add_child(_label("☾ " + DataManager.tr_key("ascension"), 32, COLORS["divine"]))
		if not AscensionManager.is_unlocked():
			v.add_child(_label(DataManager.tr_key("asc_locked") + " (" + str(AscensionManager.unlock_stage()) + ")", 24, COLORS["dim"]))
		else:
			v.add_child(_label("Fragmentos pendentes: %s | Ascensões: %d" % [fmt(AscensionManager.pending_fragments()), AscensionManager.ascensions], 26))
			v.add_child(_label(DataManager.tr_key("ascend_confirm"), 20, COLORS["dim"], true))
			var btn := _btn("☾ " + DataManager.tr_key("ascend"), func():
				if AscensionManager.ascend():
					refresh(), COLORS["divine"], 26, 300)
			if not AscensionManager.can_ascend():
				btn.disabled = true
			v.add_child(btn)
		card.add_child(v)
		return card

## ================= EQUIPAMENTO =================
class EquipPanel extends PanelBase:
	var slot_filter: String = "all"
	var rarity_filter: String = "all"

	func get_panel_title() -> String:
		return DataManager.tr_key("equipment")

	func build_content() -> void:
		_rebuild()

	func refresh() -> void:
		_rebuild()

	func _rebuild() -> void:
		for c in content.get_children():
			c.queue_free()
		content.add_child(_global_actions())
		content.add_child(_label(DataManager.tr_key("slot") + "s", 30, COLORS["gold"]))
		for s in DataManager.cfg_items["slots"]:
			var sid := String(s["id"])
			if InventoryManager.equipped.has(sid):
				content.add_child(_equipped_row(InventoryManager.equipped[sid]))
			else:
				content.add_child(_empty_slot_row(s))
		content.add_child(_filter_card())
		for it in InventoryManager.filtered(slot_filter, rarity_filter):
			content.add_child(_item_card(it, false))
		content.add_child(_fusion_card())

	func _global_actions() -> PanelContainer:
		var card := _card()
		var h := _row()
		h.add_child(_btn(DataManager.tr_key("auto_equip"), func():
			var n := InventoryManager.auto_equip()
			EventBus.toast_msg("Auto-equip: %d itens" % n, "#3a9e8f")
			refresh()))
		h.add_child(_btn(DataManager.tr_key("auto_dismantle"), func():
			var n := InventoryManager.auto_dismantle("rara")
			EventBus.toast_msg("Desmontados: %d" % n, "#9aa0a6")
			refresh(), COLORS["red"]))
		card.add_child(h)
		return card

	func _equipped_row(item: Dictionary) -> PanelContainer:
		var card := _card()
		var h := _row()
		var v := _vbox()
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.add_child(_item_title(item))
		h.add_child(v)
		h.add_child(_btn(DataManager.tr_key("unequip"), func(): InventoryManager.unequip_slot(String(item["slot"])); refresh(), COLORS["dim"], 24, 200))
		card.add_child(h)
		return card

	func _empty_slot_row(s: Dictionary) -> PanelContainer:
		var card := _card()
		var h := _row()
		h.add_child(_label("◌ " + String(s["name"]), 26, COLORS["dim"]))
		h.add_child(_label("—", 26, COLORS["dim"]))
		card.add_child(h)
		return card

	func _item_title(item: Dictionary) -> Label:
		var plus := "+" + str(item.get("reinforce", 0)) if int(item.get("reinforce", 0)) > 0 else ""
		return _label("%s %s %s (%s)" % [plus, String(item["base"]), _star_rarity(String(item["rarity"])), "PC " + fmt(item_pc_display(item))], 26, rarity_color(String(item["rarity"])), true)

	func _star_rarity(rid: String) -> String:
		return "★ " + rid.capitalize()

	func item_pc_display(item: Dictionary) -> float:
		return float(item.get("pc", 0.0))

	func _filter_card() -> PanelContainer:
		var card := _card()
		var v := _vbox()
		v.add_child(_label(DataManager.tr_key("filters") + " — " + str(InventoryManager.inventory.size()) + " itens", 26, COLORS["teal"]))
		var h1 := _row()
		for opt in [["all", "Tudo"], ["arma", "Arma"], ["elmo", "Elmo"], ["peitoral", "Peito"], ["capa", "Capa"], ["anel1", "Anéis"], ["amuleto", "Amuleto"], ["botas", "Botas"], ["luvas", "Luvas"], ["calca", "Calças"]]:
			var opt_id := String(opt[0])
			var b := _btn(String(opt[1]), func(): slot_filter = opt_id; refresh(), COLORS["panel2"], 22, 150)
			if slot_filter == opt_id:
				b.add_theme_stylebox_override("normal", _sb(COLORS["teal"], 14))
			h1.add_child(b)
		v.add_child(h1)
		var h2 := _row()
		for rid in ["all", "comum", "rara", "epica", "lendaria", "mitica"]:
			var opt_id := String(rid)
			var b := _btn(rid.capitalize(), func(): rarity_filter = opt_id; refresh(), rarity_color(opt_id) if opt_id != "all" else COLORS["panel2"], 22, 150)
			if rarity_filter == opt_id:
				b.add_theme_stylebox_override("normal", _sb(COLORS["teal"], 14))
			h2.add_child(b)
		v.add_child(h2)
		card.add_child(v)
		return card

	func _item_card(item: Dictionary, is_equipped: bool) -> PanelContainer:
		var card := _card()
		var v := _vbox()
		v.add_child(_item_title(item))
		# estatísticas
		var pstats: Dictionary = DataManager.cfg_items["primary_stats"]
		var pid := String(item["primary_id"])
		var pname := String(pstats.get(pid, {}).get("name", pid))
		v.add_child(_label("%s: %.1f%% (×%.2f reforço)" % [pname, float(item["primary"]), 1.0 + 0.08 * float(item.get("reinforce", 0))], 22, COLORS["dim"]))
		for sid in item.get("secondaries", {}).keys():
			var spool: Array = DataManager.cfg_items["secondary_pool"]
			for sdef in spool:
				if sdef["id"] == sid:
					v.add_child(_label(String(sdef["name"]) + ": %.2f" % float(item["secondaries"][sid]), 20, COLORS["dim"]))
					break
		var locked := bool(item.get("locked", false))
		var fav := bool(item.get("favorite", false))
		var actions := _row()
		if not is_equipped:
			actions.add_child(_btn(DataManager.tr_key("equip"), func(): InventoryManager.equip_item(String(item["id"])); refresh(), COLORS["teal"], 24, 170))
			var rbtn := _btn(DataManager.tr_key("reinforce") + " " + fmt(InventoryManager.reinforce_cost(item)) + "🪙", func():
				var ok := InventoryManager.reinforce(String(item["id"]))
				if ok: AudioManager.play_sfx("reinforce")
				refresh(), COLORS["accent"], 22, 260)
			if int(item.get("reinforce", 0)) >= int(DataManager.cfg_items["reinforce"]["max"]) or not EconomyManager.can_spend("ouro", InventoryManager.reinforce_cost(item)):
				rbtn.disabled = true
			actions.add_child(rbtn)
			var pity_left := InventoryManager.reinforce_pity_left()
			actions.add_child(_label("Pity %d" % pity_left, 20, COLORS["dim"]))
		actions.add_child(_btn("★" if fav else "☆", func(): InventoryManager.toggle_favorite(String(item["id"])); refresh(), COLORS["gold"], 24, 80))
		actions.add_child(_btn("🔒" if locked else "🔓", func(): InventoryManager.toggle_lock(String(item["id"])); refresh(), COLORS["dim"], 24, 80))
		if not is_equipped and not locked and not fav:
			actions.add_child(_btn("♻", func(): InventoryManager.dismantle_item(String(item["id"])); refresh(), COLORS["red"], 24, 80))
		v.add_child(actions)
		card.add_child(v)
		return card

	func _fusion_card() -> PanelContainer:
		var card := _card()
		var v := _vbox()
		v.add_child(_label("⚗ " + DataManager.tr_key("fuse") + " — Fragmentos: " + fmt(EconomyManager.get_cur("fragmentos_equip")), 26, COLORS["teal"]))
		var h := _row()
		var fcosts: Dictionary = DataManager.cfg_items["fusion"]["fragments_cost"]
		for rid in ["rara", "epica", "lendaria", "mitica", "divina"]:
			var r := String(rid)
			var b := _btn(r.capitalize() + " (" + str(int(fcosts[r])) + "⚗+" + str(int(DataManager.cfg_items["fusion"]["gold_cost"][r])) + "🪙)", func():
				var it := InventoryManager.fuse_item(r)
				if not it.is_empty():
					AudioManager.play_sfx("evolve")
				refresh(), COLORS["panel2"], 20, 320)
			if not EconomyManager.can_spend("fragmentos_equip", float(fcosts[r])) or not EconomyManager.can_spend("ouro", float(DataManager.cfg_items["fusion"]["gold_cost"][r])):
				b.disabled = true
			h.add_child(b)
		v.add_child(h)
		card.add_child(v)
		return card

## ================= HABILIDADES =================
class SkillsPanel extends PanelBase:
	func get_panel_title() -> String:
		return DataManager.tr_key("skills")

	func build_content() -> void:
		_rebuild()

	func refresh() -> void:
		_rebuild()

	func _rebuild() -> void:
		for c in content.get_children():
			c.queue_free()
		content.add_child(_label("Níveis totais: %d" % SkillManager.total_levels(), 26, COLORS["dim"]))
		for section in [["active", "Ativas"], ["passive", "Passivas"], ["supreme", "Suprema"]]:
			content.add_child(_label(String(section[1]), 32, COLORS["gold"]))
			for s in SkillManager.all_skills():
				if String(s["type"]) == String(section[0]):
					content.add_child(_skill_card(s))

	func _skill_card(s: Dictionary) -> PanelContainer:
		var card := _card()
		var v := _vbox()
		var top := _row()
		var unlocked := bool(s["unlocked"])
		var color := COLORS["text"] if unlocked else COLORS["dim"]
		var lvl_txt := "Lv %d%s" % [int(s["level"]), " ✦" if bool(s.get("evolved", false)) else ""]
		top.add_child(_label(String(s["name"]) + ("" if unlocked else " 🔒"), 30, color))
		top.add_child(_label(lvl_txt, 30, COLORS["teal"]))
		v.add_child(top)
		if unlocked:
			var lv := int(s["level"])
			var desc := String(s["desc"]).replace("{dmg}", "%.1f" % SkillManager.scaled_value(String(s["id"]), "mult") if SkillManager.scaled_value(String(s["id"]), "mult") > 0 else "?")
			v.add_child(_label(desc, 22, COLORS["dim"], true))
			# Atual/Próximo
			if s.has("per_level") and int(s["per_level"].size()) > 0 and lv > 0:
				var keys: Array = s["per_level"].keys()
				var k := String(keys[0])
				var pair := SkillManager.tooltip_pair(String(s["id"]), k)
				v.add_child(_label("%s: %s → %s %s" % [k.capitalize(), fmt(pair["current"]), fmt(pair["next"]), DataManager.tr_key("next")], 20, COLORS["teal"]))
			if String(s["type"]) != "passive":
				var actions := _row()
				var cost := SkillManager.upgrade_cost(String(s["id"]))
				var ubtn := _btn(DataManager.tr_key("upgrade") + " " + fmt(cost) + "🪙", func(): SkillManager.upgrade_skill(String(s["id"])); refresh(), COLORS["accent"], 24, 280)
				if int(s["level"]) >= int(s["max_level"]) or not EconomyManager.can_spend("ouro", cost):
					ubtn.disabled = true
				actions.add_child(ubtn)
				var auto := _btn(DataManager.tr_key("skills_auto") + (": ON" if bool(s["auto"]) else ": OFF"), func(): SkillManager.toggle_auto(String(s["id"])); refresh(), COLORS["panel2"], 22, 240)
				actions.add_child(auto)
				var cd := SkillManager.cooldown_left(String(s["id"]))
				var cast_b := _btn("Cast" + (" (%.1fs)" % cd if cd > 0.0 else ""), func(): CombatManager.cast_skill(String(s["id"])), COLORS["teal"], 24, 180)
				if cd > 0.0 or int(s["level"]) <= 0:
					cast_b.disabled = true
				actions.add_child(cast_b)
				v.add_child(actions)
		else:
			v.add_child(_label("Desbloqueia no nível %d" % int(s["unlock_level"]), 22, COLORS["dim"]))
		card.add_child(v)
		return card

## ================= PETS =================
class PetsPanel extends PanelBase:
	func get_panel_title() -> String:
		return DataManager.tr_key("pets")

	func build_content() -> void:
		_rebuild()

	func refresh() -> void:
		_rebuild()

	func _rebuild() -> void:
		for c in content.get_children():
			c.queue_free()
		content.add_child(_label("Ativo: " + (PetManager.def(PetManager.active_pet).get("name", "—") as String) + " + " + (PetManager.def(PetManager.active_companion).get("name", "—") as String), 26, COLORS["teal"]))
		content.add_child(_label("Pets: %d/6 | Companheiros: %d/4" % [PetManager.owned_count(), _companions_count()], 24, COLORS["dim"]))
		content.add_child(_label("Pets", 32, COLORS["gold"]))
		for p in DataManager.cfg_pets["pets"]:
			content.add_child(_pet_card(p))
		content.add_child(_label("Companheiros", 32, COLORS["gold"]))
		for c in DataManager.cfg_pets["companions"]:
			content.add_child(_pet_card(c))

	func _companions_count() -> int:
		var n := 0
		for c in DataManager.cfg_pets["companions"]:
			if PetManager.is_owned(String(c["id"])):
				n += 1
		return n

	func _pet_card(p: Dictionary) -> PanelContainer:
		var card := _card()
		var v := _vbox()
		var id := String(p["id"])
		var owned := PetManager.is_owned(id)
		var stars := PetManager.stars(id)
		var top := _row()
		top.add_child(_label(String(p["name"]) + (" " + "★".repeat(stars) if owned else " 🔒"), 28, rarity_color(String(p["rarity"]))))
		v.add_child(top)
		v.add_child(_label(String(p["desc"]), 20, COLORS["dim"], true))
		if owned:
			var b := PetManager.pet_bonus(id)
			var bonus_txt := ""
			for k in b.keys():
				bonus_txt += "%s +%.1f%%  " % [String(k).capitalize(), float(b[k])]
			v.add_child(_label(bonus_txt, 22, COLORS["teal"]))
			var actions := _row()
			var is_active := (PetManager.active_pet == id) or (PetManager.active_companion == id)
			actions.add_child(_btn("Ativo ✓" if is_active else DataManager.tr_key("activate"), func(): PetManager.set_active(id); refresh(), COLORS["teal"] if not is_active else COLORS["panel2"], 24, 200))
			var need_f := PetManager.evolve_cost_frags(id)
			if need_f > 0:
				var frag := int(PetManager.fragments.get(id, 0))
				var ebtn := _btn(DataManager.tr_key("evolve") + " %d/%d⚗" % [frag, need_f], func(): PetManager.evolve(id); refresh(), COLORS["gold"], 22, 280)
				if frag < need_f or not EconomyManager.can_spend("ouro", float(PetManager.evolve_cost_gold(id))):
					ebtn.disabled = true
				actions.add_child(ebtn)
			v.add_child(actions)
		else:
			v.add_child(_label("Obtenha no Portal do Crepúsculo", 20, COLORS["dim"]))
		card.add_child(v)
		return card
