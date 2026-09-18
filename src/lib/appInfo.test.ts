import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { appVersion, diagnostics, versionLine } from './appInfo';

// `__esModule` makes the namespace imports share the mock objects with the
// module under test, so the mutations below are seen by it.
jest.mock('expo-application', () => ({
  __esModule: true,
  nativeApplicationVersion: '1.2.3',
  nativeBuildVersion: '45',
}));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: null } }));
jest.mock('expo-device', () => ({
  __esModule: true,
  osName: 'iOS',
  osVersion: '19.0',
  modelName: 'iPhone 17',
}));

const application = Application as {
  nativeApplicationVersion: string | null;
  nativeBuildVersion: string | null;
};
const constants = Constants as unknown as {
  expoConfig: { version?: string; extra?: { build?: { commit?: string | null } } } | null;
};

beforeEach(() => {
  application.nativeApplicationVersion = '1.2.3';
  application.nativeBuildVersion = '45';
  constants.expoConfig = { version: '9.9.9', extra: { build: { commit: 'abc1234' } } };
});

describe('appVersion', () => {
  it('reads the native version first', () => {
    expect(appVersion()).toBe('1.2.3');
  });

  it('falls back to the config version, then to a placeholder', () => {
    application.nativeApplicationVersion = null;
    expect(appVersion()).toBe('9.9.9');
    constants.expoConfig = null;
    expect(appVersion()).toBe('?');
  });
});

describe('versionLine', () => {
  it('joins version, build number and commit', () => {
    expect(versionLine()).toBe('StackPilot 1.2.3 (45) · abc1234');
  });

  it('omits what is missing', () => {
    application.nativeBuildVersion = null;
    constants.expoConfig = { version: '9.9.9' };
    expect(versionLine()).toBe('StackPilot 1.2.3');
  });
});

describe('diagnostics', () => {
  it('adds the device on a second line', () => {
    expect(diagnostics()).toBe('StackPilot 1.2.3 (45) · abc1234\niOS 19.0 · iPhone 17');
  });
});
