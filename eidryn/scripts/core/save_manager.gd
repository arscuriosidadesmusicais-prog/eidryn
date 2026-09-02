# SaveManager — save criptografado, checksum, backup, migração e anticheat | FASE 1
extends Node
## JSON → checksum SHA256 → compressão → AES (open_encrypted_with_pass).

const SAVE_VERSION := 1
const SAVE_PATH := "user://save.dat"
const BAK_PATH := "user://save.bak"
const SALT := "EIDRYN_VELUN_CICLO_DO_ECLIPSE_SALT"
const PASS := "EIDRYN_SeloDoCrepusculo_" + SALT
const FLUSH_DEBOUNCE_S := 3.0

var _dirty := false
var _timer := 0.0
var _boot_done := false

func _ready() -> void:
        set_process(false)

## Chamado pelo GameManager no boot (depois de todos os singletons prontos).
func boot_load() -> void:
        var d := _read_file(SAVE_PATH)
        if d.is_empty():
                var bak := _read_file(BAK_PATH)
                if not bak.is_empty():
                        d = bak
                        EventBus.toast_msg(DataManager.tr_key("save_corrupt"), "#e8a33a")
        if d.is_empty():
                d = {}
        _apply_migrations(d)
        _distribute(d)
        _boot_done = true
        set_process(true)
        _validate_all()
        EventBus.save_flushed.emit()

func _read_file(path: String) -> Dictionary:
        if not FileAccess.file_exists(path):
                return {}
        var f := FileAccess.open_encrypted_with_pass(path, FileAccess.READ, PASS)
        if f == null:
                return {}
        var raw := f.get_as_text()
        f.close()
        var parsed: Variant = JSON.parse_string(raw)
        if parsed is Dictionary:
                var payload: Dictionary = parsed
                var data_json := String(payload.get("data_json", ""))
                if data_json == "" or String(payload.get("checksum", "")) != data_json.sha256_text():
                        return {} # checksum inválido → tentará backup
                var inner: Variant = JSON.parse_string(data_json)
                if inner is Dictionary:
                        return inner
        return {}

func flush() -> void:
        if not _boot_done:
                return
        var data := collect()
        var data_json := JSON.stringify(data)
        var payload := {"version": SAVE_VERSION, "checksum": data_json.sha256_text(), "data_json": data_json}
        var text := JSON.stringify(payload)
        # Backup binário-seguro do save anterior (evita corrupt UTF-8)
        if FileAccess.file_exists(SAVE_PATH):
                var src := FileAccess.open(SAVE_PATH, FileAccess.READ)
                if src:
                        var bytes := src.get_buffer(src.get_length())
                        src.close()
                        var dst := FileAccess.open(BAK_PATH, FileAccess.WRITE)
                        if dst:
                                dst.store_buffer(bytes)
                                dst.close()
        var f := FileAccess.open_encrypted_with_pass(SAVE_PATH, FileAccess.WRITE, PASS)
        if f:
                f.store_string(text)
                f.close()
        _dirty = false
        TimeManager.mark_seen()
        EventBus.save_flushed.emit()

func collect() -> Dictionary:
        return {
                "version": SAVE_VERSION,
                "time": TimeManager.save_state(),
                "economy": EconomyManager.save_state(),
                "character": CharacterManager.save_state(),
                "inventory": InventoryManager.save_state(),
                "skills": SkillManager.save_state(),
                "pets": PetManager.save_state(),
                "progression": ProgressionManager.save_state(),
                "modes": ModesManager.save_state(),
                "ascension": AscensionManager.save_state(),
                "gacha": GachaManager.save_state(),
                "retention": RetentionManager.save_state(),
                "audio": AudioManager.save_state(),
                "system": {"language": DataManager.language, "game_version": DataManager.GAME_VERSION}
        }

func _distribute(d: Dictionary) -> void:
        DataManager.language = String(d.get("system", {}).get("language", "ptbr"))
        TimeManager.load_state(d.get("time", {}))
        EconomyManager.load_state(d.get("economy", {}))
        CharacterManager.load_state(d.get("character", {}))
        InventoryManager.load_state(d.get("inventory", {}))
        SkillManager.load_state(d.get("skills", {}))
        PetManager.load_state(d.get("pets", {}))
        ProgressionManager.load_state(d.get("progression", {}))
        ModesManager.load_state(d.get("modes", {}))
        AscensionManager.load_state(d.get("ascension", {}))
        GachaManager.load_state(d.get("gacha", {}))
        RetentionManager.load_state(d.get("retention", {}))
        AudioManager.load_state(d.get("audio", {}))

## Migrações de versão — cada passo converte o dicionário para a versão seguinte.
func _apply_migrations(d: Dictionary) -> void:
        var v := int(d.get("version", 0))
        while v < SAVE_VERSION:
                match v:
                        0:
                                # Save inexistente/novo: nada a converter
                                v = SAVE_VERSION
                        _:
                                v += 1
        d["version"] = SAVE_VERSION

func mark_dirty() -> void:
        _dirty = true

func _process(delta: float) -> void:
        if _dirty:
                _timer += delta
                if _timer >= FLUSH_DEBOUNCE_S:
                        _timer = 0.0
                        flush()
        else:
                _timer = 0.0

## ---------- ANTICHEAT BÁSICO (D06) ----------
var _violations: Array = []

func _validate_all() -> void:
        _violations.clear()
        var cur: Dictionary = EconomyManager.currencies
        var caps: Dictionary = DataManager.cfg_currencies["caps"]
        for id in cur.keys():
                if float(cur[id]) < 0.0:
                        cur[id] = 0.0
                        _violations.append("moeda negativa: " + id)
                if caps.has(id) and float(cur[id]) > float(caps[id]):
                        cur[id] = float(caps[id])
                        _violations.append("moeda acima do cap: " + id)
        if CharacterManager.level > int(DataManager.cfg_attributes["level"]["cap"]):
                CharacterManager.level = int(DataManager.cfg_attributes["level"]["cap"])
                _violations.append("nível acima do cap")
        if CharacterManager.level < 1:
                CharacterManager.level = 1
                _violations.append("nível inválido")
        if ProgressionManager.current_stage < 1:
                ProgressionManager.current_stage = 1
                _violations.append("fase inválida")
        if _violations.size() > 0:
                EventBus.toast_msg(DataManager.tr_key("anticheat"), "#d0455f")
                EventBus.currency_changed.emit("all", 0.0)
                mark_dirty()

func violation_count() -> int:
        return _violations.size()
