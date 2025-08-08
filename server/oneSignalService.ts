const ONESIGNAL_APP_ID = "89816e8e-3d7d-4b33-a45c-58090f1257c9";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

interface OneSignalNotification {
  app_id: string;
  include_external_user_ids?: string[];
  include_player_ids?: string[];
  headings: {
    en: string;
  };
  contents: {
    en: string;
  };
  url?: string;
  large_icon?: string;
  big_picture?: string;
  data?: Record<string, any>;
}

class OneSignalService {
  private baseUrl = 'https://onesignal.com/api/v1';

  async sendNotification(notification: OneSignalNotification): Promise<boolean> {
    if (!ONESIGNAL_REST_API_KEY) {
      console.error('OneSignal REST API key not configured');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('OneSignal API error:', error);
        return false;
      }

      const result = await response.json();
      console.log('OneSignal notification sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending OneSignal notification:', error);
      return false;
    }
  }

  async sendToUser(userId: string, title: string, message: string, options?: {
    url?: string;
    imageUrl?: string;
    data?: Record<string, any>;
  }): Promise<boolean> {
    const notification: OneSignalNotification = {
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: [userId],
      headings: {
        en: title,
      },
      contents: {
        en: message,
      },
      ...(options?.url && { url: options.url }),
      ...(options?.imageUrl && { 
        large_icon: options.imageUrl,
        big_picture: options.imageUrl 
      }),
      ...(options?.data && { data: options.data }),
    };

    return this.sendNotification(notification);
  }

  async sendToMultipleUsers(userIds: string[], title: string, message: string, options?: {
    url?: string;
    imageUrl?: string;
    data?: Record<string, any>;
  }): Promise<boolean> {
    const notification: OneSignalNotification = {
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: userIds,
      headings: {
        en: title,
      },
      contents: {
        en: message,
      },
      ...(options?.url && { url: options.url }),
      ...(options?.imageUrl && { 
        large_icon: options.imageUrl,
        big_picture: options.imageUrl 
      }),
      ...(options?.data && { data: options.data }),
    };

    return this.sendNotification(notification);
  }

  // Test notification for development
  async sendTestNotification(userId: string): Promise<boolean> {
    return this.sendToUser(
      userId,
      "Test from Jemzy",
      "Push notifications are working! 🎉",
      {
        url: "/notifications",
        data: { type: "test" }
      }
    );
  }
}

export const oneSignalService = new OneSignalService();