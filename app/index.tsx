import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { Loader } from '../src/components/ui';

/** Aiguillage au démarrage, une fois la session persistée relue. */
export default function Index() {
  const { session, isRestoring } = useAuth();
  if (isRestoring) return <Loader />;
  return <Redirect href={session ? '/endpoints' : '/login'} />;
}
