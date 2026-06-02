import axios from 'axios';
import { getItemAsync, setItemAsync, deleteItemAsync } from '@/utils/storage';
import { API_BASE_URL } from '@/constants/api';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const refresh = await getItemAsync('refresh_token');
        if (refresh) {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refresh });
          await setItemAsync('access_token', data.access_token);
          await setItemAsync('refresh_token', data.refresh_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(error.config);
        }
      } catch {
        await deleteItemAsync('access_token');
        await deleteItemAsync('refresh_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  register: (email: string, nickname: string, password: string) =>
    api.post('/auth/register', { email, nickname, password }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// Routes
export const routesApi = {
  generate: (params: { lat: number; lon: number; radius_km: number; categories?: string[]; transport_mode?: string; max_points?: number }) =>
    api.post('/routes/generate', params),
  catalog: (limit = 20, offset = 0) => api.get('/routes/catalog', { params: { limit, offset } }),
  get: (id: string) => api.get(`/routes/${id}`),
  save: (id: string) => api.post(`/routes/${id}/save`),
  publish: (id: string) => api.post(`/routes/${id}/publish`),
  share: (id: string) => api.post(`/routes/${id}/share`),
  list: () => api.get('/routes/'),
  delete: (id: string) => api.delete(`/routes/${id}`),
};

// POI
export const poiApi = {
  list: (lat: number, lon: number, radius_km = 5, categories?: string[]) =>
    api.get('/poi/', { params: { lat, lon, radius_km, categories } }),
  get: (id: string) => api.get(`/poi/${id}`),
};

// Feed & Posts
export const feedApi = {
  feed: (cursor?: string, limit = 20) => api.get('/feed/', { params: { cursor, limit } }),
  following: (cursor?: string, limit = 20) => api.get('/feed/following', { params: { cursor, limit } }),
  search: (q: string) => api.get('/posts/search', { params: { q } }),
};

export const postsApi = {
  create: (content: string, photo_url?: string, route_id?: string) =>
    api.post('/posts/', { content, photo_url, route_id }),
  get: (id: string) => api.get(`/posts/${id}`),
  update: (id: string, content: string) => api.put(`/posts/${id}`, { content }),
  delete: (id: string) => api.delete(`/posts/${id}`),
  like: (id: string) => api.post(`/posts/${id}/like`),
  report: (id: string, reason: string) => api.post(`/posts/${id}/report`, { reason }),
  comments: (id: string) => api.get(`/posts/${id}/comments`),
  addComment: (id: string, content: string) => api.post(`/posts/${id}/comment`, { content }),
  deleteComment: (postId: string, commentId: string) => api.delete(`/posts/${postId}/comments/${commentId}`),
};

// Profile
export const profileApi = {
  me: () => api.get('/profile/me'),
  update: (data: Record<string, unknown>) => api.put('/profile/me', data),
  get: (id: string) => api.get(`/profile/${id}`),
  follow: (id: string) => api.post(`/profile/follow/${id}`),
  unfollow: (id: string) => api.delete(`/profile/follow/${id}`),
  archive: () => api.get('/profile/me/archive'),
};

// Gamification
export const gamificationApi = {
  progress: () => api.get('/gamification/progress'),
  leaderboard: () => api.get('/gamification/leaderboard'),
  challenges: () => api.get('/gamification/challenges'),
};

// Uploads
export const uploadsApi = {
  avatar: (uri: string) => {
    const form = new FormData();
    form.append('file', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
    return api.post('/uploads/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  postImage: (uri: string) => {
    const form = new FormData();
    form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
    return api.post('/uploads/post-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
