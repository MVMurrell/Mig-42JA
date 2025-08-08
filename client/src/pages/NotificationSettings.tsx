import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { ArrowLeft, Bell, Heart, MessageCircle, Video, Users, MapPin, Flag, AlertTriangle, Smartphone, Info } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { useState, useEffect } from "react";
import { oneSignalService } from "@/lib/oneSignal.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";

interface NotificationPreferences {
  allNotifications: boolean;
  videoLikes: boolean;
  videoComments: boolean;
  videoCommentVideos: boolean;
  comments: boolean;
  newCollectors: boolean;
  groupInvitations: boolean;
  gemNearby: boolean;
  contentFlaggedUser: boolean;
  contentFlaggedAi: boolean;
  contentDeletedComment: boolean;
  contentDeletedVideoComment: boolean;
  contentDeletedThreadMessage: boolean;
  contentDeletedThreadVideo: boolean;
  threadMessageFlagged: boolean;
  pushNotifications?: boolean;
  pushVideoLikes?: boolean;
  pushVideoComments?: boolean;
  pushVideoCommentVideos?: boolean;
  pushComments?: boolean;
  pushNewCollectors?: boolean;
  pushGroupInvitations?: boolean;
}

const notificationTypes = [
  {
    key: 'videoLikes',
    label: 'Likes',
    description: 'When someone likes your videos',
    icon: Heart,
    color: 'text-red-500',
    disabled: false
  },
  {
    key: 'videoComments',
    label: 'Comments',
    description: 'When someone comments on your videos',
    icon: MessageCircle,
    color: 'text-blue-500',
    disabled: false
  },
  {
    key: 'videoCommentVideos',
    label: 'Video comments',
    description: 'When someone adds a video comment to your content',
    icon: Video,
    color: 'text-purple-500',
    disabled: false
  },
  {
    key: 'newCollectors',
    label: 'New collectors',
    description: 'When someone starts collecting your gems',
    icon: Users,
    color: 'text-indigo-500',
    disabled: false
  },
  {
    key: 'groupInvitations',
    label: 'Group invitations',
    description: 'When someone adds you to their group',
    icon: Users,
    color: 'text-cyan-500',
    disabled: false
  },
  {
    key: 'gemNearby',
    label: 'Gems you collect are nearby',
    description: 'When content you collect is within 500ft of your location',
    icon: MapPin,
    color: 'text-orange-500',
    disabled: false
  }
];

const mandatoryNotificationTypes = [
  {
    key: 'contentFlaggedUser',
    label: 'Content flagged by users',
    description: 'When your content is flagged by other users',
    icon: Flag,
    color: 'text-yellow-600',
    disabled: true
  },
  {
    key: 'contentFlaggedAi',
    label: 'Content flagged by AI',
    description: 'When your content is flagged by our AI systems',
    icon: AlertTriangle,
    color: 'text-red-600',
    disabled: true
  },
  {
    key: 'contentDeletedComment',
    label: 'Comments deleted',
    description: 'When your comments are removed by moderation',
    icon: AlertTriangle,
    color: 'text-red-700',
    disabled: true
  },
  {
    key: 'contentDeletedVideoComment',
    label: 'Video comments deleted',
    description: 'When your video comments are removed by moderation',
    icon: AlertTriangle,
    color: 'text-red-700',
    disabled: true
  },
  {
    key: 'contentDeletedThreadMessage',
    label: 'Thread messages deleted',
    description: 'When your thread messages are removed by moderation',
    icon: AlertTriangle,
    color: 'text-red-700',
    disabled: true
  },
  {
    key: 'contentDeletedThreadVideo',
    label: 'Thread videos deleted',
    description: 'When your thread videos are removed by moderation',
    icon: AlertTriangle,
    color: 'text-red-700',
    disabled: true
  },
  {
    key: 'threadMessageFlagged',
    label: 'Thread messages flagged',
    description: 'When your thread messages are flagged for review',
    icon: Flag,
    color: 'text-yellow-600',
    disabled: true
  }
];

