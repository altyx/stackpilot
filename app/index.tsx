import { Redirect } from 'expo-router';
import { useEndpoints } from '../src/api/hooks';
import { useAuth } from '../src/auth/AuthContext';
import { Loader } from '../src/components/Loader';
import { pickHomeEndpoint } from '../src/lib/endpoints';
import { useCurrentEndpoint } from '../src/navigation/CurrentEndpoint';

/**
 * Startup routing: the last environment's containers, failing that the first
 * reachable environment's, failing that the environment list — which also
 * explains a loading error.
 */
export default function Index() {
  const { session, isRestoring } = useAuth();
  const currentEndpoint = useCurrentEndpoint();
  const endpoints = useEndpoints();

  if (isRestoring) return <Loader />;
  if (!session) return <Redirect href="/login" />;
  if (currentEndpoint.isRestoring || endpoints.isPending) return <Loader />;

  const home = endpoints.data
    ? pickHomeEndpoint(endpoints.data, currentEndpoint.endpointId)
    : undefined;
  return <Redirect href={home ? `/endpoints/${home.Id}` : '/endpoints'} />;
}
