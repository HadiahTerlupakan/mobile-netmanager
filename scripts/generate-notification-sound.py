#!/usr/bin/env python3
"""
Sintesis nada notifikasi `assets/sounds/notif_soft.wav`.

Nada iOS dan macOS milik Apple dan tidak bisa dipakai di sini, jadi nadanya
dibuat sendiri dari sinus murni: satu "gelembung" pendek yang naik sedikit
lalu memudar, tanpa harmonik logam. Tidak ada dependensi eksternal dan tidak
ada isu lisensi.

Skrip ini disimpan supaya asetnya bisa dibuat ulang persis, bukan jadi berkas
biner tanpa asal-usul. Jalankan dari akar repo:

    python3 scripts/generate-notification-sound.py

Mengganti nada di Android juga menuntut id channel baru di
`src/services/ForegroundNotificationService.ts` dan `firebase.json`: Android
mengunci suara sebuah channel begitu channel itu dibuat.
"""

import math
import os
import struct
import wave

RATE = 44100
OUTPUT = os.path.join("assets", "sounds", "notif_soft.wav")

BASE_FREQ = 620.0  # Hz; rendah supaya tidak menusuk
GLIDE = 0.35  # naik 35% (sekitar 837 Hz) ...
GLIDE_TIME = 0.12  # ... dalam 120 ms pertama, lalu menetap
DURATION = 0.45

ATTACK = 0.010  # serang lembut supaya tidak ada klik di awal
DECAY_RATE = 11.0  # pudar cepat: terdengar seperti 'pop', bukan dengung
RELEASE = 0.06  # fade-out di ujung agar benar-benar senyap
ECHOES = [(0.09, 0.12)]  # (jeda detik, bobot) — satu gema tipis

# Kenyaringan standar: RMS jendela 300 ms terkeras, sedikit di bawah nada lama
# (-19,6 dBFS). Sisanya diatur volume notifikasi perangkat.
TARGET_RMS_DB = -21.0
LOUDNESS_WINDOW = 0.3


def phase(t: float) -> float:
    """Fase sinus yang frekuensinya naik linear selama GLIDE_TIME."""
    glide_part = min(t, GLIDE_TIME) ** 2 / (2 * GLIDE_TIME) + max(0.0, t - GLIDE_TIME)
    return 2 * math.pi * BASE_FREQ * (t + GLIDE * glide_part)


def render_bubble(t: float) -> float:
    envelope = min(1.0, t / ATTACK) * math.exp(-t * DECAY_RATE)
    return envelope * math.sin(phase(t))


def loudest_window_rms(samples: list[float]) -> float:
    window = int(LOUDNESS_WINDOW * RATE)
    energy = sum(value * value for value in samples[:window])
    loudest = energy
    for i in range(window, len(samples)):
        energy += samples[i] ** 2 - samples[i - window] ** 2
        loudest = max(loudest, energy)
    return math.sqrt(loudest / window)


def main() -> None:
    total = int(RATE * DURATION)
    dry = [render_bubble(i / RATE) for i in range(total)]

    wet = dry[:]
    for delay, weight in ECHOES:
        offset = int(delay * RATE)
        for i in range(offset, total):
            wet[i] += weight * dry[i - offset]

    for i in range(total):
        remaining = (total - i) / RATE
        if remaining < RELEASE:
            wet[i] *= remaining / RELEASE

    scale = 10 ** (TARGET_RMS_DB / 20) / loudest_window_rms(wet)
    frames = bytearray()
    for value in wet:
        clipped = max(-1.0, min(1.0, value * scale))
        frames += struct.pack("<h", int(clipped * 32767))

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with wave.open(OUTPUT, "w") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes(bytes(frames))

    print(f"{OUTPUT} ({DURATION:.2f}s, {len(frames) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
