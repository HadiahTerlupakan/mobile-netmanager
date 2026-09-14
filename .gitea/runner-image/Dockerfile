# Image runner untuk membangun AAB Android di Gitea Actions.
#
# Sebelumnya build native berjalan di EAS cloud. Akun gratis punya kuota build,
# dan kuota itu yang menjadi alasan pemindahan ini — bukan kegagalan EAS.
#
# Yang perlu diketahui saat merawat berkas ini: proyek ini memakai New
# Architecture (`newArchEnabled=true`), jadi build menjalankan codegen dan
# mengompilasi C++ sungguhan. NDK dan CMake bukan opsional di sini, dan itu
# yang membuat image ini besar (~6 GB) serta build pertamanya lama.
#
# Versi dipatok persis. Android SDK yang bergerak sendiri akan mengubah hasil
# build tanpa satu baris kode pun berubah — persis jenis kejutan yang tidak
# boleh terjadi pada artefak yang dikirim ke Play Store.

FROM eclipse-temurin:17-jdk-jammy

# AGP 8.x menuntut JDK 17. JDK 21 belum didukung penuh oleh toolchain
# React Native 0.81, jadi versinya tidak dinaikkan tanpa alasan.

ENV DEBIAN_FRONTEND=noninteractive \
    ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    LANG=C.UTF-8

