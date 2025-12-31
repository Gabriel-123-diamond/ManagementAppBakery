
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
            if (pathname.startsWith('/dashboard') || pathname.startsWith('/database-tools')) {
                router.push('/');
            }
            return;
        }

        // --- Comprehensive Role-Based Route Restrictions ---
        const routeRestrictions: { [path: string]: string[] } = {
            '/dashboard/pos': ['Showroom Staff', 'Developer', 'Manager'],
            '/dashboard/orders': ['Manager', 'Supervisor', 'Showroom Staff', 'Accountant', 'Developer'],
            '/dashboard/inventory/products': ['Manager', 'Supervisor', 'Storekeeper', 'Accountant', 'Developer'],
            '/dashboard/inventory/recipes': ['Manager', 'Supervisor', 'Baker', 'Chief Baker', 'Storekeeper', 'Developer'],
            '/dashboard/inventory/ingredients': ['Manager', 'Supervisor', 'Storekeeper', 'Accountant', 'Developer'],
            '/dashboard/inventory/suppliers': ['Manager', 'Supervisor', 'Storekeeper', 'Accountant', 'Developer'],
            '/dashboard/inventory/other-supplies': ['Manager', 'Supervisor', 'Storekeeper', 'Accountant', 'Developer'],
            '/dashboard/inventory/waste-logs': ['Manager', 'Developer', 'Storekeeper', 'Delivery Staff', 'Showroom Staff', 'Accountant'],
            '/dashboard/customers': ['Manager', 'Supervisor', 'Developer'],
            '/dashboard/staff': ['Manager', 'Supervisor', 'Developer'],
            '/dashboard/deliveries': ['Delivery Staff', 'Developer', 'Manager', 'Supervisor', 'Accountant'],
            '/dashboard/accounting': ['Manager', 'Supervisor', 'Accountant', 'Developer'],
            '/dashboard/promotions': ['Manager', 'Supervisor', 'Developer'],
            '/database-tools': ['Developer'],
        };
        
        for (const path in routeRestrictions) {
            if (pathname.startsWith(path) && !routeRestrictions[path].includes(auth.user.role)) {
                console.log(`Redirecting: User with role '${auth.user.role}' tried to access '${pathname}'.`);
                router.push('/dashboard'); // Redirect to a safe default page
                return;
            }
        }
        
        // Special case for stock control as it has complex visibility
        if (pathname.startsWith('/dashboard/inventory/stock-control')) {
            const allowedRoles = ['Manager', 'Supervisor', 'Storekeeper', 'Delivery Staff', 'Showroom Staff', 'Developer'];
            if (!allowedRoles.includes(auth.user.role)) {
                router.push('/dashboard');
                return;
            }
            if (auth.user.role === 'Baker') { // Explicitly block Baker
                router.push('/dashboard');
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
