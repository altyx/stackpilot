import { fireEvent, render, screen } from '@testing-library/react-native';
import { groupByStack } from '../lib/stacks';
import { makeContainer } from '../testing/fixtures';
import { StackHeader } from './StackHeader';
import { StackMemberList } from './StackMemberList';

const compose = { 'com.docker.compose.project': 'blog' };
const [section] = groupByStack([
  makeContainer({ Id: '1', Names: ['/blog-web'], Labels: compose }),
  makeContainer({ Id: '2', Names: ['/blog-db'], Labels: compose, State: 'exited' }),
]);

describe('StackHeader', () => {
  it('shows the title, the running count and the actions button', () => {
    const onPressActions = jest.fn();
    render(
      <StackHeader
        section={section}
        busy={false}
        disabled={false}
        onPressActions={onPressActions}
      />,
    );
    expect(screen.getByText('blog')).toBeOnTheScreen();
    expect(screen.getByText('1/2 en cours')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Actions sur la stack blog' }));
    expect(onPressActions).toHaveBeenCalledWith(section);
  });

  it('disables the actions while another one runs', () => {
    render(<StackHeader section={section} busy={false} disabled onPressActions={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Actions sur la stack blog' })).toBeDisabled();
  });

  it('replaces the button with a spinner while its own action runs', () => {
    render(<StackHeader section={section} busy disabled onPressActions={jest.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers no action on standalone containers', () => {
    const [alone] = groupByStack([makeContainer({ Labels: {} })]);
    render(
      <StackHeader section={alone} busy={false} disabled={false} onPressActions={jest.fn()} />,
    );
    expect(screen.getByText('Sans stack')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('StackMemberList', () => {
  const members = (count: number) =>
    groupByStack(
      Array.from({ length: count }, (_, index) =>
        makeContainer({ Id: String(index), Names: [`/c${index}`], Labels: compose }),
      ),
    )[0];

  it('lists every member of a small stack', () => {
    render(<StackMemberList section={members(2)} />);
    expect(screen.getByText('c0')).toBeOnTheScreen();
    expect(screen.getByText('c1')).toBeOnTheScreen();
    expect(screen.queryByText(/autre/)).toBeNull();
  });

  it('summarises beyond six members', () => {
    render(<StackMemberList section={members(8)} />);
    expect(screen.getByText('c5')).toBeOnTheScreen();
    expect(screen.queryByText('c6')).toBeNull();
    expect(screen.getByText('et 2 autres')).toBeOnTheScreen();

    screen.rerender(<StackMemberList section={members(7)} />);
    expect(screen.getByText('et 1 autre')).toBeOnTheScreen();
  });
});
