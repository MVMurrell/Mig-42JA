import { useState } from "react";
import { X, Plus, MapPin, Users, Settings, Search, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { useAuth } from "@/hooks/useAuth.ts";
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
}

interface GroupsModalProps {
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
}

export default function GroupsModal({ onClose, userLocation }: GroupsModalProps) {
  const [activeTab, setActiveTab] = useState<'discover' | 'myGroups' | 'create'>('discover');
  const [searchRadius, setSearchRadius] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    isPublic: true,
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch nearby public groups
  const { data: nearbyGroups = [], isLoading: isLoadingNearby } = useQuery({
    queryKey: ['/api/groups/nearby', userLocation?.lat, userLocation?.lng, searchRadius],
    enabled: !!userLocation && activeTab === 'discover',
  });

  // Fetch user's groups
  const { data: userGroups = [], isLoading: isLoadingUserGroups } = useQuery({
    queryKey: ['/api/groups/user'],
    enabled: activeTab === 'myGroups',
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
      return await apiRequest('/api/groups', 'POST', {
        ...groupData,
        latitude: userLocation?.lat?.toString(),
        longitude: userLocation?.lng?.toString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Group created successfully!",
      });
      setShowCreateForm(false);
      setNewGroup({ name: '', description: '', isPublic: true });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setActiveTab('myGroups');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return await apiRequest(`/api/groups/${groupId}/join`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Joined group successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
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
      return await apiRequest(`/api/groups/${groupId}/leave`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Left group successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to leave group. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateGroup = () => {
    if (!newGroup.name.trim()) {
      toast({
        title: "Error",
        description: "Group name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!userLocation) {
      toast({
        title: "Error",
        description: "Location is required to create a group.",
        variant: "destructive",
      });
      return;
    }

    createGroupMutation.mutate(newGroup);
  };

  const filteredNearbyGroups = Array.isArray(nearbyGroups) ? nearbyGroups.filter((group: Group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Groups</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-3 text-center text-sm font-medium ${
              activeTab === 'discover' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('myGroups')}
            className={`flex-1 py-3 text-center text-sm font-medium ${
              activeTab === 'myGroups' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500'
            }`}
          >
            My Groups
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'discover' && (
            <div className="p-4 space-y-4">
              {/* Search and filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Radius:</span>
                  <select
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(Number(e.target.value))}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    <option value={5}>5 miles</option>
                    <option value={10}>10 miles</option>
                    <option value={25}>25 miles</option>
                    <option value={50}>50 miles</option>
                    <option value={100}>100 miles</option>
                  </select>
                </div>
              </div>

              {/* Groups list */}
              {isLoadingNearby ? (
                <div className="text-center py-8 text-gray-500">Loading groups...</div>
              ) : filteredNearbyGroups.length > 0 ? (
                <div className="space-y-3">
                  {filteredNearbyGroups.map((group: Group) => (
                    <div key={group.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{group.name}</h3>
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
                      <div className="flex justify-end">
                        {group.isMember ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => leaveGroupMutation.mutate(group.id)}
                            disabled={leaveGroupMutation.isPending}
                          >
                            Leave
                          </Button>
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
                  No groups found in this area. Try expanding your search radius.
                </div>
              )}
            </div>
          )}

          {activeTab === 'myGroups' && (
            <div className="p-4 space-y-4">
              {/* Create group button */}
              <Button
                onClick={() => setShowCreateForm(true)}
                className="w-full bg-red-500 hover:bg-red-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Group
              </Button>

              {/* User's groups */}
              {isLoadingUserGroups ? (
                <div className="text-center py-8 text-gray-500">Loading your groups...</div>
              ) : Array.isArray(userGroups) && userGroups.length > 0 ? (
                <div className="space-y-3">
                  {userGroups.map((group: Group) => (
                    <div key={group.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{group.name}</h3>
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
                            {group.isOwner && (
                              <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                                Owner
                              </span>
                            )}
                          </div>
                        </div>
                        {group.isOwner && (
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Settings className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {!group.isOwner && (
                        <div className="flex justify-end">
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
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Create Group</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <Input
                  placeholder="Enter group name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="What's this group about?"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none h-20"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newGroup.isPublic}
                  onChange={(e) => setNewGroup({ ...newGroup, isPublic: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  Make this group public (others can discover and join)
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={createGroupMutation.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}