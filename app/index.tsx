import { Redirect } from 'expo-router';
import { useEndpoints } from '../src/api/hooks';
import { useAuth } from '../src/auth/AuthContext';
import { Loader } from '../src/components/Loader';
import { pickHomeEndpoint } from '../src/lib/endpoints';
import { useCurrentEndpoint } from '../src/navigation/CurrentEndpoint';

/**
 * Aiguillage au démarrage : les conteneurs du dernier environnement consulté,
 * à défaut ceux du premier environnement accessible, à défaut la liste des
 * environnements — qui explique aussi une erreur de chargement.
 */
export default function Index() {
  const { session, isRestoring } = useAuth();
  const currentEndpoint = useCurrentEndpoint();
  const endpoints = useEndpoints();

  if (isRestoring) return <Loader />;
  if (!session) return <Redirect href="/login" />;
  if (currentEndpoint.isRestoring || endpoints.isPending) return <Loader />;

  const home = endpoints.data ? pickHomeEndpoint(endpoints.data, currentEndpoint.endpointId) : undefined;
  return <Redirect href={home ? `/endpoints/${home.Id}` : '/endpoints'} />;
}
