import { mapSettled } from './concurrency';

describe('mapSettled', () => {
  it('keeps order, caps calls in flight and turns failures into null', async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await mapSettled([1, 2, 3, 4, 5], 2, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5 * (6 - n)));
      inFlight -= 1;
      if (n === 3) throw new Error('boom');
      return n * 10;
    });
    expect(results).toEqual([10, 20, null, 40, 50]);
    expect(peak).toBe(2);
  });

  it('handles an empty list', async () => {
    await expect(mapSettled([], 4, () => Promise.resolve(1))).resolves.toEqual([]);
  });
});
