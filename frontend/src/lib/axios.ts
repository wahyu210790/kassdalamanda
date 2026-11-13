import axios from 'axios';

const isDev = import.meta.env.DEV;

export const baseURL = isDev
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'https://api.storytech.id/api');

if (isDev && baseURL.includes('storytech.id')) {
  throw new Error('Mode dev tidak boleh memakai API live.');
}

export const csrfCookieURL = isDev
  ? '/sanctum/csrf-cookie'
  : (baseURL.replace(/\/api\/?$/, '') + '/sanctum/csrf-cookie');

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Penting untuk cookie Sanctum
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export async function siapkanCsrfCookie(): Promise<void> {
  if (import.meta.env.DEV) {
    try {
      await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
    } catch (err) {
      console.warn('Gagal mengambil CSRF cookie di mode dev, lanjut login token:', err);
    }
    return;
  }

  await api.get(csrfCookieURL);
}
