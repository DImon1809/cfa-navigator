"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  ApiError,
  type LoginRequest,
  type RegisterRequest,
  type UserResponse,
} from "./api";

// ─── Context types ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadedRef = useRef(false);

  /** Флаг в localStorage — сигнал, что сессия может быть активна */
  const SESSION_KEY = "auth_session";

  /** Загружает текущего пользователя; при 401 пробует обновить токен.
   *  Вызывается только из /cabinet/* — не на публичных страницах. */
  const loadUser = useCallback(async () => {
    if (loadedRef.current) return;
    if (!localStorage.getItem(SESSION_KEY)) return;
    loadedRef.current = true;
    setIsLoading(true);
    try {
      setUser(await api.auth.me());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        try {
          await api.auth.refresh();
          setUser(await api.auth.me());
        } catch {
          localStorage.removeItem(SESSION_KEY);
          setUser(null);
          loadedRef.current = false;
        }
      } else {
        setUser(null);
        loadedRef.current = false;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    await api.auth.login(data);
    localStorage.setItem(SESSION_KEY, "1");
    loadedRef.current = false;
    // /me будет вызван кабинет-страницей после навигации
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    await api.auth.register(data);
    localStorage.setItem(SESSION_KEY, "1");
    loadedRef.current = false;
    // /me будет вызван кабинет-страницей после навигации
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
      loadedRef.current = false;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
