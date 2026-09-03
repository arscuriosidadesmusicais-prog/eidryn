# PetManager — 6 pets + 4 companheiros, evolução por estrelas/fragmentos | FASE 7
extends Node

var owned: Dictionary = {}        # id -> estrelas (1..5)
var fragments: Dictionary = {}    # id -> fragmentos acumulados
var active_pet: String = ""
var active_companion: String = ""

func all_defs() -> Array:
	var out: Array = []
	for p in DataManager.cfg_pets["pets"]:
		out.append(p)
	for c in DataManager.cfg_pets["companions"]:
		out.append(c)
	return out

func def(id: String) -> Dictionary:
	for d in all_defs():
		if d["id"] == id:
			return d
	return {}

func is_owned(id: String) -> bool:
	return owned.has(id)

func stars(id: String) -> int:
	return int(owned.get(id, 0))

## Ganho via gacha/gloria. Duplicado vira fragmentos.
func acquire(id: String) -> String:
	if owned.has(id):
		var qty := int(DataManager.cfg_gacha["pet_duplicate"]["frag_qty"])
		fragments[id] = int(fragments.get(id, 0)) + qty
		EventBus.toast_msg(def(id).get("name", id) + " → +" + str(qty) + " fragmentos", "#3a9e8f")
		SaveManager.mark_dirty()
		return "duplicate"
	owned[id] = 1
	fragments[id] = int(fragments.get(id, 0))
	if def(id).get("type", "") == "pet" and active_pet == "":
		active_pet = id
	if def(id).get("type", "") == "companheiro" and active_companion == "":
		active_companion = id
	CharacterManager.recalc()
	EventBus.pet_changed.emit()
	SaveManager.mark_dirty()
	return "new"

func set_active(id: String) -> void:
	var d := def(id)
	if d.is_empty() or not owned.has(id):
		return
	if d["type"] == "pet":
		active_pet = id
	else:
		active_companion = id
	CharacterManager.recalc()
	EventBus.pet_changed.emit()
	SaveManager.mark_dirty()

## Bônus atuais do pet ativo com estrelas.
func pet_bonus(id: String) -> Dictionary:
	var b := {}
	var d := def(id)
	if d.is_empty() or not owned.has(id):
		return b
	var st := stars(id)
	for k in d["bonus"].keys():
		b[k] = float(d["bonus"][k]) + float(d["per_star"][k]) * float(st - 1)
	return b

## Bônus agregados pet + companheiro ativos.
func all_bonuses() -> Dictionary:
	var b := {}
	if active_pet != "" and owned.has(active_pet):
		_merge(pet_bonus(active_pet), b)
	if active_companion != "" and owned.has(active_companion):
		_merge(pet_bonus(active_companion), b)
	return b

func _merge(src: Dictionary, dst: Dictionary) -> void:
	for k in src.keys():
		dst[k] = float(dst.get(k, 0.0)) + float(src[k])

## Valor de um bônus específico (ex.: reinforce_luck do Ferreiro).
func bonus_value(key: String) -> float:
	return float(all_bonuses().get(key, 0.0))

## Evolução por estrelas: custos em pets.json.
func evolve_cost_frags(id: String) -> int:
	var next_star := stars(id) + 1
	var costs: Dictionary = DataManager.cfg_pets["star_costs"]
	if next_star > int(DataManager.cfg_pets["max_stars"]) or not costs.has(str(next_star)):
		return 0
	return int(costs[str(next_star)])

func evolve_cost_gold(id: String) -> int:
	var next_star := stars(id) + 1
	var costs: Dictionary = DataManager.cfg_pets["star_gold"]
	if next_star > int(DataManager.cfg_pets["max_stars"]) or not costs.has(str(next_star)):
		return 0
	return int(costs[str(next_star)])

func evolve(id: String) -> bool:
	if not owned.has(id):
		return false
	var need_f := evolve_cost_frags(id)
	if need_f <= 0:
		EventBus.toast_msg(DataManager.tr_key("already_max"), "#9aa0a6")
		return false
	var need_g := evolve_cost_gold(id)
	if int(fragments.get(id, 0)) < need_f or not EconomyManager.can_spend("ouro", float(need_g)):
		EventBus.toast_msg(DataManager.tr_key("not_enough"), "#d0455f")
		return false
	fragments[id] = int(fragments[id]) - need_f
	EconomyManager.spend("ouro", float(need_g))
	owned[id] = stars(id) + 1
	CharacterManager.recalc()
	EventBus.pet_star_up.emit(id, owned[id])
	SaveManager.mark_dirty()
	return true

func add_fragments(id: String, qty: int) -> void:
	fragments[id] = int(fragments.get(id, 0)) + qty
	SaveManager.mark_dirty()

func owned_count() -> int:
	return owned.size()

func save_state() -> Dictionary:
	return {"owned": owned, "fragments": fragments, "active_pet": active_pet, "active_companion": active_companion}

func load_state(d: Dictionary) -> void:
	if d.is_empty():
		return
	owned = d.get("owned", {})
	fragments = d.get("fragments", {})
	active_pet = String(d.get("active_pet", ""))
	active_companion = String(d.get("active_companion", ""))
