# InventoryManager — 10 slots, 7 raridades, affixes, sets, reforço com pity, fusão | FASE 5
extends Node

const INV_CAP := 120

var inventory: Array = []          # itens não equipados
var equipped: Dictionary = {}      # slot -> item
var item_seq: int = 1
var rein_fail_streak: int = 0
var legendaries_found: int = 0
var divines_found: int = 0
var equips_total: int = 0

## Pesos de PC por estatística (documentado em docs/BALANCE.md)
const STAT_PC_WEIGHTS := {
        "atk_pct": 8.0, "hp_pct": 4.0, "def_pct": 6.0, "atk_speed": 10.0, "crit_rate": 15.0,
        "crit_damage": 5.0, "lifesteal": 20.0, "gold_find": 2.0, "boss_damage": 8.0,
        "regen": 5.0, "atk_flat": 0.6, "hp_flat": 0.05, "def_flat": 1.0
}

## ---------- GERAÇÃO DE ITENS (LOOT) ----------
func rarity_roll(weights_key: String, luck_bonus: float) -> String:
        var rates: Dictionary = DataManager.cfg_items[weights_key]
        var names := ["comum", "incomum", "rara", "epica", "lendaria", "mitica", "divina"]
        var weights: Array = []
        var luck_shift := 1.0 + minf(luck_bonus, float(DataManager.cfg_items["drop_scale"]["cap_bonus_pct"])) / 100.0
        for i in names.size():
                var w := float(rates[names[i]])
                if i >= 2: # rara ou acima se beneficia de sorte
                        w *= luck_shift
                weights.append(w)
        var total := 0.0
        for w in weights: total += w
        var roll := randf() * total
        var acc := 0.0
        for i in weights.size():
                acc += float(weights[i])
                if roll <= acc:
                        return names[i]
        return "comum"

## Gera um item completo para a fase dada.
func generate_item(stage: int, rarity: String, rng: RandomNumberGenerator = null) -> Dictionary:
        var slots: Array = DataManager.cfg_items["slots"]
        var slot: Dictionary = slots[randi_range(0, slots.size() - 1)]
        var rarities: Array = DataManager.cfg_items["rarities"]
        var rdata: Dictionary = {}
        for r in rarities:
                if r["id"] == rarity:
                        rdata = r
        var bases: Dictionary = DataManager.cfg_items["bases"]
        var base_name: String = bases[slot["id"]][randi_range(0, bases[slot["id"]].size() - 1)]
        var ilvl := float(mini(stage, 500))
        var pstats: Dictionary = DataManager.cfg_items["primary_stats"]
        var pid: String = slot["primary"]
        var pconf: Dictionary = pstats[pid]
        var wsum := 0.0
        var wdict: Dictionary = slot.get("weight", {})
        for k in wdict.keys():
                wsum += float(wdict[k])
        var wshare := float(wdict.get(pid, 1.0)) / maxf(wsum, 0.0001)
        var pv := (float(pconf["base"]) + float(pconf["per_level"]) * ilvl) * float(rdata["stat_mult"]) * wshare
        var secondaries := {}
        var pool: Array = DataManager.cfg_items["secondary_pool"]
        var n_aff := int(rdata["affixes"])
        var chosen: Array = []
        var guard := 0
        while secondaries.size() < n_aff and guard < 50:
                guard += 1
                var cand: Dictionary = pool[randi_range(0, pool.size() - 1)]
                if String(cand["id"]) == pid or chosen.has(String(cand["id"])):
                        continue
                chosen.append(String(cand["id"]))
                secondaries[String(cand["id"])] = snappedf((float(cand["base"]) + float(cand["per_level"]) * ilvl * 0.5) * float(rdata["stat_mult"]) * randf_range(0.8, 1.2), 0.01)
        var item := {
                "id": "i_%d" % item_seq, "slot": String(slot["id"]), "base": base_name,
                "rarity": rarity, "ilvl": int(ilvl), "reinforce": 0,
                "primary_id": pid, "primary": snappedf(pv, 0.01),
                "secondaries": secondaries, "favorite": false, "locked": false
        }
        item["pc"] = item_pc(item)
        item_seq += 1
        return item

