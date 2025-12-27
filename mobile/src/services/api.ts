import axios from 'axios';
import { storage } from '../utils/storage';
import API_BASE_URL from '../config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear it
      await storage.deleteItem('authToken');
    }
    return Promise.reject(error);
  }
);

// Auth token management
export const setAuthToken = async (token: string) => {
  await storage.setItem('authToken', token);
};

export const getAuthToken = async (): Promise<string | null> => {
  return await storage.getItem('authToken');
};

export const removeAuthToken = async () => {
  await storage.deleteItem('authToken');
};

export default api;
