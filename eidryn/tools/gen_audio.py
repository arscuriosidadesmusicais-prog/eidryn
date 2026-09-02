#!/usr/bin/env python3
"""Gerador de áudio 100% sintetizado (original, sem copyright) — Eidryn.
Músicas em loop (22050Hz mono 16-bit) + 20 SFX."""
import os
import numpy as np
import wave

SR = 22050
ROOT = "/home/z/my-project/eidryn/assets/audio"

def save(path, data, sr=SR):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = np.clip(data, -1.0, 1.0)
    pcm = (data * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())

def env(n, a=0.01, r=0.3, sr=SR):
    e = np.ones(n)
    an = min(max(1, int(a * sr)), n)
    rn = min(max(1, int(r * sr)), n)
    e[:an] = np.linspace(0, 1, an)
    e[-rn:] *= np.linspace(1, 0, rn)
    return e

def note(freq, dur, vol=0.3, kind="sine", detune=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    if kind == "sine":
        w = np.sin(2 * np.pi * f * t)
    elif kind == "saw":
        w = 2 * (t * f % 1.0) - 1
    elif kind == "square":
        w = np.sign(np.sin(2 * np.pi * f * t))
    elif kind == "tri":
        w = 2 * np.abs(2 * (t * f % 1.0) - 1) - 1
    else:
        w = np.random.uniform(-1, 1, n)
    return w * env(n) * vol

def seq(notes, gap=0.0):
    parts = []
    for (f, d, v, k) in notes:
        parts.append(note(f, d, v, k))
        if gap > 0:
            parts.append(np.zeros(int(gap * SR)))
    return np.concatenate(parts)

def drum(dur=0.12, vol=0.5, low=True):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.linspace(120 if low else 900, 40 if low else 200, n)
    thump = np.sin(2 * np.pi * f * t)
    noise = np.random.uniform(-1, 1, n) * np.linspace(1, 0, n) ** 2
    return (thump * 0.7 + noise * 0.5) * env(n) * vol

def scale_freqs(root, semis):
    return [root * (2 ** (s / 12)) for s in semis]

# ---------- MÚSICAS (loops 8s) ----------
def music_menu():
    # pads menores melancólicos em Lá menor
    t = np.arange(int(8 * SR)) / SR
    pad = np.zeros_like(t)
    for f in [110.0, 164.81, 220.0, 261.63]:
        pad += np.sin(2 * np.pi * f * t) * 0.08 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t))
    arp_notes = scale_freqs(220, [0, 3, 7, 12, 15, 12, 7, 3])
    arp = np.zeros_like(t)
    step = 8 * SR / len(arp_notes)
    for i, f in enumerate(arp_notes):
        s = int(i * step)
        n = int(step * 0.9)
        arp[s:s + n] += note(f, step * 0.9 / SR, 0.10, "tri")[:n]
    return pad + arp

def music_combat():
    total = np.zeros(int(8 * SR))
    bpm = 132
    beat = 60 / bpm
    t = 0.0
    roots = scale_freqs(146.83, [0, 0, 5, 3])  # D3...
    for bar in range(8):
        f = roots[bar % 4]
        for b in range(4):
            n = int(beat * SR)
            s = int(t * SR)
            bass = note(f / 2, beat * 0.9, 0.16, "saw")
            total[s:s + min(len(bass), len(total) - s)] += bass[:max(0, min(len(bass), len(total) - s))]
            if b % 2 == 0:
                d = drum(0.1, 0.4)
                total[s:s + len(d)] += d[:max(0, min(len(d), len(total) - s))]
            t += beat
        mel = seq([(f * 2, beat * 0.45, 0.09, "tri"), (f * 3, beat * 0.45, 0.07, "tri")])
        s = int((t - beat * 4) * SR)
        total[s:s + len(mel)] += mel[:max(0, min(len(mel), len(total) - s))]
    return total

def music_boss():
    total = np.zeros(int(8 * SR))
    bpm = 150
    beat = 60 / bpm
    t = 0.0
    for bar in range(8):
        f = scale_freqs(110, [0, 1, 0, -2])[bar % 4]  # tensão cromática
        for b in range(4):
            n = int(beat * SR)
            s = int(t * SR)
            bass = note(f / 2, beat * 0.9, 0.2, "square")
            total[s:s + min(len(bass), len(total) - s)] += bass[:max(0, min(len(bass), len(total) - s))]
            d = drum(0.14, 0.5)
            total[s:s + len(d)] += d[:max(0, min(len(d), len(total) - s))]
            t += beat
        mel = seq([(f * 4, beat * 0.9, 0.08, "saw"), (f * 4.5, beat * 0.9, 0.06, "saw")])
        s = int((t - beat * 4) * SR)
        total[s:s + len(mel)] += mel[:max(0, min(len(mel), len(total) - s))]
    return total

def music_dungeon():
    t = np.arange(int(6 * SR)) / SR
    pad = np.zeros_like(t)
    for f in [98.0, 146.83, 233.08]:
        pad += np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 0.4 * t)) * 0.09
    drop = np.sin(2 * np.pi * 440 * t) * np.exp(-((t % 1.5) * 6)) * 0.05
    return pad + drop

# ---------- SFX ----------
def mix(*arrays):
    n = max(len(a) for a in arrays)
    out = np.zeros(n)
    for a in arrays:
        out[:len(a)] += a
    return out

