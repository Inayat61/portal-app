import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { api, setAuthToken, clearAuthToken } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = Cookies.get('auth_token');
        if (token) {
          setAuthToken(token);
          await verifyToken();
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Verify token with backend
  const verifyToken = async () => {
    try {
      const response = await api.get('/auth/verify');
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error('Token verification failed:', error);
      clearAuth();
      throw error;
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      
      // Store token in cookie
      Cookies.set('auth_token', token, { 
        expires: 1, // 1 day
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      // Set token in axios headers
      setAuthToken(token);
      
      // Update user state
      setUser(userData);
      
      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      clearAuth();
    }
  };

  // Clear authentication
  const clearAuth = () => {
    Cookies.remove('auth_token');
    clearAuthToken();
    setUser(null);
    setLoading(false);
  };

  // Get user profile
  const getProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error('Get profile failed:', error);
      if (error.response?.status === 401) {
        clearAuth();
      }
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    verifyToken,
    getProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isUser: user?.role === 'user'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};