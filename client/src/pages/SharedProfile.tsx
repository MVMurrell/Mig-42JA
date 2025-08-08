import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Share, MapPin, MessageCircle, Heart, Users, Play, Bookmark, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useAuth } from "@/hooks/useAuth.ts";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient.ts";
import VideoPlayerModal from "@/components/VideoPlayerModal.tsx";
import { useToast } from "@/hooks/use-toast.ts";

export default function SharedProfile() {
  const params = useParams();
  const userId = params.userId;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("videos");
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [isCollecting, setIsCollecting] = useState(false);
  const [, setLocation] = useLocation();

  // Check if returning from Add Members modal
  const isReturningFromAddMembers = new URLSearchParams(window.location.search).get('returnToAddMembers') === 'true';

  const handleBackToAddMembers = () => {
    try {
      const modalState = sessionStorage.getItem('addMembersModal');
      console.log('Back to Add Members - found state:', modalState);
      
      if (modalState) {
        const parsedState = JSON.parse(modalState);
        
        // Navigate back to the group with a flag to restore the modal
        // Don't remove the state yet - let the group page handle it
        setLocation(`/group/${parsedState.groupId}?restoreAddMembers=true`);
      } else {
        // No modal state found, just go back to groups
        console.log('No modal state found, going back to groups');
        setLocation('/groups');
      }
    } catch (error) {
      console.error('Error restoring modal state:', error);
      // Fallback: just go back to groups
      setLocation('/groups');
    }
  };

  // Get profile user data
  const { data: profileUser, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      if (!userId) return null;
      console.log('🔍 SHARED PROFILE: Fetching profile for userId:', userId);
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error('🔍 SHARED PROFILE: API request failed:', response.status, response.statusText);
          throw new Error(`Failed to fetch profile: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('🔍 SHARED PROFILE: Profile data received:', data);
        return data;
      } catch (error) {
        console.error('🔍 SHARED PROFILE: Error fetching profile:', error);
        throw error;
      }
    },
    enabled: !!userId && !!user,
    retry: false,
  });

  // Get profile user's videos
  const { data: userVideos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["/api/users", userId, "videos"],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/users/${userId}/videos`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch videos: ${response.status}`);
      return await response.json();
    },
    enabled: !!userId && !!user,
    retry: false,
  });

  // Get profile user's liked videos
  const { data: likedVideos = [] } = useQuery({
    queryKey: ["/api/users", userId, "liked"],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/users/${userId}/liked`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch liked videos: ${response.status}`);
      return await response.json();
    },
    enabled: !!userId && !!user,
    retry: false,
  });

  // Initialize collecting state when profile data loads
  useEffect(() => {
    if (profileUser && userId) {
      // Check sessionStorage for the current collecting state
      const collectingState = sessionStorage.getItem('userCollecting');
      if (collectingState) {
        try {
          const parsedState = JSON.parse(collectingState);
          const isCurrentlyCollecting = parsedState[userId] || false;
          setIsCollecting(isCurrentlyCollecting);
        } catch (error) {
          setIsCollecting(false);
        }
      } else {
        setIsCollecting(false);
      }
    }
  }, [profileUser, userId]);

  // Redirect to login with return URL if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      window.location.href = `/api/auth/login?returnTo=${returnUrl}`;
    }
  }, [user, authLoading]);

  const handleShareProfile = async () => {
    try {
      const shareUrl = window.location.href;
      
      if (navigator.share) {
        await navigator.share({
          title: `${profileUser?.firstName || ""} ${profileUser?.lastName || ""}`.trim() || "Profile",
          text: `Check out ${profileUser?.firstName || ""} ${profileUser?.lastName || ""}`.trim() + "'s profile on Jemzy!",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Profile link has been copied to your clipboard.",
        });
      }
    } catch (error: any) {
      // Don't show error for user canceling share dialog
      if (error.name === 'AbortError') {
        return; // User canceled, this is normal behavior
      }
      
      console.error("Error sharing profile:", error);
      toast({
        title: "Share failed",
        description: "Unable to share profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Collect/uncollect mutation
  const collectMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'collect' | 'uncollect' }) => {
      const endpoint = action === 'collect' ? `/api/users/${userId}/collect` : `/api/users/${userId}/uncollect`;
      const response = await apiRequest(endpoint, 'POST');
      return response.json();
    },
    onSuccess: (data, variables) => {
      const newCollectingState = variables.action === 'collect';
      setIsCollecting(newCollectingState);
      
      // Update sessionStorage to persist the collecting state
      const currentCollectingState = sessionStorage.getItem('userCollecting');
      let collectingStateObj = {};
      if (currentCollectingState) {
        try {
          collectingStateObj = JSON.parse(currentCollectingState);
        } catch (error) {
          collectingStateObj = {};
        }
      }
      collectingStateObj[variables.userId] = newCollectingState;
      sessionStorage.setItem('userCollecting', JSON.stringify(collectingStateObj));
      
      // Update the profile user data locally to reflect the collector count change
      queryClient.setQueryData(['/api/users', userId], (oldData: any) => {
        if (!oldData || !oldData.stats) return oldData;
        return {
          ...oldData,
          stats: {
            ...oldData.stats,
            collectorsCount: variables.action === 'collect' 
              ? oldData.stats.collectorsCount + 1 
              : Math.max(0, oldData.stats.collectorsCount - 1)
          }
        };
      });
      
      toast({
        title: variables.action === 'collect' ? 'Collecting!' : 'Uncollected',
        description: variables.action === 'collect' 
          ? 'You are now collecting their jems' 
          : 'You are no longer collecting their jems',
      });
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
    },
    onError: (error: any) => {
      console.error('Error with collect action:', error);
      toast({
        title: 'Action failed',
        description: 'Unable to complete action. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCollectToggle = () => {
    if (!userId) return;
    const action = isCollecting ? 'uncollect' : 'collect';
    collectMutation.mutate({ userId, action });
  };

  const handleGoBack = () => {
    // Go back to previous page or home
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (profileError || !profileUser) {
    console.log('🔍 SHARED PROFILE: Showing error state - profileError:', profileError, 'profileUser:', profileUser);
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Profile not found</h1>
          <p className="text-gray-600 mb-4">This profile doesn't exist or isn't available.</p>
          {profileError && (
            <p className="text-red-600 text-sm mb-4">Error: {profileError.message}</p>
          )}
          <Button onClick={handleGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="relative min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {isReturningFromAddMembers ? (
            <button
              onClick={handleBackToAddMembers}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Add Members</span>
            </button>
          ) : (
            <button
              onClick={handleGoBack}
              className="w-8 h-8 flex items-center justify-center rounded-md random-hover"
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
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-900">
            {profileUser?.firstName || profileUser?.lastName 
              ? `${profileUser.firstName || ""} ${profileUser.lastName || ""}`.trim()
              : "Profile"
            }
          </h1>
          <div className="w-8"></div> {/* Spacer for center alignment */}
        </div>

        {/* Profile Info */}
        <div className="p-6 text-center">
          <img
            src={profileUser?.profileImageUrl || "https://images.unsplash.com/photo-1494790108755-2616b612b1c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"}
            alt="Profile"
            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-gray-100 object-cover"
          />
          
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {profileUser?.firstName || profileUser?.lastName 
              ? `${profileUser.firstName || ""} ${profileUser.lastName || ""}`.trim()
              : "User"
            }
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {profileUser?.bio || "No bio available."}
          </p>

          {/* Stats */}
          <div className="flex justify-center space-x-8 mb-6">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{profileUser?.stats?.followers || 0}</div>
              <div className="text-sm text-gray-600">Collectors</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{profileUser?.stats?.following || 0}</div>
              <div className="text-sm text-gray-600">Collecting</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{profileUser?.stats?.likes || 0}</div>
              <div className="text-sm text-gray-600">Likes</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mb-6">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleCollectToggle}
              disabled={collectMutation.isPending}
            >
              {isCollecting ? <Minus className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {collectMutation.isPending ? 'Loading...' : (isCollecting ? 'Collecting Jems' : 'Collect')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleShareProfile}>
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("videos")}
              className={`flex-1 py-3 text-center ${
                activeTab === "videos"
                  ? "border-b-2 border-red-500 text-red-500 font-medium"
                  : "text-gray-500"
              }`}
            >
              <MapPin className="w-5 h-5 mx-auto mb-1" />
            </button>
            <button
              onClick={() => setActiveTab("likes")}
              className={`flex-1 py-3 text-center ${
                activeTab === "likes"
                  ? "border-b-2 border-red-500 text-red-500 font-medium"
                  : "text-gray-500"
              }`}
            >
              <Heart className="w-5 h-5 mx-auto mb-1" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {activeTab === "videos" && (
            <div>
              {userVideos.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {userVideos.map((video: any, index: number) => (
                    <div 
                      key={video.id || index} 
                      className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group cursor-pointer"
                      onClick={() => {
                        setSelectedVideoIndex(index);
                        setShowVideoPlayer(true);
                      }}
                    >
                      <video
                        src={video.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="text-white text-xs font-medium text-left line-clamp-2">
                          {video.title || 'Untitled'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No videos yet</p>
                  <p className="text-sm">This user hasn't shared any videos</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "likes" && (
            <div>
              {likedVideos.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {likedVideos.map((video: any, index: number) => (
                    <div 
                      key={video.id || index} 
                      className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group cursor-pointer"
                      onClick={() => {
                        setSelectedVideoIndex(index);
                        setShowVideoPlayer(true);
                      }}
                    >
                      <video
                        src={video.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="text-white text-xs font-medium text-left line-clamp-2">
                          {video.title || 'Untitled'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No liked videos</p>
                  <p className="text-sm">This user hasn't liked any videos yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {showVideoPlayer && (
        <VideoPlayerModal
          videos={activeTab === "videos" ? userVideos : likedVideos}
          initialIndex={selectedVideoIndex}
          onClose={() => setShowVideoPlayer(false)}
          onNavigateToProfile={() => {
            setShowVideoPlayer(false);
            window.location.href = '/profile';
          }}
        />
      )}
    </div>
  );
}