# TimeManager — tempo de servidor local, offline e detecção de time-travel | FASE 1/8
extends Node

var last_seen: int = 0
var time_travel_detected: bool = false
var tt_log: Array = []

## Unix time atual em segundos (UTC).
func now() -> int:
	return int(Time.get_unix_time_from_system())

## Registra o "último visto". Chamado a cada save flush.
func mark_seen() -> void:
	last_seen = now()

## Detecta relógio retrocedido: now < last_seen - tolerância(60s).
func check_time_travel() -> bool:
	time_travel_detected = false
	if last_seen > 0 and now() < last_seen - 60:
		time_travel_detected = true
		tt_log.append({"at": now(), "last_seen": last_seen, "delta": now() - last_seen})
		EventBus.toast_msg(DataManager.tr_key("time_travel"), "#d0455f")
	return time_travel_detected

## Segundos offline desde last_seen (0 se time-travel ativo).
func offline_seconds(cap_s: int) -> int:
	if time_travel_detected:
		return 0
	var delta := now() - last_seen
	if delta < 0:
		return 0
	return mini(delta, cap_s)

## Chave de dia UTC (respeita reset_hour do missions.json).
func day_key() -> String:
	var reset_hour: int = int(DataManager.cfg_missions.get("reset_hour_utc", 0))
	var dt := Time.get_datetime_dict_from_unix_time(now() - reset_hour * 3600)
	return "%04d-%02d-%02d" % [dt["year"], dt["month"], dt["day"]]

## Chave de semana ISO (segunda-feira).
func week_key() -> String:
	var dt := Time.get_datetime_dict_from_unix_time(now())
	var days_since_monday := (int(dt["weekday"]) + 6) % 7
	var day0 := now() - days_since_monday * 86400
	var d0 := Time.get_datetime_dict_from_unix_time(day0)
	return "%04d-W%02d" % [d0["year"], d0["month"]]

func save_state() -> Dictionary:
	return {"last_seen": last_seen, "tt_log": tt_log.slice(maxi(0, tt_log.size() - 20))}

func load_state(d: Dictionary) -> void:
	last_seen = int(d.get("last_seen", 0))
	tt_log = d.get("tt_log", [])
