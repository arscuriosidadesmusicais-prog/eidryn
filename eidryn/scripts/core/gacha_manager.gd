# GachaManager — Portal do Crepúsculo, pity transparente 10/50/100 | FASE 11
extends Node

var pulls_total: int = 0
var pulls_since_rare: int = 0
var pulls_since_epic: int = 0
var pulls_since_legend: int = 0

func pity_state() -> Dictionary:
	return {
		"total": pulls_total,
		"since_rare": pulls_since_rare,
		"since_epic": pulls_since_epic,
		"since_legend": pulls_since_legend
	}

## Realiza n invocações; retorna array de resultados {kind, id/name, rarity, detail}.
func pull(n: int) -> Array:
	var cost_per := float(DataManager.cfg_gacha["pull_cost"])
	var cost10 := float(DataManager.cfg_gacha["pull10_cost"])
	var total_cost := cost10 if n == 10 else cost_per * float(n)
	if not EconomyManager.spend("essencia", total_cost):
		return []
	var results: Array = []
	var bonus := 1 if (n == 10 and bool(DataManager.cfg_gacha["pull10_bonus"])) else 0
	for i in range(n + bonus):
		results.append(_single_pull())
	RetentionManager.track("gacha", n)
	SaveManager.mark_dirty()
	return results

func _single_pull() -> Dictionary:
	pulls_total += 1
	pulls_since_rare += 1
	pulls_since_epic += 1
	pulls_since_legend += 1
	# Pity (D10)
	var min_rarity := ""
	if pulls_since_legend >= 100:
		min_rarity = "lendaria"
	elif pulls_since_epic >= 50:
		min_rarity = "epica"
	var rarity := _roll_rarity(min_rarity)
	if rarity in ["rara", "epica", "lendaria", "mitica", "divina"]:
		pulls_since_rare = 0
	if rarity in ["epica", "lendaria", "mitica", "divina"]:
		pulls_since_epic = 0
	if rarity in ["lendaria", "mitica", "divina"]:
		pulls_since_legend = 0
	# Tipo (pet/companheiro/item)
	var type_roll := randf() * 100.0
	var types: Dictionary = DataManager.cfg_gacha["types"]
	var pet_w := float(types["pet"])
	var comp_w := float(types["companheiro"])
	if type_roll < pet_w:
		return _pull_pet(rarity)
	elif type_roll < pet_w + comp_w:
		return _pull_companion(rarity)
	else:
		return _pull_item(rarity)

func _roll_rarity(min_rarity: String) -> String:
	var rates: Dictionary = DataManager.cfg_gacha["rates"]
	var order := ["rara", "epica", "lendaria", "mitica", "divina"]
	var min_idx := order.find(min_rarity)
	var weights: Array = []
	for i in order.size():
		var w := float(rates[order[i]])
		if i < min_idx:
			w = 0.0
		weights.append(w)
	var total := 0.0
	for w in weights: total += w
	var roll := randf() * total
	var acc := 0.0
	for i in weights.size():
		acc += float(weights[i])
		if roll <= acc:
			return order[i]
	return order[maxi(min_idx, 0)]

func _pull_pet(rarity: String) -> Dictionary:
	var pool: Array = []
	for p in DataManager.cfg_pets["pets"]:
		if _rarity_order(String(p["rarity"])) >= _rarity_order(rarity):
			pool.append(p)
	if pool.is_empty():
		pool = DataManager.cfg_pets["pets"].duplicate()
	var p: Dictionary = pool[randi_range(0, pool.size() - 1)]
	var res := PetManager.acquire(String(p["id"]))
	return {"kind": "pet", "id": p["id"], "name": p["name"], "rarity": p["rarity"], "detail": res}

func _pull_companion(rarity: String) -> Dictionary:
	var pool: Array = []
	for c in DataManager.cfg_pets["companions"]:
		if _rarity_order(String(c["rarity"])) >= _rarity_order(rarity):
			pool.append(c)
	if pool.is_empty():
		pool = DataManager.cfg_pets["companions"].duplicate()
	var c: Dictionary = pool[randi_range(0, pool.size() - 1)]
	var res := PetManager.acquire(String(c["id"]))
	return {"kind": "companheiro", "id": c["id"], "name": c["name"], "rarity": c["rarity"], "detail": res}

func _pull_item(rarity: String) -> Dictionary:
	var item_rates: Dictionary = DataManager.cfg_gacha["item_pull_rates"]
	var order := ["rara", "epica", "lendaria", "mitica", "divina"]
	var min_idx := order.find("rara")
	# Em pulls de item, a raridade mínima do pity também vale
	var weights: Array = []
	for i in order.size():
		weights.append(float(item_rates[order[i]]))
	var roll := randf() * 100.0
	var acc := 0.0
	var chosen := "rara"
	for i in weights.size():
		acc += float(weights[i])
		if roll <= acc:
			chosen = order[i]
			break
	if _rarity_order(chosen) < min_idx:
		chosen = "rara"
	var it := InventoryManager.generate_item(ProgressionManager.farm_stage() + 5, chosen)
	InventoryManager.add_item(it)
	return {"kind": "item", "id": it["id"], "name": it["base"], "rarity": chosen, "detail": it}

func _rarity_order(rid: String) -> int:
	var order := ["comum", "incomum", "rara", "epica", "lendaria", "mitica", "divina"]
	return order.find(rid)

func save_state() -> Dictionary:
	return {"pulls_total": pulls_total, "pulls_since_rare": pulls_since_rare, "pulls_since_epic": pulls_since_epic, "pulls_since_legend": pulls_since_legend}

func load_state(d: Dictionary) -> void:
	if d.is_empty():
		return
	pulls_total = int(d.get("pulls_total", 0))
	pulls_since_rare = int(d.get("pulls_since_rare", 0))
	pulls_since_epic = int(d.get("pulls_since_epic", 0))
	pulls_since_legend = int(d.get("pulls_since_legend", 0))
