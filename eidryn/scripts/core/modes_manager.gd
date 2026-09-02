# ModesManager — Masmorras, Torre Infinita, World Boss e Arena assíncronos | FASE 10
extends Node

signal dungeon_progress(mode_id: String, elapsed: float, duration: float)

var tower_floor: int = 1
var tower_record: int = 0
var wb_damage: float = 0.0
var wb_week: String = ""
var wb_rank_history: Array = []
var arena_points: int = 0
var arena_wins_total: int = 0
var dungeon_daily: Dictionary = {}   # day_key -> {mode_id: count}
var cooldowns: Dictionary = {}       # mode_id -> unix ts disponível
var arena_attempts_today: Dictionary = {}  # day_key -> count

# Execução ativa
var _active_mode: String = ""
var _active_t: float = 0.0
var _active_dur: float = 0.0

func _ready() -> void:
	EventBus.enemy_damaged.connect(_on_enemy_damaged)

## ---------- ENTRADA ----------
func can_enter(mode_id: String) -> Dictionary:
	var d: Dictionary = DataManager.cfg_dungeons.get(mode_id, {})
	if d.is_empty():
		return {"ok": false, "reason": "modo desconhecido"}
	if mode_id == "arena":
		var used := int(arena_attempts_today.get(TimeManager.day_key(), 0))
		if used >= int(d["attempts_free"]):
			return {"ok": false, "reason": "sem tentativas hoje", "extra_gems": int(d["extra_attempt_gems"])}
		return {"ok": true}
	var free_key := "free_" + mode_id
	var used_free := int(dungeon_daily.get(TimeManager.day_key(), {}).get(free_key, 0))
	var free_daily := int(d.get("free_daily", 0))
	if mode_id in ["masmorra_ouro", "masmorra_xp"] and used_free < free_daily:
		return {"ok": true, "free": true}
	if int(d.get("key_cost", 0)) > 0 and EconomyManager.get_cur("chaves") < float(d["key_cost"]):
		return {"ok": false, "reason": "sem chaves"}
	var cd := int(cooldowns.get(mode_id, 0))
	if TimeManager.now() < cd:
		return {"ok": false, "reason": "em recarga", "ready_at": cd}
	return {"ok": true, "free": false}

func enter(mode_id: String) -> bool:
	var check := can_enter(mode_id)
	if not bool(check["ok"]):
		EventBus.toast_msg(check.get("reason", ""), "#d0455f")
		return false
	var d: Dictionary = DataManager.cfg_dungeons[mode_id]
	# consome entrada
	if mode_id == "arena":
		var k := TimeManager.day_key()
		arena_attempts_today[k] = int(arena_attempts_today.get(k, 0)) + 1
		_resolve_arena()
		return true
	if mode_id in ["masmorra_ouro", "masmorra_xp"]:
		var free := bool(check.get("free", false))
		if not free and int(d.get("key_cost", 0)) > 0:
			if not EconomyManager.spend("chaves", float(d["key_cost"])):
				return false
		else:
			_track_daily("free_" + mode_id)
	elif mode_id == "masmorra_equip":
		if not EconomyManager.spend("chaves", float(d.get("key_cost", 1))):
			return false
	if mode_id in ["masmorra_ouro", "masmorra_xp", "masmorra_equip"]:
		_active_mode = mode_id
		_active_t = 0.0
		_active_dur = float(d["duration_s"])
		return true
	if mode_id == "torre_infinita":
		tower_floor = 1
		_start_tower_floor()
		return true
	if mode_id == "world_boss":
		_start_world_boss()
		return true
	return false

func _track_daily(key: String) -> void:
	var k := TimeManager.day_key()
	if not dungeon_daily.has(k):
		dungeon_daily[k] = {}
	dungeon_daily[k][key] = int(dungeon_daily[k].get(key, 0)) + 1

## ---------- MASMORRAS TEMPORIZADAS (coleta) ----------
func _process(delta: float) -> void:
	if _active_mode == "":
		return
	_active_t += delta
	dungeon_progress.emit(_active_mode, _active_t, _active_dur)
	if _active_t >= _active_dur:
		_finish_dungeon()

