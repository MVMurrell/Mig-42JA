import { useState, useEffect } from "react";
import { X, Users, Lock, Unlock, Edit, UserMinus, Plus, MessageSquare } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient.ts";
import { useAuth } from "@/hooks/useAuth.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { formatDistance } from "@/lib/distanceUtils.ts";
import { isUnauthorizedError } from "@/lib/authUtils.ts";
import GroupEditModal from "./GroupEditModal.tsx";

interface GroupProfileModalProps {
  groupId: string;
  onClose: () => void;
  onNavigateToMap?: (video: any) => void;
  userLocation?: { lat: number; lng: number } | null;
}

interface GroupVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  latitude: string;
  longitude: string;
  thumbnailUrl?: string;
  userId: string;
  views: number;
  likes: number;
  createdAt: string;
  watchedByUser: boolean;
  distance?: number;
  userProfileImageUrl?: string;
}

interface GroupThread {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  messageCount: number;
  lastMessageAt: string;
  creatorName: string;
  creatorProfileImage: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  coverImageUrl?: string;
  createdBy: string;
  isPublic: boolean;
  memberCount: number;
  latitude: string;
  longitude: string;
  createdAt: string;
  updatedAt: string;
}

interface MembershipStatus {
  isMember: boolean;
  isOwner: boolean;
}

const categoryIcons: { [key: string]: string } = {
  travel: "/attached_assets/Property 1=Blue.png",
  lifestyle: "/attached_assets/Property 1=Green.png", 
  fitness: "/attached_assets/Property 1=Orange.png",
  food: "/attached_assets/Property 1=Red.png",
  entertainment: "/attached_assets/Property 1=Purple.png",
  education: "/attached_assets/Property 1=Yellow.png",
  default: "/attached_assets/Property 1=Pink.png"
};

export default function GroupProfileModal({ groupId, onClose, onNavigateToMap, userLocation }: GroupProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"jems" | "threads">("jems");
  const [showEditModal, setShowEditModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    retry: false,
  });

  // Fetch group videos
  const { data: groupVideos = [], isLoading: videosLoading } = useQuery<GroupVideo[]>({
    queryKey: ["/api/groups", groupId, "videos"],
    retry: false,
  });

  // Fetch group threads
  const { data: groupThreads = [], isLoading: threadsLoading } = useQuery<GroupThread[]>({
    queryKey: ["/api/groups", groupId, "threads"],
    retry: false,
  });

  // Check if user is member
  const { data: membershipStatus } = useQuery<MembershipStatus>({
    queryKey: ["/api/groups", groupId, "membership"],
    retry: false,
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/groups/${groupId}/join`, {method: "POST"});
    },
    onSuccess: () => {
      toast({
        title: "Joined Group",
        description: "You have successfully joined the group!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "membership"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to join group. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/groups/${groupId}/leave`,{method: "DELETE"});
    },
    onSuccess: () => {
      toast({
        title: "Left Group",
        description: "You have successfully left the group.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "membership"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to leave group. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVideoClick = (video: GroupVideo) => {
    if (video.watchedByUser) {
      // For watched videos, show video player directly
      // Implementation would go here
    } else {
      // For unwatched videos, navigate to map for purchase
      if (onNavigateToMap) {
        onNavigateToMap(video);
      }
    }
  };

  const calculateDistance = (videoLat: string, videoLng: string): number => {
    if (!userLocation) return 0;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = userLocation.lat * Math.PI/180;
    const φ2 = parseFloat(videoLat) * Math.PI/180;
    const Δφ = (parseFloat(videoLat) - userLocation.lat) * Math.PI/180;
    const Δλ = (parseFloat(videoLng) - userLocation.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  if (groupLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <p className="text-center text-gray-600">Group not found</p>
          <Button onClick={onClose} className="w-full mt-4">
            Close
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = user && group && (user as any).id === group.createdBy;
  const isMember = membershipStatus?.isMember;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Group Profile</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Group Info Section */}
          <div className="p-6 border-b">
            <div className="flex items-start space-x-4">
              {/* Group Cover Image */}
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                {group.coverImageUrl ? (
                  <img
                    src={group.coverImageUrl}
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                {/* Group Name */}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{group.name}</h1>
                
                {/* Group Description */}
                <p className="text-gray-600 mb-3">{group.description}</p>
                
                {/* Group Stats */}
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{group.memberCount} members</span>
                  </div>
                  
                  <Badge variant={group.isPublic ? "secondary" : "outline"}>
                    {group.isPublic ? (
                      <>
                        <Unlock className="w-3 h-3 mr-1" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 mr-1" />
                        Private
                      </>
                    )}
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {isOwner ? (
                    <Button onClick={() => setShowEditModal(true)} size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Group
                    </Button>
                  ) : isMember ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => leaveGroupMutation.mutate()}
                      disabled={leaveGroupMutation.isPending}
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      Leave Group
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => joinGroupMutation.mutate()}
                      disabled={joinGroupMutation.isPending}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Join Group
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab("jems")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "jems"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Jems ({groupVideos.length})
              </button>
              <button
                onClick={() => setActiveTab("threads")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "threads"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Threads ({groupThreads.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === "jems" && (
              <div>
                {videosLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : groupVideos.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Jems yet</h3>
                    <p className="text-gray-500">This group hasn't shared any Jems yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupVideos.map((video: GroupVideo) => {
                      const distance = userLocation ? calculateDistance(video.latitude, video.longitude) : 0;
                      
                      return (
                        <div
                          key={video.id}
                          onClick={() => handleVideoClick(video)}
                          className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group"
                        >
                          {video.watchedByUser ? (
                            // Watched video - show title overlay
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                              <div className="absolute bottom-0 left-0 right-0 p-4">
                                <h3 className="text-white font-medium text-sm mb-2 line-clamp-2">
                                  {video.title}
                                </h3>
                                <div className="flex items-center justify-between text-xs text-gray-300">
                                  <span>{video.views} views</span>
                                  <span>{formatDistance(distance)}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Unwatched video - show category gem and distance
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-300 to-gray-500 flex flex-col items-center justify-center">
                              <img
                                src={categoryIcons[video.category as keyof typeof categoryIcons] || categoryIcons.default}
                                alt={video.category}
                                className="w-12 h-12 mb-4"
                              />
                              <div className="absolute bottom-4 left-0 right-0 text-center">
                                <p className="text-gray-700 text-sm font-medium">
                                  {formatDistance(distance)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "threads" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Discussion Threads</h3>
                  {isMember && (
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      New Thread
                    </Button>
                  )}
                </div>

                {threadsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : groupThreads.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No discussions yet</h3>
                    <p className="text-gray-500">Start the conversation by creating a new thread.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupThreads.map((thread: GroupThread) => (
                      <div
                        key={thread.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          <img
                            src={thread.creatorProfileImage}
                            alt={thread.creatorName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{thread.title}</h4>
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">{thread.description}</p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>by {thread.creatorName}</span>
                              <div className="flex items-center space-x-4">
                                <span>{thread.messageCount} messages</span>
                                <span>{new Date(thread.lastMessageAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Group Edit Modal */}
      {showEditModal && group && (
        <GroupEditModal
          group={group}
          onClose={() => setShowEditModal(false)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
          }}
        />
      )}
    </div>
  );
}