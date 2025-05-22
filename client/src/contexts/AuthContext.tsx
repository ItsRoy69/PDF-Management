import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

interface AuthContextType {
  user: any;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  validateResetToken: (token: string) => Promise<boolean>;
  resetPassword: (token: string, password: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login with email:', email);
      const data = await authService.login({ email, password });
      console.log('Login successful, received data:', data);
      setUser(data.user);
      setToken(data.token);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error details:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await authService.register({ name, email, password });
    setUser(data.user);
    setToken(data.token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  const forgotPassword = async (email: string) => {
    await authService.forgotPassword(email);
  };

  const validateResetToken = async (token: string) => {
    try {
      await authService.validateResetToken(token);
      return true;
    } catch (error) {
      return false;
    }
  };

  const resetPassword = async (token: string, password: string) => {
    const data = await authService.resetPassword(token, password);
    setUser(data.user);
    setToken(data.token);
    setIsAuthenticated(true);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      register, 
      logout, 
      forgotPassword,
      validateResetToken,
      resetPassword,
      isAuthenticated 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 