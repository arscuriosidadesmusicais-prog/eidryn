# CombatManager — loop de combate automático, skills, modificadores, recompensas | FASE 2
extends Node
## Fórmulas exclusivamente via DataManager (damage_final, damage_taken, lifesteal, roll_crit).

const ENEMY_INTERVAL := 2.0
const RESPAWN_DELAY := 0.7

var active: bool = false
var mode: String = "campaign"      # campaign | tower | dungeon_gold | dungeon_xp | dungeon_gear | world_boss | arena
var stage: int = 1
var enemy: Dictionary = {}
var enemy_hp: float = 0.0
var enemy_shield: float = 0.0
var enemy_berserk: bool = false
var hero_hp: float = 0.0
var hero_shield: float = 0.0
var revive_used: bool = false

var _hero_t: float = 0.0
var _enemy_t: float = 0.0
var _spawn_t: float = 0.0
var _boss_t: float = 0.0
var _rng: RandomNumberGenerator

# Efeitos temporários
var _buff_atk_pct: float = 0.0
var _buff_time: float = 0.0
var _dot_dmg: float = 0.0
var _dot_time: float = 0.0
var _dot_per_s: float = 0.0
var _dot_lifesteal: bool = false
var _enemy_atk_shred: float = 0.0
var _enemy_def_shred: float = 0.0
var _stun_t: float = 0.0
var _reflect_pct: float = 0.0
var _mode_callback: String = ""
var _restart_pending: bool = false

func _ready() -> void:
        _rng = RandomNumberGenerator.new()
        randomize()

## ---------- CONTROLE ----------
func start_campaign(p_stage: int) -> void:
        mode = "campaign"
        stage = p_stage
        _begin()

## Contexto customizado (Torre/Masmorra/Boss/Arena) — enemy já vem pronto.
func start_custom(ctx: Dictionary) -> void:
        mode = String(ctx.get("mode", "tower"))
        stage = int(ctx.get("stage", 1))
        enemy = ctx.get("enemy", {})
        _mode_callback = String(ctx.get("callback", ""))
        _begin_with_enemy()

func stop() -> void:
        active = false

func _begin() -> void:
        enemy = DataManager.enemy_for_stage(stage)
        _begin_with_enemy()

func _begin_with_enemy() -> void:
        var stats: Dictionary = CharacterManager.stats()
        hero_hp = float(stats["hp"])
        hero_shield = 0.0
        revive_used = false
        _reset_effects()
        active = true
        _spawn_t = 0.0
        _hero_t = 0.0
        _enemy_t = 0.0
        _restart_pending = false
        enemy_hp = _enemy_max_hp()
        if bool(enemy.get("boss", false)):
                _boss_t = float(DataManager.cfg_enemies["boss_timer_s"])
        else:
                _boss_t = 0.0
        _apply_spawn_modifiers()
        EventBus.combat_started.emit(stage, bool(enemy.get("boss", false)))
        EventBus.enemy_spawned.emit(enemy)
        EventBus.enemy_hp_changed.emit(enemy_hp + enemy_shield, _enemy_max_hp())
        EventBus.hero_hp_changed.emit(hero_hp, float(stats["hp"]))

func _reset_effects() -> void:
        _buff_atk_pct = 0.0; _buff_time = 0.0
        _dot_dmg = 0.0; _dot_time = 0.0; _dot_per_s = 0.0; _dot_lifesteal = false
        _enemy_atk_shred = 0.0; _enemy_def_shred = 0.0
        _stun_t = 0.0; _reflect_pct = 0.0

func _apply_spawn_modifiers() -> void:
        enemy_shield = 0.0
        enemy_berserk = false
        var mods: Array = enemy.get("modifiers", [])
        if mods.has("escudo"):
                enemy_shield = _enemy_max_hp() * 0.25
        if mods.has("reforçado"):
                enemy["def"] = float(enemy["def"]) * 1.2

func _enemy_max_hp() -> float:
        return float(enemy.get("hp", 1.0))

func _enemy_atk() -> float:
        var a := float(enemy.get("atk", 1.0))
        if enemy_berserk:
                a *= 1.5
        if _enemy_atk_shred > 0.0:
                a *= 1.0 - _enemy_atk_shred / 100.0
        return a

