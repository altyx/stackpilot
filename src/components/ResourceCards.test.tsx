import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { makeContainer, makeEndpoint, makeImage, makeVolume } from '../testing/fixtures';
import { ContainerRow } from './ContainerRow';
import { EndpointCard } from './EndpointCard';
import { ImageCard } from './ImageCard';
import { VolumeCard } from './VolumeCard';

// Links need a navigator; these cards only need their content rendered.
jest.mock('expo-router', () => ({ Link: ({ children }: { children: ReactNode }) => children }));
// The image status needs a session and a query client: an idle query here.
jest.mock('../api/hooks', () => ({
  useImageStatus: () => ({ data: undefined, isError: false, isPending: true, fetchStatus: 'idle' }),
}));

const created = Date.UTC(2026, 8, 16, 14, 5) / 1000;

describe('VolumeCard', () => {
  it('shows the volume, its driver and date, and who uses it', () => {
    const volume = makeVolume({
      Name: 'pgdata',
      Driver: 'local',
      CreatedAt: '2026-09-16T14:05:00Z',
      Mountpoint: '/var/lib/docker/volumes/pgdata/_data',
    });
    render(<VolumeCard usage={{ item: volume, usedBy: ['db', 'backup'] }} />);
    expect(screen.getByText('pgdata')).toBeOnTheScreen();
    expect(screen.getByText(/^local · 16 Sep 2026/)).toBeOnTheScreen();
    expect(screen.getByText('db, backup')).toBeOnTheScreen();
    expect(screen.getByText('/var/lib/docker/volumes/pgdata/_data')).toBeOnTheScreen();
    expect(screen.getByText('used · 2')).toBeOnTheScreen();
  });
});

describe('ImageCard', () => {
  it('shows the tag, size, id, date and tag count', () => {
    const image = makeImage({
      Id: 'sha256:abcdef0123456789',
      RepoTags: ['app:1', 'app:latest', 'app:stable'],
      Size: 1_500,
      Created: created,
    });
    render(<ImageCard usage={{ item: image, usedBy: ['web'] }} />);
    expect(screen.getByText('app:1')).toBeOnTheScreen();
    expect(screen.getByText(/^1.5 kB · abcdef012345 · 16 Sep 2026/)).toBeOnTheScreen();
    expect(screen.getByText('3 tags')).toBeOnTheScreen();
    expect(screen.getByText('web')).toBeOnTheScreen();
    expect(screen.queryByText('Untagged image (dangling)')).toBeNull();
  });

  it('flags dangling images by their short id', () => {
    const image = makeImage({ Id: 'sha256:abcdef0123456789', RepoTags: null, Created: created });
    render(<ImageCard usage={{ item: image, usedBy: [] }} />);
    expect(screen.getByText('abcdef012345')).toBeOnTheScreen();
    expect(screen.getByText('Untagged image (dangling)')).toBeOnTheScreen();
    expect(screen.getByText('unused')).toBeOnTheScreen();
  });

  it('offers deletion only when given a handler', () => {
    const image = makeImage({ RepoTags: ['app:1'] });
    const onDelete = jest.fn();
    render(<ImageCard usage={{ item: image, usedBy: [] }} onDelete={onDelete} />);
    fireEvent.press(screen.getByRole('button', { name: 'Delete app:1' }));
    expect(onDelete).toHaveBeenCalledTimes(1);

    screen.rerender(<ImageCard usage={{ item: image, usedBy: [] }} />);
    expect(screen.queryByRole('button', { name: 'Delete app:1' })).toBeNull();
  });
});

describe('EndpointCard', () => {
  it('summarises an online Docker environment', () => {
    const endpoint = makeEndpoint({
      Name: 'homelab',
      URL: 'tcp://10.0.0.2:2375',
      Snapshots: [{ RunningContainerCount: 3, StoppedContainerCount: 1, ImageCount: 5 }],
    });
    render(<EndpointCard endpoint={endpoint} current={false} />);
    expect(screen.getByText('homelab')).toBeOnTheScreen();
    expect(screen.getByText('Online')).toBeOnTheScreen();
    expect(screen.getByText('tcp://10.0.0.2:2375')).toBeOnTheScreen();
    expect(screen.getByText('3 running · 1 stopped · 5 images')).toBeOnTheScreen();
  });

  it('explains what it cannot show', () => {
    render(<EndpointCard endpoint={makeEndpoint({ URL: '', Status: 2 })} current={false} />);
    expect(screen.getByText('Offline')).toBeOnTheScreen();
    expect(screen.getByText('local socket')).toBeOnTheScreen();
    expect(screen.getByText('No snapshot available')).toBeOnTheScreen();

    screen.rerender(<EndpointCard endpoint={makeEndpoint({ Type: 5 })} current={false} />);
    expect(screen.getByText(/Kubernetes environment/)).toBeOnTheScreen();
  });
});

describe('ContainerRow', () => {
  it('shows the name, image and status', () => {
    const container = makeContainer({ Names: ['/web'], Image: 'nginx:1.27', Status: 'Up 2 hours' });
    render(<ContainerRow endpointId={1} container={container} />);
    expect(screen.getByText('web')).toBeOnTheScreen();
    expect(screen.getByText('nginx:1.27')).toBeOnTheScreen();
    expect(screen.getByText('Up 2 hours')).toBeOnTheScreen();
  });
});
