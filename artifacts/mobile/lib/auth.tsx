import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "kuotflow_auth_token";

function getBaseURL(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:8080";
}

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

type AuthContextType = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: AuthUser | null;
  getToken: () => Promise<string | null>;
  signIn: (email: string, password: string, bearerToken?: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchSession(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${getBaseURL()}/api/auth/get-session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          const sessionUser = await fetchSession(stored);
          if (sessionUser) {
            setToken(stored);
            setUser(sessionUser);
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
          }
        }
      } finally {
        setIsLoaded(true);
      }
    }
    init();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, bearerToken?: string): Promise<{ error?: string }> => {
      // If a bearer token is supplied directly (e.g. from Google OAuth callback),
      // validate it and persist it without calling the sign-in endpoint.
      if (bearerToken) {
        try {
          const sessionUser = await fetchSession(bearerToken);
          if (!sessionUser) {
            return { error: "Invalid token from social login. Please try again." };
          }
          await SecureStore.setItemAsync(TOKEN_KEY, bearerToken);
          setToken(bearerToken);
          setUser(sessionUser);
          return {};
        } catch {
          return { error: "Network error. Check your connection and try again." };
        }
      }

      try {
        const res = await fetch(`${getBaseURL()}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: data?.message ?? data?.error ?? "Sign in failed" };
        }
        const authToken: string | undefined = data?.token ?? data?.session?.token;
        if (!authToken) {
          return { error: "No session token returned. Please try again." };
        }
        await SecureStore.setItemAsync(TOKEN_KEY, authToken);
        setToken(authToken);
        setUser(data.user ?? null);
        return {};
      } catch {
        return { error: "Network error. Check your connection and try again." };
      }
    },
    [],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string,
    ): Promise<{ error?: string }> => {
      try {
        const res = await fetch(`${getBaseURL()}/api/auth/sign-up/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: data?.message ?? data?.error ?? "Sign up failed" };
        }
        const authToken: string | undefined = data?.token ?? data?.session?.token;
        if (!authToken) {
          return { error: "No session token returned. Please try again." };
        }
        await SecureStore.setItemAsync(TOKEN_KEY, authToken);
        setToken(authToken);
        setUser(data.user ?? null);
        return {};
      } catch {
        return { error: "Network error. Check your connection and try again." };
      }
    },
    [],
  );

  const signOut = useCallback(async (): Promise<void> => {
    const currentToken = token;
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    if (currentToken) {
      try {
        await fetch(`${getBaseURL()}/api/auth/sign-out`, {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch {
        // best-effort sign-out on server
      }
    }
  }, [token]);

  const getToken = useCallback(async (): Promise<string | null> => token, [token]);

  return (
    <AuthContext.Provider
      value={{ isLoaded, isSignedIn: !!user, user, getToken, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
