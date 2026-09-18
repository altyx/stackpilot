import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { groupByStack, mergeStacks } from '../lib/stacks';
import { makeContainer, makeStack } from '../testing/fixtures';
import { StackCard } from './StackCard';

jest.mock('expo-router', () => ({ Link: ({ children }: { children: ReactNode }) => children }));

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
    expect(screen.getByText('1/2 en cours')).toBeOnTheScreen();
    expect(screen.getByText(/^Créée le 16\/09\/2026 .* par admin$/)).toBeOnTheScreen();
    expect(screen.getByText('Git · main · mise à jour auto toutes les 5m')).toBeOnTheScreen();
  });

  it('flags a stack Portainer never deployed', () => {
    const [overview] = mergeStacks(sections, []);
    render(<StackCard endpointId={1} overview={overview} />);
    expect(screen.getByText('Externe')).toBeOnTheScreen();
    expect(screen.getByText('Déployée hors de Portainer')).toBeOnTheScreen();
  });

  it('says when a Portainer stack has no container left', () => {
    const [overview] = mergeStacks(
      [],
      [makeStack({ Name: 'blog', CreationDate: 0, CreatedBy: '' })],
    );
    render(<StackCard endpointId={1} overview={overview} />);
    expect(screen.getByText('Aucun conteneur')).toBeOnTheScreen();
    expect(screen.getByText('Gérée par Portainer')).toBeOnTheScreen();
  });
});
