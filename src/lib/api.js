import { createClient } from '@supabase/supabase-js';

let authClient;
export async function initAuth() {
  if (authClient) return authClient;
  const config = await fetch('/api/config').then(r => r.json());
  if (!config.supabaseUrl || !config.supabaseAnonKey) return null;
  authClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return authClient;
}

export async function signInGoogle() {
  const client = await initAuth();
  if (!client) throw new Error('Authentication configuration pending');
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin, queryParams: { access_type: 'offline', prompt: 'select_account' } }
  });
  if (error) throw error;
}

export async function signOut() {
  const client = await initAuth();
  if (client) await client.auth.signOut();
}

export async function sessionInfo() {
  const client = await initAuth();
  if (!client) return { client: null, session: null };
  const { data: { session } } = await client.auth.getSession();
  return { client, session };
}

export async function api(path, options = {}, withAuth = false) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  const { session } = await sessionInfo();
  if (withAuth && !session) throw new Error('Google login required');
  if (session) headers.Authorization = `Bearer ${session.access_token}`;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const imageUrl = (path, size = 'w500') => path ? `/api/image-proxy?url=${encodeURIComponent(`https://image.tmdb.org/t/p/${size}${path}`)}` : '';
