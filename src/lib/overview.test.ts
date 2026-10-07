import { makeContainer } from '../testing/fixtures';
import type { StackOverview } from './stacks';
import {
  containerHealth,
  containerProblems,
  countContainers,
  countStackStates,
  exitCode,
} from './overview';

describe('containerHealth', () => {
  it('reads the health Docker appends to the status', () => {
    expect(containerHealth(makeContainer({ Status: 'Up 2 hours (healthy)' }))).toBe('healthy');
    expect(containerHealth(makeContainer({ Status: 'Up 5 min (unhealthy)' }))).toBe('unhealthy');
    expect(containerHealth(makeContainer({ Status: 'Up 3 s (health: starting)' }))).toBe(
      'starting',
    );
    expect(containerHealth(makeContainer({ Status: 'Up 2 hours' }))).toBe('none');
  });
});

describe('exitCode', () => {
  it('parses the code of a stopped container', () => {
    expect(exitCode(makeContainer({ Status: 'Exited (1) 3 hours ago' }))).toBe(1);
    expect(exitCode(makeContainer({ Status: 'Exited (0) 2 days ago' }))).toBe(0);
    expect(exitCode(makeContainer({ Status: 'Up 2 hours' }))).toBeNull();
  });
});

describe('containerProblems', () => {
  const exited = (name: string, code: number) =>
    makeContainer({ Names: [`/${name}`], State: 'exited', Status: `Exited (${code}) 1 hour ago` });

  it('flags unhealthy, looping, crashed and dead containers, most urgent first', () => {
    const problems = containerProblems([
      makeContainer({ Names: ['/ok'], Status: 'Up 2 hours (healthy)' }),
      exited('crashed', 1),
      makeContainer({ Names: ['/zombie'], State: 'dead', Status: 'Dead' }),
      makeContainer({ Names: ['/loop'], State: 'restarting', Status: 'Restarting (1) 5 s ago' }),
      makeContainer({ Names: ['/sick'], Status: 'Up 1 hour (unhealthy)' }),
    ]);
    expect(problems.map((p) => [p.container.Names[0], p.kind])).toEqual([
      ['/sick', 'unhealthy'],
      ['/loop', 'restarting'],
      ['/crashed', 'crashed'],
      ['/zombie', 'dead'],
    ]);
  });

  it('ignores requested stops, but not a SIGKILL', () => {
    const kinds = containerProblems([
      exited('clean', 0),
      exited('sigint', 130),
      exited('sigterm', 143),
      exited('oom', 137),
    ]).map((p) => p.container.Names[0]);
    expect(kinds).toEqual(['/oom']);
  });
});

describe('countContainers', () => {
  it('counts states and health, with containers lacking a healthcheck apart', () => {
    expect(
      countContainers([
        makeContainer({ State: 'running', Status: 'Up (healthy)' }),
        makeContainer({ State: 'running', Status: 'Up (unhealthy)' }),
        makeContainer({ State: 'running', Status: 'Up (health: starting)' }),
        makeContainer({ State: 'exited', Status: 'Exited (0) 1 day ago' }),
      ]),
    ).toEqual({
      total: 4,
      running: 3,
      stopped: 1,
      healthy: 1,
      unhealthy: 1,
      starting: 1,
      unchecked: 1,
    });
  });
});

describe('countStackStates', () => {
  const stack = (running: number, total: number) => ({ running, total }) as StackOverview;

  it('splits complete, partial and stopped stacks', () => {
    expect(countStackStates([stack(2, 2), stack(1, 3), stack(0, 2), stack(0, 0)])).toEqual({
      total: 4,
      complete: 1,
      partial: 1,
      stopped: 2,
    });
  });
});
