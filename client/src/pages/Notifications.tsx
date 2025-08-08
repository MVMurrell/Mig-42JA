import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Bell, Trash2, ExternalLink, ArrowLeft, Heart, MessageCircle, Video, Users, MapPin, Flag, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";
import type { Notification } from "@shared/schema.ts";

// Notification type configurations with icons and navigation
const notificationConfig = {
  video_like: { icon: Heart, color: "text-red-500", bgColor: "bg-red-50" },
  video_comment: { icon: MessageCircle, color: "text-blue-500", bgColor: "bg-blue-50" },
  video_comment_video: { icon: Video, color: "text-purple-500", bgColor: "bg-purple-50" },
  comment: { icon: MessageCircle, color: "text-green-500", bgColor: "bg-green-50" },
  new_collector: { icon: Users, color: "text-indigo-500", bgColor: "bg-indigo-50" },
  group_invitation: { icon: Users, color: "text-cyan-500", bgColor: "bg-cyan-50" },
  gem_nearby: { icon: MapPin, color: "text-orange-500", bgColor: "bg-orange-50" },
  content_flagged_user: { icon: Flag, color: "text-yellow-600", bgColor: "bg-yellow-50" },
  content_flagged_ai: { icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50" },
  content_deleted_comment: { icon: AlertTriangle, color: "text-red-700", bgColor: "bg-red-100" },
  content_deleted_video_comment: { icon: AlertTriangle, color: "text-red-700", bgColor: "bg-red-100" },
  content_deleted_thread_message: { icon: AlertTriangle, color: "text-red-700", bgColor: "bg-red-100" },
  content_deleted_thread_video: { icon: AlertTriangle, color: "text-red-700", bgColor: "bg-red-100" },
  thread_message_flagged: { icon: Flag, color: "text-yellow-600", bgColor: "bg-yellow-50" },
};

function getNotificationIcon(type: string) {
  const config = notificationConfig[type as keyof typeof notificationConfig];
  return config || { icon: Bell, color: "text-gray-500", bgColor: "bg-gray-50" };
}

function handleNotificationClick(notification: any, setLocation: (path: string) => void) {
  // Generate navigation URLs based on notification type and content
  let navigationUrl = "";
  
  switch (notification.type) {
    case "video_like":
    case "video_comment":
    case "video_comment_video":
      if (notification.relatedVideoId) {
        navigationUrl = `/video/${notification.relatedVideoId}`;
      }
      break;
      
    case "comment":
      if (notification.relatedVideoId) {
        navigationUrl = `/video/${notification.relatedVideoId}?focus=comments`;
      }
      break;
      
    case "new_collector":
      if (notification.relatedUserId) {
        navigationUrl = `/profile/${notification.relatedUserId}`;
      }
      break;
      
    case "group_invitation":
      if (notification.relatedGroupId) {
        navigationUrl = `/group/${notification.relatedGroupId}`;
      }
      break;
      
    case "gem_nearby":
      if (notification.latitude && notification.longitude) {
        navigationUrl = `/?lat=${notification.latitude}&lng=${notification.longitude}&zoom=18`;
      } else if (notification.relatedVideoId) {
        navigationUrl = `/video/${notification.relatedVideoId}`;
      }
      break;
      
    case "content_flagged_user":
    case "content_flagged_ai":
    case "thread_message_flagged":
      // Navigate to profile to see content status
      navigationUrl = "/profile?tab=content";
      break;
      
    case "content_deleted_comment":
    case "content_deleted_video_comment":
      if (notification.relatedVideoId) {
        navigationUrl = `/video/${notification.relatedVideoId}`;
      } else {
        navigationUrl = "/profile?tab=content";
      }
      break;
      
    case "content_deleted_thread_message":
    case "content_deleted_thread_video":
      if (notification.relatedGroupId && notification.relatedThreadId) {
        navigationUrl = `/group/${notification.relatedGroupId}?thread=${notification.relatedThreadId}`;
      } else if (notification.relatedGroupId) {
        navigationUrl = `/group/${notification.relatedGroupId}`;
      } else {
        navigationUrl = "/groups";
      }
      break;
      
    default:
      // Use actionUrl if provided, otherwise go to profile
      navigationUrl = notification.actionUrl || "/profile";
  }
  
  if (navigationUrl) {
    setLocation(navigationUrl);
  }
}

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: () => apiRequest('/api/notifications/read', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: any) => {
      console.error("Failed to mark notifications as read:", error);
    }
  });

  // Automatically mark all notifications as read when the page loads
  useEffect(() => {
    if (user && notifications.length > 0) {
      const hasUnread = notifications.some((n: any) => !n.isRead);
      if (hasUnread) {
        markAsReadMutation.mutate();
      }
    }
  }, [user, notifications.length]);

  const unreadCount = 0; // Always 0 since we auto-mark as read

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to view notifications</h1>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
      {/* Mobile-optimized header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-6">
        <Link href="/profile">
          <Button variant="outline" size="sm" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Bell className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
        <h1 className="text-xl sm:text-2xl font-bold truncate">Notifications</h1>
      </div>

      {Array.isArray(notifications) && notifications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
            <p className="text-gray-600">
              When you receive notifications about your content, followers, or moderation updates, they'll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {Array.isArray(notifications) && notifications.map((notification: any) => {
            const iconConfig = getNotificationIcon(notification.type);
            const IconComponent = iconConfig.icon;
            
            return (
              <Card 
                key={notification.id} 
                className={`transition-all cursor-pointer hover:shadow-md ${!notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                onClick={() => handleNotificationClick(notification, setLocation)}
              >
                <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Notification Icon */}
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${iconConfig.bgColor} flex items-center justify-center shrink-0`}>
                      <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${iconConfig.color}`} />
                    </div>
                    
                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg leading-tight pr-2">
                        {notification.title}
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    
                    {/* Thumbnail if available */}
                    {notification.thumbnailUrl && (
                      <img
                        src={notification.thumbnailUrl}
                        alt="Content thumbnail"
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0"
                      />
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {notification.message}
                  </p>
                  
                  {/* Special handling for content violations */}
                  {(notification.type.includes('content_flagged') || notification.type.includes('content_deleted')) && (
                    <div className="mt-3 sm:mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                        Content Policy Issue
                      </p>
                      <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 mt-1 leading-relaxed">
                        Review our content guidelines to understand our community standards and avoid future issues.
                      </p>
                    </div>
                  )}
                  
                  {/* Special handling for nearby gems */}
                  {notification.type === 'gem_nearby' && (
                    <div className="mt-3 sm:mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                        Nearby Content
                      </p>
                      <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mt-1 leading-relaxed">
                        Tap to view this content on the map and discover what's happening near you.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}