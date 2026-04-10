import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: User) => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('keKingdom_token');
    const storedUser = localStorage.getItem('keKingdom_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Verify token is still valid
      fetchUserProfile(storedToken);
    }
    setIsLoading(false);
  }, []);

  const fetchUserProfile = async (authToken: string) => {
    try {
      const data = await api.getProfile(authToken);
      setUser(data.user);
      localStorage.setItem('keKingdom_user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logout();
    }
  };

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('keKingdom_token', data.token);
    localStorage.setItem('keKingdom_user', JSON.stringify(data.user));
  };

  const register = async (fullName: string, email: string, password: string) => {
    const data = await api.register(fullName, email, password);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('keKingdom_token', data.token);
    localStorage.setItem('keKingdom_user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('keKingdom_token');
    localStorage.removeItem('keKingdom_user');
  };

  const updateProfile = async (profileData: Partial<User>) => {
    if (!token) throw new Error('Not authenticated');

    const data = await api.updateProfile(token, profileData);

    setUser(data.user);
    localStorage.setItem('keKingdom_user', JSON.stringify(data.user));
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    isSeller: user?.isSeller || false,
    isLoading,
    login,
    register,
    logout,
    updateUser: (data: User) => {
      setUser(data);
      localStorage.setItem('keKingdom_user', JSON.stringify(data));
    },
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
