# OfflineManager — recompensas por tempo ausente, cap 8h/12h, dobro via anúncio stub | FASE 8
extends Node

var pending: Dictionary = {}   # {"seconds": int, "gold": float, "xp": float}
var collected_count: int = 0

## Cap de horas: 8h grátis; 12h premium; +4h nó n15 (Chave Sussurrada).
func cap_seconds() -> int:
        var h := 8.0
        if EconomyManager.is_premium():
                h = 12.0
        h += AscensionManager.offline_cap_bonus_hours()
        return int(h * 3600.0)

## Calcula pendentes com base no instante do boot (TimeManager já validou time-travel).
func compute_pending() -> Dictionary:
        var secs := TimeManager.offline_seconds(cap_seconds())
        pending = {}
        if secs < 60:
                return pending
        var fs := ProgressionManager.farm_stage()
        var gold := ProgressionManager.gold_per_second(fs) * float(secs)
        var xp := ProgressionManager.xp_per_second(fs) * float(secs)
        pending = {"seconds": secs, "gold": gold, "xp": xp, "stage": fs}
        return pending

## Operação única de lifecycle: calcula com o last_seen anterior e só então avança o relógio.
func prepare_resume() -> Dictionary:
        TimeManager.check_time_travel()
        var result := compute_pending()
        TimeManager.mark_seen()
        return result

func has_pending() -> bool:
        return not pending.is_empty() and float(pending.get("gold", 0.0)) > 0.0

## Coleta simples (ou dobrada com anúncio stub).
func collect(doubled: bool) -> Dictionary:
        if pending.is_empty():
                return {}
        var mult := 2.0 if doubled else 1.0
        if doubled:
                var ad: bool = Platform.show_rewarded_ad("ad_offline_double")
                if not ad:
                        mult = 1.0
        var gold := float(pending.get("gold", 0.0)) * mult
        var xp := float(pending.get("xp", 0.0)) * mult
        EconomyManager.add("ouro", gold)
        CharacterManager.gain_xp(xp)
        collected_count += 1
        RetentionManager.track("offline_collects", 1)
        var out := {"gold": gold, "xp": xp, "doubled": mult > 1.0, "seconds": int(pending.get("seconds", 0))}
        pending = {}
        EventBus.offline_collected.emit(out, mult > 1.0)
        SaveManager.flush()
        return out

func ad_stub_available() -> bool:
        return Platform.rewarded_available("ad_offline_double")

func save_state() -> Dictionary:
        return {"collected_count": collected_count}

func load_state(d: Dictionary) -> void:
        if d.is_empty():
                return
        collected_count = int(d.get("collected_count", 0))
