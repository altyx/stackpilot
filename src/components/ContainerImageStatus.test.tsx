import { render, screen } from '@testing-library/react-native';
import { useImageStatus } from '../api/hooks';
import { ContainerImageStatus } from './ContainerImageStatus';
import { ImageStatusIcon } from './ImageStatusIcon';

jest.mock('../api/hooks', () => ({ useImageStatus: jest.fn() }));

type Query = ReturnType<typeof useImageStatus>;
const query = (partial: Partial<Query>) =>
  jest.mocked(useImageStatus).mockReturnValue({
    data: undefined,
    isError: false,
    isPending: false,
    fetchStatus: 'idle',
    ...partial,
  } as Query);

describe('ImageStatusIcon', () => {
  it('describes each status for screen readers', () => {
    render(<ImageStatusIcon status="updated" />);
    expect(screen.getByLabelText('Image à jour')).toBeOnTheScreen();
    screen.rerender(<ImageStatusIcon status="outdated" />);
    expect(screen.getByLabelText("Mise à jour de l'image disponible")).toBeOnTheScreen();
  });

  it('spells the status out when asked', () => {
    render(<ImageStatusIcon status="outdated" withLabel />);
    expect(screen.getByText("Mise à jour de l'image disponible")).toBeOnTheScreen();
  });
});

describe('ContainerImageStatus', () => {
  it('renders nothing while the indicator is unavailable', () => {
    query({ isPending: true, fetchStatus: 'idle' });
    render(<ContainerImageStatus endpointId={1} containerId="abc" />);
    expect(screen.toJSON()).toBeNull();
  });

  it('shows the icon once Portainer has answered', () => {
    query({ data: 'outdated' });
    render(<ContainerImageStatus endpointId={1} containerId="abc" />);
    expect(screen.getByLabelText("Mise à jour de l'image disponible")).toBeOnTheScreen();
  });

  it('keeps an undecided status off the card but names it on the detail screen', () => {
    query({ isError: true });
    render(<ContainerImageStatus endpointId={1} containerId="abc" />);
    expect(screen.toJSON()).toBeNull();

    screen.rerender(<ContainerImageStatus endpointId={1} containerId="abc" withLabel />);
    expect(screen.getByText("Statut de l'image indéterminé")).toBeOnTheScreen();
  });

  it('shows the check in progress on the detail screen only', () => {
    query({ isPending: true, fetchStatus: 'fetching' });
    render(<ContainerImageStatus endpointId={1} containerId="abc" withLabel />);
    expect(screen.getByText("Vérification de l'image…")).toBeOnTheScreen();
  });
});
