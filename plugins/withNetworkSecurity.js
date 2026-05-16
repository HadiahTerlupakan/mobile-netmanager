const {
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MAIN_NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <!-- Izinkan cleartext untuk loopback/emulator saat ada build release yang
         debug-mode. Production traffic ke staging.radpro.id atau radpro.id tetap
         HTTPS karena base-config strict. -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">localhost</domain>
        <domain includeSubdomains="false">10.0.2.2</domain>
        <domain includeSubdomains="false">127.0.0.1</domain>
    </domain-config>
</network-security-config>
`;

const DEBUG_NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<!--
  Debug-only override. Resource merger menimpa versi main saat build debug
  variant, sehingga Metro dev server di IP LAN (192.168.x.x, 10.x.x.x) bisa
  diakses tanpa HTTPS. Release tetap memakai versi strict di src/main.
-->
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

const DEBUG_VARIANTS = ['debug', 'debugOptimized'];

function writeXml(dir, contents) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'network_security_config.xml'), contents);
}

module.exports = function withNetworkSecurity(config) {
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (mainApplication) {
      mainApplication.$['android:networkSecurityConfig'] =
        '@xml/network_security_config';
    }
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const appDir = path.join(config.modRequest.platformProjectRoot, 'app');

      writeXml(
        path.join(appDir, 'src', 'main', 'res', 'xml'),
        MAIN_NETWORK_SECURITY_XML,
      );

      for (const variant of DEBUG_VARIANTS) {
        writeXml(
          path.join(appDir, 'src', variant, 'res', 'xml'),
          DEBUG_NETWORK_SECURITY_XML,
        );
      }

      return config;
    },
  ]);

  return config;
};
