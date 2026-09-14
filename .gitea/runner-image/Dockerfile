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
ARG CMDLINE_TOOLS_VERSION=11076708
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

# Android command line tools harus berada di
# $ANDROID_HOME/cmdline-tools/latest/ — sdkmanager menolak layout lain.
RUN mkdir -p "${ANDROID_HOME}/cmdline-tools" \
    && curl -fsSL -o /tmp/cmdline-tools.zip \
        "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip" \
    && unzip -q /tmp/cmdline-tools.zip -d "${ANDROID_HOME}/cmdline-tools" \
    && mv "${ANDROID_HOME}/cmdline-tools/cmdline-tools" "${ANDROID_HOME}/cmdline-tools/latest" \
    && rm /tmp/cmdline-tools.zip

ENV PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"

# Lisensi disetujui lebih dulu; tanpa ini sdkmanager menggantung menunggu input
# yang tidak akan pernah datang di runner tanpa TTY.
RUN yes | sdkmanager --licenses > /dev/null 2>&1 || true

RUN sdkmanager --install \
        "platform-tools" \
        "platforms;android-${ANDROID_PLATFORM}" \
        "build-tools;${ANDROID_BUILD_TOOLS}" \
        "ndk;${ANDROID_NDK}" \
        "cmake;3.22.1" \
    && yes | sdkmanager --licenses > /dev/null 2>&1 || true

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
    echo "Image runner Android siap."

WORKDIR /workspace
