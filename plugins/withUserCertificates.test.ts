import fs from 'fs';
import os from 'os';
import path from 'path';

// Plain CommonJS module run by `expo prebuild`: typed here only as far as the test needs.
type Manifest = { manifest: { application?: { $: Record<string, string> }[] } };
const plugin = jest.requireActual<{
  networkSecurityConfig: (options: { cleartext: boolean }) => string;
  setNetworkSecurityConfig: (manifest: Manifest) => Manifest;
  writeConfigs: (appDir: string) => void;
}>('./withUserCertificates');

function manifest(attributes: Record<string, string> = {}): Manifest {
  return {
    manifest: { application: [{ $: { 'android:name': '.MainApplication', ...attributes } }] },
  };
}

describe('withUserCertificates', () => {
  it('trusts user-installed authorities alongside the system ones', () => {
    const xml = plugin.networkSecurityConfig({ cleartext: false });
    expect(xml).toContain('<certificates src="system" />');
    expect(xml).toContain('<certificates src="user" />');
    expect(xml).toContain('cleartextTrafficPermitted="false"');
  });

  it('points the application at the config', () => {
    const result = plugin.setNetworkSecurityConfig(manifest());
    expect(result.manifest.application?.[0].$['android:networkSecurityConfig']).toBe(
      '@xml/network_security_config',
    );
  });

  it('refuses to overwrite a config another plugin set', () => {
    expect(() =>
      plugin.setNetworkSecurityConfig(
        manifest({ 'android:networkSecurityConfig': '@xml/other_config' }),
      ),
    ).toThrow(/déjà défini/);
  });

  it('keeps cleartext off in release and on for the debug builds that reach Metro', () => {
    const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'user-certificates-'));
    plugin.writeConfigs(appDir);
    const read = (sourceSet: string) =>
      fs.readFileSync(
        path.join(appDir, 'src', sourceSet, 'res', 'xml', 'network_security_config.xml'),
        'utf8',
      );
    expect(read('main')).toContain('cleartextTrafficPermitted="false"');
    expect(read('debug')).toContain('cleartextTrafficPermitted="true"');
    expect(read('debugOptimized')).toContain('cleartextTrafficPermitted="true"');
    fs.rmSync(appDir, { recursive: true });
  });
});
