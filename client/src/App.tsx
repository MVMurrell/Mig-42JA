import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient.ts";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { MusicProvider } from "@/contexts/MusicContext.tsx";
import AuthCheck from "@/components/AuthCheck.tsx";
import { oneSignalService } from "@/lib/oneSignal.ts";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import PWAInstaller from "@/components/PWAInstaller.tsx";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt.tsx";
import PWANetworkStatus from "@/components/PWANetworkStatus.tsx";
import { pwaManager } from "@/lib/pwa.ts";
import { handleShortcutNavigation, setupPWAShortcutListeners } from "@/utils/pwaShortcuts.ts";
import NotFound from "@/pages/not-found.tsx";
import Home from "@/pages/home.tsx";
import Groups from "@/pages/groups.tsx";
import GroupProfile from "@/pages/group-profile.tsx";
import Settings from "@/pages/Settings.tsx";
import SharedProfile from "@/pages/SharedProfile.tsx";
import Profile from "@/pages/profile.tsx";
import Quest from "@/pages/quest-simple.tsx";
import CommunityGuidelines from "@/pages/CommunityGuidelines.tsx";
import Feedback from "@/pages/Feedback.tsx";
import DeleteAccount from "@/pages/DeleteAccount.tsx";
import ContentModerationRules from "@/pages/ContentModerationRules.tsx";
import ContentModerationDashboard from "@/pages/ContentModerationDashboard.tsx";
import VideoReviewPage from "@/pages/VideoReviewPage.tsx";
import VideoModerationReviewPage from "@/pages/VideoModerationReviewPage.tsx";
import ModerationDetailPage from "@/pages/ModerationDetailPage.tsx";
import ModerationDecisions from "@/pages/ModerationDecisions.tsx";
import UserStrikes from "@/pages/UserStrikes.tsx";
import UserStrikeDetails from "@/pages/UserStrikeDetails.tsx";
import AccountSuspended from "@/pages/AccountSuspended.tsx";
import Notifications from "@/pages/Notifications.tsx";
import NotificationSettings from "@/pages/NotificationSettings.tsx";
import AccountSettings from "@/pages/account-settings.tsx";
import DownloadApp from "@/pages/download-app.tsx";
import Collectors from "@/pages/Collectors.tsx";
import Collecting from "@/pages/Collecting.tsx";
import VideoSharePage from "@/pages/video-share.tsx";
import PaymentSuccess from "@/pages/payment-success.tsx";


// OneSignal initialization component
function OneSignalInit() {
  const { data: user } = useQuery({ queryKey: ['/api/user'] });

  useEffect(() => {
    if (user?.id) {
      // Initialize OneSignal when user is authenticated
      oneSignalService.init().then(() => {
        // Set external user ID to link OneSignal with your user system
        oneSignalService.setExternalUserId(user.id);
        
        // Add user tags for targeted notifications
        oneSignalService.addTags({
          userId: user.id,
          username: user.username || 'unknown'
        });
      });
    }
  }, [user?.id]);

  return null;
}

// PWA initialization component
function PWAInit() {
  useEffect(() => {
    try {
      // PWA manager initializes automatically on import
      // Add PWA event listeners
      const handlePWAEvent = (event: any) => {
        try {
          console.log('PWA Event:', event.type, event.details);
        } catch (error) {
          console.error('PWA: Error logging event:', error);
        }
      };
      
      pwaManager.addEventListener(handlePWAEvent);
      
      // Setup PWA shortcuts and handle URL-based navigation
      handleShortcutNavigation();
      setupPWAShortcutListeners();
      
      return () => {
        try {
          pwaManager.removeEventListener(handlePWAEvent);
        } catch (error) {
          console.error('PWA: Error removing event listener:', error);
        }
      };
    } catch (error) {
      console.error('PWA: Error initializing PWA components:', error);
    }
  }, []);

  return null;
}

function Router() {
  return (
    <Switch>
      {/* Suspension page bypasses auth check */}
      <Route path="/account-suspended" component={AccountSuspended} />
      
      {/* All other routes require authentication */}
      <Route path="*">
        <AuthCheck>
          <OneSignalInit />
          <PWAInit />
          <PWAInstaller />

          <Switch>
            <Route path="/" component={Home} />
            <Route path="/groups" component={Groups} />
            <Route path="/group/:id" component={GroupProfile} />
            <Route path="/quest" component={Quest} />
            <Route path="/profile" component={Profile} />
            <Route path="/profile/:userId" component={SharedProfile} />
            <Route path="/collectors" component={Collectors} />
            <Route path="/collecting" component={Collecting} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/notification-settings" component={NotificationSettings} />
            <Route path="/settings" component={Settings} />
            <Route path="/account-settings" component={AccountSettings} />
            <Route path="/download-app" component={DownloadApp} />
            <Route path="/community-guidelines" component={CommunityGuidelines} />
            <Route path="/content-moderation-rules" component={ContentModerationRules} />
            <Route path="/moderation" component={ContentModerationDashboard} />
            <Route path="/moderation/:contentType/:flagId" component={ModerationDetailPage} />
            <Route path="/moderation/review/:appealId" component={VideoReviewPage} />
            <Route path="/moderation/video/:videoId" component={VideoModerationReviewPage} />
            <Route path="/content-moderation" component={ContentModerationDashboard} />
            <Route path="/moderation-decisions" component={ModerationDecisions} />
            <Route path="/user-strikes" component={UserStrikes} />
            <Route path="/strikes" component={UserStrikes} />
            <Route path="/strikes/:userId" component={UserStrikeDetails} />
            <Route path="/feedback" component={Feedback} />
            <Route path="/delete-account" component={DeleteAccount} />
            <Route path="/video/:id" component={VideoSharePage} />
            <Route path="/payment-success" component={PaymentSuccess} />

            <Route component={NotFound} />
          </Switch>
        </AuthCheck>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MusicProvider>
          <Toaster />
          <Router />
        </MusicProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
