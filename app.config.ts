import type { ExpoConfig, ConfigContext } from "expo/config";

const VARIANT_CONFIG = {
  development: {
    apiBase: process.env.EXPO_PUBLIC_API_URL?.trim() || "http://localhost:3000",
    channel: "staging" as const,
  },
  staging: {
    apiBase: "https://staging.radpro.id",
    channel: "staging" as const,
  },
  production: {
    apiBase: "https://radpro.id",
    channel: "production" as const,
  },
} as const;

type Variant = keyof typeof VARIANT_CONFIG;

function resolveVariant(): Variant {
  const raw = process.env.EXPO_PUBLIC_APP_VARIANT?.trim().toLowerCase();
  if (raw === "production" || raw === "staging" || raw === "development") {
    return raw;
  }
  return "development";
}

// Play Store menolak versionCode di atas angka ini.
const BATAS_VERSION_CODE_PLAY_STORE = 2100000000;

/**
 * Baca versionCode dari lingkungan build.
 *
 * `eas.json` memakai `appVersionSource: "remote"` — EAS yang dulu memegang
 * angka ini. Sejak build native pindah ke Gitea Actions, EAS tidak lagi ikut
 * dalam alur, dan tanpa sumber pengganti `expo prebuild` akan menulis
 * `versionCode 1`. Angka itu tidak menggagalkan build; ia menggagalkan unggahan
 * ke Play Store setelah satu siklus build penuh terbuang.
 *
 * Nilai kosong dibiarkan undefined supaya `expo start` dan build pengembangan
 * tetap jalan tanpa perlu menyetel apa pun. Yang memastikan build rilis punya
 * angka sungguhan adalah pemeriksaan di workflow dan di `build_aab.sh`, bukan
 * fungsi ini.
 */
export function resolveVersionCode(
  env: Record<string, string | undefined> = process.env,
): number | undefined {
  const mentah = env.RADPRO_VERSION_CODE?.trim();
  if (!mentah) return undefined;

  // Number() menerima "4.5", " 12 ", dan "0x10"; pola ini hanya menerima
  // deretan angka desimal supaya nilai rusak tidak lolos diam-diam.
  if (!/^\d+$/.test(mentah)) {
    throw new Error(
      `RADPRO_VERSION_CODE harus bilangan bulat positif, menerima "${mentah}"`,
    );
  }

  const angka = Number(mentah);
  if (angka < 1 || angka > BATAS_VERSION_CODE_PLAY_STORE) {
    throw new Error(
      `RADPRO_VERSION_CODE di luar rentang yang diterima Play Store ` +
        `(1..${BATAS_VERSION_CODE_PLAY_STORE}), menerima "${mentah}"`,
    );
  }

  return angka;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  const { apiBase, channel } = VARIANT_CONFIG[variant];
  const versionCode = resolveVersionCode();

  const baseUpdates = (config.updates ?? {}) as Record<string, unknown>;
  // Code signing hanya untuk build production. Saat dev/staging Expo CLI
  // butuh private key untuk sign manifest yang di-serve Metro — kita tidak
  // menyimpan private key di repo, jadi field-nya di-drop di non-prod.
  const updates =
    variant === "production"
      ? baseUpdates
      : Object.fromEntries(
          Object.entries(baseUpdates).filter(
            ([key]) =>
              key !== "codeSigningCertificate" && key !== "codeSigningMetadata",
          ),
        );

  const requestHeaders = {
    ...((updates as { requestHeaders?: Record<string, string> })
      ?.requestHeaders ?? {}),
    "expo-channel-name": channel,
  };

  // EAS Build inject GOOGLE_SERVICES_JSON sebagai path file (file env var
  // dengan visibility secret). Local dev fallback ke ./google-services.json
  // di working directory.
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json";
  const googleServicesPlist =
    process.env.GOOGLE_SERVICES_INFO_PLIST ?? "./GoogleService-Info.plist";

  return {
    ...config,
    name: config.name ?? "RADPRO",
    slug: config.slug ?? "netmanager",
    updates: {
      ...updates,
      enabled: variant !== "development",
      url: `${apiBase}/api/mobile/app-update/manifest`,
      requestHeaders,
    },
    android: {
      ...(config.android ?? {}),
      googleServicesFile,
      // Hanya disetel bila lingkungan menyediakannya. `app.json` sengaja tidak
      // memaku versionCode: nilai yang dipaku di sana pernah terbawa ke
      // `Constants.expoConfig` dan membuat aplikasi melaporkan versi yang salah.
      ...(versionCode === undefined ? {} : { versionCode }),
    },
    ios: {
      ...(config.ios ?? {}),
      googleServicesFile: googleServicesPlist,
    },
  };
};
