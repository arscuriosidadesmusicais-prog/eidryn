# AscensionManager — reinício do ciclo com árvore permanente | FASE 9
extends Node

var ascensions: int = 0
var node_levels: Dictionary = {}   # node_id -> nível comprado

func unlock_stage() -> int:
	return int(DataManager.cfg_ascension["unlock_stage"])

func is_unlocked() -> bool:
	return ProgressionManager.max_stage >= unlock_stage()

## Fragmentos ganhos ao ascender: floor((farm/10)^1.35) + chefes do ciclo (D + ascension.json).
func pending_fragments() -> float:
	if not is_unlocked():
		return 0.0
	var fs := float(maxi(ProgressionManager.farm_stage(), 1))
	var base := pow(fs / 10.0, 1.35)
	return floorf(base) + float(ProgressionManager.bosses_killed_total)

func can_ascend() -> bool:
	return is_unlocked() and pending_fragments() > 0.0

## Executa a Ascensão: reset parcial (mantém equipamentos/pets/habilidades/gemas).
func ascend() -> bool:
	if not can_ascend():
		return false
	var gained := pending_fragments()
	EconomyManager.add("fragmentos_alma", gained)
	# Reset parcial
	ProgressionManager.current_stage = 1
	ProgressionManager.max_stage = 1
	ProgressionManager.bosses_killed_total = 0
	CharacterManager.level = 1
	CharacterManager.xp = 0.0
	for a in CharacterManager.attributes.keys():
		CharacterManager.attributes[a] = 0
	# Ouro volta ao inicial; outras moedas preservadas (gemas, chaves, essência, glória, fragmentos)
	EconomyManager.currencies["ouro"] = float(DataManager.cfg_currencies["starting"]["ouro"])
	ascensions += 1
	CharacterManager.recalc()
	CombatManager.stop()
	CombatManager.start_campaign(1)
	EventBus.ascension_performed.emit(gained)
	EventBus.toast_msg("☾ CICLO ENCERRADO — +%d Fragmentos de Alma ☽" % int(gained), "#f5e6c8")
	SaveManager.flush()
	return true

## ---------- ÁRVORE ----------
func nodes() -> Array:
	return DataManager.cfg_ascension["nodes"]

func node_level(id: String) -> int:
	return int(node_levels.get(id, 0))

func node_cost(n: Dictionary) -> float:
	return float(n["cost"]) * float(node_level(n["id"]) + 1)

func node_requirements_met(n: Dictionary) -> bool:
	for req in n.get("requires", []):
		if node_level(String(req)) <= 0:
			return false
	return true

func buy_node(id: String) -> bool:
	var n: Dictionary = {}
	for nd in nodes():
		if nd["id"] == id:
			n = nd
			break
	if n.is_empty():
		return false
	var lv := node_level(id)
	if lv >= int(n["max"]):
		EventBus.toast_msg(DataManager.tr_key("already_max"), "#9aa0a6")
		return false
	if not node_requirements_met(n):
		EventBus.toast_msg("Requisitos não atendidos", "#d0455f")
		return false
	if not EconomyManager.spend("fragmentos_alma", node_cost(n)):
		return false
	node_levels[id] = lv + 1
	CharacterManager.recalc()
	EventBus.node_bought.emit(id)
	SaveManager.mark_dirty()
	return true

func tree_bonuses() -> Dictionary:
	var b := {}
	for n in nodes():
		var lv := node_level(String(n["id"]))
		if lv <= 0:
			continue
		for k in n["bonus"].keys():
			b[k] = float(b.get(k, 0.0)) + float(n["bonus"][k]) * float(lv)
	return b

func has_revive() -> bool:
	return node_level("n10") > 0

func offline_cap_bonus_hours() -> float:
	return float(tree_bonuses().get("offline_hours", 0.0)) + float(tree_bonuses().get("supreme_cd_reduce", 0.0) * 0.0)

func save_state() -> Dictionary:
	return {"ascensions": ascensions, "node_levels": node_levels}

func load_state(d: Dictionary) -> void:
	if d.is_empty():
		return
	ascensions = int(d.get("ascensions", 0))
	node_levels = d.get("node_levels", {})
