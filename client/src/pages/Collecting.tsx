import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useToast } from "@/hooks/use-toast.ts";

interface CollectingUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImageUrl?: string;
  isCollecting: boolean;
  notificationsEnabled?: boolean;
}

export default function Collecting() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notificationStates, setNotificationStates] = useState<Record<string, boolean>>({});

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: () => fetch('/api/auth/user').then(res => res.json())
  });

  // Fetch users you're collecting
  const { data: collectingUsers = [], isLoading, isError } = useQuery({
    queryKey: ['/api/users', user?.id, 'collecting'],
    queryFn: async () => {
      const response = await fetch(`/api/users/${user?.id}/collecting`);
      if (!response.ok) {
        throw new Error('Failed to fetch collecting users');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id
  });

  // Mutation to stop collecting a user
  const stopCollectingMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const response = await fetch(`/api/uncollect-user/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to stop collecting');
      return response.json();
    },
    onMutate: async ({ userId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/users', user?.id, 'collecting'] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['/api/users', user?.id, 'collecting']);
      
      // Optimistically update by removing the user from the list
      if (previousData && Array.isArray(previousData)) {
        queryClient.setQueryData(['/api/users', user?.id, 'collecting'], 
          previousData.filter((u: CollectingUser) => u.id !== userId)
        );
      }
      
      return { previousData };
    },
    onSuccess: (_, { userId }) => {
      toast({
        title: "Stopped collecting",
        description: "You won't see their jems in your feed anymore."
      });
    },
    onError: (err, { userId }, context) => {
      // If the mutation fails, rollback to the previous data
      if (context?.previousData) {
        queryClient.setQueryData(['/api/users', user?.id, 'collecting'], context.previousData);
      }
      toast({
        title: "Error",
        description: "Failed to stop collecting. Please try again.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'collecting'] });
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
    onSuccess: (_, { userId, enabled }) => {
      // Update local state immediately
      setNotificationStates(prev => ({
        ...prev,
        [userId]: enabled
      }));
      
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

  const handleStopCollecting = (collectingUser: CollectingUser) => {
    stopCollectingMutation.mutate({ userId: collectingUser.id });
  };

  const handleNotificationToggle = (collectingUser: CollectingUser) => {
    // Check local state first, then fall back to API data
    const currentState = notificationStates[collectingUser.id] ?? collectingUser.notificationsEnabled ?? true;
    const enabled = !currentState;
    notificationMutation.mutate({ userId: collectingUser.id, enabled });
  };

  const navigateToProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button 
          onClick={() => navigate('/profile')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors random-hover"
          onMouseEnter={(e) => {
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            e.currentTarget.style.setProperty('--hover-color', randomColor);
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <h1 className="text-lg font-semibold">Collecting</h1>
        
        <div className="w-10"></div> {/* Spacer for center alignment */}
      </div>

      {/* Collecting List */}
      <div className="p-4">
        {isError ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowLeft className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading collecting list</h3>
            <p className="text-gray-500 mb-4">
              There was a problem loading your collecting list. Please try refreshing the page.
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="mx-auto"
            >
              Refresh Page
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded-full"></div>
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              </div>
            ))}
          </div>
        ) : collectingUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowLeft className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Not collecting anyone yet</h3>
            <p className="text-gray-500">
              Start collecting users to see their jems in your feed.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {collectingUsers.map((collectingUser: CollectingUser) => (
              <div 
                key={collectingUser.id}
                className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => navigateToProfile(collectingUser.id)}
                  className="flex items-center space-x-3 flex-1"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                    {collectingUser.profileImageUrl ? (
                      <img 
                        src={collectingUser.profileImageUrl} 
                        alt={`${collectingUser.firstName} ${collectingUser.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {collectingUser.firstName?.[0]}{collectingUser.lastName?.[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <h3 className="font-medium text-gray-900">
                      {collectingUser.firstName} {collectingUser.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">@{collectingUser.username}</p>
                  </div>
                </button>
                
                <div className="flex items-center space-x-2">
                  {/* Notification toggle */}
                  <Button
                    onClick={() => handleNotificationToggle(collectingUser)}
                    disabled={notificationMutation.isPending}
                    variant="ghost"
                    size="sm"
                    className="p-2 h-8 w-8"
                    title={(notificationStates[collectingUser.id] ?? collectingUser.notificationsEnabled ?? true) ? "Disable notifications" : "Enable notifications"}
                  >
                    {(notificationStates[collectingUser.id] ?? collectingUser.notificationsEnabled ?? true) ? (
                      <Bell className="w-4 h-4 text-blue-600" />
                    ) : (
                      <BellOff className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => handleStopCollecting(collectingUser)}
                    disabled={stopCollectingMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Collecting
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