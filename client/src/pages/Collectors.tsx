import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { apiRequest } from "@/lib/queryClient.ts";

interface Collector {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImageUrl?: string;
  isCollecting: boolean;
  notificationsEnabled?: boolean;
}

export default function Collectors() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user ID first
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user']
  });

  // Fetch collectors/followers
  const { data: collectors = [], isLoading } = useQuery({
    queryKey: ['/api/users', user?.id, 'collectors'],
    queryFn: () => fetch(`/api/users/${user?.id}/collectors`).then(res => res.json()),
    enabled: !!user?.id
  });

  // Mutation to follow/unfollow a user
  const collectMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'collect' | 'uncollect' }) => {
      const response = await fetch(`/api/users/${userId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to update collection status');
      return response.json();
    },
    onSuccess: (_, { userId, action }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'collectors'] });
      toast({
        title: action === 'collect' ? "Now collecting their jems!" : "Stopped collecting",
        description: action === 'collect' ? "You'll see their latest jems in your feed." : "You won't see their jems anymore."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update collection status. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation to toggle notification preferences
  const notificationMutation = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const response = await fetch(`/api/notifications/preferences/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ notificationsEnabled: enabled }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to update notification preferences');
      return response.json();
    },
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'collectors'] });
      toast({
        title: enabled ? "Notifications enabled" : "Notifications disabled",
        description: enabled ? "You'll get notified when they post new gems." : "You won't get notifications for their new gems."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification preferences. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCollectToggle = (collector: Collector) => {
    const action = collector.isCollecting ? 'uncollect' : 'collect';
    collectMutation.mutate({ userId: collector.id, action });
  };

  const handleNotificationToggle = (collector: Collector) => {
    if (!collector.isCollecting) return; // Only allow notification toggle for collected users
    const enabled = !collector.notificationsEnabled;
    notificationMutation.mutate({ userId: collector.id, enabled });
  };

  const navigateToProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between mobile-safe-area-top">
        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center justify-center w-10 h-10 rounded-md random-hover"
          onMouseEnter={(e) => {
            const colors = [
              'hsl(0, 72%, 51%)',     // Jemzy Red
              'hsl(24, 100%, 48%)',   // Jemzy Orange  
              'hsl(207, 90%, 54%)',   // Jemzy Blue
              'hsl(142, 71%, 45%)',   // Jemzy Green
              'hsl(259, 53%, 70%)',   // Jemzy Purple
              'hsl(45, 100%, 50%)',   // Jemzy Gold
              'hsl(320, 70%, 55%)',   // Pink
              'hsl(280, 65%, 60%)',   // Violet
              'hsl(180, 70%, 50%)',   // Cyan
              'hsl(50, 85%, 55%)',    // Bright Yellow
              'hsl(15, 80%, 60%)',    // Coral
              'hsl(270, 75%, 65%)',   // Magenta
            ];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            e.currentTarget.style.setProperty('--hover-color', randomColor);
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <h1 className="text-lg font-semibold">Collectors</h1>
        
        <div className="w-10"></div> {/* Spacer for center alignment */}
      </div>

      {/* Collectors List */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded-full"></div>
              </div>
            ))}
          </div>
        ) : collectors.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No collectors yet</h3>
            <p className="text-gray-500">
              When people start collecting your jems, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {collectors.map((collector: Collector) => (
              <div 
                key={collector.id}
                className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => navigateToProfile(collector.id)}
                  className="flex items-center space-x-3 flex-1"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                    {collector.profileImageUrl ? (
                      <img 
                        src={collector.profileImageUrl} 
                        alt={`${collector.firstName} ${collector.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {collector.firstName?.[0]}{collector.lastName?.[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <h3 className="font-medium text-gray-900">
                      {collector.firstName} {collector.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">@{collector.username}</p>
                  </div>
                </button>
                
                <div className="flex items-center space-x-2">
                  {/* Notification toggle - only show for collected users */}
                  {collector.isCollecting && (
                    <Button
                      onClick={() => handleNotificationToggle(collector)}
                      disabled={notificationMutation.isPending}
                      variant="ghost"
                      size="sm"
                      className="p-2 h-8 w-8"
                      title={collector.notificationsEnabled ? "Disable notifications" : "Enable notifications"}
                    >
                      {collector.notificationsEnabled ? (
                        <Bell className="w-4 h-4 text-blue-600" />
                      ) : (
                        <BellOff className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => handleCollectToggle(collector)}
                    disabled={collectMutation.isPending}
                    variant={collector.isCollecting ? "outline" : "default"}
                    size="sm"
                    className={
                      collector.isCollecting 
                        ? "border-gray-300 text-gray-700 hover:bg-gray-50" 
                        : "bg-black text-white hover:bg-gray-800"
                    }
                  >
                    {collector.isCollecting ? (
                      <>
                        <span className="mr-1">✓</span>
                        Collecting
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        Collect
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}