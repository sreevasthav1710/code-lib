import { useCallback, useEffect, useRef, useState, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const authRequestId = useRef(0);

  const applySession = useCallback((nextSession: Session | null, deferRoleCheck = false) => {
    const requestId = ++authRequestId.current;
    const nextUser = nextSession?.user ?? null;

    setSession(nextSession);
    setUser(nextUser);

    if (!nextUser) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    const loadAdminRole = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", nextUser.id)
          .eq("role", "admin")
          .maybeSingle();

        if (authRequestId.current !== requestId) return;
        setIsAdmin(!error && !!data);
      } catch (error) {
        if (authRequestId.current !== requestId) return;
        console.error("[auth] Failed to load admin role:", error);
        setIsAdmin(false);
      } finally {
        if (authRequestId.current === requestId) {
          setLoading(false);
        }
      }
    };

    if (deferRoleCheck) {
      setTimeout(loadAdminRole, 0);
    } else {
      void loadAdminRole();
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session, true);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    }).catch((error) => {
      console.error("[auth] Failed to read session:", error);
      applySession(null);
    });

    return () => {
      authRequestId.current += 1;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = async () => {
    authRequestId.current += 1;
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setLoading(false);

    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch (error) {
      console.error("[auth] Sign out failed after local state was cleared:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
