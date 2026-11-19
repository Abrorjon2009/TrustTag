import { Platform } from 'react-native';

// Support production remote backend (Render / Vercel) via EXPO_PUBLIC_API_URL, fallback to localhost
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
const BASE_HOST = ENV_API_URL
  ? ENV_API_URL.replace(/\/+$/, '')
  : (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');
export const API_BASE_URL = `${BASE_HOST}/api`;
export const SOCKET_URL = BASE_HOST;

// In-memory token cache (persisted by AuthContext in storage)
let currentAuthToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  // Only set Content-Type to JSON if body is NOT FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Attach JWT Bearer token if user is signed in
  if (currentAuthToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Authentication & Phone SMS OTP
  sendOtp: (phoneNumber: string) =>
    request<{ success: boolean; message: string; phoneNumber: string; devCode?: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }),

  verifyOtp: (phoneNumber: string, code: string, fullName?: string) =>
    request<{ success: boolean; isNewUser: boolean; user: any; token: string; refreshToken: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code, fullName }),
    }),

  // Option A: Google Sign-In & Sign-Up
  loginWithGoogle: (data: {
    idToken?: string;
    accessToken?: string;
    code?: string;
    redirectUri?: string;
    mode?: 'LOGIN' | 'SIGNUP';
    googleId?: string;
    email?: string;
    fullName?: string;
    avatarUrl?: string;
  }) =>
    request<{ success: boolean; isNewUser: boolean; user: any; token: string; refreshToken: string; message?: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Option B: Telegram Login & Registration
  loginWithTelegram: (data: {
    id?: number | string;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date?: number;
    hash?: string;
    telegramId?: string;
    fullName?: string;
    avatarUrl?: string;
    mode?: 'LOGIN' | 'SIGNUP';
  }) =>
    request<{ success: boolean; isNewUser: boolean; user: any; token: string; refreshToken: string; message?: string }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Option C: Real Email OTP (100% Free Verification Code)
  sendEmailOtp: (data: { email: string; fullName?: string; mode?: 'LOGIN' | 'SIGNUP' }) =>
    request<{ success: boolean; message: string; email: string; isNewUser: boolean; devCode?: string }>('/auth/email/send-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyEmailOtp: (data: { email: string; code: string; fullName?: string; mode?: 'LOGIN' | 'SIGNUP' }) =>
    request<{ success: boolean; isNewUser: boolean; user: any; token: string; refreshToken: string; message?: string }>('/auth/email/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Option D: Email & Password (Legacy fallback)
  registerWithEmail: (data: { email: string; password: string; fullName: string }) =>
    request<{ success: boolean; isNewUser: boolean; user: any; token: string; refreshToken: string }>('/auth/register-email', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  loginWithEmail: (data: { email: string; password: string }) =>
    request<{ success: boolean; isNewUser: boolean; user: any; token: string; refreshToken: string }>('/auth/login-email', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => request<any>('/auth/me'),

  updateProfile: (data: { fullName?: string; email?: string; avatarUrl?: string; preferredLang?: string }) =>
    request<any>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAccount: () =>
    request<{ success: boolean; message: string }>('/auth/delete-account', {
      method: 'POST',
    }),

  // Payments & Escrow Initiation (Payme, Click, Uzcard/Humo, In-App Wallet)
  initiatePayment: (tradeSessionId: string, paymentMethod: 'WALLET' | 'PAYME' | 'CLICK' | 'UZCARD_HUMO') =>
    request<any>('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify({ tradeSessionId, paymentMethod }),
    }),

  // Media & Photo Upload
  uploadImage: async (imageUri: string, filename: string = 'photo.jpg'): Promise<{ url: string }> => {
    const formData = new FormData();
    // @ts-ignore - React Native FormData accepts uri/type/name object
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: filename,
    });

    return request<{ success: boolean; url: string }>('/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Locations
  getLocations: () => request<any[]>('/locations'),

  // Products
  getProducts: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const qs = query.toString();
    return request<any[]>(`/products${qs ? `?${qs}` : ''}`);
  },

  getProduct: (id: string) => request<any>(`/products/${id}`),

  createProduct: (data: any) =>
    request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (id: string, data: any) =>
    request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: string) =>
    request<any>(`/products/${id}`, {
      method: 'DELETE',
    }),

  getSellerProducts: (sellerId: string) =>
    request<any[]>(`/products/seller/${sellerId}`),

  // Trades
  startTrade: (data: { productId: string; buyerId: string; agreedPrice: number }) =>
    request<any>('/trades/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTrade: (id: string, currentUserId?: string) =>
    request<any>(`/trades/${id}${currentUserId ? `?currentUserId=${currentUserId}` : ''}`),

  getUserTrades: (userId: string) => request<any[]>(`/trades/user/${userId}`),

  getProductTrades: (productId: string, currentUserId?: string) =>
    request<any[]>(`/trades/product/${productId}${currentUserId ? `?currentUserId=${currentUserId}` : ''}`),

  depositTrade: (id: string, buyerId: string) =>
    request<any>(`/trades/${id}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ buyerId }),
    }),

  receiveTrade: (id: string, buyerId: string) =>
    request<any>(`/trades/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ buyerId }),
    }),

  withdrawTrade: (id: string, buyerId: string) =>
    request<any>(`/trades/${id}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ buyerId }),
    }),

  shipTrade: (id: string, sellerId: string) =>
    request<any>(`/trades/${id}/ship`, {
      method: 'POST',
      body: JSON.stringify({ sellerId }),
    }),

  // Disputes & Admin
  fileDispute: (data: any) =>
    request<any>('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDisputes: () => request<any[]>('/disputes'),

  resolveDispute: (id: string, data: any) =>
    request<any>(`/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Wallet
  getWallet: (userId: string) => request<any>(`/wallets/${userId}`),

  topupWallet: (userId: string, amount: number) =>
    request<any>(`/wallets/${userId}/topup`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  withdrawBank: (userId: string, amount: number, bankCardNumber?: string) =>
    request<any>(`/wallets/${userId}/withdraw-bank`, {
      method: 'POST',
      body: JSON.stringify({ amount, bankCardNumber }),
    }),

  // Users
  getUsers: () => request<any[]>('/users'),

  getUserProfile: (userId: string) => request<any>(`/users/${userId}`),

  submitReview: (data: any) =>
    request<any>('/users/review', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Favorites / Watchlist
  getFavorites: (userId: string) => request<any[]>(`/users/${userId}/favorites`),

  toggleFavorite: (userId: string, productId: string) =>
    request<{ isFavorite: boolean; message: string }>(`/users/${userId}/favorites/toggle`, {
      method: 'POST',
      body: JSON.stringify({ productId }),
    }),

  // Notifications
  getNotifications: (userId: string) =>
    request<{ notifications: any[]; unreadCount: number }>(`/users/${userId}/notifications`),

  markNotificationsRead: (userId: string, notificationId?: string) =>
    request<{ success: boolean }>(`/users/${userId}/notifications/mark-read`, {
      method: 'POST',
      body: JSON.stringify({ notificationId }),
    }),
};
