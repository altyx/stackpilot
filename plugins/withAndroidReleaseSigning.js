const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signe les builds Android de release avec la clé d'envoi Play quand elle est
 * fournie, et retombe sur la clé de debug sinon.
 *
 * Le `build.gradle` généré par Expo signe la release avec `debug.keystore`, ce
 * que Google Play refuse. Ce plugin y ajoute une configuration `release` qui lit
 * quatre propriétés Gradle ; en CI elles arrivent par les variables
 * `ORG_GRADLE_PROJECT_STACKPILOT_UPLOAD_*`, sans toucher à `gradle.properties`.
 * En local, sans ces propriétés, `./gradlew bundleRelease` continue de
 * fonctionner avec la clé de debug.
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

  // Le bloc `debug { … }` se ferme sur 8 espaces, `signingConfigs` sur 4.
  const signingConfigs = /(signingConfigs \{\n[\s\S]*?\n {8}\}\n)( {4}\})/;
  if (!signingConfigs.test(contents)) {
    throw new Error("withAndroidReleaseSigning : bloc `signingConfigs` introuvable dans build.gradle.");
  }
  contents = contents.replace(signingConfigs, `$1${RELEASE_SIGNING_CONFIG}$2`);

  // Dans `buildTypes`, seule la release doit changer de clé.
  const releaseBuildType = /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseBuildType.test(contents)) {
    throw new Error("withAndroidReleaseSigning : signature de la release introuvable dans build.gradle.");
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
