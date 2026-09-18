import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User } from '../lib/api';

interface ExtendedUser extends User {
  username?: string;
  /** Set by the Worker on /auth/me — drives the "Member since" panel. */
  createdAt?: string;
  accountStatus?: 'active' | 'suspended' | 'deactivated';
  emailVerified?: boolean;
  canManageUsers?: boolean;
  canManageContent?: boolean;
  canManageSellers?: boolean;
  blockedUsers?: string[];
  mutedUsers?: string[];
}

interface AuthContextType {
  user: ExtendedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isContentManager: boolean;
  isSellerManager: boolean;
  isSeller: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, username?: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: ExtendedUser) => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('keKingdom_token');
    const storedUser = localStorage.getItem('keKingdom_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Verify token is still valid (async - don't block loading)
      fetchUserProfile(storedToken).finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserProfile = async (authToken: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const data = await api.getProfile(authToken);
      clearTimeout(timeoutId);
      setUser(data.user);
      localStorage.setItem('keKingdom_user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Keep existing user data from localStorage on network error
      const storedUser = localStorage.getItem('keKingdom_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  };

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    const userData: ExtendedUser = {
      id: data.user.id,
      fullName: data.user.fullName,
      email: data.user.email,
      username: data.user.username,
      role: data.user.role,
      accountStatus: data.user.accountStatus,
      avatar: data.user.avatar,
      isSeller: data.user.isSeller,
      shopName: data.user.shopName,
      shopVerified: data.user.shopVerified
    };
    setUser(userData);
    setToken(data.token);
    localStorage.setItem('keKingdom_token', data.token);
    localStorage.setItem('keKingdom_user', JSON.stringify(userData));
  };

  const register = async (fullName: string, email: string, password: string, username?: string) => {
    const data = await api.register(fullName, email, password);
    const userData: ExtendedUser = {
      id: data.user.id,
      fullName: data.user.fullName,
      email: data.user.email,
      username: data.user.username,
      role: data.user.role
    };
    setUser(userData);
    setToken(data.token);
    localStorage.setItem('keKingdom_token', data.token);
    localStorage.setItem('keKingdom_user', JSON.stringify(userData));
  };

  const forgotPassword = async (email: string): Promise<string> => {
    const data = await api.forgotPassword(email);
    return data.message;
  };

  const resetPassword = async (resetToken: string, newPassword: string) => {
    const data = await api.resetPassword(resetToken, newPassword);
    setToken(data.token);
    localStorage.setItem('keKingdom_token', data.token);
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

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    isModerator: user?.role === 'moderator',
    isContentManager: user?.role === 'content_manager',
    isSellerManager: user?.role === 'seller_manager',
    isSeller: user?.isSeller || false,
    isLoading,
    login,
    register,
    logout,
    updateUser: (data: ExtendedUser) => {
      setUser(data);
      localStorage.setItem('keKingdom_user', JSON.stringify(data));
    },
    updateProfile,
    forgotPassword,
    resetPassword
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