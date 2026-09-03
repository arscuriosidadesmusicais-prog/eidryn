# GameManager — orquestra boot, estados, ciclo de vida do app | FASE 1
extends Node

enum State { BOOT, TITLE, PLAYING }

var state: int = State.BOOT
var playtime_s: float = 0.0
var session_kills: int = 0

func _ready() -> void:
	_boot()

func _boot() -> void:
	TimeManager.mark_seen()
	SaveManager.boot_load()
	# Offline: calcula pendentes ANTES de marcar o novo last_seen
	TimeManager.check_time_travel()
	OfflineManager.compute_pending()
	RetentionManager.check_login_day()
	CharacterManager.recalc()
	ProgressionManager._notify_stage()
	state = State.TITLE
	EventBus.game_booted.emit()

## Chamado pela UI quando o jogador toca para começar.
func start_game() -> void:
	if state != State.TITLE:
		return
	state = State.PLAYING
	CombatManager.start_campaign(ProgressionManager.current_stage)
	AudioManager.play_music("combat")

func _process(delta: float) -> void:
	if state == State.PLAYING:
		playtime_s += delta
	_update_context_music()

## Música muda conforme contexto: chefe/boss da fase ou combate normal.
func _update_context_music() -> void:
	if state != State.PLAYING:
		AudioManager.play_music("menu")
		return
	if CombatManager.active and bool(CombatManager.enemy.get("boss", false)):
		AudioManager.play_music("boss")
	elif CombatManager.mode != "campaign":
		AudioManager.play_music("dungeon")
	else:
		AudioManager.play_music("combat")

## Ciclo de vida mobile: salva ao pausar; recalcula offline ao voltar.
func _notification(what: int) -> void:
	match what:
		NOTIFICATION_APPLICATION_PAUSED, NOTIFICATION_EXIT_TREE:
			if SaveManager != null:
				SaveManager.flush()
		NOTIFICATION_APPLICATION_RESUMED:
			if state != State.BOOT:
				TimeManager.mark_seen()
				TimeManager.check_time_travel()
				OfflineManager.compute_pending()
				EventBus.toast_msg("Bem-vindo de volta, Marcado.", "#3a9e8f")

func reset_all() -> void:
	SaveManager.flush()
	DirAccess.remove_absolute("user://save.dat")
	DirAccess.remove_absolute("user://save.bak")
	get_tree().quit(0)
