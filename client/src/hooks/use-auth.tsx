import { createContext, useContext, ReactNode, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SafeUser } from '@shared/schema';

interface AuthContextType {
  user: SafeUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<SafeUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading } = useQuery<SafeUser | null>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 0, // always revalidate session on mount
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Login failed");
      }
      return res.json() as Promise<SafeUser>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/me"], data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/me"], null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "/api/me" });
    },
  });

  const login = useCallback(
    async (username: string, password: string) => loginMutation.mutateAsync({ username, password }),
    [loginMutation]
  );

  const logout = useCallback(
    async () => { await logoutMutation.mutateAsync(); },
    [logoutMutation]
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
