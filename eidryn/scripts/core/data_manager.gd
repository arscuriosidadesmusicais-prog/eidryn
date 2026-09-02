# DataManager — carregamento data-driven de JSON + localização + fórmulas centrais | FASE 1
extends Node
## FONTE ÚNICA DE FÓRMULAS. Nenhum outro arquivo pode repetir estas constantes.

const SAVE_VERSION := 1
const GAME_VERSION := "1.0.0"

var cfg_enemies: Dictionary = {}
var cfg_regions: Dictionary = {}
var cfg_currencies: Dictionary = {}
var cfg_attributes: Dictionary = {}
var cfg_skills: Dictionary = {}
var cfg_items: Dictionary = {}
var cfg_pets: Dictionary = {}
var cfg_ascension: Dictionary = {}
var cfg_dungeons: Dictionary = {}
var cfg_gacha: Dictionary = {}
var cfg_missions: Dictionary = {}
var cfg_achievements: Dictionary = {}
var cfg_shop: Dictionary = {}
var cfg_battlepass: Dictionary = {}
var cfg_events: Dictionary = {}
var loc_ptbr: Dictionary = {}
var loc_en: Dictionary = {}
var language: String = "ptbr"

func _ready() -> void:
        cfg_enemies = _load_json("res://data/enemies.json")
        cfg_regions = _load_json("res://data/regions.json")
        cfg_currencies = _load_json("res://data/currencies.json")
        cfg_attributes = _load_json("res://data/attributes.json")
        cfg_skills = _load_json("res://data/skills.json")
        cfg_items = _load_json("res://data/items.json")
        cfg_pets = _load_json("res://data/pets.json")
        cfg_ascension = _load_json("res://data/ascension_tree.json")
        cfg_dungeons = _load_json("res://data/dungeons.json")
        cfg_gacha = _load_json("res://data/gacha.json")
        cfg_missions = _load_json("res://data/missions.json")
        cfg_achievements = _load_json("res://data/achievements.json")
        cfg_shop = _load_json("res://data/shop.json")
        cfg_battlepass = _load_json("res://data/battlepass.json")
        cfg_events = _load_json("res://data/events.json")
        loc_ptbr = _load_json("res://data/loc_ptbr.json")
        loc_en = _load_json("res://data/loc_en.json")

func _load_json(path: String) -> Dictionary:
        var f := FileAccess.open(path, FileAccess.READ)
        if f == null:
                push_error("DataManager: JSON ausente: " + path)
                return {}
        var parsed: Variant = JSON.parse_string(f.get_as_text())
        if parsed is Dictionary:
                return parsed
        push_error("DataManager: JSON inválido: " + path)
        return {}

## ---------- LOCALIZAÇÃO ----------
func tr_key(key: String) -> String:
        var base: Dictionary = loc_ptbr if language == "ptbr" else loc_en
        var alt: Dictionary = loc_en if language == "ptbr" else loc_ptbr
        if base.has(key):
                return base[key]
        if alt.has(key):
                return alt[key]
        return key

## ---------- FÓRMULAS OBRIGATÓRIAS ----------
## Soft-cap a partir da fase 400: expoente efetivo reduz gradualmente (DECISÃO D08).
## Implementado em _f_exp() — única fonte de verdade.

## Escalonamento de inimigo para a fase F (requisito exato + D08).
func enemy_stats_for_stage(stage: int) -> Dictionary:
        var base: Dictionary = cfg_enemies["base_stage_1"]
        var sc: Dictionary = cfg_enemies["scaling"]
        var hp := float(base["hp"]) * pow(float(sc["hp_exp"]), _f_exp(stage, float(sc["hp_exp"])) / float(sc["hp_exp"]))
        var atk := float(base["atk"]) * pow(float(sc["atk_exp"]), _f_exp(stage, float(sc["atk_exp"])) / float(sc["atk_exp"]))
        var gold := float(base["gold"]) * pow(float(sc["gold_exp"]), _f_exp(stage, float(sc["gold_exp"])) / float(sc["gold_exp"]))
        var xp := float(base["xp"]) * pow(float(sc["xp_exp"]), _f_exp(stage, float(sc["xp_exp"])) / float(sc["xp_exp"]))
        var def := float(base.get("def", 2.0)) * pow(1.08, _f_exp(stage, 1.08) / 1.08)
        # Abismo: crescimento extra contínuo
        if stage > 500:
                var ab := float(stage - 500)
                hp *= pow(1.0 + float(cfg_enemies["abismo_extra_exp"]["hp"]) * 10.0, ab / 10.0)
                atk *= pow(1.0 + float(cfg_enemies["abismo_extra_exp"]["atk"]) * 10.0, ab / 10.0)
        return {"hp": hp, "atk": atk, "def": def, "gold": gold, "xp": xp}

