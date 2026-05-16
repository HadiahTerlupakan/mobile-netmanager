const {
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

module.exports = function withNetworkSecurity(config) {
  // 1. Tambahkan attribute android:networkSecurityConfig di AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (mainApplication) {
      mainApplication.$['android:networkSecurityConfig'] =
        '@xml/network_security_config';
    }
    return config;
  });

  // 2. Generate file res/xml/network_security_config.xml karena prebuild
  //    --clean wipe folder android/, tanpa step ini gradle gagal AAPT.
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      fs.mkdirSync(resDir, { recursive: true });
      fs.writeFileSync(
        path.join(resDir, 'network_security_config.xml'),
        NETWORK_SECURITY_XML,
      );
      return config;
    },
  ]);

  return config;
};
