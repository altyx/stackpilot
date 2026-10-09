import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { groupByStack, mergeStacks } from '../lib/stacks';
import { makeContainer, makeStack } from '../testing/fixtures';
import { useStackImageStatus } from '../api/hooks';
import { StackCard } from './StackCard';

jest.mock('expo-router', () => ({ Link: ({ children }: { children: ReactNode }) => children }));
// The status needs a session and a query client: an idle query unless a test says otherwise.
jest.mock('../api/hooks', () => ({ useStackImageStatus: jest.fn() }));

const idle = { data: undefined, isError: false, isPending: true, fetchStatus: 'idle' };

beforeEach(() => {
  jest.mocked(useStackImageStatus).mockReturnValue(idle as never);
});

const compose = { 'com.docker.compose.project': 'blog' };
const sections = groupByStack([
  makeContainer({ Id: '1', Labels: compose, State: 'running' }),
  makeContainer({ Id: '2', Labels: compose, State: 'exited' }),
]);
const created = Date.UTC(2026, 8, 16, 14, 5) / 1000;

describe('StackCard', () => {
  it('shows a Portainer stack with its origin and Git source', () => {
    const [overview] = mergeStacks(sections, [
      makeStack({
        Name: 'blog',
        CreationDate: created,
        CreatedBy: 'admin',
        GitConfig: {
          URL: 'https://git.lan/blog',
          ReferenceName: 'refs/heads/main',
          ConfigFilePath: 'compose.yml',
        },
        AutoUpdate: { Interval: '5m' },
      }),
    ]);
    render(<StackCard endpointId={1} overview={overview} />);
    expect(screen.getByText('blog')).toBeOnTheScreen();
    expect(screen.getByText('Compose')).toBeOnTheScreen();
    expect(screen.getByText('1/2 running')).toBeOnTheScreen();
    expect(screen.getByText(/^Created 16 Sep 2026, .* by admin$/)).toBeOnTheScreen();
    expect(screen.getByText('Git · main · auto update every 5m')).toBeOnTheScreen();
  });

  it('flags a stack Portainer never deployed', () => {
    const [overview] = mergeStacks(sections, []);
    render(<StackCard endpointId={1} overview={overview} />);
    expect(screen.getByText('External')).toBeOnTheScreen();
    expect(screen.getByText('Deployed outside Portainer')).toBeOnTheScreen();
  });

  it('says when a Portainer stack has no container left', () => {
    const [overview] = mergeStacks(
      [],
      [makeStack({ Name: 'blog', CreationDate: 0, CreatedBy: '' })],
    );
    render(<StackCard endpointId={1} overview={overview} />);
    expect(screen.getByText('No containers')).toBeOnTheScreen();
    expect(screen.getByText('Managed by Portainer')).toBeOnTheScreen();
  });

  it("shows the stack's image status once Portainer reports it", () => {
    jest.mocked(useStackImageStatus).mockReturnValue({
      data: 'outdated',
      isError: false,
      isPending: false,
      fetchStatus: 'idle',
    } as never);
    const [overview] = mergeStacks(sections, [makeStack({ Id: 7, Name: 'blog' })]);
    render(<StackCard endpointId={1} overview={overview} />);
    expect(screen.getByLabelText('Image update available')).toBeOnTheScreen();
    expect(useStackImageStatus).toHaveBeenCalledWith(1, 7);
  });

  it('shows nothing when the images are up to date, not to read as "stack OK"', () => {
    jest.mocked(useStackImageStatus).mockReturnValue({
      data: 'updated',
      isError: false,
      isPending: false,
      fetchStatus: 'idle',
    } as never);
    const [overview] = mergeStacks(sections, [makeStack({ Id: 7, Name: 'blog' })]);
    render(<StackCard endpointId={1} overview={overview} />);
    expect(screen.queryByLabelText('Images up to date')).toBeNull();
  });

  it('asks nothing for a stack Portainer does not manage', () => {
    const [overview] = mergeStacks(sections, []);
    render(<StackCard endpointId={1} overview={overview} />);
    expect(useStackImageStatus).not.toHaveBeenCalled();
  });
});