## ---------- LOOP ----------
func _process(delta: float) -> void:
        if not active:
                return
        var stats: Dictionary = CharacterManager.stats()
        # respawn / reinício pendente
        if _spawn_t > 0.0:
                _spawn_t -= delta
                if _spawn_t <= 0.0:
                        if _restart_pending:
                                _begin()
                        else:
                                _next_after_win()
                return
        if not _alive():
                return
        _auto_cast()
        SkillManager.tick_cooldowns(delta)
        # regen
        if float(stats["regen"]) > 0.0:
                hero_hp = minf(hero_hp + float(stats["regen"]) * delta, float(stats["hp"]))
        # buff de ATK (Suprema)
        if _buff_time > 0.0:
                _buff_time -= delta
                if _buff_time <= 0.0:
                        _buff_atk_pct = 0.0
        # DOT (Sedenta Sombrio)
        if _dot_time > 0.0:
                _dot_time -= delta
                var tick := _dot_per_s * delta
                _apply_damage_to_enemy(tick, false, "#9b59d0", true)
                if _dot_lifesteal:
                        _heal_hero(tick * 0.5)
                if _dot_time <= 0.0:
                        _enemy_atk_shred = 0.0
        # atordoamento do inimigo
        if _stun_t > 0.0:
                _stun_t -= delta
        # ataque do herói
        _hero_t += delta
        var interval := float(stats["atk_interval"])
        if _hero_t >= interval:
                _hero_t -= interval
                _hero_attack()
        # ataque do inimigo
        if _stun_t <= 0.0:
                _enemy_t += delta
                if _enemy_t >= ENEMY_INTERVAL:
                        _enemy_t -= ENEMY_INTERVAL
                        _enemy_attack(stats)
        # timer de chefe
        if _boss_t > 0.0:
                _boss_t -= delta
                EventBus.boss_timer.emit(_boss_t)
                if _boss_t <= 0.0 and _alive():
                        _fail("timeout")
        # cura do curandeiro
        if _alive() and enemy.get("modifiers", []).has("curandeiro"):
                enemy_hp = minf(enemy_hp + _enemy_max_hp() * 0.02 * delta, _enemy_max_hp())
                EventBus.enemy_hp_changed.emit(enemy_hp + enemy_shield, _enemy_max_hp())

func enemy_interval() -> float:
        return ENEMY_INTERVAL

func _alive() -> bool:
        return active and enemy_hp > 0.0 and hero_hp > 0.0

## ---------- ATAQUES ----------
func _hero_attack() -> void:
        _apply_damage_to_enemy(0.0, false, "#e8e0d0", false)

func _enemy_attack(stats: Dictionary) -> void:
        var mods: Array = enemy.get("modifiers", [])
        var dodge := float(stats.get("dodge", 0.0))
        if _rng.randf_range(0.0, 100.0) <= dodge:
                EventBus.floating_damage.emit(0.0, false, "hero", Color("#9aa0a6"))
                return
        var raw := _enemy_atk()
        var incoming := DataManager.damage_taken(raw, float(stats["def"]))
        # O escudo absorve antes de qualquer redução do HP.
        var absorbed := 0.0
        if hero_shield > 0.0:
                absorbed = minf(hero_shield, incoming)
                hero_shield -= absorbed
        var hp_damage := incoming - absorbed
        hero_hp -= hp_damage
        EventBus.hero_damaged.emit(incoming)
        if hp_damage > 0.0:
                EventBus.floating_damage.emit(-hp_damage, false, "hero", Color("#d0455f"))
        elif absorbed > 0.0:
                EventBus.floating_damage.emit(-absorbed, false, "hero", Color("#3a7bd5"))
        EventBus.screenshake.emit(0.25 if bool(enemy.get("boss", false)) else 0.1)
        if absorbed > 0.0 and _reflect_pct > 0.0:
                _apply_direct_damage_to_enemy(absorbed * _reflect_pct / 100.0, "#3a7bd5")
        EventBus.hero_hp_changed.emit(maxf(hero_hp, 0.0), float(stats["hp"]))
        # berserk do inimigo
        if mods.has("berserk") and not enemy_berserk and enemy_hp < _enemy_max_hp() * 0.3:
                enemy_berserk = true
                EventBus.toast_msg(enemy.get("name", "?") + " ficou Enfurecido!", "#d0455f")
        if hero_hp <= 0.0:
                _hero_down()

