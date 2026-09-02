# AudioManager — música contextual com crossfade, SFX pool, volumes salvos | FASE 14
extends Node

const MUSIC := {"menu": "res://assets/audio/music/menu_theme.wav", "combat": "res://assets/audio/music/combat_theme.wav",
	"boss": "res://assets/audio/music/boss_theme.wav", "dungeon": "res://assets/audio/music/dungeon_theme.wav"}
const SFX := {
	"hit": "res://assets/audio/sfx/hit.wav", "crit": "res://assets/audio/sfx/crit.wav",
	"levelup": "res://assets/audio/sfx/levelup.wav", "coin": "res://assets/audio/sfx/coin.wav",
	"loot_common": "res://assets/audio/sfx/loot_common.wav", "loot_rare": "res://assets/audio/sfx/loot_rare.wav",
	"loot_epic": "res://assets/audio/sfx/loot_epic.wav", "loot_legend": "res://assets/audio/sfx/loot_legend.wav",
	"click": "res://assets/audio/sfx/click.wav", "equip": "res://assets/audio/sfx/equip.wav",
	"fail": "res://assets/audio/sfx/fail.wav", "win": "res://assets/audio/sfx/win.wav",
	"boss_roar": "res://assets/audio/sfx/boss_roar.wav", "skill": "res://assets/audio/sfx/skill.wav",
	"supreme": "res://assets/audio/sfx/supreme.wav", "gacha": "res://assets/audio/sfx/gacha.wav",
	"ascend": "res://assets/audio/sfx/ascend.wav", "offline": "res://assets/audio/sfx/offline.wav",
	"reinforce": "res://assets/audio/sfx/reinforce.wav", "evolve": "res://assets/audio/sfx/evolve.wav"
}
const SFX_POOL_SIZE := 10

var music_vol: float = 0.7
var sfx_vol: float = 0.8
var _music_a: AudioStreamPlayer
var _music_b: AudioStreamPlayer
var _current_music: String = ""
var _use_a: bool = true
var _sfx_pool: Array = []
var _sfx_idx: int = 0
var _cache: Dictionary = {}

func _ready() -> void:
	_setup_buses()
	_music_a = AudioStreamPlayer.new(); _music_a.bus = "Music"; add_child(_music_a)
	_music_b = AudioStreamPlayer.new(); _music_b.bus = "Music"; add_child(_music_b)
	for i in SFX_POOL_SIZE:
		var p := AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		_sfx_pool.append(p)
	apply_volumes()

func _setup_buses() -> void:
	if AudioServer.get_bus_index("Music") == -1:
		AudioServer.add_bus()
		AudioServer.set_bus_name(AudioServer.get_bus_count() - 1, "Music")
	if AudioServer.get_bus_index("SFX") == -1:
		AudioServer.add_bus()
		AudioServer.set_bus_name(AudioServer.get_bus_count() - 1, "SFX")

func apply_volumes() -> void:
	var mi := AudioServer.get_bus_index("Music")
	var si := AudioServer.get_bus_index("SFX")
	if mi >= 0:
		AudioServer.set_bus_volume_db(mi, linear_to_db(maxf(music_vol, 0.0001)))
		AudioServer.set_bus_mute(mi, music_vol <= 0.001)
	if si >= 0:
		AudioServer.set_bus_volume_db(si, linear_to_db(maxf(sfx_vol, 0.0001)))
		AudioServer.set_bus_mute(si, sfx_vol <= 0.001)

func set_music_vol(v: float) -> void:
	music_vol = clampf(v, 0.0, 1.0)
	apply_volumes()
	SaveManager.mark_dirty()

func set_sfx_vol(v: float) -> void:
	sfx_vol = clampf(v, 0.0, 1.0)
	apply_volumes()
	SaveManager.mark_dirty()

## Música contextual com crossfade suave.
func play_music(context: String) -> void:
	if _current_music == context:
		return
	if not MUSIC.has(context):
		return
	var stream: AudioStream = _get_stream(MUSIC[context])
	if stream == null:
		_current_music = context
		return
	_current_music = context
	var old := _music_b if _use_a else _music_a
	var new := _music_a if _use_a else _music_b
	_use_a = not _use_a
	new.stream = stream
	new.volume_db = -30.0
	new.play()
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(new, "volume_db", linear_to_db(maxf(music_vol, 0.0001)), 1.2)
	tw.tween_property(old, "volume_db", -40.0, 1.2)
	tw.chain().tween_callback(old.stop)

func stop_music() -> void:
	_current_music = ""
	_music_a.stop()
	_music_b.stop()

func play_sfx(name: String) -> void:
	if not SFX.has(name):
		return
	var stream: AudioStream = _get_stream(SFX[name])
	if stream == null:
		return
	var p: AudioStreamPlayer = _sfx_pool[_sfx_idx]
	_sfx_idx = (_sfx_idx + 1) % SFX_POOL_SIZE
	p.stream = stream
	p.play()

func _get_stream(path: String) -> AudioStream:
	if _cache.has(path):
		return _cache[path]
	if not ResourceLoader.exists(path):
		return null
	var s: AudioStream = load(path)
	if s != null:
		_cache[path] = s
	return s

func save_state() -> Dictionary:
	return {"music_vol": music_vol, "sfx_vol": sfx_vol}

func load_state(d: Dictionary) -> void:
	if d.is_empty():
		return
	music_vol = float(d.get("music_vol", 0.7))
	sfx_vol = float(d.get("sfx_vol", 0.8))
	apply_volumes()
