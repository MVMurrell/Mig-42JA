import { useLocation } from "wouter";
import { ArrowLeft, Download, Smartphone, Zap, Shield, Wifi, Bell, Home, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { usePWA } from "@/hooks/usePWA.ts";

export default function DownloadApp() {
  const [, setLocation] = useLocation();
  const { isInstallable, isInstalled, isIOS, install } = usePWA();

  const handleBack = () => {
    setLocation("/settings");
  };

  const handleInstall = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        console.log("App installed successfully");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="flex-1 text-center text-xl font-semibold text-gray-900 dark:text-white pr-10">
          Download Jemzy App
        </h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Hero Section */}
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-black dark:bg-white rounded-2xl flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-white dark:text-black" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Get the Full Jemzy Experience
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Install our app for the best mobile experience with exclusive features
          </p>
        </div>

        {/* App Status */}
        {isInstalled && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Home className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    App Already Installed!
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    You're enjoying the full Jemzy experience
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits Grid */}
        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                Lightning Fast Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Instant loading and smooth animations. Navigate your treasure hunts and video feeds without any delays.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                Offline Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Continue exploring and viewing cached content even when you're offline. Your adventures never stop.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                Push Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Get instant alerts when treasure chests spawn nearby, mystery boxes appear, or dragons are spotted in your area.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                  <Home className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                Home Screen Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Launch Jemzy instantly from your home screen. No more hunting through browser tabs or bookmarks.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                Native Sharing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Share your epic treasure finds and video highlights directly through your device's native sharing features.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Enhanced Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                App-level security and privacy protection. Your treasure hunting data stays safe and secure.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Installation Section */}
        <Card className="border-black dark:border-white">
          <CardHeader>
            <CardTitle className="text-center text-xl">Ready to Install?</CardTitle>
            <CardDescription className="text-center">
              Get started with the enhanced Jemzy experience in seconds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isIOS ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Install on iOS
                </h3>
                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>1. Tap the Share button <span className="inline-block w-4 h-4 bg-blue-200 dark:bg-blue-800 rounded text-center text-xs">↗</span> in Safari</li>
                  <li>2. Scroll down and tap "Add to Home Screen"</li>
                  <li>3. Tap "Add" to install Jemzy</li>
                  <li>4. Look for the Jemzy icon on your home screen</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3">
                {isInstallable ? (
                  <Button 
                    onClick={handleInstall}
                    className="w-full bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white flex items-center gap-2 h-12"
                  >
                    <Download className="w-5 h-5" />
                    Install Jemzy App
                  </Button>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      Install option not available in this browser session
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Try visiting Jemzy in Chrome or Edge to see the install prompt
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                The app is completely free with no additional downloads required
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
          <p>Jemzy works great in your browser too!</p>
          <p>Installing the app just makes it even better.</p>
        </div>
      </div>
    </div>
  );
}