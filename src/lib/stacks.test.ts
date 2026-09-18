import { StackType } from '../api/types';
import { makeContainer, makeStack } from '../testing/fixtures';
import { countStacks, describeStackResult, groupByStack, mergeStacks, stackOf } from './stacks';

const compose = (project: string) => ({ 'com.docker.compose.project': project });

describe('stackOf', () => {
  it('reads the Compose project label', () => {
    expect(stackOf(makeContainer({ Labels: compose('blog') }))).toBe('blog');
  });

  it('falls back to the Swarm namespace label', () => {
    expect(stackOf(makeContainer({ Labels: { 'com.docker.stack.namespace': 'mesh' } }))).toBe(
      'mesh',
    );
  });

  it('returns null without a stack label', () => {
    expect(stackOf(makeContainer({ Labels: {} }))).toBeNull();
  });
});

describe('groupByStack', () => {
  const containers = [
    makeContainer({ Id: '1', Names: ['/blog-web'], Labels: compose('blog'), State: 'running' }),
    makeContainer({ Id: '2', Names: ['/blog-db'], Labels: compose('blog'), State: 'exited' }),
    makeContainer({ Id: '3', Names: ['/alone'], Labels: {}, State: 'running' }),
    makeContainer({ Id: '4', Names: ['/api'], Labels: compose('api'), State: 'running' }),
  ];

  it('groups by stack, sorts stacks by name and keeps standalone containers last', () => {
    expect(groupByStack(containers)).toMatchObject([
      { title: 'api', ungrouped: false },
      { title: 'blog', ungrouped: false },
      { title: 'Sans stack', ungrouped: true },
    ]);
  });

  it('sorts members by name and counts running ones over the whole stack', () => {
    const [blog] = groupByStack(containers).filter((section) => section.key === 'blog');
    expect(blog.members.map((container) => container.Id)).toEqual(['2', '1']);
    expect(blog.running).toBe(1);
  });

  it('filters the visible rows but keeps every member for stack actions', () => {
    const [blog] = groupByStack(containers, (container) => container.State === 'running').filter(
      (section) => section.key === 'blog',
    );
    expect(blog.data.map((container) => container.Id)).toEqual(['1']);
    expect(blog.members.map((container) => container.Id)).toEqual(['2', '1']);
  });

  it('drops stacks with no visible member', () => {
    const sections = groupByStack(containers, (container) => container.Names[0] === '/alone');
    expect(sections).toMatchObject([{ title: 'Sans stack', ungrouped: true }]);
  });
});

describe('countStacks', () => {
  it('ignores the standalone group', () => {
    const containers = [
      makeContainer({ Id: '1', Labels: compose('blog') }),
      makeContainer({ Id: '2', Labels: {} }),
    ];
    expect(countStacks(groupByStack(containers))).toBe(1);
  });
});

describe('mergeStacks', () => {
  const sections = groupByStack([
    makeContainer({ Id: '1', Names: ['/blog-web'], Labels: compose('blog'), State: 'running' }),
    makeContainer({ Id: '2', Names: ['/blog-db'], Labels: compose('blog'), State: 'exited' }),
    makeContainer({ Id: '3', Names: ['/alone'], Labels: {} }),
    makeContainer({ Id: '4', Names: ['/legacy'], Labels: compose('legacy') }),
  ]);

  it('joins Portainer records and containers on the stack name', () => {
    const merged = mergeStacks(sections, [makeStack({ Name: 'blog' })]);
    expect(merged).toMatchObject([
      { name: 'blog', kind: 'compose', running: 1, total: 2 },
      { name: 'legacy', kind: 'external', stack: null, running: 1, total: 1 },
    ]);
    expect(merged[0].stack?.Name).toBe('blog');
    expect(merged[0].section?.key).toBe('blog');
  });

  it('lists a Portainer stack without containers, and tells Swarm from Compose', () => {
    const merged = mergeStacks(
      [],
      [
        makeStack({ Name: 'mesh', Type: StackType.DockerSwarm }),
        makeStack({ Name: 'k8s', Type: StackType.Kubernetes }),
      ],
    );
    expect(merged).toMatchObject([{ name: 'mesh', kind: 'swarm', section: null, total: 0 }]);
  });

  it('never lists the standalone containers as a stack', () => {
    expect(mergeStacks(sections, []).map((o) => o.name)).toEqual(['blog', 'legacy']);
  });
});

describe('describeStackResult', () => {
  const [blog] = groupByStack([makeContainer({ Labels: compose('blog') })]);

  it('counts the successes', () => {
    expect(describeStackResult(blog, 'start', { succeeded: 2, failures: [] })).toEqual({
      title: 'blog',
      message: '2 conteneurs démarrés.',
    });
  });

  it('details each failure', () => {
    const { message } = describeStackResult(blog, 'stop', {
      succeeded: 1,
      failures: [{ name: 'db', message: 'refusé' }],
    });
    expect(message).toBe('1 conteneurs arrêtés, 1 en échec.\n\n• db : refusé');
  });
});
