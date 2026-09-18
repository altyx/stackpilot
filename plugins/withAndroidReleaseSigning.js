const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signs Android release builds with the Play upload key when it's provided,
 * and falls back to the debug key otherwise.
 *
 * The `build.gradle` Expo generates signs the release with `debug.keystore`,
 * which Google Play rejects. This plugin adds a `release` config that reads
 * four Gradle properties; in CI they arrive via the
 * `ORG_GRADLE_PROJECT_STACKPILOT_UPLOAD_*` variables, without touching
 * `gradle.properties`. Locally, without these properties, `./gradlew
 * bundleRelease` keeps working with the debug key.
 */
const PROPERTY_PREFIX = 'STACKPILOT_UPLOAD_';

const RELEASE_SIGNING_CONFIG = `        release {
            if (project.hasProperty('${PROPERTY_PREFIX}STORE_FILE')) {
                storeFile file(project.property('${PROPERTY_PREFIX}STORE_FILE'))
                storePassword project.property('${PROPERTY_PREFIX}STORE_PASSWORD')
                keyAlias project.property('${PROPERTY_PREFIX}KEY_ALIAS')
                keyPassword project.property('${PROPERTY_PREFIX}KEY_PASSWORD')
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
`;

function addReleaseSigning(contents) {
  if (contents.includes(`${PROPERTY_PREFIX}STORE_FILE`)) return contents;

  // The `debug { … }` block closes at 8 spaces, `signingConfigs` at 4.
  const signingConfigs = /(signingConfigs \{\n[\s\S]*?\n {8}\}\n)( {4}\})/;
  if (!signingConfigs.test(contents)) {
    throw new Error(
      'withAndroidReleaseSigning : bloc `signingConfigs` introuvable dans build.gradle.',
    );
  }
  contents = contents.replace(signingConfigs, `$1${RELEASE_SIGNING_CONFIG}$2`);

  // In `buildTypes`, only the release must change signing key.
  const releaseBuildType =
    /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseBuildType.test(contents)) {
    throw new Error(
      'withAndroidReleaseSigning : signature de la release introuvable dans build.gradle.',
    );
  }
  return contents.replace(releaseBuildType, '$1signingConfig signingConfigs.release');
}

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('withAndroidReleaseSigning : build.gradle attendu en Groovy.');
    }
    mod.modResults.contents = addReleaseSigning(mod.modResults.contents);
    return mod;
  });
};

module.exports.addReleaseSigning = addReleaseSigning;
