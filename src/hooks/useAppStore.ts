import { useAppContext } from '../context/AppContext';
import { useAuthContext } from '../client/modules/auth/context/AuthContext';

export function useAppStore() {
  const appContext = useAppContext();
  const authContext = useAuthContext();
  
  return {
    ...appContext,
    ...authContext,
    // AppContext also has user and isLoading, but AuthContext is the source of truth for these
    user: authContext.user,
    isLoading: appContext.isLoading || authContext.isLoading
  };
}
