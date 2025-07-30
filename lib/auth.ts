// Auth utility functions for handling authentication

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  email: string;
  user_type: string;
}

// Get access token from localStorage
export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

// Get refresh token from localStorage
export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

// Get user info from localStorage
export const getUserInfo = () => {
  return {
    user_id: localStorage.getItem('user_id'),
    email: localStorage.getItem('user_email'),
    user_type: localStorage.getItem('user_type'),
  };
};

// Get base URL based on user type
export const getBaseUrl = (): string => {
  const userType = localStorage.getItem('user_type');
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://waha-backend.onrender.com/api/v1';
  
  if (userType === 'admin') {
    return `${baseUrl}/admin/waha`;
  } else {
    return `${baseUrl}/normal/waha`;
  }
};

export const getAuthBaseUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://waha-backend.onrender.com/api/v1';
  return `${baseUrl}/auth`;
};

// Validate current token by making a request to backend
export const validateToken = async (): Promise<boolean> => {
  const token = getAccessToken();
  
  if (!token) {
    return false;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://waha-backend.onrender.com/api/v1';
    const response = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};

// Create headers with authentication token
export const createAuthHeaders = (): HeadersInit => {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

  // Make authenticated API call with user-type specific base URL
  export const authenticatedFetch = async (
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    const headers = createAuthHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    // If token is expired, try to refresh
    if (response.status === 401) {
      console.log('Token expired, attempting refresh...');
      const refreshed = await refreshToken();
      if (refreshed) {
        console.log('Token refreshed successfully, retrying request...');
        // Retry the request with new token
        const newHeaders = createAuthHeaders();
        return fetch(url, {
          ...options,
          headers: {
            ...newHeaders,
            ...options.headers,
          },
        });
      } else {
        console.log('Token refresh failed, user will be redirected to login');
        // refreshToken fonksiyonu zaten login'e yönlendiriyor
      }
    }

    return response;
  };

  // Make authenticated API call with custom URL (for auth endpoints)
  export const authenticatedFetchCustom = async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    const headers = createAuthHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    // If token is expired, try to refresh
    if (response.status === 401) {
      console.log('Token expired, attempting refresh...');
      const refreshed = await refreshToken();
      if (refreshed) {
        console.log('Token refreshed successfully, retrying request...');
        // Retry the request with new token
        const newHeaders = createAuthHeaders();
        return fetch(url, {
          ...options,
          headers: {
            ...newHeaders,
            ...options.headers,
          },
        });
      } else {
        console.log('Token refresh failed, user will be redirected to login');
        // refreshToken fonksiyonu zaten login'e yönlendiriyor
      }
    }

    return response;
  };

// Refresh access token
export const refreshToken = async (): Promise<boolean> => {
  const refreshTokenValue = getRefreshToken();
  
  if (!refreshTokenValue) {
    return false;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://waha-backend.onrender.com/api/v1';
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshTokenValue,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Token refresh response:', data);
      localStorage.setItem('access_token', data.access_token);
      // Refresh token da güncellenebilir
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      return true;
    } else if (response.status === 401) {
      // Refresh token da geçersiz, kullanıcıyı login'e yönlendir
      console.log('Refresh token expired, redirecting to login...');
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return false;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  return false;
};

// Clear all authentication data
export const clearAuth = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_type');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

// Check if user is admin
export const isAdmin = (): boolean => {
  return localStorage.getItem('user_type') === 'admin';
};

// Check if user is normal user
export const isNormalUser = (): boolean => {
  return localStorage.getItem('user_type') === 'user';
}; 