func item_pc(item: Dictionary) -> float:
        var pc := float(item.get("primary", 0.0)) * float(STAT_PC_WEIGHTS.get(String(item.get("primary_id", "atk_pct")), 1.0))
        for sid in item.get("secondaries", {}).keys():
                pc += float(item["secondaries"][sid]) * float(STAT_PC_WEIGHTS.get(String(sid), 1.0))
        pc *= 1.0 + 0.08 * float(item.get("reinforce", 0))
        return snappedf(pc, 0.01)

## Tentativa de drop em combate.
func try_drop(stage: int, is_boss: bool, stats: Dictionary) -> void:
        var base_chance: float = float(DataManager.cfg_items["drop_chance_boss"]) if is_boss else float(DataManager.cfg_items["drop_chance_normal"])
        var chance := base_chance * (1.0 + float(stats.get("drop_bonus", 0.0)) / 100.0)
        if randf() > chance:
                return
        var luck := float(stats.get("luck", 0.0)) + (2.0 if is_boss else 0.0)
        var rarity := rarity_roll("drop_rates_boss" if is_boss else "drop_rates_normal", luck)
        var item := generate_item(stage, rarity)
        add_item(item)

func add_item(item: Dictionary) -> void:
        if String(item["rarity"]) == "lendaria" or String(item["rarity"]) == "mitica" or String(item["rarity"]) == "divina":
                if String(item["rarity"]) == "divina":
                        divines_found += 1
                else:
                        legendaries_found += 1
        if inventory.size() >= INV_CAP:
                EventBus.inventory_full.emit()
                return
        inventory.append(item)
        equips_total += 1
        EventBus.item_dropped.emit(item)
        if item["rarity"] in ["rara", "epica", "lendaria", "mitica", "divina"]:
                EventBus.loot_rare.emit(item)
        SaveManager.mark_dirty()

## ---------- EQUIPAR ----------
func equip_item(item_id: String) -> bool:
        var idx := _find_index(item_id)
        if idx < 0:
                return false
        var item: Dictionary = inventory[idx]
        var slot := String(item["slot"])
        inventory.remove_at(idx)
        if equipped.has(slot):
                var old: Dictionary = equipped[slot]
                inventory.append(old)
                EventBus.item_unequipped.emit(slot)
        equipped[slot] = item
        equips_total += 1
        CharacterManager.recalc()
        EventBus.item_equipped.emit(item)
        SaveManager.mark_dirty()
        return true

func unequip_slot(slot: String) -> bool:
        if not equipped.has(slot):
                return false
        if inventory.size() >= INV_CAP:
                EventBus.inventory_full.emit()
                return false
        var item: Dictionary = equipped[slot]
        inventory.append(item)
        equipped.erase(slot)
        CharacterManager.recalc()
        EventBus.item_unequipped.emit(slot)
        SaveManager.mark_dirty()
        return true

## Auto-equipar: melhor item por slot (maior PC) considerando o que já está equipado.
func auto_equip() -> int:
        var count := 0
        var slots: Array = DataManager.cfg_items["slots"]
        for s in slots:
                var sid := String(s["id"])
                var best: Dictionary = {}
                var best_pc := -1.0
                var cur_pc := -1.0
                if equipped.has(sid):
                        cur_pc = item_pc(equipped[sid])
                for it in inventory:
                        if String(it["slot"]) != sid or bool(it.get("locked", false)):
                                continue
                        var p := item_pc(it)
                        if p > best_pc:
                                best_pc = p
                                best = it
                if not best.is_empty() and best_pc > cur_pc:
                        if equip_item(String(best["id"])):
                                count += 1
        return count

## ---------- DESMONTAR ----------
func dismantle_item(item_id: String) -> Dictionary:
        var idx := _find_index(item_id)
        if idx < 0:
                return {}
        return _dismantle_at(idx)

