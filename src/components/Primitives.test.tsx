import { render, screen } from '@testing-library/react-native';
import { theme } from '../theme';
import { EmptyState } from './EmptyState';
import { Loader } from './Loader';
import { NotificationStep } from './NotificationStep';
import { ReleaseCard } from './ReleaseCard';
import { Row } from './Row';
import { StatusDot } from './StatusDot';
import { UsageBadge } from './UsageBadge';

describe('UsageBadge', () => {
  it('counts the containers using the resource', () => {
    render(<UsageBadge usedBy={['web', 'worker']} />);
    expect(screen.getByText('utilisé · 2')).toBeOnTheScreen();
  });

  it('flags unused resources', () => {
    render(<UsageBadge usedBy={[]} />);
    expect(screen.getByText('inutilisé')).toBeOnTheScreen();
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
    render(<EmptyState title="Aucun conteneur" subtitle="Aucun résultat pour ce filtre." />);
    expect(screen.getByText('Aucun conteneur')).toBeOnTheScreen();
    expect(screen.getByText('Aucun résultat pour ce filtre.')).toBeOnTheScreen();
  });
});

describe('Loader', () => {
  it('shows its label', () => {
    render(<Loader label="Chargement…" />);
    expect(screen.getByText('Chargement…')).toBeOnTheScreen();
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
  const release = { version: '1.2.0', date: '1 janvier 2026', changes: ['Ajout A', 'Correctif B'] };

  it('lists the notes of a release', () => {
    render(<ReleaseCard release={release} installed={false} />);
    expect(screen.getByText('Version 1.2.0')).toBeOnTheScreen();
    expect(screen.getByText('1 janvier 2026')).toBeOnTheScreen();
    expect(screen.getByText('Ajout A')).toBeOnTheScreen();
    expect(screen.getByText('Correctif B')).toBeOnTheScreen();
    expect(screen.queryByText('Installée')).toBeNull();
  });

  it('marks the installed version', () => {
    render(<ReleaseCard release={release} installed />);
    expect(screen.getByText('Installée')).toBeOnTheScreen();
  });
});

describe('NotificationStep', () => {
  it('numbers its instruction', () => {
    render(<NotificationStep n={2} text="Collez le jeton." />);
    expect(screen.getByText('2')).toBeOnTheScreen();
    expect(screen.getByText('Collez le jeton.')).toBeOnTheScreen();
  });
});
