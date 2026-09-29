const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

/**
 * Makes the Android app trust the certificate authorities the user installs
 * on the device, on top of the system ones.
 *
 * Since Android 7, apps ignore user-installed CAs unless they opt in. iOS
 * trusts them as soon as the user enables full trust, so without this plugin
 * a Portainer instance signed by a private CA (mkcert, homelab PKI) would
 * work on iPhone and fail on Android. Only CAs the user installed themselves
 * become trusted: certificate validation stays on.
 *
 * A network security config overrides `usesCleartextTraffic`, which Expo sets
 * on the debug manifests only so the dev build can reach Metro. The same
 * split is kept here with one file per build variant: cleartext stays off in
 * release, as it was, and on in debug.
 */
const RESOURCE_NAME = 'network_security_config';

/** Variants whose manifest Expo generates with `usesCleartextTraffic="true"`. */
const CLEARTEXT_VARIANTS = ['debug', 'debugOptimized'];

function networkSecurityConfig({ cleartext }) {
  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="${cleartext}">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;
}

function setNetworkSecurityConfig(manifest) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  const existing = application.$['android:networkSecurityConfig'];
  if (existing && existing !== `@xml/${RESOURCE_NAME}`) {
    // Another plugin owns it: merging two configs silently would drop rules.
    throw new Error(
      `withUserCertificates : android:networkSecurityConfig déjà défini (${existing}).`,
    );
  }
  application.$['android:networkSecurityConfig'] = `@xml/${RESOURCE_NAME}`;
  return manifest;
}

function writeConfigs(appDir) {
  const variants = [
    { sourceSet: 'main', cleartext: false },
    ...CLEARTEXT_VARIANTS.map((sourceSet) => ({ sourceSet, cleartext: true })),
  ];
  for (const { sourceSet, cleartext } of variants) {
    const dir = path.join(appDir, 'src', sourceSet, 'res', 'xml');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${RESOURCE_NAME}.xml`), networkSecurityConfig({ cleartext }));
  }
}

module.exports = function withUserCertificates(config) {
  config = withAndroidManifest(config, (mod) => {
    mod.modResults = setNetworkSecurityConfig(mod.modResults);
    return mod;
  });
  return withDangerousMod(config, [
    'android',
    (mod) => {
      writeConfigs(path.join(mod.modRequest.platformProjectRoot, 'app'));
      return mod;
    },
  ]);
};

module.exports.networkSecurityConfig = networkSecurityConfig;
module.exports.setNetworkSecurityConfig = setNetworkSecurityConfig;
module.exports.writeConfigs = writeConfigs;
