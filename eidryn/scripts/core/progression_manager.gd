# ProgressionManager — 500 fases, 6 regiões + Abismo, auto-avançar, farm fallback | FASE 3
extends Node

var current_stage: int = 1
var max_stage: int = 1
var auto_advance: bool = true
var bosses_killed_total: int = 0
var _region_id: String = ""

func _ready() -> void:
        EventBus.combat_ended.connect(_on_combat_ended)

func current_region() -> Dictionary:
        return DataManager.region_for_stage(current_stage)

func farm_stage() -> int:
        # Última fase não-chefe vencida: loop nunca trava em dead-end (D19).
        if max_stage % 10 == 0:
                return maxi(1, max_stage - 1)
        return max_stage

func set_auto_advance(on: bool) -> void:
        auto_advance = on
        EventBus.auto_advance_toggled.emit(on)
        SaveManager.mark_dirty()

func jump_to_stage(stage: int) -> void:
        # Só permite voltar para fases já alcançadas (mapa) ou a atual.
        current_stage = clampi(stage, 1, maxi(max_stage, current_stage))
        _notify_stage()

func _on_combat_ended(result: String, stage: int) -> void:
        # Só reage à campanha; modos customizados são responsabilidade do ModesManager.
        if CombatManager.mode != "campaign":
                return
        if result == "win":
                if stage > max_stage:
                        max_stage = stage
                if bool(DataManager.enemy_for_stage(stage).get("boss", false)) or DataManager.is_boss_stage(stage):
                        bosses_killed_total += 1
                if auto_advance:
                        current_stage = stage + 1
                _notify_stage()
        else:
                # Falha (chefe/tempo) → volta a farmar sem perder progresso (D19)
                current_stage = farm_stage()
                EventBus.farming_fallback.emit(current_stage)
                _notify_stage()

func _notify_stage() -> void:
        var is_boss := DataManager.is_boss_stage(current_stage)
        var is_mini := DataManager.is_miniboss_stage(current_stage)
        EventBus.stage_changed.emit(current_stage, is_boss, is_mini)
        var reg := current_region()
        if reg["id"] != _region_id:
                _region_id = String(reg["id"])
                EventBus.region_changed.emit(_region_id)
        SaveManager.mark_dirty()

## Rendimento por segundo na fase de farm (usado por Offline e Masmorras).
## Estimativa de tempo por abate = intervalo de ataque × 4 golpes em média + 0.6s de spawn.
func gold_per_second(stage: int) -> float:
        var e := DataManager.enemy_stats_for_stage(stage)
        var interval: float = float(CharacterManager.stats().get("atk_interval", 1.0))
        var kill_time := interval * 4.0 + 0.6
        return e["gold"] / maxf(kill_time, 0.5) * EconomyManager.gold_mult()

func xp_per_second(stage: int) -> float:
        var e := DataManager.enemy_stats_for_stage(stage)
        var interval: float = float(CharacterManager.stats().get("atk_interval", 1.0))
        var kill_time := interval * 4.0 + 0.6
        return e["xp"] / maxf(kill_time, 0.5)

func save_state() -> Dictionary:
        return {"current_stage": current_stage, "max_stage": max_stage, "auto_advance": auto_advance, "bosses_killed_total": bosses_killed_total}

func load_state(d: Dictionary) -> void:
        if d.is_empty():
                return
        current_stage = int(d.get("current_stage", 1))
        max_stage = int(d.get("max_stage", 1))
        auto_advance = bool(d.get("auto_advance", true))
        bosses_killed_total = int(d.get("bosses_killed_total", 0))
        _region_id = String(current_region()["id"])
