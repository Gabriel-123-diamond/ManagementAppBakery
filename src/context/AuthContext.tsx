
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

type User = {
  name: string;
  role: string;
  staff_id: string;
  theme?: string;
};

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      localStorage.removeItem('loggedInUser');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((userData: User) => {
    localStorage.setItem('loggedInUser', JSON.stringify(userData));
    setUser(userData);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('loggedInUser');
    setUser(null);
    router.push('/');
  }, [router]);

  const value = useMemo(() => ({
    user,
    login,
    logout,
    isLoading
  }), [user, isLoading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const auth = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (auth.isLoading) {
            return; // Wait until user authentication status is resolved
        }

        if (!auth.user) {
            if (pathname.startsWith('/dashboard')) {
                router.push('/');
            }
            return;
        }

        // Define role-based route restrictions
        const routeRestrictions: { [path: string]: string[] } = {
            '/dashboard/pos': ['Showroom Staff', 'Developer'],
            '/dashboard/staff': ['Manager', 'Supervisor', 'Developer'],
            '/dashboard/customers': ['Manager', 'Supervisor', 'Developer'],
            '/dashboard/accounting': ['Manager', 'Supervisor', 'Accountant', 'Developer'],
        };
        
        for (const path in routeRestrictions) {
            if (pathname.startsWith(path) && !routeRestrictions[path].includes(auth.user.role)) {
                router.push('/dashboard'); // Redirect to a safe default page
                return;
            }
        }

    }, [auth.isLoading, auth.user, router, pathname]);

    if (auth.isLoading || (!auth.user && pathname.startsWith('/dashboard'))) {
         return (
            <div className="flex h-screen w-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return <>{children}</>;
}