func _dismantle_at(idx: int) -> Dictionary:
        var item: Dictionary = inventory[idx]
        if bool(item.get("locked", false)) or bool(item.get("favorite", false)):
                return {}
        var rd := _rarity_data(String(item["rarity"]))
        var frags := int(rd["dismantle"]) * (1 + int(item.get("reinforce", 0)))
        var gold := int(rd["sell"]) * (1 + int(item.get("reinforce", 0)))
        inventory.remove_at(idx)
        EconomyManager.add("fragmentos_equip", float(frags))
        EconomyManager.add("ouro", float(gold))
        EventBus.item_dismantled.emit(item)
        SaveManager.mark_dirty()
        return {"fragments": frags, "gold": gold}

func _rarity_data(rid: String) -> Dictionary:
        for r in DataManager.cfg_items["rarities"]:
                if r["id"] == rid:
                        return r
        return {"dismantle": 1, "sell": 10}

## Auto-desmontar: tudo abaixo de Rara que não esteja equipado/favoritado/bloqueado.
func auto_dismantle(min_rarity: String = "rara") -> int:
        var order := ["comum", "incomum", "rara", "epica", "lendaria", "mitica", "divina"]
        var cut := order.find(min_rarity)
        var count := 0
        for i in range(inventory.size() - 1, -1, -1):
                var it: Dictionary = inventory[i]
                if order.find(String(it["rarity"])) < cut:
                        if _dismantle_at(i) != {}:
                                count += 1
        return count

## ---------- REFORÇO (+1→+20) COM PITY ----------
func reinforce(item_id: String) -> bool:
        var idx := _find_index(item_id)
        if idx < 0:
                return false
        var item: Dictionary = inventory[idx]
        var lvl := int(item.get("reinforce", 0))
        if lvl >= int(DataManager.cfg_items["reinforce"]["max"]):
                EventBus.toast_msg(DataManager.tr_key("already_max"), "#9aa0a6")
                return false
        var cost := reinforce_cost(item)
        if not EconomyManager.spend("ouro", cost):
                return false
        var chances: Array = DataManager.cfg_items["reinforce"]["chances"]
        var chance := float(chances[lvl])
        chance = minf(chance + float(PetManager.bonus_value("reinforce_luck")) / 100.0, 1.0)
        var success := randf() <= chance
        if not success:
                rein_fail_streak += 1
                if rein_fail_streak >= int(DataManager.cfg_items["reinforce"]["pity"]):
                        success = true # pity: falha NÃO destrói; streak garante sucesso
        if success:
                rein_fail_streak = 0
                item["reinforce"] = lvl + 1
                item["pc"] = item_pc(item)
        EventBus.item_reinforced.emit(item, success, int(DataManager.cfg_items["reinforce"]["pity"]) - rein_fail_streak)
        SaveManager.mark_dirty()
        return success

func reinforce_cost(item: Dictionary) -> float:
        var rc: Dictionary = DataManager.cfg_items["reinforce"]
        var lvl := int(item.get("reinforce", 0))
        return float(rc["cost_base"]) * pow(float(rc["cost_exp"]), float(lvl)) * pow(float(rc["cost_rarity_mult"]), float(_rarity_order(String(item["rarity"]))))

func _rarity_order(rid: String) -> int:
        var order := ["comum", "incomum", "rara", "epica", "lendaria", "mitica", "divina"]
        return order.find(rid)

func reinforce_pity_left() -> int:
        return int(DataManager.cfg_items["reinforce"]["pity"]) - rein_fail_streak

