# RetentionManager — missões, conquistas, login, passe e contadores | FASE 11
extends Node

var counters: Dictionary = {}      # chaves de rastreio globais
var daily_state: Dictionary = {}   # day_key -> {mission_id: progress}
var daily_claimed: Dictionary = {} # day_key -> [ids]
var weekly_state: Dictionary = {}
var weekly_claimed: Dictionary = {}
var achievements_state: Dictionary = {}  # id -> progress
var achievements_claimed: Dictionary = {}  # id -> true
var login_cycle_day: int = 0       # 1..7
var login_last_day: String = ""
var bp_xp: float = 0.0
var bp_claimed_free: Array = []
var bp_claimed_premium: Array = []
var bp_premium_unlocked: bool = false

func _ready() -> void:
	EventBus.combat_ended.connect(func(result, stage):
		if result == "win" and DataManager.is_boss_stage(stage) and CombatManager.mode == "campaign":
			track("stages", 1))

## Rastreia um contador global + progresso de missões + conquistas.
func track(key: String, amount: int) -> void:
	counters[key] = float(counters.get(key, 0.0)) + float(amount)
	_update_missions(key, float(amount))
	_update_achievements(key, float(amount))

func _update_missions(key: String, amount: float) -> void:
	var changed := false
	var dk := TimeManager.day_key()
	var wk := TimeManager.week_key()
	if not daily_state.has(dk):
		daily_state[dk] = {}
	if not weekly_state.has(wk):
		weekly_state[wk] = {}
	for m in DataManager.cfg_missions["daily"]:
		if String(m["track"]) == key:
			daily_state[dk][m["id"]] = float(daily_state[dk].get(m["id"], 0.0)) + amount
			changed = true
	for m in DataManager.cfg_missions["weekly"]:
		if String(m["track"]) == key:
			weekly_state[wk][m["id"]] = float(weekly_state[wk].get(m["id"], 0.0)) + amount
			changed = true
	if changed:
		EventBus.missions_updated.emit()

func _update_achievements(key: String, amount: float) -> void:
	for a in DataManager.cfg_achievements["achievements"]:
		if String(a["track"]) != key:
			continue
		var id := String(a["id"])
		if achievements_claimed.has(id) and bool(achievements_claimed[id]):
			continue
		var cur := float(achievements_state.get(id, 0.0))
		var goal := float(a["goal"])
		# Para métricas de máximo (não cumulativas), usa max
		if key in ["max_stage", "level", "reinforce_max", "pet_max_stars", "tower_floor", "gold_total"]:
			achievements_state[id] = maxf(cur, amount)
		else:
			achievements_state[id] = cur + amount
		if float(achievements_state[id]) >= goal:
			EventBus.toast_msg("🏆 " + String(a["name"]), "#e8a33a")
	EventBus.missions_updated.emit()

## ---------- MISSÕES ----------
func mission_progress(m: Dictionary, period: String) -> float:
	var store := daily_state if period == "daily" else weekly_state
	var k := TimeManager.day_key() if period == "daily" else TimeManager.week_key()
	return float(store.get(k, {}).get(String(m["id"]), 0.0))

func mission_done(m: Dictionary, period: String) -> bool:
	return mission_progress(m, period) >= float(m["goal"])

func mission_claimed(m: Dictionary, period: String) -> bool:
	var claimed := daily_claimed if period == "daily" else weekly_claimed
	var k := TimeManager.day_key() if period == "daily" else TimeManager.week_key()
	return String(m["id"]) in claimed.get(k, [])

func claim_mission(m: Dictionary, period: String) -> bool:
	if not mission_done(m, period) or mission_claimed(m, period):
		return false
	var k := TimeManager.day_key() if period == "daily" else TimeManager.week_key()
	if period == "daily":
		if not daily_claimed.has(k):
			daily_claimed[k] = []
		daily_claimed[k].append(String(m["id"]))
	else:
		if not weekly_claimed.has(k):
			weekly_claimed[k] = []
		weekly_claimed[k].append(String(m["id"]))
	EconomyManager.add_dict(m["reward"])
	track("missions_done", 1)
	EventBus.missions_updated.emit()
	return true

## ---------- LOGIN DIÁRIO (ciclo de 7 dias) ----------
func check_login_day() -> void:
	var dk := TimeManager.day_key()
	if login_last_day == dk:
		return
	login_last_day = dk
	login_cycle_day = int(login_cycle_day) % 7 + 1
	track("login_days", 1)
	SaveManager.mark_dirty()

func login_claim_available() -> bool:
	return not login_claimed_today()

var _login_claimed_day: int = 0

