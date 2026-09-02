# UIManager — roteamento de painéis, toasts e popups globais | FASE 13
extends Node

var main_ui: Control = null
var current_panel: String = ""

const PANEL_CLASSES := {
	"hero": "PanelsMain.HeroPanel",
	"equip": "PanelsMain.EquipPanel",
	"skills": "PanelsMain.SkillsPanel",
	"pets": "PanelsMain.PetsPanel",
	"map": "PanelsWorld.MapPanel",
	"dungeons": "PanelsWorld.DungeonsPanel",
	"summon": "PanelsWorld.SummonPanel",
	"shop": "PanelsWorld.ShopPanel",
	"missions": "PanelsWorld.MissionsPanel",
	"settings": "PanelsWorld.SettingsPanel"
}

func register_main_ui(ui: Control) -> void:
	main_ui = ui

func open_panel(panel_id: String) -> void:
	if main_ui == null:
		return
	if current_panel == panel_id:
		close_panel()
		return
	close_panel()
	if not PANEL_CLASSES.has(panel_id):
		return
	var path: String = PANEL_CLASSES[panel_id]
	var script: GDScript = load("res://scripts/ui/panels_" + ("main" if path.begins_with("PanelsMain") else "world") + ".gd")
	var cls: GDScript = script.get(path.get_slice(".", 1))
	var panel: Control = cls.new()
	main_ui.add_child(panel)
	current_panel = panel_id
	panel.refresh()
	EventBus.panel_changed.emit(panel_id)

func close_panel() -> void:
	if main_ui == null:
		return
	current_panel = ""
	for c in main_ui.get_children():
		if c is PanelBase:
			c.queue_free()

func is_panel_open() -> bool:
	return current_panel != ""

func toast(msg: String, color: Color) -> void:
	if main_ui != null:
		main_ui.call("_push_toast", msg, color)

func show_gacha_results(results: Array) -> void:
	if main_ui != null:
		main_ui.call("_show_gacha_results", results)

func show_offline_popup() -> void:
	if main_ui != null:
		main_ui.call("_show_offline_popup")

func show_daily_login_popup() -> void:
	if main_ui != null:
		main_ui.call("_show_daily_login")
