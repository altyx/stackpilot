import { render, screen } from '@testing-library/react-native';
import { theme } from '../theme';
import { EmptyState } from './EmptyState';
import { Loader } from './Loader';
import { NumberedStep } from './NumberedStep';
import { ReleaseCard } from './ReleaseCard';
import { Row } from './Row';
import { StatusDot } from './StatusDot';
import { UsageBadge } from './UsageBadge';

describe('UsageBadge', () => {
  it('counts the containers using the resource', () => {
    render(<UsageBadge usedBy={['web', 'worker']} />);
    expect(screen.getByText('used · 2')).toBeOnTheScreen();
  });

  it('flags unused resources', () => {
    render(<UsageBadge usedBy={[]} />);
    expect(screen.getByText('unused')).toBeOnTheScreen();
  });
});

describe('StatusDot', () => {
  it('colours running containers green and unknown states grey', () => {
    render(<StatusDot state="running" />);
    expect(screen.root).toHaveStyle({ backgroundColor: theme.colors.success });
    screen.rerender(<StatusDot state="whatever" />);
    expect(screen.root).toHaveStyle({ backgroundColor: theme.colors.textMuted });
  });
});

describe('EmptyState', () => {
  it('shows its title and subtitle', () => {
    render(<EmptyState title="No containers" subtitle="Nothing matches this filter." />);
    expect(screen.getByText('No containers')).toBeOnTheScreen();
    expect(screen.getByText('Nothing matches this filter.')).toBeOnTheScreen();
  });
});

describe('Loader', () => {
  it('shows its label', () => {
    render(<Loader label="Loading…" />);
    expect(screen.getByText('Loading…')).toBeOnTheScreen();
  });
});

describe('Row', () => {
  it('shows a label and its value', () => {
    render(<Row label="ID" value="abcdef012345" />);
    expect(screen.getByText('ID')).toBeOnTheScreen();
    expect(screen.getByText('abcdef012345')).toBeOnTheScreen();
  });
});

describe('ReleaseCard', () => {
  const release = { version: '1.2.0', date: 'January 1, 2026', changes: ['Added A', 'Fixed B'] };

  it('lists the notes of a release', () => {
    render(<ReleaseCard release={release} installed={false} />);
    expect(screen.getByText('Version 1.2.0')).toBeOnTheScreen();
    expect(screen.getByText('January 1, 2026')).toBeOnTheScreen();
    expect(screen.getByText('Added A')).toBeOnTheScreen();
    expect(screen.getByText('Fixed B')).toBeOnTheScreen();
    expect(screen.queryByText('Installed')).toBeNull();
  });

  it('marks the installed version', () => {
    render(<ReleaseCard release={release} installed />);
    expect(screen.getByText('Installed')).toBeOnTheScreen();
  });
});

describe('NumberedStep', () => {
  it('numbers its instruction', () => {
    render(<NumberedStep n={2} text="Paste the token." />);
    expect(screen.getByText('2')).toBeOnTheScreen();
    expect(screen.getByText('Paste the token.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
  });

  it('shows the command to type, copyable', () => {
    render(<NumberedStep n={1} text="Get the authority:" code="mkcert -CAROOT" />);
    expect(screen.getByText('mkcert -CAROOT')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeOnTheScreen();
  });
});
