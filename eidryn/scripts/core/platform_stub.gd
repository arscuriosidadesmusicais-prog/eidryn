# PlatformStub — camada de abstração IAP/Ads/Cloud pronta para integração (D14)
## Autoload "Platform". Trocar implementações reais (AdMob/Play Billing/Firebase)
## sem tocar na lógica do jogo. Flags enabled_* = false no lançamento stub.
extends Node

var enabled_iap: bool = false
var enabled_ads: bool = false
var enabled_cloud: bool = false
var _ad_log: Array = []

## IAP: compra simulada. Em produção: validar recibo na loja antes de conceder.
func purchase(product_id: String) -> Dictionary:
	for p in DataManager.cfg_shop.get("iap_stubs", []):
		if p["product"] == product_id or p["id"] == product_id:
			if not enabled_iap:
				return {"ok": false, "reason": "IAP stub desativado"}
			return {"ok": true, "grant": p["grant"]}
	return {"ok": false, "reason": "produto desconhecido"}

## Aplica o grant de um IAP aprovado.
func apply_grant(grant: Dictionary) -> void:
	if grant.has("premium_days"):
		EconomyManager.premium_until = TimeManager.now() + int(grant["premium_days"]) * 86400
	if grant.has("battlepass_premium"):
		RetentionManager.bp_premium_unlocked = true
	EconomyManager.add_dict(grant)

## Anúncio recompensado: fallback=true concede a recompensa em dev/stub.
func show_rewarded_ad(ad_id: String) -> bool:
	for a in DataManager.cfg_shop.get("ad_stubs", []):
		if a["id"] == ad_id:
			_ad_log.append({"id": ad_id, "at": TimeManager.now()})
			if enabled_ads:
				# Integração real: aguardar callback onRewarded do SDK.
				return true
			return bool(a.get("fallback", false))
	return false

func rewarded_available(ad_id: String) -> bool:
	for a in DataManager.cfg_shop.get("ad_stubs", []):
		if a["id"] == ad_id:
			return true
	return false

## Cloud save: hooks prontos para Firebase/PlayFab.
func cloud_push(payload: String) -> void:
	if not enabled_cloud:
		return

func cloud_pull() -> String:
	if not enabled_cloud:
		return ""
	return ""
