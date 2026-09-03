# CharacterManager — 12 atributos, nível/XP, PC em tempo real | FASE 4
extends Node

var level: int = 1
var xp: float = 0.0
var attributes: Dictionary = {}   # id -> pontos investidos
var _cached_stats: Dictionary = {}

func _ready() -> void:
        for a in DataManager.cfg_attributes["attributes"]:
                attributes[a["id"]] = 0
        _recalc()

## ---------- ATRIBUTOS ----------
func attr_level(id: String) -> int:
        return int(attributes.get(id, 0))

func attr_cost(id: String) -> float:
        for a in DataManager.cfg_attributes["attributes"]:
                if a["id"] == id:
                        return DataManager.attribute_cost(a, attr_level(id))
        return INF

func upgrade_attribute(id: String) -> bool:
        var cost := attr_cost(id)
        if cost == INF:
                return false
        if not EconomyManager.spend("ouro", cost):
                return false
        attributes[id] = attr_level(id) + 1
        _recalc()
        EventBus.attribute_upgraded.emit(id, attr_level(id))
        SaveManager.mark_dirty()
        return true

## ---------- XP/NÍVEL ----------
func gain_xp(amount: float) -> void:
        if level >= int(DataManager.cfg_attributes["level"]["cap"]):
                return
        xp += amount * EconomyManager.xp_mult()
        EventBus.xp_gained.emit(amount)
        var leveled := false
        while level < int(DataManager.cfg_attributes["level"]["cap"]) and xp >= DataManager.level_xp_cost(level):
                xp -= DataManager.level_xp_cost(level)
                level += 1
                leveled = true
                EventBus.level_up.emit(level)
        if leveled:
                _recalc()
        SkillManager.check_unlocks()
        SaveManager.mark_dirty()

## ---------- STATS DERIVADOS (com equipment/skills/pets/ascension via getters de managers) ----------
func _recalc() -> void:
        _cached_stats = compute_stats()
        EventBus.stats_recalculated.emit(_cached_stats)