func _finish_dungeon() -> void:
	var mode_id := _active_mode
	_active_mode = ""
	var d: Dictionary = DataManager.cfg_dungeons[mode_id]
	var fs := ProgressionManager.farm_stage()
	var rewards := {}
	match mode_id:
		"masmorra_ouro":
			var g := ProgressionManager.gold_per_second(fs) * _active_dur * float(d["reward"]["mult"])
			EconomyManager.add("ouro", g)
			rewards = {"ouro": g}
		"masmorra_xp":
			var x := ProgressionManager.xp_per_second(fs) * _active_dur * float(d["reward"]["mult"])
			CharacterManager.gain_xp(x)
			rewards = {"xp": x}
		"masmorra_equip":
			var items: Array = []
			for i in int(d["reward"]["count"]):
				var r := InventoryManager.rarity_roll("drop_rates_boss", 5.0)
				if r in ["comum", "incomum"]:
					r = "rara"
				var it := InventoryManager.generate_item(fs + 20, r)
				InventoryManager.add_item(it)
				items.append(it)
			rewards = {"items": items}
	cooldowns[mode_id] = TimeManager.now() + int(float(d.get("cooldown_h", 1)) * 3600)
	RetentionManager.track("dungeons", 1)
	EventBus.dungeon_completed.emit(mode_id, rewards)

## ---------- TORRE INFINITA ----------
func _start_tower_floor() -> void:
	var stats := DataManager.enemy_stats_for_stage(maxi(1, ProgressionManager.farm_stage()))
	var fl := float(tower_floor)
	var hp := float(stats["hp"]) * pow(float(DataManager.cfg_dungeons["torre_infinita"]["floor_scale_exp"]), fl)
	var atk := float(stats["atk"]) * pow(1.10, fl)
	var e := {
		"name": "Andar %d — Eco do Abismo" % tower_floor, "stage": tower_floor,
		"region": "abismo", "boss": tower_floor % int(DataManager.cfg_dungeons["torre_infinita"]["boss_every"]) == 0,
		"miniboss": false, "hp": hp, "atk": atk, "def": float(stats["def"]) * (1.0 + fl * 0.01),
		"gold": float(stats["gold"]) * float(DataManager.cfg_dungeons["torre_infinita"]["reward_floor"]["ouro_mult"]),
		"xp": float(stats["xp"]) * float(DataManager.cfg_dungeons["torre_infinita"]["reward_floor"]["xp_mult"]),
		"modifiers": [], "sprite": "enemy_abismo_%d" % (tower_floor % 5)
	}
	CombatManager.start_custom({"mode": "tower", "stage": tower_floor, "enemy": e, "callback": "tower"})

func on_mode_combat_end(cb: String, result: String, stage: int) -> void:
	if cb == "tower":
		if result == "win":
			EventBus.tower_floor_reached.emit(tower_floor)
			tower_floor += 1
			if tower_floor > tower_record:
				tower_record = tower_floor
				RetentionManager.track("tower_floor", tower_record - 1)
				EventBus.toast_msg(DataManager.tr_key("new_record") + " " + str(tower_record), "#e8a33a")
			_start_tower_floor()
		else:
			EventBus.toast_msg("Torre: andar %d alcançado" % (tower_floor - 1), "#e8a33a")

func request_next(mode: String) -> void:
	if mode == "tower":
		_start_tower_floor()

## ---------- WORLD BOSS (assíncrono, 30s de dano) ----------
var _wb_active := false

func _start_world_boss() -> void:
	_wb_active = true
	wb_damage = 0.0
	var pc_expected := 30000.0 * pow(1.09, ProgressionManager.farm_stage())
	var hp := pc_expected * 4.0
	var e := {
		"name": "Devorador Menor", "stage": 999, "region": "abismo", "boss": true, "miniboss": false,
		"hp": hp, "atk": float(DataManager.enemy_stats_for_stage(maxi(1, ProgressionManager.farm_stage()))["atk"]) * 1.4,
		"def": 20.0, "gold": 0.0, "xp": 0.0, "modifiers": [], "sprite": "enemy_abismo_2"
	}
	CombatManager.start_custom({"mode": "world_boss", "stage": 999, "enemy": e, "callback": "world_boss"})

