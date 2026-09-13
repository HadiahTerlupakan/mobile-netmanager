#!/usr/bin/env python3
"""
Sintesis nada notifikasi `assets/sounds/notif_soft.wav`.

Nada macOS (Tink, Boop, Ping) milik Apple dan tidak bisa dipakai di sini, jadi
nadanya dibuat sendiri dari sinus murni: satu ketuk tinggi dengan peluruhan ala
bel, tanpa dentuman. Tidak ada dependensi eksternal dan tidak ada isu lisensi.

Skrip ini disimpan supaya asetnya bisa dibuat ulang persis, bukan jadi berkas
biner tanpa asal-usul. Jalankan dari akar repo:

    python3 scripts/generate-notification-sound.py
"""

import math
import os
import struct
import wave

RATE = 44100
OUTPUT = os.path.join("assets", "sounds", "notif_soft.wav")

# (frekuensi Hz, bobot, mulai detik) — nada dasar G6 plus dua harmonik tipis
# yang memberi warna logam tanpa membuatnya menusuk.
PARTIALS = [(1568, 1.0, 0.0), (3136, 0.28, 0.0), (4704, 0.10, 0.0)]
DURATION = 0.45
GAIN = 0.32

ATTACK = 0.012  # serang lembut supaya tidak ada klik di awal
DECAY_RATE = 7.5  # peluruhan eksponensial ala bel
RELEASE = 0.02  # fade-out di ujung agar benar-benar senyap


def render_sample(t: float) -> float:
    value = 0.0
    for freq, weight, start in PARTIALS:
        if t < start:
            continue
        dt = t - start
        attack = min(1.0, dt / ATTACK)
        decay = math.exp(-dt * DECAY_RATE)
        value += weight * attack * decay * math.sin(2 * math.pi * freq * dt)
    return value


def main() -> None:
    total = int(RATE * DURATION)
    frames = bytearray()

    for i in range(total):
        value = render_sample(i / RATE)

        remaining = (total - i) / RATE
        if remaining < RELEASE:
            value *= remaining / RELEASE

        clipped = max(-1.0, min(1.0, value * GAIN))
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
