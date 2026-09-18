import { renderHook } from '@testing-library/react-native';
import { useLatched } from './useLatched';

describe('useLatched', () => {
  it('keeps the last non-null value while the input is null', () => {
    const { result, rerender } = renderHook((value: string | null) => useLatched(value), {
      initialProps: 'first',
    });
    expect(result.current).toBe('first');

    rerender(null);
    expect(result.current).toBe('first');

    rerender('second');
    expect(result.current).toBe('second');
  });

  it('starts null when nothing has been provided yet', () => {
    const { result } = renderHook((value: string | null) => useLatched(value), {
      initialProps: null,
    });
    expect(result.current).toBeNull();
  });
});
