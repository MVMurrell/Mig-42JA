declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

const ONESIGNAL_APP_ID = "89816e8e-3d7d-4b33-a45c-58090f1257c9";

class OneSignalService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    // Check if OneSignal is already loaded globally
    if (window.OneSignal && typeof window.OneSignal.init === 'function') {
      console.log('🔔 OneSignal: Already initialized globally, skipping initialization');
      this.initialized = true;
      return;
    }

    this.initPromise = this.initializeOneSignal();
    return this.initPromise;
  }

  private async initializeOneSignal(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔔 OneSignal: Starting initialization...');
      
      // Load OneSignal SDK
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      
      script.onload = () => {
        console.log('🔔 OneSignal: SDK script loaded successfully');
      };
      
      script.onerror = (error) => {
        console.error('🔔 OneSignal: Failed to load SDK script:', error);
        reject(new Error('Failed to load OneSignal SDK'));
      };
      
      document.head.appendChild(script);

      // Initialize OneSignal when loaded
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          console.log('🔔 OneSignal: Initializing with config...');
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true, // For development
          });

          this.initialized = true;
          console.log('🔔 OneSignal: Initialized successfully');
          resolve();
        } catch (error) {
          console.error('🔔 OneSignal: Initialization failed:', error);
          reject(error);
        }
      });
    });
  }

  async requestPermission(): Promise<boolean> {
    console.log('🔔 OneSignal: Starting permission request...');
    
    await this.init();
    
    if (!window.OneSignal) {
      console.error('🔔 OneSignal: OneSignal not loaded');
      return false;
    }

    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.error('🔔 OneSignal: This browser does not support notifications');
        return false;
      }

      // Check current permission status
      const currentPermission = Notification.permission;
      console.log('🔔 OneSignal: Current browser permission:', currentPermission);
      
      if (currentPermission === 'denied') {
        console.error('🔔 OneSignal: Notification permissions are blocked. User must manually enable them in browser settings.');
        return false;
      }

      console.log('🔔 OneSignal: Requesting OneSignal permission...');

      if (currentPermission === 'granted') {
        // Already granted, just initialize OneSignal subscription
        console.log('🔔 OneSignal: Browser permission already granted, initializing OneSignal subscription...');
        try {
          const permission = await window.OneSignal.Notifications.requestPermission();
          console.log('🔔 OneSignal: OneSignal permission result:', permission);
          
          // Handle undefined or null results as success if browser permission is granted
          if (permission === undefined || permission === null) {
            console.log('🔔 OneSignal: OneSignal returned undefined, but browser permission is granted - treating as success');
            return true;
          }
          
          return Boolean(permission);
        } catch (error) {
          console.error('🔔 OneSignal: Error during OneSignal subscription:', error);
          // If OneSignal fails but browser permission is granted, still return true
          console.log('🔔 OneSignal: OneSignal failed but browser permission is granted - treating as success');
          return true;
        }
      }

      // Request permission (only works if permission is 'default')
      console.log('🔔 OneSignal: Browser permission is default, requesting both browser and OneSignal permission...');
      try {
        const permission = await window.OneSignal.Notifications.requestPermission();
        console.log('🔔 OneSignal: OneSignal permission result:', permission);
        
        // Check browser permission after OneSignal request
        const newBrowserPermission = Notification.permission;
        console.log('🔔 OneSignal: Browser permission after OneSignal request:', newBrowserPermission);
        
        if (newBrowserPermission === 'granted') {
          console.log('🔔 OneSignal: Browser permission granted - treating as success');
          return true;
        }
        
        return Boolean(permission);
      } catch (error) {
        console.error('🔔 OneSignal: Error during permission request:', error);
        
        // Check if browser permission was granted despite OneSignal error
        const finalBrowserPermission = Notification.permission;
        if (finalBrowserPermission === 'granted') {
          console.log('🔔 OneSignal: Browser permission granted despite OneSignal error - treating as success');
          return true;
        }
        
        return false;
      }
    } catch (error) {
      console.error('🔔 OneSignal: Error requesting notification permission:', error);
      console.error('🔔 OneSignal: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Check if the error is due to blocked permissions
      if (error instanceof Error && error.message.includes('blocked')) {
        console.error('🔔 OneSignal: Permissions are blocked in browser settings');
      }
      
      return false;
    }
  }

  async isSubscribed(): Promise<boolean> {
    await this.init();
    
    if (!window.OneSignal) return false;

    try {
      const subscription = await window.OneSignal.User.PushSubscription.optedIn;
      return subscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  async getUserId(): Promise<string | null> {
    await this.init();
    
    if (!window.OneSignal) return null;

    try {
      // Try multiple methods to get the OneSignal player/user ID
      let userId = null;
      
      // Method 1: Try PushSubscription.id
      try {
        userId = await window.OneSignal.User.PushSubscription.id;
        if (userId) {
          console.log('🔔 OneSignal: Got user ID from PushSubscription.id:', userId);
          return userId;
        }
      } catch (e) {
        console.log('🔔 OneSignal: PushSubscription.id not available:', e);
      }
      
      // Method 2: Try onesignalId
      try {
        userId = await window.OneSignal.User.onesignalId;
        if (userId) {
          console.log('🔔 OneSignal: Got user ID from onesignalId:', userId);
          return userId;
        }
      } catch (e) {
        console.log('🔔 OneSignal: onesignalId not available:', e);
      }
      
      // Method 3: Try legacy getUserId
      try {
        userId = await window.OneSignal.getUserId();
        if (userId) {
          console.log('🔔 OneSignal: Got user ID from getUserId():', userId);
          return userId;
        }
      } catch (e) {
        console.log('🔔 OneSignal: getUserId() not available:', e);
      }
      
      console.log('🔔 OneSignal: No user ID available through any method');
      return null;
    } catch (error) {
      console.error('🔔 OneSignal: Error getting user ID:', error);
      return null;
    }
  }

  async setExternalUserId(userId: string): Promise<void> {
    await this.init();
    
    if (!window.OneSignal) return;

    try {
      await window.OneSignal.login(userId);
      console.log('OneSignal external user ID set:', userId);
    } catch (error) {
      console.error('Error setting external user ID:', error);
    }
  }

  async addTags(tags: Record<string, string>): Promise<void> {
    await this.init();
    
    if (!window.OneSignal) return;

    try {
      await window.OneSignal.User.addTags(tags);
      console.log('OneSignal tags added:', tags);
    } catch (error) {
      console.error('Error adding tags:', error);
    }
  }

  // Test notification (for development)
  async sendTestNotification(): Promise<void> {
    await this.init();
    
    if (!window.OneSignal) return;

    try {
      // This is just for testing - real notifications are sent from backend
      console.log('Test notification would be sent from backend');
    } catch (error) {
      console.error('Error with test notification:', error);
    }
  }
}

export const oneSignalService = new OneSignalService();