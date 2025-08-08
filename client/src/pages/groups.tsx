import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Plus, ArrowLeft, Users, Lock, Globe, MapPin, MessageCircle, Camera, Trash2, Send, X, UserPlus, Settings, Smile, AlertTriangle, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast.ts";
import { useAuth } from "@/hooks/useAuth.ts";
import { formatDistance } from "@/lib/distanceUtils.ts";
import { isUnauthorizedError } from "@/lib/authUtils.ts";
import VideoMessageRecorder from "@/components/VideoMessageRecorder.tsx";
import { VideoCommentPlayer } from "@/components/VideoPlayerModal.tsx";


interface Group {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  createdBy: string;
  latitude: string;
  longitude: string;
  memberCount: number;
  distance?: number;
  createdAt: string;
  isOwner?: boolean;
  isMember?: boolean;
  coverImageUrl?: string;
}

export default function GroupsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'discover' | 'myGroups' | 'create'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRadius, setSearchRadius] = useState(10);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [showThreads, setShowThreads] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true
  });

  const queryClient = useQueryClient();

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Fetch nearby groups
  const { data: nearbyGroups = [], isLoading: isLoadingNearby, error: nearbyError } = useQuery({
    queryKey: ["/api/groups/nearby", userLocation?.lat, userLocation?.lng, searchRadius],
    queryFn: async () => {
      if (!userLocation) {
        console.log("🔍 GROUPS FRONTEND: No user location available");
        throw new Error("Location required");
      }
      
      const url = `/api/groups/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${searchRadius}`;
      console.log("🔍 GROUPS FRONTEND: Fetching groups from:", url);
      console.log("🔍 GROUPS FRONTEND: User location:", userLocation);
      console.log("🔍 GROUPS FRONTEND: Search radius:", searchRadius);
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      console.log("🔍 GROUPS FRONTEND: Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log("🔍 GROUPS FRONTEND: Error response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("🔍 GROUPS FRONTEND: Received groups data:", data);
      console.log("🔍 GROUPS FRONTEND: Number of groups:", Array.isArray(data) ? data.length : 'Not an array');
      
      return data;
    },
    enabled: !!userLocation && activeTab === 'discover'
  });

  // Fetch user's owned groups
  const { data: userGroups = [], isLoading: isLoadingUserGroups } = useQuery({
    queryKey: ["/api/groups/owned"],
    enabled: activeTab === 'myGroups'
  }) as { data: Group[]; isLoading: boolean };

  // Fetch threads for selected group
  const { data: threads = [] } = useQuery({
    queryKey: ["/api/groups", selectedGroup?.id, "threads"],
    queryFn: () => {
      if (!selectedGroup) throw new Error("No group selected");
      return fetch(`/api/groups/${selectedGroup.id}/threads`).then(res => res.json());
    },
    enabled: !!selectedGroup && showThreads
  });

  // Fetch membership status for selected group
  const { data: membershipStatus } = useQuery({
    queryKey: ["/api/groups", selectedGroup?.id, "membership"],
    queryFn: () => {
      if (!selectedGroup) throw new Error("No group selected");
      return fetch(`/api/groups/${selectedGroup.id}/membership`).then(res => res.json());
    },
    enabled: !!selectedGroup && showThreads
  });

  // Fetch messages for selected thread
  const { data: messages = [] } = useQuery({
    queryKey: ["/api/threads", selectedThread?.id, "messages"],
    queryFn: () => {
      if (!selectedThread) throw new Error("No thread selected");
      return fetch(`/api/threads/${selectedThread.id}/messages`).then(res => res.json());
    },
    enabled: !!selectedThread && showMessaging
  });

  const createGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
      return apiRequest("/api/groups", "POST", groupData);
    },
    onSuccess: () => {
      toast({ title: "Group created successfully!" });
      setActiveTab('myGroups');
      setFormData({ name: '', description: '', isPublic: true });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/owned"] });
    }
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      console.log(`🔍 JOIN GROUP FRONTEND: Attempting to join group ${groupId}`);
      try {
        const result = await apiRequest(`/api/groups/${groupId}/join`, "POST");
        console.log(`🔍 JOIN GROUP FRONTEND: Successfully joined group ${groupId}`, result);
        return result;
      } catch (error) {
        console.error(`🔍 JOIN GROUP FRONTEND: Error joining group ${groupId}:`, error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log(`🔍 JOIN GROUP FRONTEND: Join mutation success handler triggered`);
      toast({ title: "Joined group successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/nearby"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/owned"] });
    },
    onError: (error) => {
      console.error(`🔍 JOIN GROUP FRONTEND: Join mutation error handler triggered:`, error);
      toast({ 
        title: "Failed to join group", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest(`/api/groups/${groupId}/leave`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Left group successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/nearby"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/owned"] });
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest(`/api/groups/${groupId}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Group deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/nearby"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/owned"] });
    }
  });

  const updateCoverImageMutation = useMutation({
    mutationFn: async ({ groupId, imageUrl }: { groupId: string; imageUrl: string }) => {
      return apiRequest(`/api/groups/${groupId}/cover-image`, "PUT", { imageUrl });
    },
    onSuccess: () => {
      toast({ title: "Cover image updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/nearby"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/owned"] });
    }
  });

  const createThreadMutation = useMutation({
    mutationFn: async ({ groupId, title }: { groupId: string; title: string }) => {
      return apiRequest(`/api/groups/${groupId}/threads`, "POST", { title });
    },
    onSuccess: () => {
      toast({ title: "Thread created successfully!" });
      setShowCreateThread(false);
      setThreadTitle("");
      queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedGroup?.id, "threads"] });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      return apiRequest(`/api/threads/${threadId}/messages`, "POST", { content });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/threads", selectedThread?.id, "messages"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userLocation) {
      toast({ title: "Location required", description: "Please enable location access to create a group.", variant: "destructive" });
      return;
    }
    
    createGroupMutation.mutate({
      ...formData,
      latitude: userLocation.lat.toString(),
      longitude: userLocation.lng.toString()
    });
  };

  const handleGroupClick = (group: Group) => {
    setLocation(`/group/${group.id}`);
  };

  // Filter nearby groups by search query
  const filteredNearbyGroups = Array.isArray(nearbyGroups) ? nearbyGroups.filter((group: Group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !threadTitle.trim()) return;
    
    createThreadMutation.mutate({
      groupId: selectedGroup.id,
      title: threadTitle
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !messageText.trim()) return;
    
    sendMessageMutation.mutate({
      threadId: selectedThread.id,
      content: messageText
    });
  };

  // Show threads view when chat button is clicked
  if (showThreads && selectedGroup) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowThreads(false);
                setSelectedGroup(null);
              }}
              className="p-2 random-hover"
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
            </Button>
            <div>
              <h1 className="text-xl font-bold">{selectedGroup.name}</h1>
              <p className="text-sm text-gray-500">Group Discussions</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Threads</h2>
                {membershipStatus?.isMember ? (
                  <Button
                    size="sm"
                    onClick={() => setShowCreateThread(true)}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Thread
                  </Button>
                ) : (
                  <p className="text-sm text-gray-500">Join group to create threads</p>
                )}
              </div>
            </div>

            {showCreateThread && (
              <div className="p-4 border-b bg-gray-50">
                <form onSubmit={handleCreateThread} className="space-y-3">
                  <Input
                    value={threadTitle}
                    onChange={(e) => setThreadTitle(e.target.value)}
                    placeholder="Thread title..."
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={!threadTitle.trim() || createThreadMutation.isPending}
                      size="sm"
                    >
                      Create
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCreateThread(false);
                        setThreadTitle("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            <div className="divide-y">
              {(threads as any[])?.length > 0 ? (
                (threads as any[]).map((thread: any) => (
                  <div key={thread.id} className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedThread(thread);
                      setShowMessaging(true);
                      setShowThreads(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{thread.title}</h3>
                        {thread.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{thread.description}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          {thread.messageCount || 0} messages • Created {new Date(thread.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-gray-400">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No threads yet. Start a new discussion!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show messaging view when thread is selected
  if (showMessaging && selectedThread) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowMessaging(false);
                setShowThreads(true);
              }}
              className="p-2 random-hover"
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
            </Button>
            <div>
              <h1 className="text-xl font-bold">{selectedThread.title}</h1>
              <p className="text-sm text-gray-500">{selectedGroup?.name}</p>
            </div>
          </div>

          {/* Thread Description */}
          {selectedThread.description && (
            <div className="bg-white rounded-lg border p-4 mb-4">
              <p className="text-sm text-gray-600">{selectedThread.description}</p>
            </div>
          )}

          <div className="bg-white rounded-lg border h-96 flex flex-col">
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {(messages as any[])?.length > 0 ? (
                (messages as any[]).map((message: any) => (
                  <div key={message.id} className="flex gap-3">
                    <img
                      src={message.userProfileImage || 'https://via.placeholder.com/32x32/e2e8f0/64748b?text=?'}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{message.userName || 'Anonymous'}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {/* Text message */}
                      {message.messageType === 'text' && message.message && (
                        <p className="text-sm text-gray-700">{message.message}</p>
                      )}
                      
                      {/* Video message */}
                      {message.messageType === 'video' && (
                        <div className="inline-block max-w-full">
                          {/* Processing Status Cards - Match comment section style */}
                          {['processing', 'uploaded', 'pending', 'failed', 'rejected_by_moderation', 'under_appeal'].includes(message.processingStatus) && message.userId === user?.id && (
                            <div className="w-48">
                              <button
                                className={`aspect-square rounded overflow-hidden relative group border-2 w-full ${
                                  message.processingStatus === 'rejected_by_moderation' ? 'bg-red-100 border-red-200' : 
                                  message.processingStatus === 'failed' ? 'bg-red-100 border-red-200' : 
                                  message.processingStatus === 'under_appeal' ? 'bg-blue-100 border-blue-200' :
                                  'bg-orange-100 border-orange-200'
                                }`}
                              >
                                <div className={`w-full h-full flex flex-col items-center justify-center ${
                                  message.processingStatus === 'rejected_by_moderation' ? 'bg-gradient-to-br from-red-200 to-red-300' :
                                  message.processingStatus === 'failed' ? 'bg-gradient-to-br from-red-200 to-red-300' :
                                  message.processingStatus === 'under_appeal' ? 'bg-gradient-to-br from-blue-200 to-blue-300' :
                                  'bg-gradient-to-br from-orange-200 to-orange-300'
                                }`}>
                                  <Video className={`w-8 h-8 mb-2 ${
                                    message.processingStatus === 'rejected_by_moderation' ? 'text-red-600' :
                                    message.processingStatus === 'failed' ? 'text-red-600' :
                                    message.processingStatus === 'under_appeal' ? 'text-blue-600 animate-pulse' :
                                    'text-orange-600 animate-pulse'
                                  }`} />
                                  <span className={`text-xs font-medium px-2 text-center ${
                                    message.processingStatus === 'rejected_by_moderation' ? 'text-red-700' :
                                    message.processingStatus === 'failed' ? 'text-red-700' :
                                    message.processingStatus === 'under_appeal' ? 'text-blue-700' :
                                    'text-orange-700'
                                  }`}>
                                    {message.processingStatus === 'processing' ? 'Processing...' : 
                                     message.processingStatus === 'uploaded' ? 'Reviewing...' : 
                                     message.processingStatus === 'failed' ? 'Failed' :
                                     message.processingStatus === 'rejected_by_moderation' ? 'Rejected' : 
                                     message.processingStatus === 'under_appeal' ? 'Under Appeal' : 'Pending...'}
                                  </span>
                                  
                                  {/* Detailed status messages */}
                                  {message.processingStatus === 'processing' && message.audioModerationStatus === 'pending' && (
                                    <span className="text-xs text-orange-600 px-2 text-center mt-1">
                                      Audio Analysis
                                    </span>
                                  )}
                                  {message.processingStatus === 'uploaded' && (
                                    <span className="text-xs text-orange-600 px-2 text-center mt-1">
                                      Content Review
                                    </span>
                                  )}
                                  {message.processingStatus === 'rejected_by_moderation' && (
                                    <span className="text-xs text-red-600 px-2 text-center mt-1">
                                      Content Violation
                                    </span>
                                  )}
                                  {message.processingStatus === 'failed' && (
                                    <span className="text-xs text-red-600 px-2 text-center mt-1">
                                      Upload Error
                                    </span>
                                  )}
                                  {message.processingStatus === 'under_appeal' && (
                                    <span className="text-xs text-blue-600 px-2 text-center mt-1">
                                      Being Reviewed
                                    </span>
                                  )}
                                </div>
                                
                                {/* Title overlay */}
                                <div className="absolute top-2 left-2 right-2">
                                  <div className={`text-xs font-medium truncate px-2 py-1 rounded ${
                                    message.processingStatus === 'rejected_by_moderation' || message.processingStatus === 'failed' ? 'text-red-800 bg-red-200/80' :
                                    'text-orange-800 bg-orange-200/80'
                                  }`}>
                                    Video Message
                                  </div>
                                </div>
                              </button>
                            </div>
                          )}
                          
                          {/* Approved video display */}
                          {message.processingStatus === 'approved' && message.videoUrl && (
                            <VideoCommentPlayer 
                              videoUrl={message.videoUrl}
                              duration={message.duration}
                              thumbnailUrl={message.thumbnailUrl}
                              commentData={message}
                              onFullscreen={() => {
                                console.log('Opening thread video in fullscreen:', message.id);
                                // TODO: Add fullscreen modal for thread videos if needed
                              }}
                            />
                          )}
                          
                          {/* Flagged video display */}
                          {message.processingStatus === 'flagged' && (
                            <div className="w-48 h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-red-200">
                              <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                              <p className="text-xs text-red-600 text-center px-2">
                                Content flagged for review
                              </p>
                              {message.flaggedReason && (
                                <p className="text-xs text-gray-500 text-center px-2 mt-1">
                                  {message.flaggedReason}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Fallback for legacy messages */}
                      {!message.messageType && message.content && (
                        <p className="text-sm text-gray-700">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>

            {membershipStatus?.isMember ? (
              <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowVideoRecorder(true)}
                    className="px-2"
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-4 border-t bg-gray-50 text-center">
                <p className="text-sm text-gray-600 mb-3">
                  Join {selectedGroup?.name} to participate in this conversation
                </p>
                <Button
                  onClick={() => selectedGroup?.id && joinGroupMutation.mutate(selectedGroup.id)}
                  disabled={joinGroupMutation.isPending || !selectedGroup?.id}
                  className="bg-red-500 hover:bg-red-600"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {joinGroupMutation.isPending ? 'Joining...' : 'Join Group'}
                </Button>
              </div>
            )}
          </div>

          {/* Video Message Recorder Modal */}
          {showVideoRecorder && (
            <VideoMessageRecorder
              threadId={selectedThread.id}
              onClose={() => setShowVideoRecorder(false)}
              onUploadComplete={() => {
                setShowVideoRecorder(false);
                queryClient.invalidateQueries({ queryKey: ["/api/threads", selectedThread.id, "messages"] });
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="p-2 random-hover"
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
            </Button>
            <h1 className="text-2xl font-bold">Groups</h1>
          </div>
          <Button onClick={() => setActiveTab('create')} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'discover'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('myGroups')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'myGroups'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Groups
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'discover' && (
          <div>
            <div className="space-y-4 mb-6">
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Distance range:</span>
                <select
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>1 mile</option>
                  <option value={5}>5 miles</option>
                  <option value={10}>10 miles</option>
                  <option value={25}>25 miles</option>
                  <option value={50}>50 miles</option>
                  <option value={100}>100 miles</option>
                </select>
              </div>
            </div>

            {/* Show location permission status */}
            {!userLocation && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  📍 Location access is required to find nearby groups. Please enable location permissions.
                </p>
              </div>
            )}

            {/* Show error messages */}
            {nearbyError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800">
                  ❌ Error loading groups: {nearbyError.message}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Check your authentication and location permissions
                </p>
              </div>
            )}

            {isLoadingNearby ? (
              <div className="text-center py-8 text-gray-500">Loading groups...</div>
            ) : filteredNearbyGroups.length > 0 ? (
              <div className="space-y-3">
                {filteredNearbyGroups.map((group: Group) => (
                  <div key={group.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {group.coverImageUrl ? (
                          <img 
                            src={group.coverImageUrl} 
                            alt={group.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{group.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {user?.id === group.createdBy && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                                  Owner
                                </span>
                              )}
                              {!group.isPublic && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                                  Private
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGroupClick(group)}
                          >
                            View Profile
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{group.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{group.memberCount} members</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{group.distance ? formatDistance(group.distance) : 'Nearby'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No groups found nearby. Be the first to create one!
              </div>
            )}
          </div>
        )}

        {activeTab === 'myGroups' && (
          <div>
            {isLoadingUserGroups ? (
              <div className="text-center py-8 text-gray-500">Loading your groups...</div>
            ) : userGroups.length > 0 ? (
              <div className="space-y-3">
                {userGroups.map((group: Group) => (
                  <div key={group.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {group.coverImageUrl ? (
                          <img 
                            src={group.coverImageUrl} 
                            alt={group.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{group.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {group.isOwner && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                                  Owner
                                </span>
                              )}
                              {!group.isPublic && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                                  Private
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGroupClick(group)}
                          >
                            View Profile
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{group.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{group.memberCount} members</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                You haven't joined any groups yet. Discover groups near you!
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your group"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                />
                <Label htmlFor="isPublic" className="flex items-center gap-2">
                  {formData.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {formData.isPublic ? 'Public' : 'Private'}
                </Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createGroupMutation.isPending}>
                  Create Group
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('discover')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>


    </div>
  );
}