## ---------- FUSÃO POR FRAGMENTOS ----------
func fuse_item(rarity: String) -> Dictionary:
        var fcosts: Dictionary = DataManager.cfg_items["fusion"]["fragments_cost"]
        var gcosts: Dictionary = DataManager.cfg_items["fusion"]["gold_cost"]
        if not fcosts.has(rarity):
                return {}
        var fr := float(fcosts[rarity])
        var go := float(gcosts[rarity])
        if not EconomyManager.can_spend("fragmentos_equip", fr) or not EconomyManager.can_spend("ouro", go):
                EventBus.toast_msg(DataManager.tr_key("not_enough"), "#d0455f")
                return {}
        EconomyManager.spend("fragmentos_equip", fr)
        EconomyManager.spend("ouro", go)
        var item := generate_item(ProgressionManager.farm_stage(), rarity)
        add_item(item)
        return item

## ---------- AGREGAÇÃO DE BÔNUS ----------
func equip_bonuses() -> Dictionary:
        var b := {}
        for slot in equipped.keys():
                _add_stat(b, String(equipped[slot]["primary_id"]), float(equipped[slot]["primary"]) * (1.0 + 0.08 * float(equipped[slot].get("reinforce", 0))))
                for sid in equipped[slot].get("secondaries", {}).keys():
                        _add_stat(b, String(sid), float(equipped[slot]["secondaries"][sid]))
        return b

func set_bonuses() -> Dictionary:
        var b := {}
        var worn: Array = []
        for slot in equipped.keys():
                worn.append(slot)
        for set_def in DataManager.cfg_items["sets"]:
                var pieces: Array = set_def["pieces"]
                var worn_count := 0
                for p in pieces:
                        if worn.has(p):
                                worn_count += 1
                if worn_count >= 2 and set_def.has("bonus_2"):
                        _merge_add(b, set_def["bonus_2"])
                if worn_count >= 3 and set_def.has("bonus_3"):
                        _merge_add(b, set_def["bonus_3"])
        return b

func _merge_add(b: Dictionary, src: Dictionary) -> void:
        for k in src.keys():
                _add_stat(b, String(k), float(src[k]))

func _add_stat(b: Dictionary, key: String, val: float) -> void:
        b[key] = float(b.get(key, 0.0)) + val

func equipped_set_pieces() -> Dictionary:
        return equipped.duplicate(true)

## ---------- HELPERS ----------
func _find_index(item_id: String) -> int:
        for i in inventory.size():
                if String(inventory[i]["id"]) == item_id:
                        return i
        return -1

func get_item(item_id: String) -> Dictionary:
        var idx := _find_index(item_id)
        if idx >= 0:
                return inventory[idx]
        return {}

func toggle_favorite(item_id: String) -> void:
        var it := get_item(item_id)
        if not it.is_empty():
                it["favorite"] = not bool(it.get("favorite", false))
                SaveManager.mark_dirty()

func toggle_lock(item_id: String) -> void:
        var it := get_item(item_id)
        if not it.is_empty():
                it["locked"] = not bool(it.get("locked", false))
                SaveManager.mark_dirty()

## Lista filtrada e ordenada por PC desc.
func filtered(slot_filter: String, rarity_filter: String) -> Array:
        var out: Array = []
        for it in inventory:
                if slot_filter != "all" and String(it["slot"]) != slot_filter:
                        continue
                if rarity_filter != "all" and String(it["rarity"]) != rarity_filter:
                        continue
                out.append(it)
        out.sort_custom(func(a, b): return item_pc(a) > item_pc(b))
        return out

func save_state() -> Dictionary:
        return {
                "inventory": inventory, "equipped": equipped, "item_seq": item_seq,
                "rein_fail_streak": rein_fail_streak, "legendaries_found": legendaries_found,
                "divines_found": divines_found, "equips_total": equips_total
        }

func load_state(d: Dictionary) -> void:
        if d.is_empty():
                return
        inventory = d.get("inventory", [])
        equipped = d.get("equipped", {})
        item_seq = int(d.get("item_seq", 1))
        rein_fail_streak = int(d.get("rein_fail_streak", 0))
        legendaries_found = int(d.get("legendaries_found", 0))
        divines_found = int(d.get("divines_found", 0))
        equips_total = int(d.get("equips_total", 0))
