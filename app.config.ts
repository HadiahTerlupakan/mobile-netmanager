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

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  const { apiBase, channel } = VARIANT_CONFIG[variant];

  return {
    ...config,
    name: config.name ?? "RADPRO",
    slug: config.slug ?? "netmanager",
    updates: {
      ...(config.updates ?? {}),
      enabled: variant !== "development",
      url: `${apiBase}/api/mobile/app-update/manifest`,
      requestHeaders: {
        ...((config.updates as { requestHeaders?: Record<string, string> })
          ?.requestHeaders ?? {}),
        "expo-channel-name": channel,
      },
    },
  };
};
