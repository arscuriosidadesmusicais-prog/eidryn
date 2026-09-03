# SkillManager — 4 ativas + 4 passivas + 1 suprema, auto-cast, evolução | FASE 6
extends Node

var levels: Dictionary = {}        # skill_id -> nível (1..20)
var unlocked: Dictionary = {}      # skill_id -> true
var evolved: Dictionary = {}       # skill_id -> true (evolui no nível 10)
var auto_cast: Dictionary = {}     # skill_id -> bool
var cooldowns: Dictionary = {}     # skill_id -> segundos restantes

func _ready() -> void:
	for s in DataManager.cfg_skills["active"]:
		levels[s["id"]] = 0
		auto_cast[s["id"]] = bool(DataManager.cfg_skills["auto_cast_default"])
	for s in DataManager.cfg_skills["passive"]:
		levels[s["id"]] = 0
	for s in DataManager.cfg_skills["supreme"]:
		levels[s["id"]] = 0
		auto_cast[s["id"]] = false

func check_unlocks() -> void:
	var changed := false
	for section in ["active", "passive", "supreme"]:
		for s in DataManager.cfg_skills[section]:
			if not bool(unlocked.get(s["id"], false)) and CharacterManager.level >= int(s["unlock_level"]):
				unlocked[s["id"]] = true
				levels[s["id"]] = 1
				changed = true
				EventBus.toast_msg(DataManager.tr_key("skills") + ": " + s["name"] + "!", "#e8a33a")
	if changed:
		CharacterManager.recalc()
		SaveManager.mark_dirty()

func all_skills() -> Array:
	var out: Array = []
	for section in ["active", "passive", "supreme"]:
		for s in DataManager.cfg_skills[section]:
			var d: Dictionary = s.duplicate(true)
			d["level"] = int(levels.get(s["id"], 0))
			d["unlocked"] = bool(unlocked.get(s["id"], false))
			d["evolved"] = bool(evolved.get(s["id"], false))
			d["auto"] = bool(auto_cast.get(s["id"], false))
			out.append(d)
	return out

func skill_def(id: String) -> Dictionary:
	for section in ["active", "passive", "supreme"]:
		for s in DataManager.cfg_skills[section]:
			if s["id"] == id:
				return s
	return {}

## Valor de chave escalado pelo nível: base + per_level×(nível-1).
func scaled_value(id: String, key: String) -> float:
	var s := skill_def(id)
	if s.is_empty():
		return 0.0
	var lv := float(levels.get(id, 0))
	if lv <= 0.0:
		return 0.0
	var base := float(s.get("base", {}).get(key, 0.0))
	var per := float(s.get("per_level", {}).get(key, 0.0))
	return base + per * (lv - 1.0)

## Tooltips: "Atual / Próximo nível" para uma chave.
func tooltip_pair(id: String, key: String) -> Dictionary:
	return {"current": scaled_value(id, key), "next": scaled_value(id, key) + float(skill_def(id).get("per_level", {}).get(key, 0.0))}

func upgrade_skill(id: String) -> bool:
	var s := skill_def(id)
	if s.is_empty() or not bool(unlocked.get(id, false)):
		return false
	var lv := int(levels.get(id, 0))
	if lv >= int(s["max_level"]):
		EventBus.toast_msg(DataManager.tr_key("already_max"), "#9aa0a6")
		return false
	var cost := float(DataManager.cfg_skills["upgrade_cost_base"]) * pow(float(DataManager.cfg_skills["upgrade_cost_exp"]), float(lv - 1))
	if not EconomyManager.spend("ouro", cost):
		return false
	levels[id] = lv + 1
	if levels[id] >= int(s.get("evolve_at", 999)) and s.has("evolve"):
		evolved[id] = true
	CharacterManager.recalc()
	EventBus.skill_leveled.emit(id, levels[id])
	SaveManager.mark_dirty()
	return true

func upgrade_cost(id: String) -> float:
	var lv := int(levels.get(id, 0))
	if lv <= 0:
		return float(DataManager.cfg_skills["upgrade_cost_base"])
	return float(DataManager.cfg_skills["upgrade_cost_base"]) * pow(float(DataManager.cfg_skills["upgrade_cost_exp"]), float(lv - 1))

func toggle_auto(id: String) -> void:
	auto_cast[id] = not bool(auto_cast.get(id, false))
	SaveManager.mark_dirty()

## Chamada a cada frame de combate.
func tick_cooldowns(delta: float) -> void:
	for id in cooldowns.keys():
		if float(cooldowns[id]) > 0.0:
			cooldowns[id] = maxf(0.0, float(cooldowns[id]) - delta)
			if float(cooldowns[id]) == 0.0:
				EventBus.skill_ready.emit(String(id))

func cast(id: String) -> bool:
	var s := skill_def(id)
	if s.is_empty() or int(levels.get(id, 0)) <= 0:
		return false
	if float(cooldowns.get(id, 0.0)) > 0.0:
		return false
	cooldowns[id] = float(s["cooldown"])
	EventBus.skill_casted.emit(s)
	return true

func ready_skills(auto_only: bool) -> Array:
	var ready: Array = []
	for section in ["active", "supreme"]:
		for s in DataManager.cfg_skills[section]:
			var id: String = s["id"]
			if int(levels.get(id, 0)) <= 0:
				continue
			if auto_only and not bool(auto_cast.get(id, false)):
				continue
			if float(cooldowns.get(id, 0.0)) <= 0.0:
				ready.append(s)
	return ready

## Bônus agregados das passivas (usado por CharacterManager).
func passive_bonuses() -> Dictionary:
	var b := {}
	for s in DataManager.cfg_skills["passive"]:
		var id: String = s["id"]
		if int(levels.get(id, 0)) <= 0:
			continue
		for key in s["per_level"].keys():
			b[key] = float(b.get(key, 0.0)) + scaled_value(id, String(key))
	return b

## Multiplicador de dano de habilidade ativa (inclui Energia do herói).
func active_mult(id: String) -> float:
	var mult := scaled_value(id, "mult")
	var energy := float(CharacterManager.attr_level("energia"))
	mult *= 1.0 + energy * 0.004
	var s := skill_def(id)
	if bool(evolved.get(id, false)):
		mult *= 1.10 # bônus de evolução
	return mult

func cooldown_left(id: String) -> float:
	return float(cooldowns.get(id, 0.0))

func total_levels() -> int:
	var t := 0
	for id in levels.keys():
		t += int(levels[id])
	return t

func save_state() -> Dictionary:
	return {"levels": levels, "unlocked": unlocked, "evolved": evolved, "auto_cast": auto_cast}

func load_state(d: Dictionary) -> void:
	if d.is_empty():
		return
	for k in d.get("levels", {}).keys():
		if levels.has(k):
			levels[k] = int(d["levels"][k])
	for k in d.get("unlocked", {}).keys():
		unlocked[k] = bool(d["unlocked"][k])
	for k in d.get("evolved", {}).keys():
		evolved[k] = bool(d["evolved"][k])
	for k in d.get("auto_cast", {}).keys():
		auto_cast[k] = bool(d["auto_cast"][k])
