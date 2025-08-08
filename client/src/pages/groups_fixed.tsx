import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Plus, ArrowLeft, Users, Lock, Globe, MapPin, MessageCircle, Camera, Trash2, Send, X } from "lucide-react";
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messageText, setMessageText] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
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
  const { data: nearbyGroups, isLoading: isLoadingNearby } = useQuery({
    queryKey: ["/api/groups/nearby", userLocation?.lat, userLocation?.lng],
    enabled: !!userLocation
  });

  // Fetch user's groups
  const { data: userGroups, isLoading: isLoadingUserGroups } = useQuery({
    queryKey: ["/api/groups/my-groups"]
  });

  // Fetch group messages
  const { data: messages } = useQuery({
    queryKey: ["/api/groups", selectedGroup?.id, "messages"],
    enabled: !!selectedGroup && showMessaging
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!userLocation) throw new Error("Location required");
      return apiRequest("/api/groups", "POST", {
        ...data,
        latitude: userLocation.lat.toString(),
        longitude: userLocation.lng.toString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setShowCreateForm(false);
      setFormData({ name: "", description: "", isPublic: true });
    }
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest(`/api/groups/${groupId}/join`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    }
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest(`/api/groups/${groupId}/leave`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    }
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest(`/api/groups/${groupId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    }
  });

  // Toggle privacy mutation
  const togglePrivacyMutation = useMutation({
    mutationFn: async ({ groupId, isPublic }: { groupId: string; isPublic: boolean }) => {
      return apiRequest(`/api/groups/${groupId}/privacy`, "PATCH", { isPublic });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    }
  });

  // Update cover image mutation
  const updateCoverImageMutation = useMutation({
    mutationFn: async ({ groupId, imageUrl }: { groupId: string; imageUrl: string }) => {
      return apiRequest(`/api/groups/${groupId}/cover-image`, "PATCH", { imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ groupId, content }: { groupId: string; content: string }) => {
      return apiRequest(`/api/groups/${groupId}/messages`, "POST", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedGroup?.id, "messages"] });
      setMessageText("");
    }
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) return;
    createGroupMutation.mutate(formData);
  };

  const filteredNearbyGroups = (nearbyGroups as Group[])?.filter((group: Group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (showMessaging && selectedGroup) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMessaging(false)}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">{selectedGroup.name}</h1>
          </div>

          <div className="bg-white rounded-lg border h-96 flex flex-col">
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {(messages as any[])?.length > 0 ? (
                (messages as any[]).map((message: any) => (
                  <div key={message.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{message.firstName || 'Anonymous'}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">{message.content}</div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>

            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (messageText.trim()) {
                    sendMessageMutation.mutate({
                      groupId: selectedGroup.id,
                      content: messageText.trim()
                    });
                  }
                }}
                className="flex gap-2"
              >
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateForm(false)}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Create Group</h1>
          </div>

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
              <Label htmlFor="isPublic">
                {formData.isPublic ? "Public Group" : "Private Group"}
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Groups</h1>
          <Button onClick={() => setShowCreateForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </div>

        {showCreateForm ? (
          <div>
            <h2 className="text-lg font-semibold mb-4">Create New Group</h2>
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
                <Label htmlFor="isPublic">
                  {formData.isPublic ? "Public Group" : "Private Group"}
                </Label>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createGroupMutation.isPending}
                >
                  {createGroupMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-4">My Groups</h2>
            
            {isLoadingUserGroups ? (
              <div className="text-center py-8 text-gray-500">Loading your groups...</div>
            ) : (userGroups as Group[])?.length > 0 ? (
              <div className="space-y-3">
                {(userGroups as Group[]).map((group: Group) => (
                  <div key={group.id} className="bg-white border rounded-lg p-4 space-y-2">
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
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{group.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{group.memberCount} members</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            group.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {group.isPublic ? 'Public' : 'Private'}
                          </span>
                          {group.isOwner && (
                            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                              Owner
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {group.isOwner ? (
                      <div className="flex justify-end gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
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
                          disabled={updateCoverImageMutation.isPending}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Camera className="w-4 h-4 mr-1" />
                          Photo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            togglePrivacyMutation.mutate({
                              groupId: group.id,
                              isPublic: !group.isPublic
                            });
                          }}
                          disabled={togglePrivacyMutation.isPending}
                          className="text-yellow-600 hover:text-yellow-700"
                        >
                          {group.isPublic ? <Lock className="w-4 h-4 mr-1" /> : <Globe className="w-4 h-4 mr-1" />}
                          {group.isPublic ? 'Make Private' : 'Make Public'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
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
                      <div className="flex justify-end gap-2 mt-3">
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
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                You haven't joined any groups yet. Discover groups near you!
              </div>
            )}

            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Discover Groups</h2>
              
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4"
              />

              {isLoadingNearby ? (
                <div className="text-center py-8 text-gray-500">Loading nearby groups...</div>
              ) : filteredNearbyGroups.length > 0 ? (
                <div className="space-y-3">
                  {filteredNearbyGroups.map((group: Group) => (
                    <div key={group.id} className="bg-white border rounded-lg p-4">
                      <h3 className="font-semibold">{group.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{group.memberCount} members</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{group.distance ? formatDistance(group.distance) : 'Nearby'}</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            group.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {group.isPublic ? 'Public' : 'Private'}
                          </span>
                        </div>
                        {!group.isMember && (
                          <Button
                            size="sm"
                            onClick={() => joinGroupMutation.mutate(group.id)}
                            disabled={joinGroupMutation.isPending}
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
          </div>
        )}
      </div>
    </div>
  );
}