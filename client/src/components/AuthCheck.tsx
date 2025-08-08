import { useAuth } from "@/hooks/useAuth.ts";
import { Button } from "@/components/ui/button.tsx";
import { Loader, AlertTriangle, Smartphone } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

interface AuthCheckProps {
  children: React.ReactNode;
}

export default function AuthCheck({ children }: AuthCheckProps) {
  const { user, isLoading, login, isAuthenticated, isMobile, authStatus } = useAuth();
  const [location] = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPWA, setIsPWA] = useState(false);
  
  useEffect(() => {
    // Check if running as PWA
    const isPWAMode = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone || 
                     document.referrer.includes('android-app://');
    setIsPWA(isPWAMode);
    
    // Check for auth errors in URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('auth_error') || urlParams.get('pwa_auth_error') || urlParams.get('mobile_auth_error');
    const isMobileError = urlParams.get('mobile_auth_error');
    const deviceType = urlParams.get('device');
    
    if (error) {
      if (isMobileError && deviceType === 'mobile') {
        setAuthError('mobile_storage_issue');
      } else {
        setAuthError(error);
      }
      // Clean URL
      window.history.replaceState({}, '', '/');
    }
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto p-8">
          <h1 className="text-4xl font-bold mb-6">Welcome to Jemzy</h1>
          <p className="text-lg mb-8">Your video sharing platform with AI-powered content discovery</p>
          
          {authError && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-300 font-medium">Authentication Issue</span>
              </div>
              
              {authError === 'storage_partitioned' || authError === 'mobile_storage_issue' ? (
                <div className="text-sm text-red-200 space-y-3">
                  <p>Mobile browser authentication restrictions detected.</p>
                  
                  <div className="bg-orange-900/50 border border-orange-700 rounded p-3">
                    <div className="flex items-center mb-2">
                      <Smartphone className="w-4 h-4 text-orange-400 mr-2" />
                      <span className="text-orange-300 font-medium">Mobile Browsers Limitation</span>
                    </div>
                    <div className="text-xs text-orange-200 space-y-1">
                      <p>• Mobile browsers restrict authentication storage</p>
                      <p>• This affects PWA apps and mobile Chrome</p>
                      <p>• Desktop browsers work normally</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-900/50 border border-blue-700 rounded p-3">
                    <div className="text-xs text-blue-200 space-y-1">
                      <p className="font-medium mb-1">Try these solutions:</p>
                      <p>• Use desktop/laptop browser instead</p>
                      <p>• Clear browser cache and cookies</p>
                      <p>• Try incognito/private browsing mode</p>
                      <p>• Switch to different mobile browser</p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => window.location.href = '/api/auth/status'}
                    className="w-full mt-3 bg-orange-800 hover:bg-orange-700 text-white text-sm"
                  >
                    Check Authentication Status
                  </Button>
                  
                  {isMobile && authStatus && (
                    <div className="mt-3 bg-green-900/50 border border-green-700 rounded p-3">
                      <div className="text-xs text-green-200">
                        <p className="font-medium mb-1">Mobile Auth Status:</p>
                        <p>• Authenticated: {(authStatus as any)?.authenticated ? 'Yes' : 'No'}</p>
                        <p>• Secure Cookie: {(authStatus as any)?.secure_cookie ? 'Yes' : 'No'}</p>
                        <p>• Session Valid: {(authStatus as any)?.session_valid ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-200">
                  Authentication failed: {authError}
                </p>
              )}
              
              <Button 
                onClick={() => setAuthError(null)} 
                className="mt-3 text-xs bg-red-800 hover:bg-red-700 text-white"
              >
                Try Again
              </Button>
            </div>
          )}
          
          <div className="space-y-4">
            <Button 
              onClick={login} 
              className="w-full bg-white text-purple-900 hover:bg-gray-100"
            >
              Sign in with Replit
            </Button>
            
            {isPWA && !authError && (
              <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4 text-sm">
                <div className="flex items-center justify-center mb-2">
                  <Smartphone className="w-4 h-4 text-blue-400 mr-2" />
                  <span className="text-blue-300 font-medium">PWA Mode Detected</span>
                </div>
                <p className="text-blue-200">
                  If sign-in fails, try opening in your browser instead of the app
                </p>
              </div>
            )}
            
            <div className="text-sm opacity-75 space-y-1">
              <p>Authentication requires network access to replit.com</p>
              <p>PWA apps may have storage restrictions</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}