# Versi komponen — sejalan dengan `expo-build-properties` di app.json.
# Menaikkan salah satunya berarti menaikkan app.json juga, kalau tidak build
# akan gagal karena compileSdk yang diminta tidak terpasang.
ARG ANDROID_PLATFORM=36
ARG ANDROID_BUILD_TOOLS=36.0.0
ARG ANDROID_NDK=27.1.12297006
ARG NODE_MAJOR=20

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl unzip git git-lfs zip \
        python3 python3-pip \
        build-essential file ninja-build \
    && rm -rf /var/lib/apt/lists/*

# Node dipasang dari NodeSource, bukan dari apt Ubuntu: versi apt jauh
# tertinggal dan Expo SDK 54 menuntut Node 20+.
RUN curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && node --version && npm --version

# ── Android SDK ──────────────────────────────────────────────────────────────
# Paket diunduh dengan aria2c, 16 koneksi paralel, bukan lewat sdkmanager.
#
# dl.google.com membatasi kecepatan per koneksi dari jaringan VPS ini: satu
# koneksi terukur 48-370 KB/s, delapan koneksi paralel 1,9 MB/s. sdkmanager
# hanya memakai satu koneksi, dan dengan kecepatan itu ~950 MB paket (NDK saja
# 633 MB) butuh berjam-jam. Build pertama image ini sempat tertahan di sini.
#
# Nama berkas dan SHA-1 diambil dari
# https://dl.google.com/android/repository/repository2-3.xml. Checksum
# diverifikasi aria2c sebelum berkas dipakai, jadi unduhan paralel tidak menukar
# integritas dengan kecepatan. Menaikkan versi paket berarti memperbarui nama
# berkas dan checksum-nya bersamaan.
RUN apt-get update && apt-get install -y --no-install-recommends aria2 \
    && rm -rf /var/lib/apt/lists/*

# Format tiap baris: <berkas> <sha1> <tujuan relatif ANDROID_HOME>
RUN printf '%s\n' \
    'commandlinetools-linux-16111833_latest.zip e025545c62a8e64c7559119566a569fb1dec5f60 cmdline-tools/latest' \
    'platform-tools_r37.0.1-linux.zip 477254aa5f903c15cf51001717bdf347fb6b53e0 platform-tools' \
    'platform-36_r02.zip 2c1a80dd4d9f7d0e6dd336ec603d9b5c55a6f576 platforms/android-36' \
    'build-tools_r36_linux.zip b0b6376977657e8ad9b969bacf4093601da2c6fb build-tools/36.0.0' \
    'android-ndk-r27b-linux.zip 6fc476b2e57d7c01ac0c95817746b927035b9749 ndk/27.1.12297006' \
    'cmake-3.22.1-linux.zip fd0a48b4a758310df8c7aa51f59840ed48fe7ed8 cmake/3.22.1' \
    > /tmp/sdk-paket.txt

RUN set -eu; \
    mkdir -p /tmp/sdk-zip "${ANDROID_HOME}"; \
    while read -r berkas sha1 tujuan; do \
        [ -n "$berkas" ] || continue; \
        echo "unduh ${berkas}"; \
        aria2c --quiet=true --console-log-level=warn \
            --max-connection-per-server=16 --split=16 --min-split-size=4M \
            --max-tries=10 --retry-wait=5 --timeout=60 \
            --checksum="sha-1=${sha1}" \
            --dir=/tmp/sdk-zip --out="${berkas}" \
            "https://dl.google.com/android/repository/${berkas}"; \
        rm -rf /tmp/sdk-buka && mkdir -p /tmp/sdk-buka; \
        unzip -q "/tmp/sdk-zip/${berkas}" -d /tmp/sdk-buka; \
        rm "/tmp/sdk-zip/${berkas}"; \
        mkdir -p "$(dirname "${ANDROID_HOME}/${tujuan}")"; \
        # Tiap zip membungkus isinya dalam satu direktori dengan nama yang tidak \
        # konsisten (android-16/, android-ndk-r27b/, cmdline-tools/). Kalau \
        # memang hanya ada satu direktori, isinya yang dipindah; kalau tidak, \
        # seluruh hasil ekstrak. \
        isi="$(ls -A /tmp/sdk-buka)"; \
        if [ "$(printf '%s\n' "$isi" | wc -l)" = 1 ] && [ -d "/tmp/sdk-buka/$isi" ]; then \
            mv "/tmp/sdk-buka/$isi" "${ANDROID_HOME}/${tujuan}"; \
        else \
            mv /tmp/sdk-buka "${ANDROID_HOME}/${tujuan}"; \
        fi; \
    done < /tmp/sdk-paket.txt; \
    rm -rf /tmp/sdk-zip /tmp/sdk-buka

ENV PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"

# Lisensi ditulis langsung sebagai berkas hash, bukan lewat
# `sdkmanager --licenses`. Perintah itu menghubungi dl.google.com, dan dari
# jaringan ini ia bisa diam bermenit-menit; ditambah `|| true`, kegagalannya
# tidak terlihat sampai Gradle menolak paket karena lisensi belum disetujui.
# Hash di bawah adalah hash teks lisensi Android SDK yang dipakai AGP untuk
# memeriksa persetujuan.
RUN mkdir -p "${ANDROID_HOME}/licenses" \
    && printf '\n%s\n%s\n%s' \
        24333f8a63b6825ea9c5514f83c2829b004d1fee \
        8933bad161af4178b1185d1a37fbf41ea5269c55 \
        d56f5187479451eabf01fb78af6dfcb131a6481e \
        > "${ANDROID_HOME}/licenses/android-sdk-license" \
    && printf '\n%s' 84831b9409646a918e30573bab4c9c91346d8abd \
        > "${ANDROID_HOME}/licenses/android-sdk-preview-license"

ENV ANDROID_NDK_HOME="${ANDROID_HOME}/ndk/${ANDROID_NDK}" \
    GRADLE_USER_HOME=/gradle-cache

# Cache Gradle ditaruh di path tetap supaya bisa dipasang sebagai volume.
# Tanpa cache yang bertahan antar-run, setiap build mengunduh ulang seluruh
# dependensi Maven dan mengompilasi ulang dari nol.
RUN mkdir -p /gradle-cache && chmod 777 /gradle-cache

# Pemeriksaan saat build image, bukan saat build aplikasi: kalau salah satu
# komponen gagal terpasang, kegagalannya muncul di sini — bukan 40 menit
# setelah sebuah build aplikasi dimulai.
RUN set -eu; \
    java -version 2>&1 | head -1; \
    node --version; \
    test -d "${ANDROID_HOME}/platforms/android-${ANDROID_PLATFORM}" \
        || { echo "platform android-${ANDROID_PLATFORM} tidak terpasang" >&2; exit 1; }; \
    test -d "${ANDROID_HOME}/build-tools/${ANDROID_BUILD_TOOLS}" \
        || { echo "build-tools ${ANDROID_BUILD_TOOLS} tidak terpasang" >&2; exit 1; }; \
    test -x "${ANDROID_HOME}/build-tools/${ANDROID_BUILD_TOOLS}/apksigner" \
        || { echo "apksigner tidak ada — verifikasi tanda tangan tidak akan bisa dijalankan" >&2; exit 1; }; \
    test -d "${ANDROID_NDK_HOME}" \
        || { echo "NDK ${ANDROID_NDK} tidak terpasang" >&2; exit 1; }; \
    # Paket dipasang dengan unzip, bukan sdkmanager, jadi yang diperiksa adalah \
    # source.properties — berkas yang dibaca Gradle untuk mengenali paket. \
    # `sdkmanager --list_installed` sengaja tidak dipakai: ia tetap menghubungi \
    # dl.google.com dan menggantung bermenit-menit dari jaringan ini. \
    periksa() { \
        berkas="${ANDROID_HOME}/$1/source.properties"; \
        grep -qE "$2" "$berkas" 2>/dev/null \
            || { echo "$1 tidak dikenali: $berkas tidak memuat $2" >&2; exit 1; }; \
        echo "  ok $1"; \
    }; \
    periksa "platforms/android-${ANDROID_PLATFORM}" "AndroidVersion.ApiLevel *= *${ANDROID_PLATFORM}"; \
    periksa "build-tools/${ANDROID_BUILD_TOOLS}" "Pkg.Revision *= *${ANDROID_BUILD_TOOLS}"; \
    periksa "ndk/${ANDROID_NDK}" "Pkg.Revision *= *${ANDROID_NDK}"; \
    periksa "cmake/3.22.1" "Pkg.Revision *= *3.22.1"; \
    periksa "platform-tools" "Pkg.Revision"; \
    periksa "cmdline-tools/latest" "Pkg.Revision"; \
    test -s "${ANDROID_HOME}/licenses/android-sdk-license" \
        || { echo "lisensi SDK belum tertulis" >&2; exit 1; }; \
    echo "Image runner Android siap."

WORKDIR /workspace
