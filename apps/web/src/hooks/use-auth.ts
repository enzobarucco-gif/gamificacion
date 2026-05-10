'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient, PgdApiError } from '../lib/api-client';
import { useAuthStore } from '../stores/auth.store';

interface TokenPair { access_token: string; refresh_token: string }
interface MeResponse { id: string; email: string; nombre: string; roles: Array<{ rol: string; scope_id: string | null }> }

export function useMe() {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => apiClient.get<MeResponse>('/me'),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const { setTokens, setUser } = useAuthStore();
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiClient.post<TokenPair>('/auth/login', data),
    onSuccess: async (tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token);
      const me = await apiClient.get<MeResponse>('/me');
      setUser({ sub: me.id, email: me.email, nombre: me.nombre, roles: me.roles });
      qc.setQueryData(['me'], me);
      router.push('/dashboard');
    },
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (data: { email: string; password: string; nombre: string }) =>
      apiClient.post<{ message: string }>('/auth/register', data),
    onSuccess: () => router.push('/login?registered=1'),
  });
}

export function useLogout() {
  const { refreshToken, logout } = useAuthStore();
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () =>
      refreshToken
        ? apiClient.post('/auth/logout', { refresh_token: refreshToken })
        : Promise.resolve(),
    onSettled: () => {
      logout();
      qc.clear();
      router.push('/login');
    },
  });
}
