import { Platform } from 'react-native';

// On Android Emulator localhost is 10.0.2.2, on Web and iOS it's localhost
const BASE_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
export const API_BASE_URL = `${BASE_HOST}/api`;
export const SOCKET_URL = BASE_HOST;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
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

  // Trades
  startTrade: (data: { productId: string; buyerId: string; agreedPrice: number }) =>
    request<any>('/trades/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTrade: (id: string, currentUserId?: string) =>
    request<any>(`/trades/${id}${currentUserId ? `?currentUserId=${currentUserId}` : ''}`),

  getUserTrades: (userId: string) => request<any[]>(`/trades/user/${userId}`),

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
};

