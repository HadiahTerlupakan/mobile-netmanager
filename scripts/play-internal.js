#!/usr/bin/env node
/**
 * Klien Google Play Developer API untuk build Android di GitHub Actions.
 *
 * Hanya dua hal: menentukan versionCode berikutnya, dan mengunggah AAB ke track
 * internal. Promosi ke produksi sengaja tidak ada di sini — dilakukan manual
 * lewat Play Console setelah build diuji di perangkat.
 *
 * Kredensial dibaca dari GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (isi JSON service
 * account, bukan path) supaya tidak ada berkas kunci yang tertinggal di runner.
 *
 * Pemakaian:
 *   node scripts/play-internal.js next-version-code [override]
 *   node scripts/play-internal.js upload <aab> <versionCode> <releaseName>
 */

const crypto = require("crypto");
const fs = require("fs");

const PACKAGE_NAME = "com.netmanager.mobile";
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}`;
const UPLOAD_API = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE_NAME}`;
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const MASA_BERLAKU_TOKEN_DETIK = 3600;
// Unggahan ~120 MB dari VPS yang egress ke Google-nya dibatasi per koneksi.
const BATAS_WAKTU_UNGGAH_MS = 45 * 60 * 1000;

/**
 * versionCode berikutnya: satu di atas bundle tertinggi yang pernah diunggah.
 * Play menolak angka yang tidak lebih besar dari bundle mana pun, termasuk yang
 * tidak pernah dirilis.
 */
function nextVersionCode(bundles, override) {
  const tertinggi = bundles.reduce((maks, b) => Math.max(maks, Number(b.versionCode) || 0), 0);

  const mentah = override === undefined || override === null ? "" : String(override).trim();
  if (!mentah) return tertinggi + 1;

  if (!/^\d+$/.test(mentah)) {
    throw new Error(`versionCode manual harus bilangan bulat, menerima "${mentah}"`);
  }
  const angka = Number(mentah);
  if (angka <= tertinggi) {
    throw new Error(
      `versionCode manual ${angka} tidak lebih besar dari bundle tertinggi di Play (${tertinggi}); Play Store akan menolaknya`,
    );
  }
  return angka;
}

/** Isi tracks.update untuk merilis satu versionCode ke track internal. */
function buildInternalTrack({ versionCode, releaseName }) {
  return {
    track: "internal",
    releases: [{ name: releaseName, versionCodes: [String(versionCode)], status: "completed" }],
  };
}

/** JWT bertanda tangan RS256 untuk ditukar dengan access token OAuth. */
function buildServiceAccountJwt(serviceAccount, sekarangDetik = Math.floor(Date.now() / 1000)) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const isi = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: serviceAccount.client_email,
    scope: SCOPE,
    aud: serviceAccount.token_uri,
    iat: sekarangDetik,
    exp: sekarangDetik + MASA_BERLAKU_TOKEN_DETIK,
  })}`;
  const tanda = crypto.sign("RSA-SHA256", Buffer.from(isi), serviceAccount.private_key);
  return `${isi}.${tanda.toString("base64url")}`;
}

function bacaServiceAccount() {
  const mentah = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!mentah) throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON belum diset");
  const sa = JSON.parse(mentah);
  for (const kunci of ["client_email", "private_key", "token_uri"]) {
    if (!sa[kunci]) throw new Error(`service account tidak memuat ${kunci}`);
  }
  return sa;
}

async function mintaJson(url, opsi = {}) {
  const respons = await fetch(url, opsi);
  const teks = await respons.text();
  const isi = teks ? JSON.parse(teks) : {};
  if (!respons.ok) {
    const pesan = isi.error?.message || teks.slice(0, 300);
    const galat = new Error(`${opsi.method || "GET"} ${url.replace(API, "").replace(UPLOAD_API, "")} -> ${respons.status}: ${pesan}`);
    galat.status = respons.status;
    throw galat;
  }
  return isi;
}

async function aksesToken(sa) {
  const isi = await mintaJson(sa.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: buildServiceAccountJwt(sa),
    }),
  });
  return { authorization: `Bearer ${isi.access_token}` };
}

/** Jalankan fungsi di dalam satu edit; edit dihapus bila fungsi gagal. */
async function denganEdit(header, kerja) {
  const edit = await mintaJson(`${API}/edits`, { method: "POST", headers: header });
  try {
    return await kerja(edit.id);
  } catch (galat) {
    await fetch(`${API}/edits/${edit.id}`, { method: "DELETE", headers: header }).catch(() => {});
    throw galat;
  }
}

async function perintahNextVersionCode(override) {
  const header = await aksesToken(bacaServiceAccount());
  const angka = await denganEdit(header, async (editId) => {
    const hasil = await mintaJson(`${API}/edits/${editId}/bundles`, { headers: header });
    await fetch(`${API}/edits/${editId}`, { method: "DELETE", headers: header });
    return nextVersionCode(hasil.bundles || [], override);
  });
  process.stdout.write(String(angka));
}

async function perintahUpload(jalurAab, versionCode, releaseName) {
  if (!fs.existsSync(jalurAab)) throw new Error(`AAB tidak ditemukan: ${jalurAab}`);
  const header = await aksesToken(bacaServiceAccount());

  await denganEdit(header, async (editId) => {
    const ukuran = fs.statSync(jalurAab).size;
    process.stderr.write(`Mengunggah ${ukuran} byte ke Play...\n`);
    const bundle = await mintaJson(`${UPLOAD_API}/edits/${editId}/bundles?uploadType=media`, {
      method: "POST",
      headers: { ...header, "content-type": "application/octet-stream", "content-length": String(ukuran) },
      body: fs.readFileSync(jalurAab),
      signal: AbortSignal.timeout(BATAS_WAKTU_UNGGAH_MS),
    });

    // Play yang menentukan versionCode dari isi AAB; kalau berbeda dari yang
    // diminta, prebuild tidak menulis angka yang benar dan rilis dihentikan.
    if (String(bundle.versionCode) !== String(versionCode)) {
      throw new Error(`Play membaca versionCode ${bundle.versionCode}, diharapkan ${versionCode}`);
    }

    await mintaJson(`${API}/edits/${editId}/tracks/internal`, {
      method: "PUT",
      headers: { ...header, "content-type": "application/json" },
      body: JSON.stringify(buildInternalTrack({ versionCode, releaseName })),
    });

    try {
      await mintaJson(`${API}/edits/${editId}:commit`, { method: "POST", headers: header });
    } catch (galat) {
      // Sebagian aplikasi mewajibkan flag ini untuk perubahan yang tidak perlu
      // ditinjau; track internal termasuk di dalamnya.
      if (!/changesNotSentForReview/.test(galat.message)) throw galat;
      await mintaJson(`${API}/edits/${editId}:commit?changesNotSentForReview=true`, {
        method: "POST",
        headers: header,
      });
    }
  });

  process.stdout.write(`versionCode ${versionCode} terbit di track internal\n`);
}

async function main() {
  const [perintah, ...arg] = process.argv.slice(2);
  if (perintah === "next-version-code") return perintahNextVersionCode(arg[0]);
  if (perintah === "upload") return perintahUpload(arg[0], arg[1], arg[2]);
  throw new Error("Perintah: next-version-code [override] | upload <aab> <versionCode> <releaseName>");
}

if (require.main === module) {
  main().catch((galat) => {
    process.stderr.write(`❌ ${galat.message}\n`);
    process.exit(1);
  });
}

module.exports = { PACKAGE_NAME, nextVersionCode, buildInternalTrack, buildServiceAccountJwt };
