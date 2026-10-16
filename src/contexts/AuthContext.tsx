"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  email: string;
  role: "STUDENT" | "RECRUITER" | "ADMIN";
  name: string;
  profile: Record<string, string> | null;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isMounted = useRef(true);
  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isMounted.current || fetchingRef.current) return;
    
    fetchingRef.current = true;
    
    try {
      console.log("🔐 AUTH_CONTEXT: Calling /api/auth/me");
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
      });
      console.log("🔐 AUTH_CONTEXT: /me response status:", res.status);
      
      if (!isMounted.current) return;
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        console.log("🔐 AUTH_CONTEXT: /me failed, clearing user");
        setUser(null);
      }
    } catch (err) {
      console.log("🔐 AUTH_CONTEXT: /me error:", err);
      if (isMounted.current) {
        setUser(null);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    refresh();
    
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.push("/auth/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
