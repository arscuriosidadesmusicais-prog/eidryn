# EventBus — barramento de eventos global (signals) | FASE 1
extends Node
## Todos os sistemas comunicam-se por signals; nenhuma dependência circular direta.

# Combate
signal combat_started(stage: int, is_boss: bool)
signal combat_ended(result: String, stage: int)
signal enemy_spawned(enemy: Dictionary)
signal enemy_hp_changed(hp: float, max_hp: float)
signal enemy_killed(enemy: Dictionary)
signal enemy_damaged(amount: float, crit: bool)
signal hero_damaged(amount: float)
signal hero_hp_changed(hp: float, max_hp: float)
signal floating_damage(amount: float, crit: bool, side: String, color: Color)
signal boss_timer(seconds_left: float)
signal screenshake(intensity: float)

# Progressão
signal stage_changed(stage: int, is_boss: bool, is_miniboss: bool)
signal region_changed(region_id: String)
signal farming_fallback(stage: int)
signal auto_advance_toggled(on: bool)

# Economia
signal currency_changed(id: String, value: float)
signal gold_changed(value: float)

# Personagem
signal xp_gained(amount: float)
signal level_up(new_level: int)
signal stats_recalculated(stats: Dictionary)
signal attribute_upgraded(attr_id: String, level: int)

# Itens
signal item_dropped(item: Dictionary)
signal item_equipped(item: Dictionary)
signal item_unequipped(slot: String)
signal item_dismantled(item: Dictionary)
signal item_reinforced(item: Dictionary, success: bool, pity_left: int)
signal loot_rare(item: Dictionary)
signal inventory_full()

# Habilidades
signal skill_casted(skill: Dictionary)
signal skill_ready(skill_id: String)
signal skill_leveled(skill_id: String, level: int)

# Pets
signal pet_changed()
signal pet_star_up(pet_id: String, stars: int)

# Masmorras/Modos
signal dungeon_completed(mode_id: String, rewards: Dictionary)
signal tower_floor_reached(floor_num: int)
signal arena_result(win: bool, rewards: Dictionary)
signal world_boss_result(damage: float, rank: int)

# Ascensão
signal ascension_performed(fragments_gained: float)
signal node_bought(node_id: String)

# Retenção
signal missions_updated()
signal achievement_unlocked(ach: Dictionary)
signal login_claimed(day: int)
signal gacha_pulled(results: Array)
signal bp_xp_changed(xp: float, tier: int)

# Sistema
signal toast(msg: String, color: Color)
signal panel_changed(panel_id: String)
signal offline_collected(rewards: Dictionary, doubled: bool)
signal language_changed(lang: String)
signal game_booted()
signal save_flushed()

## Emite toast rápido (texto + cor opcional)
func toast_msg(msg: String, color_hex: String = "#e8e0d0") -> void:
	toast.emit(msg, Color(color_hex))
