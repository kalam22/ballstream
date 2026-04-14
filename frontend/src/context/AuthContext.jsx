import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { swal } from '../utils/swal';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const sessionPollRef = useRef(null);

  // Sync state to local storage
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const logout = useCallback(async () => {
    // Call backend to clear session_id from DB so re-login is possible on any device
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch (_) {
        // Ignore network errors — still do client-side logout
      }
    }
    setUser(null);
    setToken(null);
    if (sessionPollRef.current) {
      clearInterval(sessionPollRef.current);
      sessionPollRef.current = null;
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Pass back the error code so the UI can handle specific cases (e.g. ALREADY_LOGGED_IN)
        return {
          success: false,
          error: data.error?.message || 'Email atau password salah',
          code: data.error?.code || null,
        };
      }

      setToken(data.data.token);
      setUser(data.data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, code: null };
    }
  };

  // Auto-logout when token expires (reads expiry from JWT payload)
  useEffect(() => {
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp) {
        const expirationTime = payload.exp * 1000;
        const timeRemaining = Math.max(0, expirationTime - Date.now());

        if (timeRemaining === 0) {
          logout();
          return;
        }

        const timeoutId = setTimeout(() => {
          logout();
          window.location.href = '/login';
        }, timeRemaining);

        return () => clearTimeout(timeoutId);
      }
    } catch (e) {
      console.error('[Auth] Failed to parse token expiry:', e);
      logout();
    }
  }, [token, logout]);

  // Poll /api/v1/auth/verify every 30 seconds to detect concurrent logins.
  // If another device logged in, the session_id in the DB changes and this
  // session gets a SESSION_INVALIDATED response → force logout.
  useEffect(() => {
    if (!token) {
      if (sessionPollRef.current) {
        clearInterval(sessionPollRef.current);
        sessionPollRef.current = null;
      }
      return;
    }

    const verifySession = async () => {
      try {
        const res = await fetch('/api/v1/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const code = data?.error?.code;
          if (code === 'SESSION_INVALIDATED' || code === 'TOKEN_EXPIRED' || res.status === 401) {
            console.warn('[Auth] Session invalidated – logging out');
            if (sessionPollRef.current) {
              clearInterval(sessionPollRef.current);
              sessionPollRef.current = null;
            }
            await swal.sessionEnded();
            logout();
            window.location.href = '/login';
          }
        }
      } catch (_) {
        // Network error — do not force logout, user might just be offline
      }
    };

    // Check immediately, then every 30 seconds
    verifySession();
    sessionPollRef.current = setInterval(verifySession, 30000);

    return () => {
      if (sessionPollRef.current) {
        clearInterval(sessionPollRef.current);
        sessionPollRef.current = null;
      }
    };
  }, [token, logout]);

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return { user: null, token: null, isAuthenticated: false, login: async () => {}, logout: () => {} };
  }
  return context;
}
