/**
 * In-memory stand-in for `expo-secure-store`, to install with
 * `jest.mock('expo-secure-store', () => jest.requireActual(...).secureStoreMock)`.
 * Tests reset `memory` between cases and can read what was written.
 */
export const memory = new Map<string, string>();

export const secureStoreMock = {
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  setItemAsync: jest.fn((key: string, value: string) => {
    memory.set(key, value);
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) => Promise.resolve(memory.get(key) ?? null)),
  deleteItemAsync: jest.fn((key: string) => {
    memory.delete(key);
    return Promise.resolve();
  }),
};
