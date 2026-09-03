# main.gd — ponto de entrada: monta a UI e conecta boot | FASE 13
extends Node

func _ready() -> void:
	var ui: Control = load("res://scripts/ui/main_ui.gd").new()
	ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(ui)
	EventBus.game_booted.connect(func():
		EventBus.toast_msg("☾ " + DataManager.tr_key("app_title"), "#e8833a"))
	AudioManager.play_music("menu")
