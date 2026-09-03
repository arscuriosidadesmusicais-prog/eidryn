# EconomyManager — as 7 moedas, ganhos/gastos, multiplicadores de evento e premium | FASE 12
extends Node

var currencies: Dictionary = {}
var premium_until: int = 0
var gold_earned_total: float = 0.0
var spent_log: Dictionary = {}

func _ready() -> void:
	_reset_to_starting()

func _reset_to_starting() -> void:
	currencies = {}
	var starting: Dictionary = DataManager.cfg_currencies["starting"]
	for id in starting:
		currencies[id] = float(starting[id])

func is_premium() -> bool:
	return TimeManager.now() < premium_until

## Multiplicadores de eventos ativos (template de eventos).
func event_mult(kind: String) -> float:
	var mult := 1.0
	for evt in DataManager.cfg_events.get("events", []):
		if not bool(evt.get("enabled", false)):
			continue
		var bonus: Dictionary = evt.get("bonus", {})
		if bonus.has(kind):
			mult *= float(bonus[kind])
	return mult

func gold_mult() -> float:
	var m := event_mult("gold_mult")
	if is_premium():
		m *= 1.10
	return m

func xp_mult() -> float:
	var m := event_mult("xp_mult")
	return m

func get_cur(id: String) -> float:
	return float(currencies.get(id, 0.0))

func add(id: String, amount: float) -> void:
	if amount <= 0.0:
		return
	var caps: Dictionary = DataManager.cfg_currencies["caps"]
	var v := get_cur(id) + amount
	if caps.has(id):
		v = minf(v, float(caps[id]))
	currencies[id] = v
	if id == "ouro":
		gold_earned_total += amount
		EventBus.gold_changed.emit(v)
	EventBus.currency_changed.emit(id, v)
	SaveManager.mark_dirty()

## Tenta gastar; retorna true se bem-sucedido.
func spend(id: String, amount: float) -> bool:
	if not can_spend(id, amount):
		EventBus.toast_msg(DataManager.tr_key("not_enough"), "#d0455f")
		return false
	currencies[id] = get_cur(id) - amount
	spent_log[id] = float(spent_log.get(id, 0.0)) + amount
	if id == "ouro":
		EventBus.gold_changed.emit(currencies[id])
	EventBus.currency_changed.emit(id, currencies[id])
	SaveManager.mark_dirty()
	return true

func can_spend(id: String, amount: float) -> bool:
	return get_cur(id) >= amount - 0.0001

func add_dict(rewards: Dictionary) -> void:
	for id in rewards.keys():
		var amt: Variant = rewards[id]
		match typeof(amt):
			TYPE_FLOAT, TYPE_INT:
				add(String(id), float(amt))
			TYPE_DICTIONARY:
				pass

func save_state() -> Dictionary:
	return {"currencies": currencies.duplicate(true), "premium_until": premium_until, "gold_earned_total": gold_earned_total, "spent_log": spent_log}

func load_state(d: Dictionary) -> void:
	if d.is_empty():
		return
	var cur: Dictionary = d.get("currencies", {})
	if cur.is_empty():
		return
	currencies = cur
	premium_until = int(d.get("premium_until", 0))
	gold_earned_total = float(d.get("gold_earned_total", 0.0))
	spent_log = d.get("spent_log", {})