func _on_enemy_damaged(amount: float, _crit: bool) -> void:
	if _wb_active:
		wb_damage += amount

func _finish_world_boss() -> void:
	_wb_active = false
	var bots := _gen_bots(5, float(DataManager.cfg_dungeons["world_boss"]["bots_pc_range"][0]), float(DataManager.cfg_dungeons["world_boss"]["bots_pc_range"][1]))
	var my_score := wb_damage
	var rank := 1
	for b in bots:
		if b > my_score:
			rank += 1
	var rw: Dictionary = DataManager.cfg_dungeons["world_boss"]["reward"]
	var gloria := float(rw["gloria_base"]) * (6.0 - float(mini(rank, 6))) / 5.0
	var ess := float(rw["essencia_base"]) * (6.0 - float(mini(rank, 6))) / 5.0
	EconomyManager.add("gloria", gloria)
	EconomyManager.add("essencia", ess)
	if rank == 1:
		EconomyManager.add("gemas", float(rw["gemas_top"]))
	var wk := TimeManager.week_key()
	if wk != wb_week:
		wb_week = wk
	RetentionManager.track("world_boss", 1)
	EventBus.world_boss_result.emit(wb_damage, rank)

func _gen_bots(n: int, lo: float, hi: float) -> Array:
	var out: Array = []
	var base := CharacterManager.pc()
	for i in n:
		out.append(base * randf_range(lo, hi))
	out.sort()
	out.reverse()
	return out

## ---------- ARENA (assíncrona — resolução automática) ----------
func _resolve_arena() -> void:
	var my_pc := CharacterManager.pc()
	var bot_pc := my_pc * randf_range(float(DataManager.cfg_dungeons["arena"]["bots_pc_range"][0]), float(DataManager.cfg_dungeons["arena"]["bots_pc_range"][1]))
	# Chance ponderada pelo PC com ruído — espelho assíncrono (D13)
	var win_chance := my_pc / (my_pc + bot_pc)
	var win := randf() <= win_chance
	var rw: Dictionary = DataManager.cfg_dungeons["arena"][("reward_win" if win else "reward_lose")]
	EconomyManager.add("gloria", float(rw["gloria"]))
	if win:
		arena_points += int(rw["pontos"])
		arena_wins_total += 1
		RetentionManager.track("arena_wins", 1)
	else:
		arena_points = maxi(0, arena_points + int(rw["pontos"]))
	EventBus.arena_result.emit(win, rw)

## Loja da Glória.
func buy_gloria(offer_id: String) -> bool:
	var shop: Array = DataManager.cfg_dungeons["arena"]["shop"]
	for o in shop:
		if o["id"] == offer_id:
			if not EconomyManager.spend("gloria", float(o["cost"])):
				return false
			match String(o["type"]):
				"item":
					var it := InventoryManager.generate_item(ProgressionManager.farm_stage() + 10, String(o["rarity"]))
					it["slot"] = String(o["slot"])
					it["pc"] = InventoryManager.item_pc(it)
					InventoryManager.add_item(it)
				"pet_frag":
					PetManager.add_fragments(String(o.get("pet_id", PetManager.all_defs()[0]["id"])), int(o["qty"]))
				"currency":
					EconomyManager.add(String(o["currency"]), float(o["qty"]))
			return true
	return false

func save_state() -> Dictionary:
	return {
		"tower_floor": tower_floor, "tower_record": tower_record, "wb_damage": wb_damage,
		"wb_week": wb_week, "arena_points": arena_points, "arena_wins_total": arena_wins_total,
		"dungeon_daily": dungeon_daily, "cooldowns": cooldowns, "arena_attempts_today": arena_attempts_today
	}

func load_state(d: Dictionary) -> void:
	if d.is_empty():
		return
	tower_floor = int(d.get("tower_floor", 1))
	tower_record = int(d.get("tower_record", 0))
	wb_damage = float(d.get("wb_damage", 0.0))
	wb_week = String(d.get("wb_week", ""))
	arena_points = int(d.get("arena_points", 0))
	arena_wins_total = int(d.get("arena_wins_total", 0))
	dungeon_daily = d.get("dungeon_daily", {})
	cooldowns = d.get("cooldowns", {})
	arena_attempts_today = d.get("arena_attempts_today", {})
