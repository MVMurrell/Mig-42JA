import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";


export type AppUser = {
  id: string;
  username: string | null;
  profileImageUrl: string | null;
  email?: string | null;
  role?: "user" | "admin";
};

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  gemCoins?: number;
}

type RawUser = {
  id: string;
  username?: string | null;
  profileImageUrl?: string | null;
  email?: string | null;
  role?: string | null;
} | null;

export function useAuth() {
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

 const { data: rawUser } = useQuery<RawUser>({
    queryKey: ["/api/auth/user"],
    refetchOnWindowFocus: true,
  });

    const user: AppUser | null = rawUser
    ? {
        id: rawUser.id,
        username: rawUser.username ?? null,
        profileImageUrl: rawUser.profileImageUrl ?? null,
        email: rawUser.email ?? null,
        role: (rawUser.role as AppUser["role"]) ?? "user",
      }
    : null;

  // Additional query for authentication status on mobile devices
  const { data: authStatus } = useQuery({
    queryKey: ["/api/auth/status"],
    enabled: isMobile, // Only run on mobile devices
    retry: false,
    refetchInterval: 30000, // Check every 30 seconds for mobile authentication updates
  });

  const login = () => {
    if (isMobile) {
      console.log('📱 Mobile login detected, using server-side authentication flow');
      // For mobile devices, use the server-side authentication flow
      window.location.href = '/api/auth/login?mobile=true';
    } else {
      console.log('🖥️ Desktop login detected, using standard authentication flow');
      window.location.href = '/api/auth/login';
    }
  };

  const logout = () => {
    window.location.href = '/api/auth/logout';
  };

  // Check if we got a 401 error, which means not authenticated
  const is401Error = error && (error as any).message === "Unauthorized";
  const isSuspended = error && (error as any).message === "Account suspended";
  
  // Enhanced authentication check that considers server-side authentication for mobile
  let isAuthenticated = !!user && !is401Error && !isSuspended;
  
  // For mobile devices, also check the authentication status endpoint
  if (isMobile && authStatus) {
    isAuthenticated = isAuthenticated || (authStatus as any).authenticated;
    console.log('📱 Mobile auth status check:', {
      userAuth: !!user,
      serverAuth: (authStatus as any)?.authenticated,
      secureCookie: (authStatus as any)?.secure_cookie,
      finalAuth: isAuthenticated
    });
  }

  
  return {
    user,
    isLoading,
    isAuthenticated,
    isSuspended,
    isMobile,
    authStatus: isMobile ? authStatus : null,
    login,
    logout,
  };
}


