import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { User } from '../types';
import { api, setAuthToken } from '../api/client';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  token: string | null;
  setCurrentUser: (user: User | null) => void;
  loginWithToken: (user: User, token: string) => Promise<void>;
  logout: () => void;
  switchUser: (userId: string) => void;
  refreshUsers: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  isLoading: boolean;
}

const STORAGE_KEY_TOKEN = 'trusttag_auth_token';
const STORAGE_KEY_USER = 'trusttag_auth_user';

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  users: [],
  token: null,
  setCurrentUser: () => {},
  loginWithToken: async () => {},
  logout: () => {},
  switchUser: () => {},
  refreshUsers: async () => {},
  refreshCurrentUser: async () => {},
  isLoading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore saved session on launch
  const restoreSession = async () => {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
        const savedUserStr = localStorage.getItem(STORAGE_KEY_USER);

        if (savedToken && savedUserStr) {
          const parsedUser = JSON.parse(savedUserStr);
          setAuthToken(savedToken);
          setTokenState(savedToken);
          setCurrentUser(parsedUser);

          // Verify with server in background
          try {
            const me = await api.getMe();
            if (me) {
              setCurrentUser(me);
              localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(me));
            }
          } catch (e) {
            // Token might be expired
            console.log('Session verification refreshed or token expired');
          }
        }
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
      if (!currentUser && data.length > 0) {
        // Default to Alex for immediate exploration if not logged in
        const defaultUser = data.find((u: User) => u.fullName.includes('Alex')) || data[0];
        setCurrentUser(defaultUser);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    restoreSession().then(() => {
      fetchUsers();
    });
  }, []);

  const loginWithToken = async (user: User, newToken: string) => {
    setAuthToken(newToken);
    setTokenState(newToken);
    setCurrentUser(user);

    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_TOKEN, newToken);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    }
  };

  const logout = () => {
    setAuthToken(null);
    setTokenState(null);
    setCurrentUser(null);

    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  };

  const refreshCurrentUser = async () => {
    if (!currentUser) return;
    try {
      const fresh = await api.getUserProfile(currentUser.id);
      if (fresh) setCurrentUser(fresh);
    } catch (e) {
      console.error('Failed to refresh user profile:', e);
    }
  };

  const switchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(found));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        token,
        setCurrentUser,
        loginWithToken,
        logout,
        switchUser,
        refreshUsers: fetchUsers,
        refreshCurrentUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
