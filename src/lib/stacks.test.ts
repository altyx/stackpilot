import { makeContainer } from '../testing/fixtures';
import { countStacks, groupByStack, stackOf } from './stacks';

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