func _hero_down() -> void:
        if not revive_used and AscensionManager.has_revive():
                revive_used = true
                hero_hp = float(CharacterManager.stats()["hp"]) * 0.5
                EventBus.hero_hp_changed.emit(hero_hp, float(CharacterManager.stats()["hp"]))
                EventBus.toast_msg("Sombra Guardiã — renasceu!", "#3a9e8f")
                return
        _fail("death")

## Aplica dano ao inimigo (mult=0 → ataque básico). Usado por skills também.
func _apply_damage_to_enemy(skill_mult: float, _is_skill: bool, color_hex: String, no_effects: bool) -> void:
        if not _alive():
                return
        var stats: Dictionary = CharacterManager.stats()
        var mods: Array = enemy.get("modifiers", [])
        # esquiva do inimigo (elusivo)
        if not no_effects and mods.has("elusivo") and _rng.randf_range(0.0, 100.0) <= 10.0:
                EventBus.floating_damage.emit(0.0, false, "enemy", Color("#9aa0a6"))
                return
        var crit := DataManager.roll_crit(_rng, float(stats["crit_rate"]))
        var buffs := 1.0 + _buff_atk_pct / 100.0
        var skill_m := 1.0 if skill_mult <= 0.0 else skill_mult
        var dmg := DataManager.damage_final(float(stats["atk"]), 1.0, skill_m, buffs)
        if bool(enemy.get("boss", false)) or bool(enemy.get("miniboss", false)):
                dmg *= 1.0 + float(stats.get("boss_damage", 0.0)) / 100.0
        if crit:
                dmg *= float(stats["crit_damage"]) / 100.0
        # defesa do inimigo (com shred de Rumo do Vazio)
        var edef := float(enemy.get("def", 0.0)) * (1.0 - _enemy_def_shred / 100.0)
        dmg = DataManager.damage_taken(dmg, edef)
        # escudo absorve primeiro
        if enemy_shield > 0.0:
                var absorbed := minf(enemy_shield, dmg)
                enemy_shield -= absorbed
                dmg -= absorbed
        enemy_hp -= dmg
        var color := Color(color_hex) if not crit else Color("#e8833a")
        EventBus.floating_damage.emit(dmg, crit, "enemy", color)
        if crit:
                EventBus.screenshake.emit(0.3)
        EventBus.enemy_damaged.emit(dmg, crit)
        EventBus.enemy_hp_changed.emit(maxf(enemy_hp, 0.0) + enemy_shield, _enemy_max_hp())
        # lifesteal
        var heal := DataManager.lifesteal_heal(dmg, float(stats["lifesteal"]))
        if heal > 0.0:
                _heal_hero(heal)
        if enemy_hp <= 0.0:
                _kill_enemy()

## Aplica dano já calculado (reflexão), sem reaplicar ATK, crítico, DEF ou lifesteal.
func _apply_direct_damage_to_enemy(amount: float, color_hex: String) -> float:
        if not active or enemy_hp <= 0.0 or amount <= 0.0:
                return 0.0
        var dmg := amount
        if enemy_shield > 0.0:
                var absorbed := minf(enemy_shield, dmg)
                enemy_shield -= absorbed
                dmg -= absorbed
        enemy_hp -= dmg
        EventBus.floating_damage.emit(dmg, false, "enemy", Color(color_hex))
        EventBus.enemy_damaged.emit(dmg, false)
        EventBus.enemy_hp_changed.emit(maxf(enemy_hp, 0.0) + enemy_shield, _enemy_max_hp())
        if enemy_hp <= 0.0:
                _kill_enemy()
        return dmg

func _heal_hero(amount: float) -> void:
        var max_hp := float(CharacterManager.stats()["hp"])
        var before := hero_hp
        hero_hp = minf(hero_hp + amount, max_hp)
        if hero_hp - before > 0.5:
                EventBus.hero_hp_changed.emit(hero_hp, max_hp)