## Calcula stats finais: base do herói + nível + atributos + equipamentos + passivas + pets + ascensão.
func compute_stats() -> Dictionary:
        var hb: Dictionary = DataManager.cfg_attributes["hero_base"]
        var lv := float(level - 1)
        var hp := float(hb["hp"]) + lv * float(hb["per_level_hp"])
        var atk := float(hb["atk"]) + lv * float(hb["per_level_atk"])
        var def := float(hb["def"]) + lv * float(hb["per_level_def"])
        var crit_rate := float(hb["crit_rate"])
        var crit_damage := float(hb["crit_damage"])
        var atk_interval := float(hb["atk_interval"])
        var lifesteal := float(hb["lifesteal"])
        var dodge := float(hb["dodge"])
        var regen := 0.0
        var gold_find := 0.0
        var xp_gain := 0.0
        var boss_damage := 0.0
        var drop_bonus := 0.0
        var luck := 0.0
        # Atributos investidos (D21: efeitos ofensivos/defensivos multiplicativos)
        for a in DataManager.cfg_attributes["attributes"]:
                var pts := float(attr_level(a["id"]))
                match String(a["id"]):
                        "forca": atk *= 1.0 + pts * 0.07
                        "vitalidade": hp *= 1.0 + pts * 0.06; def *= 1.0 + pts * 0.025
                        "sorte": crit_rate += pts * 0.1; luck += pts * 0.05; drop_bonus += pts * 0.05
                        "crit_rate": crit_rate += pts * 0.5
                        "crit_damage": crit_damage += pts * 1.0
                        "lifesteal": lifesteal += pts * 0.3
                        "defesa": def *= 1.0 + pts * 0.025
                        "regeneracao": regen += pts * 0.5
        # Vel. ataque: atributos AtkSpeed% + Destreza% reduzem o intervalo (cap +300%)
        atk_interval = float(hb["atk_interval"]) / (1.0 + minf(float(attr_level("atk_speed")) * 0.01 + float(attr_level("destreza")) * 0.003, 3.0))
        crit_rate = minf(crit_rate, 75.0)
        lifesteal = minf(lifesteal, 30.0)
        # Passivas de habilidades
        var sk := SkillManager.passive_bonuses()
        atk *= 1.0 + float(sk.get("atk_pct", 0.0)) / 100.0
        hp *= 1.0 + float(sk.get("hp_pct", 0.0)) / 100.0
        def *= 1.0 + float(sk.get("def_pct", 0.0)) / 100.0
        crit_rate += float(sk.get("crit", 0.0))
        gold_find += float(sk.get("gold", 0.0))
        atk_interval /= 1.0 + float(sk.get("as", 0.0)) / 100.0
        lifesteal += float(sk.get("ls", 0.0))
        # Equipamentos
        var eq := InventoryManager.equip_bonuses()
        atk *= 1.0 + float(eq.get("atk_pct", 0.0)) / 100.0
        hp *= 1.0 + float(eq.get("hp_pct", 0.0)) / 100.0
        def *= 1.0 + float(eq.get("def_pct", 0.0)) / 100.0
        crit_rate += float(eq.get("crit_rate", 0.0))
        crit_damage += float(eq.get("crit_damage", 0.0))
        atk_interval /= 1.0 + float(eq.get("atk_speed", 0.0)) / 100.0
        lifesteal += float(eq.get("lifesteal", 0.0))
        gold_find += float(eq.get("gold_find", 0.0))
        boss_damage += float(eq.get("boss_damage", 0.0))
        regen += float(eq.get("regen", 0.0))
        atk += float(eq.get("atk_flat", 0.0))
        hp += float(eq.get("hp_flat", 0.0))
        def += float(eq.get("def_flat", 0.0))
        # Sets
        var st := InventoryManager.set_bonuses()
        for k in st.keys():
                match String(k):
                        "atk_pct": atk *= 1.0 + float(st[k]) / 100.0
                        "hp_pct": hp *= 1.0 + float(st[k]) / 100.0
                        "def_pct": def *= 1.0 + float(st[k]) / 100.0
                        "crit_rate": crit_rate += float(st[k])
                        "atk_speed": atk_interval /= 1.0 + float(st[k]) / 100.0
                        "lifesteal": lifesteal += float(st[k])
        # Pets + companheiros
        var pb := PetManager.all_bonuses()
        for k in pb.keys():
                match String(k):
                        "atk_pct": atk *= 1.0 + float(pb[k]) / 100.0
                        "hp_pct": hp *= 1.0 + float(pb[k]) / 100.0
                        "def_pct": def *= 1.0 + float(pb[k]) / 100.0
                        "crit_rate": crit_rate += float(pb[k])
                        "crit_damage": crit_damage += float(pb[k])
                        "atk_speed": atk_interval /= 1.0 + float(pb[k]) / 100.0
                        "lifesteal": lifesteal += float(pb[k])
                        "gold_find": gold_find += float(pb[k])
                        "xp_gain": xp_gain += float(pb[k])
                        "reinforce_luck": pass
        # Árvore de Ascensão (all_pct soma em ATK/HP/DEF)
        var ab := AscensionManager.tree_bonuses()
        var a_atk := float(ab.get("atk_pct", 0.0)) + float(ab.get("all_pct", 0.0))
        var a_hp := float(ab.get("hp_pct", 0.0)) + float(ab.get("all_pct", 0.0))
        var a_def := float(ab.get("def_pct", 0.0)) + float(ab.get("all_pct", 0.0))
        atk *= 1.0 + a_atk / 100.0
        hp *= 1.0 + a_hp / 100.0
        def *= 1.0 + a_def / 100.0
        crit_rate += float(ab.get("crit_rate", 0.0))
        crit_damage += float(ab.get("crit_damage", 0.0))
        boss_damage += float(ab.get("boss_damage", 0.0))
        atk_interval /= 1.0 + float(ab.get("atk_speed", 0.0)) / 100.0
        regen += float(ab.get("regen", 0.0))
        dodge += float(ab.get("dodge", 0.0))
        gold_find += float(ab.get("gold_find", 0.0))
        xp_gain += float(ab.get("xp_gain", 0.0))
        drop_bonus += float(ab.get("drop_bonus_pct", 0.0))
        crit_rate = minf(crit_rate, 90.0)
        lifesteal = minf(lifesteal, 45.0)
        return {
                "hp": hp, "atk": atk, "def": def, "crit_rate": crit_rate, "crit_damage": crit_damage,
                "atk_interval": maxf(atk_interval, 0.25), "lifesteal": lifesteal, "dodge": dodge,
                "regen": regen, "gold_find": gold_find, "xp_gain": xp_gain, "boss_damage": boss_damage,
                "drop_bonus": drop_bonus, "luck": luck
        }

## Poder de Combate: soma ponderada de atributos (D09).
func compute_pc(stats: Dictionary = {}) -> float:
        var s: Dictionary = stats if not stats.is_empty() else _cached_stats
        if s.is_empty():
                s = compute_stats()
        var pc := 0.0
        pc += float(s["atk"]) * 6.0
        pc += float(s["hp"]) * 0.6
        pc += float(s["def"]) * 8.0
        pc += float(s["crit_rate"]) * 12.0
        pc += float(s["crit_damage"]) * 4.0
        pc += (1.0 / float(s["atk_interval"])) * 150.0
        pc += float(s["lifesteal"]) * 20.0
        pc += float(s["boss_damage"]) * 6.0
        return pc

func pc() -> float:
        return compute_pc()

func stats() -> Dictionary:
        return _cached_stats

func recalc() -> void:
        _recalc()

func grant_xp(amount: float) -> void:
        gain_xp(amount)

func save_state() -> Dictionary:
        return {"level": level, "xp": xp, "attributes": attributes.duplicate(true)}

func load_state(d: Dictionary) -> void:
        if d.is_empty():
                return
        level = int(d.get("level", 1))
        xp = float(d.get("xp", 0.0))
        var attrs: Dictionary = d.get("attributes", {})
        for k in attrs.keys():
                if attributes.has(k):
                        attributes[k] = int(attrs[k])
        _recalc()