## Expoente efetivo genérico: g(F) já inclui soft-cap.
func _f_exp(stage: int, exp_base: float) -> float:
        if stage <= 400:
                return exp_base * float(stage)
        var sc: Dictionary = cfg_enemies.get("softcap", {"stage": 400, "floor": 0.4, "decay": 300.0})
        var over := float(stage - int(sc["stage"]))
        var factor: float = float(sc["floor"]) + (1.0 - float(sc["floor"])) * exp(-over / float(sc["decay"]))
        return exp_base * (float(sc["stage"]) + over * factor)

func is_boss_stage(stage: int) -> bool:
        return stage % 10 == 0

func is_miniboss_stage(stage: int) -> bool:
        return stage % 5 == 0 and stage % 10 != 0

func region_for_stage(stage: int) -> Dictionary:
        var regions: Array = cfg_regions["regions"]
        for r in regions:
                var rng: Array = r["stages"]
                if stage >= int(rng[0]) and stage <= int(rng[1]):
                        return r
        return regions[regions.size() - 1]

## RNG determinístico por fase — mesma fase sempre gera o mesmo inimigo/modificadores.
func stage_rng(stage: int) -> RandomNumberGenerator:
        var rng := RandomNumberGenerator.new()
        rng.seed = int(stage * 7919 + 104729)
        return rng

func enemy_for_stage(stage: int) -> Dictionary:
        var region := region_for_stage(stage)
        var rng := stage_rng(stage)
        var region_index := 0
        var regions: Array = cfg_regions["regions"]
        for i in regions.size():
                if regions[i]["id"] == region["id"]:
                        region_index = i
        var stats := enemy_stats_for_stage(stage)
        var enemies: Array = region["enemies"]
        var name_txt: String = enemies[rng.randi_range(0, enemies.size() - 1)]
        var is_boss := is_boss_stage(stage)
        var is_mini := is_miniboss_stage(stage)
        var mults: Dictionary = cfg_enemies["miniboss_multiplier"] if is_mini else cfg_enemies["boss_multiplier"] if is_boss else {"hp": 1.0, "atk": 1.0, "gold": 1.0, "xp": 1.0}
        if is_boss:
                name_txt = region["boss"]
        elif is_mini:
                name_txt = region["miniboss"]
        var mods: Array = _roll_modifiers(stage, rng, is_boss)
        var m_hp := float(mults["hp"])
        var m_atk := float(mults["atk"])
        return {
                "name": name_txt, "stage": stage, "region": region["id"], "boss": is_boss, "miniboss": is_mini,
                "hp": stats["hp"] * m_hp, "atk": stats["atk"] * m_atk, "def": stats["def"] * (2.0 if is_boss else 1.0),
                "gold": stats["gold"] * float(mults["gold"]), "xp": stats["xp"] * float(mults["xp"]),
                "modifiers": mods, "sprite": ("boss_" + String(region["id"])) if is_boss else "enemy_%s_%d" % [region["id"], rng.randi_range(0, 4)]
        }

func _roll_modifiers(stage: int, rng: RandomNumberGenerator, is_boss: bool) -> Array:
        if stage < 15 and not is_boss:
                return []
        var count := 1
        if stage >= 150: count += 1
        if stage >= 300: count += 1
        var pool: Array = cfg_enemies["modifiers"]
        var picked: Array = []
        var total := 0.0
        for m in pool:
                if int(m["min_stage"]) <= stage:
                        total += float(m["weight"])
        for i in count:
                var roll := rng.randf() * total
                var acc := 0.0
                for m in pool:
                        if int(m["min_stage"]) > stage: continue
                        acc += float(m["weight"])
                        if roll <= acc:
                                if not picked.has(m["id"]):
                                        picked.append(m["id"])
                                break
        if is_boss and picked.is_empty():
                picked.append("reforçado")
        return picked

## Dano final do herói: DanoFinal = ATK × MultArma × MultHabilidade × Buffs
func damage_final(atk: float, mult_weapon: float, mult_skill: float, mult_buffs: float) -> float:
        return atk * mult_weapon * mult_skill * mult_buffs

## Defesa: DanoRecebido = DanoInimigo × (100/(100+DEF))
func damage_taken(raw: float, defense: float) -> float:
        return raw * (100.0 / (100.0 + maxf(defense, 0.0)))

## Lifesteal: VidaGanha = DanoCausado × LS%/100
func lifesteal_heal(damage: float, ls_pct: float) -> float:
        return damage * ls_pct / 100.0

## Crítico: se rand(0-100) <= CritRate → ×CritDamage
func roll_crit(rng: RandomNumberGenerator, crit_rate: float) -> bool:
        return rng.randf_range(0.0, 100.0) <= crit_rate

## Custo exponencial de upgrade de atributo
func attribute_cost(attr: Dictionary, current_level: int) -> float:
        return float(attr["base_cost"]) * pow(float(attr["cost_exp"]), float(current_level))

## Custo de XP para o próximo nível
func level_xp_cost(level: int) -> float:
        var lv: Dictionary = cfg_attributes["level"]
        return float(lv["xp_base"]) * pow(float(lv["xp_exp"]), float(level - 1))
