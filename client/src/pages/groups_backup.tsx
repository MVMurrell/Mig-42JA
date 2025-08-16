import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Plus, ArrowLeft, Users, Lock, Globe, MapPin, MessageCircle, Camera, Trash2, Send, X, UserPlus, Settings, Smile } from "lucide-react";
import { useToast } from "@/hooks/use-toast.ts";
import { formatDistance } from "@/lib/distanceUtils.ts";

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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true
  });

  const { toast } = useToast();
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
  const { data: nearbyGroups = [], isLoading: isLoadingNearby } = useQuery({
    queryKey: ["/api/groups/nearby", userLocation?.lat, userLocation?.lng, searchRadius],
    queryFn: () => {
      if (!userLocation) throw new Error("Location required");
      return fetch(`/api/groups/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${searchRadius}`)
        .then(res => res.json());
    },
    enabled: !!userLocation && activeTab === 'discover'
  });

  // Fetch user's groups
  const { data: userGroups = [], isLoading: isLoadingUserGroups } = useQuery({
    queryKey: ["/api/groups/user"],
    enabled: activeTab === 'myGroups'
  }) as { data: Group[]; isLoading: boolean };

  // Other mutations and handlers would go here...
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
        return apiRequest("/api/groups", {method: "POST", data: groupData});
    },
    onSuccess: () => {
      toast({ title: "Group created successfully!" });
      setActiveTab('myGroups');
      setFormData({ name: '', description: '', isPublic: true });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/user"] });
    }
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest( `/api/groups/${groupId}/join`, { method: "POST" });
    },
    onSuccess: () => {
      toast({ title: "Joined group successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/nearby"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/user"] });
    }
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest(`/api/groups/${groupId}/leave`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Left group successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/nearby"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/user"] });
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest(`/api/groups/${groupId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Group deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/nearby"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/user"] });
    }
  });

  const updateCoverImageMutation = useMutation({
    mutationFn: async ({ groupId, imageUrl }: { groupId: string; imageUrl: string }) => {
      return apiRequest( `/api/groups/${groupId}/cover-image`, {method: "PUT", data: imageUrl });
    },
    onSuccess: () => {
      toast({ title: "Cover image updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/nearby"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/user"] });
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

  // Filter nearby groups by search query
  const filteredNearbyGroups = nearbyGroups.filter((group: Group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="p-2"
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

            {isLoadingNearby ? (
              <div className="text-center py-8 text-gray-500">Loading groups...</div>
            ) : filteredNearbyGroups.length > 0 ? (
              <div className="space-y-3">
                {filteredNearbyGroups.map((group: Group) => (
                  <div key={group.id} className="border rounded-lg p-4 space-y-3 relative">
                    {/* Invite button in top right */}
                    {group.isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-3 right-3"
                        onClick={() => {
                          navigator.clipboard.writeText(`Join my group: ${group.name} - ${window.location.origin}/groups/${group.id}`);
                          toast({
                            title: "Invite link copied!",
                            description: "Share this link to invite people to your group.",
                          });
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Invite
                      </Button>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="space-y-2">
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
                          {/* Edit photo button under photo for owner */}
                          {group.isOwner && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e: any) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      updateCoverImageMutation.mutate({
                                        groupId: group.id,
                                        imageUrl: reader.result as string
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                            >
                              Edit Photo
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 pr-16">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{group.name}</h3>
                          {group.isOwner && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{group.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{group.memberCount} members</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{group.distance ? formatDistance(group.distance) : 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      {group.isMember ? (
                        <>
                          {/* Chat button for all members */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedGroup(group);
                              setShowThreads(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                          
                          {group.isOwner ? (
                            // Additional owner controls
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this group?')) {
                                  deleteGroupMutation.mutate(group.id);
                                }
                              }}
                              disabled={deleteGroupMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          ) : (
                            // Leave button for non-owners
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => leaveGroupMutation.mutate(group.id)}
                              disabled={leaveGroupMutation.isPending}
                            >
                              Leave
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => joinGroupMutation.mutate(group.id)}
                          disabled={joinGroupMutation.isPending}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Join
                        </Button>
                      )}
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
                  <div key={group.id} className="border rounded-lg p-4 space-y-3 relative">
                    {/* Invite button in top right for owner */}
                    {group.isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-3 right-3"
                        onClick={() => {
                          navigator.clipboard.writeText(`Join my group: ${group.name} - ${window.location.origin}/groups/${group.id}`);
                          toast({
                            title: "Invite link copied!",
                            description: "Share this link to invite people to your group.",
                          });
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Invite
                      </Button>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="space-y-2">
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
                          {/* Edit photo button under photo for owner */}
                          {group.isOwner && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e: any) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      updateCoverImageMutation.mutate({
                                        groupId: group.id,
                                        imageUrl: reader.result as string
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                            >
                              Edit Photo
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 pr-16">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{group.name}</h3>
                          {group.isOwner && (
                            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{group.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{group.memberCount} members</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            group.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {group.isPublic ? 'Public' : 'Private'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      {group.isOwner ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedGroup(group);
                              setShowThreads(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this group?')) {
                                deleteGroupMutation.mutate(group.id);
                              }
                            }}
                            disabled={deleteGroupMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedGroup(group);
                              setShowThreads(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => leaveGroupMutation.mutate(group.id)}
                            disabled={leaveGroupMutation.isPending}
                          >
                            Leave
                          </Button>
                        </div>
                      )}
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