## ---------- SKILLS ----------
func cast_skill(id: String) -> bool:
        var stats: Dictionary = CharacterManager.stats()
        var s := SkillManager.skill_def(id)
        if s.is_empty():
                return false
        if not SkillManager.cast(id):
                return false
        var mult := SkillManager.active_mult(id) / 100.0
        match id:
                "lamina_eclipse":
                        _apply_damage_to_enemy(mult, true, "#e8833a", false)
                        if bool(SkillManager.evolved.get(id, false)):
                                _stun_t = float(s["evolve"]["extra_stun"])
                "guarda_sombras":
                        hero_shield = float(stats["hp"]) * mult
                        _reflect_pct = float(s["evolve"]["reflect"]) if bool(SkillManager.evolved.get(id, false)) else 0.0
                        EventBus.toast_msg(s["name"] + "!", "#3a7bd5")
                "sedenta":
                        _dot_per_s = float(stats["atk"]) * mult / float(s["base"]["dur"])
                        _dot_time = float(s["base"]["dur"])
                        _dot_lifesteal = true
                        if bool(SkillManager.evolved.get(id, false)):
                                _enemy_atk_shred = float(s["evolve"]["atk_shred"])
                        EventBus.toast_msg(s["name"] + "!", "#9b59d0")
                "rumo_vazio":
                        var shred := float(s["evolve"]["def_shred"]) if bool(SkillManager.evolved.get(id, false)) else 0.0
                        _enemy_def_shred = shred
                        _apply_damage_to_enemy(mult, true, "#3a9e8f", false)
                "cataclismo":
                        _apply_damage_to_enemy(mult, true, "#f5e6c8", false)
                        _buff_atk_pct = float(SkillManager.scaled_value(id, "buff_pct"))
                        _buff_time = float(s["base"]["buff_dur"])
                        EventBus.screenshake.emit(0.8)
                        EventBus.toast_msg("☾ " + s["name"] + " ☽", "#f5e6c8")
        return true

## Auto-cast das habilidades prontas.
func _auto_cast() -> void:
        for s in SkillManager.ready_skills(true):
                cast_skill(String(s["id"]))

## ---------- MORTE / RECOMPENSAS ----------
func _kill_enemy() -> void:
        enemy_hp = 0.0
        var stats: Dictionary = CharacterManager.stats()
        # explosivo: dano ao morrer
        if enemy.get("modifiers", []).has("explosivo"):
                var boom := float(enemy["atk"]) * 0.15
                hero_hp -= DataManager.damage_taken(boom, float(stats["def"]))
                EventBus.floating_damage.emit(-boom, false, "hero", Color("#d0455f"))
                EventBus.hero_hp_changed.emit(maxf(hero_hp, 0.0), float(stats["hp"]))
                if hero_hp <= 0.0:
                        _hero_down()
                        return
        var gold := float(enemy["gold"]) * (1.0 + float(stats.get("gold_find", 0.0)) / 100.0) * EconomyManager.gold_mult()
        var xp := float(enemy["xp"]) * (1.0 + float(stats.get("xp_gain", 0.0)) / 100.0)
        EconomyManager.add("ouro", gold)
        CharacterManager.gain_xp(xp)
        InventoryManager.try_drop(stage, bool(enemy.get("boss", false)), stats)
        RetentionManager.track("kills", 1)
        if bool(enemy.get("boss", false)) or bool(enemy.get("miniboss", false)):
                RetentionManager.track("boss_kills", 1)
        EventBus.enemy_killed.emit(enemy)
        EventBus.combat_ended.emit("win", stage)
        _spawn_t = RESPAWN_DELAY
        if _mode_callback != "":
                ModesManager.on_mode_combat_end(_mode_callback, "win", stage)

func _fail(reason: String) -> void:
        EventBus.combat_ended.emit("fail", stage)
        if _mode_callback != "":
                ModesManager.on_mode_combat_end(_mode_callback, "fail", stage)
        if mode == "campaign":
                # volta a farmar: reinicia automaticamente na fase de farm (D19)
                _restart_pending = true
                _spawn_t = RESPAWN_DELAY
        else:
                active = false

## Próxima etapa após vitória: decide pela Progression (campaign) ou mantém contexto (modos).
func _next_after_win() -> void:
        if mode == "campaign":
                _begin()
        else:
                # Modos customizados re-iniciam pelo ModesManager
                active = false
                ModesManager.request_next(mode)