func login_claimed_today() -> bool:
	return _login_claimed_day == login_cycle_day

func claim_login() -> Dictionary:
	if login_claimed_today():
		return {}
	var day_data: Dictionary = {}
	for d in DataManager.cfg_missions["daily_login"]:
		if int(d["day"]) == login_cycle_day:
			day_data = d
			break
	if day_data.is_empty():
		return {}
	_login_claimed_day = login_cycle_day
	EconomyManager.add_dict(day_data["reward"])
	EventBus.login_claimed.emit(login_cycle_day)
	return day_data

func login_day_info() -> Dictionary:
	for d in DataManager.cfg_missions["daily_login"]:
		if int(d["day"]) == login_cycle_day:
			return d
	return {}

## ---------- CONQUISTAS ----------
func achievements_list() -> Array:
	return DataManager.cfg_achievements["achievements"]

func achievement_progress(a: Dictionary) -> float:
	return minf(float(achievements_state.get(String(a["id"]), 0.0)), float(a["goal"]))

func achievement_claim(a: Dictionary) -> bool:
	var id := String(a["id"])
	if bool(achievements_claimed.get(id, false)):
		return false
	if achievement_progress(a) < float(a["goal"]):
		return false
	achievements_claimed[id] = true
	EconomyManager.add_dict(a["reward"])
	EventBus.achievement_unlocked.emit(a)
	return true

func achievements_done_count() -> int:
	var c := 0
	for a in achievements_list():
		if bool(achievements_claimed.get(String(a["id"]), false)):
			c += 1
	return c

## ---------- PASSE DE BATALHA ----------
func bp_add_xp(amount: float) -> void:
	bp_xp += amount
	EventBus.bp_xp_changed.emit(bp_xp, bp_tier())
	SaveManager.mark_dirty()

func bp_tier() -> int:
	return mini(int(bp_xp / float(DataManager.cfg_battlepass["season"]["xp_per_level"])), int(DataManager.cfg_battlepass["tiers"]))

func bp_claim(tier: int, premium: bool) -> bool:
	if tier <= 0 or tier > bp_tier():
		return false
	var track_arr := bp_claimed_premium if premium else bp_claimed_free
	if premium and not bp_premium_unlocked:
		return false
	if tier in track_arr:
		return false
	var list: Array = DataManager.cfg_battlepass["premium_track"] if premium else DataManager.cfg_battlepass["free_track"]
	for entry in list:
		if int(entry["tier"]) == tier:
			track_arr.append(tier)
			EconomyManager.add_dict(entry["reward"])
			if entry["reward"].has("item_epico"):
				InventoryManager.add_item(InventoryManager.generate_item(ProgressionManager.farm_stage() + 10, "epica"))
			if entry["reward"].has("item_lendario"):
				InventoryManager.add_item(InventoryManager.generate_item(ProgressionManager.farm_stage() + 10, "lendaria"))
			if entry["reward"].has("pet_frag"):
				PetManager.add_fragments(String(PetManager.all_defs()[0]["id"]), int(entry["reward"]["pet_frag"]))
			return true
	return false

func save_state() -> Dictionary:
	return {
		"counters": counters, "daily_state": daily_state, "daily_claimed": daily_claimed,
		"weekly_state": weekly_state, "weekly_claimed": weekly_claimed,
		"achievements_state": achievements_state, "achievements_claimed": achievements_claimed,
		"login_cycle_day": login_cycle_day, "login_last_day": login_last_day,
		"login_claimed_day": _login_claimed_day, "bp_xp": bp_xp,
		"bp_claimed_free": bp_claimed_free, "bp_claimed_premium": bp_claimed_premium,
		"bp_premium_unlocked": bp_premium_unlocked
	}

func load_state(d: Dictionary) -> void:
	if d.is_empty():
		return
	counters = d.get("counters", {})
	daily_state = d.get("daily_state", {})
	daily_claimed = d.get("daily_claimed", {})
	weekly_state = d.get("weekly_state", {})
	weekly_claimed = d.get("weekly_claimed", {})
	achievements_state = d.get("achievements_state", {})
	achievements_claimed = d.get("achievements_claimed", {})
	login_cycle_day = int(d.get("login_cycle_day", 0))
	login_last_day = String(d.get("login_last_day", ""))
	_login_claimed_day = int(d.get("login_claimed_day", 0))
	bp_xp = float(d.get("bp_xp", 0.0))
	bp_claimed_free = d.get("bp_claimed_free", [])
	bp_claimed_premium = d.get("bp_claimed_premium", [])
	bp_premium_unlocked = bool(d.get("bp_premium_unlocked", false))