export default function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    allNotifications: true,
    videoLikes: true,
    videoComments: true,
    videoCommentVideos: true,
    comments: true,
    newCollectors: true,
    groupInvitations: true,
    gemNearby: true,
    contentFlaggedUser: true,
    contentFlaggedAi: true,
    contentDeletedComment: true,
    contentDeletedVideoComment: true,
    contentDeletedThreadMessage: true,
    contentDeletedThreadVideo: true,
    threadMessageFlagged: true,
    pushNotifications: false,
    pushVideoLikes: true,
    pushVideoComments: true,
    pushVideoCommentVideos: true,
    pushComments: true,
    pushNewCollectors: true,
    pushGroupInvitations: true,
  });

  const [pushStatus, setPushStatus] = useState<{
    supported: boolean;
    permission: string;
    subscribed: boolean;
  }>({
    supported: false,
    permission: 'default',
    subscribed: false
  });

  const { data: userPreferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ['/api/notifications/preferences'],
    enabled: !!user,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (newPreferences: Partial<NotificationPreferences>) =>
      apiRequest('/api/notifications/preferences', 'PUT', newPreferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      toast({
        title: "Settings updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification preferences.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (userPreferences && typeof userPreferences === 'object') {
      setPreferences(prev => ({
        ...prev,
        ...userPreferences
      }));
    }
  }, [userPreferences]);

  // Initialize OneSignal and check push notification status
  useEffect(() => {
    const checkPushStatus = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setPushStatus(prev => ({ ...prev, supported: true }));
        
        try {
          await oneSignalService.init();
          const permission = Notification.permission;
          const subscribed = await oneSignalService.isSubscribed();
          
          setPushStatus(prev => ({
            ...prev,
            permission,
            subscribed
          }));
        } catch (error) {
          console.error('Error checking push status:', error);
        }
      }
    };

    checkPushStatus();
  }, []);

  const handlePushToggle = async (checked: boolean) => {
    if (!pushStatus.supported) {
      toast({
        title: "Not supported",
        description: "Push notifications are not supported on this device.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (checked) {
        // Check browser permission status first
        const browserPermission = Notification.permission;
        
        if (browserPermission === 'denied') {
          toast({
            title: "Notifications blocked",
            description: "Please enable notifications in your browser settings first. Click the lock icon in your address bar or go to browser settings.",
            variant: "destructive",
          });
          return;
        }

        // Request permission and subscribe
        const permission = await oneSignalService.requestPermission();
        if (permission) {
          console.log('🔔 OneSignal: Permission granted, setting up user mapping...');
          
          // Set external user ID for this user
          if (user?.id) {
            await oneSignalService.setExternalUserId(user.id);
            console.log('🔔 OneSignal: External user ID set to:', user.id);
          }
          
          const subscribed = await oneSignalService.isSubscribed();
          const userId = await oneSignalService.getUserId();
          
          console.log('🔔 OneSignal: Setup complete - subscribed:', subscribed, 'userId:', userId);
          
          setPushStatus(prev => ({
            ...prev,
            permission: 'granted',
            subscribed
          }));
          
          setPreferences(prev => ({ ...prev, pushNotifications: true }));
          await updatePreferencesMutation.mutateAsync({ pushNotifications: true });
          
          toast({
            title: "Push notifications enabled",
            description: "You'll now receive notifications on this device.",
          });
        } else {
          // Check what went wrong
          const finalPermission = Notification.permission;
          if (finalPermission === 'denied') {
            toast({
              title: "Permission blocked",
              description: "Notifications were blocked. Please click the lock icon in your address bar and allow notifications, then try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Setup failed",
              description: "Could not set up push notifications. Please try again or check your browser settings.",
              variant: "destructive",
            });
          }
        }
      } else {
        // Disable push notifications
        setPreferences(prev => ({ ...prev, pushNotifications: false }));
        updatePreferencesMutation.mutate({ pushNotifications: false });
        
        toast({
          title: "Push notifications disabled",
          description: "You won't receive push notifications on this device.",
        });
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      
      // Provide specific error guidance
      const errorMessage = error instanceof Error ? error.message : String(error);
      let description = "Failed to update push notification settings.";
      
      if (errorMessage.includes('blocked') || errorMessage.includes('denied')) {
        description = "Notifications are blocked in your browser. Please enable them in your browser settings and try again.";
      }
      
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };



  const handleToggleAll = (checked: boolean) => {
    const newPreferences = {
      ...preferences,
      allNotifications: checked,
      // Only toggle optional notifications, not mandatory ones
      videoLikes: checked,
      videoComments: checked,
      videoCommentVideos: checked,
      comments: checked,
      newCollectors: checked,
      groupInvitations: checked,
      gemNearby: checked,
    };
    setPreferences(newPreferences);
    updatePreferencesMutation.mutate(newPreferences);
  };

  const handleTogglePreference = (key: keyof NotificationPreferences, checked: boolean) => {
    const newPreferences = { ...preferences, [key]: checked };
    
    // If turning off a preference and all notifications was on, turn off all notifications
    if (!checked && preferences.allNotifications) {
      newPreferences.allNotifications = false;
    }
    
    // If turning on a preference and all optional preferences are now on, turn on all notifications
    if (checked) {
      const optionalPrefs = ['videoLikes', 'videoComments', 'videoCommentVideos', 'comments', 'newCollectors', 'groupInvitations', 'gemNearby'];
      const allOptionalOn = optionalPrefs.every(pref => 
        pref === key ? checked : newPreferences[pref as keyof NotificationPreferences]
      );
      if (allOptionalOn) {
        newPreferences.allNotifications = true;
      }
    }
    
    setPreferences(newPreferences);
    updatePreferencesMutation.mutate(newPreferences);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to manage notification settings</h1>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notification settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-6">
        <Link href="/profile">
          <Button variant="outline" size="sm" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Bell className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
        <h1 className="text-xl sm:text-2xl font-bold truncate">Notifications</h1>
      </div>

      <div className="space-y-4">
        {/* Push Notifications Section */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Push notifications</h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Info className="w-4 h-4 text-gray-500" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>How to Enable Push Notifications</DialogTitle>
                          <DialogDescription>
                            If notifications are blocked, follow these browser-specific steps:
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 text-sm">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Chrome/Edge:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-gray-600">
                              <li>Click the site settings icon in your address bar</li>
                              <li>Find "Notifications" and change to "Allow"</li>
                              <li>Refresh the page and try again</li>
                            </ol>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Firefox:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-gray-600">
                              <li>Click the shield icon in your address bar</li>
                              <li>Go to Permissions → Allow notifications</li>
                              <li>Refresh the page and try again</li>
                            </ol>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Safari:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-gray-600">
                              <li>Safari menu → Preferences → Websites</li>
                              <li>Find "Notifications" and set to "Allow"</li>
                              <li>Refresh the page and try again</li>
                            </ol>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-blue-800 text-sm">
                              <strong>Quick fix:</strong> Try refreshing this page and clicking the toggle again. Your browser should show a permission dialog.
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Receive notifications on your device even when the app is closed
                  </p>
                  {!pushStatus.supported && (
                    <p className="text-xs text-orange-600 mt-1">
                      Not supported on this device
                    </p>
                  )}
                  {pushStatus.supported && pushStatus.permission === 'denied' && (
                    <p className="text-xs text-red-600 mt-1">
                      Blocked in browser settings - click the info icon for help
                    </p>
                  )}
                  {pushStatus.supported && pushStatus.permission === 'default' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Click toggle to enable notifications
                    </p>
                  )}
                  {pushStatus.supported && pushStatus.permission === 'granted' && preferences.pushNotifications && (
                    <p className="text-xs text-green-600 mt-1">
                      Push notifications active
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pushStatus.supported && pushStatus.permission === 'denied' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Reset Instructions",
                        description: "1. Refresh this page 2. Click the notification toggle 3. Allow when prompted",
                        duration: 5000,
                      });
                      setTimeout(() => window.location.reload(), 1000);
                    }}
                  >
                    Reset
                  </Button>
                )}

                <Switch
                  checked={preferences.pushNotifications || false}
                  onCheckedChange={handlePushToggle}
                  disabled={updatePreferencesMutation.isPending || !pushStatus.supported}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Push Notification Types - Only show if push notifications are enabled */}
        {preferences.pushNotifications && pushStatus.permission === 'granted' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Push Notification Types</CardTitle>
              <p className="text-sm text-gray-600">
                Choose which types of notifications to receive as push notifications on your device.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationTypes.map((type) => {
                const IconComponent = type.icon;
                const pushKey = `push${type.key.charAt(0).toUpperCase() + type.key.slice(1)}` as keyof NotificationPreferences;
                
                return (
                  <div key={`push-${type.key}`} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <IconComponent className={`w-4 h-4 ${type.color}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{type.label}</h4>
                        <p className="text-sm text-gray-600">Push notifications for {type.description.toLowerCase()}</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences[pushKey] as boolean || false}
                      onCheckedChange={(checked) => handleTogglePreference(pushKey, checked)}
                      disabled={updatePreferencesMutation.isPending || type.disabled}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Master Toggle for In-app Notifications */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">In-app Notifications</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Turn off all optional notifications at once
                </p>
              </div>
              <Switch
                checked={preferences.allNotifications}
                onCheckedChange={handleToggleAll}
                disabled={updatePreferencesMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* In-app Notifications Section - Only show if all notifications are enabled */}
        {preferences.allNotifications && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">In-app Notification Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <div key={type.key} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <IconComponent className={`w-4 h-4 ${type.color}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{type.label}</h4>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences[type.key as keyof NotificationPreferences] as boolean}
                      onCheckedChange={(checked) => handleTogglePreference(type.key as keyof NotificationPreferences, checked)}
                      disabled={updatePreferencesMutation.isPending || type.disabled}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Mandatory Notifications Section - HIDDEN FOR NOW */}
        {/* 
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Required Notifications</CardTitle>
            <p className="text-sm text-gray-600">
              These notifications cannot be disabled as they relate to content policy and account security.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {mandatoryNotificationTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <div key={type.key} className="flex items-center justify-between py-2 opacity-75">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <IconComponent className={`w-4 h-4 ${type.color}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{type.label}</h4>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={true}
                    disabled={true}
                    className="opacity-50"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
        */}

        {/* Help Text */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              You can control which notifications you receive for different activities. 
              Content policy notifications cannot be disabled to ensure you stay informed 
              about important account and safety matters.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}