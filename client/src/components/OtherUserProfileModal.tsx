import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient.ts";
import { useAuth } from "@/hooks/useAuth.ts";
import { ArrowLeft, Bell, Settings, Share, Heart, MapPin, Play, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast.ts";
import artIcon from "@assets/Property 1=Red.png";
import gamesIcon from "@assets/Property 1=Green.png";
import educationIcon from "@assets/Property 1=Orange.png";
import productsIcon from "@assets/Property 1=Purple.png";
import servicesIcon from "@assets/Property 1=Pink.png";
import reviewsIcon from "@assets/Property 1=Yellow.png";
import eventsIcon from "@assets/Property 1=Blue.png";
import { formatDistance } from "@/lib/distanceUtils.ts";

interface OtherUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userLocation?: { lat: number; lng: number };
  onPlayVideo?: (video: any) => void;
  onNavigateToMap?: (video: any) => void;
}

export default function OtherUserProfileModal({
  isOpen,
  onClose,
  userId,
  userLocation,
  onPlayVideo,
  onNavigateToMap
}: OtherUserProfileModalProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("jems");

  // Fetch other user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/users", userId, "profile"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/profile`);
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      return response.json();
    },
    enabled: isOpen && !!userId
  });

  // Fetch user videos with distance
  const { data: userVideos, isLoading: videosLoading } = useQuery({
    queryKey: ["/api/users", userId, "videos-with-distance"],
    queryFn: async () => {
      if (!userLocation) return [];
      const response = await fetch(`/api/users/${userId}/videos-with-distance?lat=${userLocation.lat}&lng=${userLocation.lng}`);
      return response.json();
    },
    enabled: isOpen && !!userId && !!userLocation
  });

  // Fetch user's public groups (groups they own)
  const { data: userGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ["/api/users", userId, "groups"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/groups`);
      return response.json();
    },
    enabled: isOpen && !!userId
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (userProfile?.isFollowed) {
        await apiRequest(`/api/users/${userId}/unfollow`, "POST");
      } else {
        await apiRequest(`/api/users/${userId}/follow`, "POST");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: userProfile?.isFollowed ? "Unfollowed" : "Following",
        description: userProfile?.isFollowed 
          ? "You stopped collecting this user" 
          : `You are now collecting ${userProfile?.firstName || userProfile?.username}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Notification toggle mutation
  const notificationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest(`/api/users/${userId}/notifications`, "PUT", { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "profile"] });
      toast({
        title: "Notifications Updated",
        description: "Notification settings have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update notification settings.",
        variant: "destructive",
      });
    },
  });

  const handleFollow = () => {
    followMutation.mutate();
  };

  const handleNotificationToggle = (enabled: boolean) => {
    notificationMutation.mutate(enabled);
  };

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await apiRequest(`/api/groups/${groupId}/join`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "groups"] });
      toast({
        title: "Joined Group",
        description: "You have successfully joined the group!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to join group. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await apiRequest(`/api/groups/${groupId}/leave`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "groups"] });
      toast({
        title: "Left Group",
        description: "You have left the group.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to leave group. Please try again.",
        variant: "destructive",
      });
    },
  });

  const playVideo = (video: any) => {
    onClose();
    if (onPlayVideo) {
      onPlayVideo(video);
    }
  };

  const navigateToMap = (video: any) => {
    onClose();
    if (onNavigateToMap) {
      onNavigateToMap(video);
    }
  };

  const handleShare = () => {
    const profileUrl = `${window.location.origin}/profile/${userId}`;
    const shareText = `Check out ${userProfile?.firstName || userProfile?.username || 'this user'}'s profile on Jemzy!`;
    
    if (navigator.share) {
      navigator.share({
        title: `${userProfile?.firstName || userProfile?.username || 'User'} on Jemzy`,
        text: shareText,
        url: profileUrl,
      }).catch((error) => {
        console.log('Error sharing:', error);
        fallbackShare(profileUrl, shareText);
      });
    } else {
      fallbackShare(profileUrl, shareText);
    }
  };

  const fallbackShare = (url: string, text: string) => {
    navigator.clipboard.writeText(`${text} ${url}`).then(() => {
      toast({
        title: "Link Copied!",
        description: "Profile link has been copied to your clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Share",
        description: `${text} ${url}`,
      });
    });
  };

  if (!isOpen) return null;

  if (profileLoading) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
        <div className="relative min-h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Profile</h1>
            <div className="w-8 h-8" />
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
        <div className="relative min-h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Profile</h1>
            <div className="w-8 h-8" />
          </div>
          <div className="text-center py-8">
            <div className="text-lg font-semibold mb-2">User not found</div>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="relative min-h-full">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={onClose}
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
          <h1 className="text-lg font-bold text-gray-900">Profile</h1>
          <div className="flex space-x-2">
            <button className="w-8 h-8 flex items-center justify-center">
              <Bell className="w-5 h-5 text-red-500" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="p-6 text-center">
          <img
            src={userProfile.profileImageUrl || "https://images.unsplash.com/photo-1494790108755-2616b612b1c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"}
            alt="Profile"
            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-gray-100 object-cover"
          />
          
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {userProfile.firstName && userProfile.lastName 
              ? `${userProfile.firstName} ${userProfile.lastName}`
              : userProfile.firstName || userProfile.username || "Unknown User"
            }
          </h2>
          
          <div className="text-gray-600 mb-4">@{userProfile.username || userProfile.id}</div>
          
          <div className="flex justify-center space-x-8 mb-4">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{userProfile.stats?.followers || 0}</div>
              <div className="text-sm text-gray-600">Collectors</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{userProfile.stats?.following || 0}</div>
              <div className="text-sm text-gray-600">Collecting</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{userProfile.stats?.likes || 0}</div>
              <div className="text-sm text-gray-600">Likes</div>
            </div>
          </div>
          
          <div className="flex space-x-3 mb-6">
            <div className="flex-1 flex space-x-2">
              <button 
                className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
                  userProfile.isFollowed 
                    ? 'bg-gray-100 text-gray-700 border border-gray-300' 
                    : 'bg-gray-900 text-white'
                }`}
                disabled={followMutation.isPending}
                onClick={handleFollow}
              >
                {followMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                ) : userProfile.isFollowed ? (
                  "Collecting"
                ) : (
                  "Collect"
                )}
              </button>
              {userProfile.isFollowed && (
                <button 
                  className={`py-2 px-3 rounded-xl font-medium transition-colors border ${
                    userProfile.notificationsEnabled 
                      ? 'bg-red-500 text-white border-red-500' 
                      : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                  disabled={notificationMutation.isPending}
                  onClick={() => handleNotificationToggle(!userProfile.notificationsEnabled)}
                >
                  {notificationMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            <button 
              className="py-2 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium border border-gray-300"
              onClick={handleShare}
            >
              <Share className="w-4 h-4 mr-2 inline" />
              Share
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button 
              onClick={() => setActiveTab("jems")}
              className={`py-3 text-center ${
                // Show groups tab if user has public groups, otherwise make jems full width
                userGroups && userGroups.length > 0 ? "flex-1" : "w-full"
              } ${
                activeTab === "jems" 
                  ? "border-b-2 border-red-500 text-red-500 font-medium" 
                  : "text-gray-500"
              }`}
            >
              <MapPin className="w-5 h-5 mx-auto mb-1" />
              <div className="text-xs">Jems</div>
            </button>
            {userGroups && userGroups.length > 0 && (
              <button 
                onClick={() => setActiveTab("groups")}
                className={`flex-1 py-3 text-center ${
                  activeTab === "groups" 
                    ? "border-b-2 border-red-500 text-red-500 font-medium" 
                    : "text-gray-500"
                }`}
              >
                <Users className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">Groups</div>
              </button>
            )}
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="p-4">
          {activeTab === "jems" && (
            <>
              {videosLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full" />
                </div>
              ) : !userVideos || userVideos.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Jems Yet</h3>
                  <p className="text-gray-600">This user hasn't placed any Jems yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {userVideos.map((video: any, index: number) => {
                    // Jemzy 7-category system with proper colors
                    const categoryData = {
                      art: { color: 'hsl(0, 72%, 51%)', icon: artIcon },
                      games: { color: 'hsl(142, 71%, 45%)', icon: gamesIcon },
                      education: { color: 'hsl(24, 100%, 48%)', icon: educationIcon },
                      products: { color: 'hsl(259, 53%, 70%)', icon: productsIcon },
                      services: { color: 'hsl(320, 70%, 55%)', icon: servicesIcon },
                      reviews: { color: 'hsl(45, 100%, 50%)', icon: reviewsIcon },
                      events: { color: 'hsl(207, 90%, 54%)', icon: eventsIcon }
                    };
                    
                    const category = categoryData[video.category as keyof typeof categoryData] || categoryData.art;
                    
                    return (
                      <div 
                        key={video.id}
                        className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group cursor-pointer"
                        onClick={() => {
                          if (video.hasWatched) {
                            playVideo(video);
                          } else {
                            navigateToMap(video);
                          }
                        }}
                      >
                        {/* Video preview/thumbnail background */}
                        {video.hasWatched ? (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <div className="text-center text-white">
                              <Play className="w-8 h-8 mx-auto mb-1" />
                              <span className="text-xs font-medium truncate">{video.title}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center relative">
                            <div className="text-center">
                              <img 
                                src={category.icon} 
                                alt={video.category} 
                                className="w-12 h-auto mx-auto object-contain"
                              />
                            </div>
                            {/* Distance overlay at bottom */}
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="text-center">
                                <span className="text-white text-xs font-medium bg-black/70 px-2 py-1 rounded">
                                  {video.distance ? formatDistance(video.distance) : 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Overlay with gradient and info - only for watched videos */}
                        {video.hasWatched && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                            {/* Bottom stats */}
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="flex items-center justify-between text-white text-xs">
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center bg-black/70 px-1 rounded">
                                    <Play className="w-3 h-3 mr-1" />
                                    {video.views || 0}
                                  </div>
                                  <div className="flex items-center bg-black/70 px-1 rounded">
                                    <Heart className="w-3 h-3 mr-1" />
                                    {video.likes || 0}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs">{video.distance ? formatDistance(video.distance) : 'Unknown'}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onNavigateToMap) {
                                        onNavigateToMap(video);
                                      }
                                    }}
                                    className="text-white hover:text-red-400 transition-colors"
                                    title="Show on map"
                                  >
                                    <MapPin className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Top title */}
                            <div className="absolute top-2 left-2 right-2">
                              <div className="text-white text-xs font-medium truncate bg-black/70 px-2 py-1 rounded">
                                {video.title}
                              </div>
                            </div>
                            
                            {/* Play button overlay on hover */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Play className="w-6 h-6 text-white ml-1" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          
          {activeTab === "groups" && (
            <>
              {groupsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full" />
                </div>
              ) : !userGroups || userGroups.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Public Groups</h3>
                  <p className="text-gray-600">This user hasn't created any public groups yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userGroups.map((group: any) => (
                    <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{group.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <Users className="w-3 h-3 mr-1" />
                            <span>{group.memberCount || 0} members</span>
                            {group.distance && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{formatDistance(group.distance)} away</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          {group.isMember ? (
                            <button 
                              className="px-3 py-1 bg-gray-500 text-white text-xs rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50"
                              onClick={() => leaveGroupMutation.mutate(group.id)}
                              disabled={leaveGroupMutation.isPending}
                            >
                              {leaveGroupMutation.isPending ? "Leaving..." : "Leave"}
                            </button>
                          ) : (
                            <button 
                              className="px-3 py-1 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                              onClick={() => joinGroupMutation.mutate(group.id)}
                              disabled={joinGroupMutation.isPending}
                            >
                              {joinGroupMutation.isPending ? "Joining..." : "Join"}
                            </button>
                          )}
                          <button 
                            className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded-full hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              toast({
                                title: group.name,
                                description: `${group.description}\n\n${group.memberCount} members`,
                              });
                            }}
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}