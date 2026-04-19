import React, { createContext, useEffect, useMemo, useState } from "react";
import { getAuthToken, setAuthToken } from "../services/authTokenStore";
import {
  clearOidcSession,
  completeOidcLoginIfNeeded,
  isOidcConfigured,
  startOidcLogin
} from "../services/oidcService";
import { inspectJwtToken } from "../services/jwtDiagnostics";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      try {
        const exchangedToken = await completeOidcLoginIfNeeded();
        const token = exchangedToken || getAuthToken();

        if (token) {
          const diagnostics = inspectJwtToken(token);
          const payload = diagnostics.payload || {};
          if (isMounted) {
            setUser({
              sub: payload.sub || "unknown",
              name: payload.name || payload.preferred_username || "Authenticated User",
              roles: diagnostics.checks?.roles || []
            });
          }
        }
      } catch (_error) {
        if (isMounted) {
          setUser(null);
          setAuthToken("");
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      authLoading,
      oidcConfigured: isOidcConfigured(),
      signInWithOidc: async () => startOidcLogin(),
      signIn: (nextUser, token) => {
        setUser(nextUser);
        setAuthToken(token);
      },
      signOut: () => {
        setUser(null);
        clearOidcSession();
      }
    }),
    [user, authLoading]
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}