def sfx_hit():
    n = int(0.12 * SR)
    noise = np.random.uniform(-1, 1, n) * np.linspace(1, 0, n)
    thump = drum(0.1, 0.5)
    out = np.zeros(max(n, len(thump)))
    out[:n] += noise * 0.6
    out[:len(thump)] += thump
    return out * 0.8

def sfx_crit():
    return mix(seq([(880, 0.06, 0.3, "square"), (1320, 0.08, 0.3, "square"), (1760, 0.12, 0.25, "saw")]), drum(0.12, 0.6))

def sfx_levelup():
    return seq([(523, 0.1, 0.3, "tri"), (659, 0.1, 0.3, "tri"), (784, 0.1, 0.3, "tri"), (1046, 0.25, 0.35, "tri")])

def sfx_coin():
    return seq([(988, 0.06, 0.25, "square"), (1319, 0.12, 0.25, "square")])

def chime(rates):
    out = np.zeros(1)
    for f in rates:
        out = np.concatenate([out, [0.0], note(f, 0.14, 0.22, "sine"), note(f * 2, 0.1, 0.1, "sine")])
    return out

def sfx_loot(rarity):
    scales = {"common": [523], "rare": [523, 659], "epic": [523, 659, 784], "legend": [523, 659, 784, 1046]}
    return chime(scales[rarity])

def sfx_click():
    return note(660, 0.04, 0.2, "square")

def sfx_equip():
    return mix(note(220, 0.08, 0.3, "square"), note(330, 0.1, 0.2, "square"))

def sfx_fail():
    return seq([(392, 0.15, 0.3, "saw"), (311, 0.15, 0.3, "saw"), (233, 0.3, 0.3, "saw")])

def sfx_win():
    return seq([(523, 0.12, 0.3, "tri"), (659, 0.12, 0.3, "tri"), (784, 0.12, 0.3, "tri"), (1046, 0.3, 0.35, "tri"), (784, 0.12, 0.25, "tri"), (1046, 0.4, 0.35, "tri")])

def sfx_boss_roar():
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    growl = np.sin(2 * np.pi * (60 + 25 * np.sin(2 * np.pi * 6 * t)) * t)
    noise = np.random.uniform(-1, 1, n) * 0.4
    out = (growl * 0.7 + noise * 0.5) * env(n, 0.05, 0.5)
    return out

def sfx_skill():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    f = np.linspace(400, 900, n)
    return np.sin(2 * np.pi * f * t) * env(n, 0.02, 0.2) * 0.3

def sfx_supreme():
    out = drum(0.5, 0.8)
    out = mix(out, seq([(110, 0.5, 0.3, "saw"), (220, 0.5, 0.2, "saw"), (440, 0.6, 0.2, "saw")]))
    return out

def sfx_gacha():
    return chime([880, 1108, 1318, 1760])

def sfx_ascend():
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    f = np.linspace(110, 880, n)
    riser = np.sin(2 * np.pi * f * t) * np.linspace(0.1, 0.6, n)
    boom = drum(0.6, 0.7)
    out = np.zeros(int(1.8 * SR))
    out[:n] += riser
    idx = n - len(boom)
    out[idx:idx + len(boom)] += boom
    return out

def sfx_offline():
    return chime([659, 523, 784])

def sfx_reinforce():
    return mix(drum(0.18, 0.6), note(660, 0.15, 0.2, "square"))

def sfx_evolve():
    return seq([(587, 0.1, 0.25, "tri"), (880, 0.1, 0.25, "tri"), (1174, 0.25, 0.3, "tri")])

def main():
    M = f"{ROOT}/music"
    S = f"{ROOT}/sfx"
    save(f"{M}/menu_theme.wav", music_menu() * 0.9)
    save(f"{M}/combat_theme.wav", music_combat() * 0.9)
    save(f"{M}/boss_theme.wav", music_boss() * 0.9)
    save(f"{M}/dungeon_theme.wav", music_dungeon() * 0.9)
    save(f"{S}/hit.wav", sfx_hit())
    save(f"{S}/crit.wav", sfx_crit())
    save(f"{S}/levelup.wav", sfx_levelup())
    save(f"{S}/coin.wav", sfx_coin())
    save(f"{S}/loot_common.wav", sfx_loot("common"))
    save(f"{S}/loot_rare.wav", sfx_loot("rare"))
    save(f"{S}/loot_epic.wav", sfx_loot("epic"))
    save(f"{S}/loot_legend.wav", sfx_loot("legend"))
    save(f"{S}/click.wav", sfx_click())
    save(f"{S}/equip.wav", sfx_equip())
    save(f"{S}/fail.wav", sfx_fail())
    save(f"{S}/win.wav", sfx_win())
    save(f"{S}/boss_roar.wav", sfx_boss_roar())
    save(f"{S}/skill.wav", sfx_skill())
    save(f"{S}/supreme.wav", sfx_supreme())
    save(f"{S}/gacha.wav", sfx_gacha())
    save(f"{S}/ascend.wav", sfx_ascend())
    save(f"{S}/offline.wav", sfx_offline())
    save(f"{S}/reinforce.wav", sfx_reinforce())
    save(f"{S}/evolve.wav", sfx_evolve())
    print("Áudio OK:", sum(len(f) for _, _, f in os.walk(ROOT)), "arquivos")

if __name__ == "__main__":
    main()
