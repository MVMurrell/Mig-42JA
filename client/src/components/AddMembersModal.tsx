import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { X, Plus, Check, ArrowLeft, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient.ts";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImageUrl?: string;
  email: string;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImageUrl?: string;
  role: string;
  joinedAt: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  createdBy: string;
}

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
}

export function AddMembersModal({ isOpen, onClose, group }: AddMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [addedUsers, setAddedUsers] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState<'search' | 'added' | 'members'>('search');
  const [userCache, setUserCache] = useState<Map<string, User>>(new Map());
  
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Store modal state for navigation
  const preserveModalState = () => {
    const modalState = {
      isOpen: true,
      groupId: group?.id,
      searchQuery,
      selectedUsers: Array.from(selectedUsers),
      addedUsers: Array.from(addedUsers),
      currentStep,
      userCache: Array.from(userCache.entries()),
      timestamp: Date.now()
    };
    
    console.log('Preserving modal state to sessionStorage:', modalState);
    
    try {
      // Store in both sessionStorage and localStorage for redundancy
      sessionStorage.setItem('addMembersModal', JSON.stringify(modalState));
      localStorage.setItem('addMembersModalBackup', JSON.stringify(modalState));
      
      // Verify both storages
      const sessionSaved = sessionStorage.getItem('addMembersModal');
      const localSaved = localStorage.getItem('addMembersModalBackup');
      console.log('Verified session storage:', sessionSaved);
      console.log('Verified local storage backup:', localSaved);
    } catch (error) {
      console.error('Error saving modal state:', error);
    }
  };

  const navigateToProfile = (userId: string) => {
    console.log('Navigating to profile, preserving modal state:', {
      isOpen: true,
      groupId: group?.id,
      searchQuery,
      selectedUsers: Array.from(selectedUsers),
      addedUsers: Array.from(addedUsers),
      currentStep
    });
    preserveModalState();
    setLocation(`/profile/${userId}?returnToAddMembers=true`);
  };

  // Search users
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['/api/users/search', searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Failed to search users');
      return response.json();
    },
    enabled: searchQuery.length >= 2,
  });

  // Cache users from search results
  useEffect(() => {
    if (Array.isArray(searchResults) && searchResults.length > 0) {
      setUserCache(prev => {
        const newCache = new Map(prev);
        searchResults.forEach((user: User) => {
          newCache.set(user.id, user);
        });
        return newCache;
      });
    }
  }, [searchResults]);

  // Get current group members
  const { data: groupMembers = [] } = useQuery<Member[]>({
    queryKey: [`/api/groups/${group?.id}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${group?.id}/members`);
      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    },
    enabled: !!group?.id, // Always load members when modal is open
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const response = await fetch(`/api/groups/${group?.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to add member');
      }
      return response.json();
    },
    onSuccess: (_, targetUserId) => {
      setAddedUsers(prev => new Set([...Array.from(prev), targetUserId]));
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${group?.id}/members`] });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/groups/${group?.id}/members/${memberId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${group?.id}/members`] });
    },
  });

  // Reset state when modal opens/closes, but restore from storage if available
  useEffect(() => {
    if (isOpen) {
      // Check both sessionStorage and localStorage for saved state
      let savedState = sessionStorage.getItem('addMembersModal');
      let storageType = 'sessionStorage';
      
      if (!savedState) {
        savedState = localStorage.getItem('addMembersModalBackup');
        storageType = 'localStorage';
      }
      
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          console.log(`Restoring modal state from ${storageType}:`, parsedState);
          
          // Only restore if this is for the same group
          if (parsedState.groupId === group?.id) {
            setSearchQuery(parsedState.searchQuery || "");
            setSelectedUsers(new Set(parsedState.selectedUsers || []));
            setAddedUsers(new Set(parsedState.addedUsers || []));
            setCurrentStep(parsedState.currentStep || 'search');
            
            // Restore user cache
            if (parsedState.userCache && Array.isArray(parsedState.userCache)) {
              setUserCache(new Map(parsedState.userCache));
            }
            
            console.log('Modal state successfully restored');
          } else {
            console.log('Group ID mismatch, not restoring state');
            // Reset to default
            setSearchQuery("");
            setSelectedUsers(new Set());
            setAddedUsers(new Set());
            setCurrentStep('search');
          }
          
          // Clear both storages after restoration
          setTimeout(() => {
            sessionStorage.removeItem('addMembersModal');
            localStorage.removeItem('addMembersModalBackup');
            console.log('Restored state cleared from both storages');
          }, 1000);
        } catch (error) {
          console.error('Error restoring modal state:', error);
          // Fallback to reset
          setSearchQuery("");
          setSelectedUsers(new Set());
          setAddedUsers(new Set());
          setCurrentStep('search');
        }
      } else {
        console.log('No saved modal state found, using defaults');
        // No saved state, normal reset
        setSearchQuery("");
        setSelectedUsers(new Set());
        setAddedUsers(new Set());
        setCurrentStep('search');
      }
    }
  }, [isOpen, group?.id]);

  const handleAddUser = (userId: string) => {
    addMemberMutation.mutate(userId);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  const handleToggleUser = (userId: string) => {
    // Check if user is already a member
    const memberIds = new Set(groupMembers.map(m => m.id));
    if (memberIds.has(userId)) {
      console.log('Cannot select user - already a member:', userId);
      return;
    }
    
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const addSelectedUsers = () => {
    const usersToAdd = Array.from(selectedUsers);
    const memberIds = new Set(groupMembers.map(m => m.id));
    
    // Filter out users who are already members
    const validUsersToAdd = usersToAdd.filter(userId => !memberIds.has(userId));
    
    if (validUsersToAdd.length === 0) {
      return;
    }
    
    validUsersToAdd.forEach(userId => {
      addMemberMutation.mutate(userId);
    });
  };

  const getUserDisplayName = (user: User | Member) => {
    if (user.username) return user.username;
    return `${user.firstName} ${user.lastName}`.trim();
  };

  const getUserInitials = (user: User | Member) => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  // Filter out already added users and current members
  const memberIds = new Set(groupMembers.map(m => m.id));
  const filteredResults = Array.isArray(searchResults) ? searchResults.filter((user: User) => 
    !memberIds.has(user.id) && !addedUsers.has(user.id)
  ) : [];

  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-white text-gray-900 border-gray-200">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            {currentStep !== 'search' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(currentStep === 'members' ? 'added' : 'search')}
                className="p-1 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <DialogTitle className="text-lg font-semibold">
              {currentStep === 'search' && 'Add Members'}
              {currentStep === 'added' && 'Add Members'}
              {currentStep === 'members' && 'Add Members'}
            </DialogTitle>
          </div>
          
          {/* Group info */}
          <div className="flex items-center gap-3 pt-2">
            <Avatar className="w-12 h-12">
              <AvatarImage src={group.coverImageUrl || ""} className="object-cover" />
              <AvatarFallback className="bg-orange-600 text-white">
                {group.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{group.name}</h3>
              <p className="text-sm text-gray-500">Private Group</p>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 mt-4">
            <button
              onClick={() => setCurrentStep('search')}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                currentStep === 'search'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Add Members
            </button>
            <button
              onClick={() => setCurrentStep('members')}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                currentStep === 'members'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Manage Members ({groupMembers.length})
            </button>
          </div>
        </DialogHeader>

        <div id="add-members-description" className="sr-only">
          Modal for managing group members. Add new members or remove existing ones.
        </div>

        <div className="space-y-4">
          {/* Search Input */}
          {currentStep === 'search' && (
            <>
              <div className="relative">
                <Input
                  placeholder="Profile Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-gray-300 focus:border-blue-500"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Recently Added Users Section */}
              {addedUsers.size > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Recently Added ({addedUsers.size})
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                    {Array.from(addedUsers).map(userId => {
                      // Use user cache to get user data
                      const user = userCache.get(userId);
                      
                      if (!user) {
                        // If user not in cache, show basic info with remove option
                        return (
                          <div key={userId} className="flex items-center justify-between p-2 bg-white rounded">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-green-600 text-white text-xs">
                                  ✓
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">User Added</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-600 font-medium">Added</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAddedUsers(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(userId);
                                    return newSet;
                                  });
                                }}
                                className="w-5 h-5 p-0 hover:bg-red-100 rounded-full text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={userId} className="flex items-center justify-between p-2 bg-white rounded">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-green-300 transition-all"
                              onClick={() => navigateToProfile(user.id)}
                            >
                              <AvatarImage src={user.profileImageUrl || ""} className="object-cover" />
                              <AvatarFallback className="bg-green-600 text-white text-xs">
                                {getUserInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            <div 
                              className="cursor-pointer hover:text-green-600 transition-colors"
                              onClick={() => navigateToProfile(user.id)}
                            >
                              <span className="text-sm font-medium">{getUserDisplayName(user)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-600 font-medium">✓ Added</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAddedUsers(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(userId);
                                  return newSet;
                                });
                              }}
                              className="w-5 h-5 p-0 hover:bg-red-100 rounded-full text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Users for Adding */}
              {selectedUsers.size > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Selected to Add ({selectedUsers.size})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(selectedUsers).map(userId => {
                      const user = userCache.get(userId);
                      if (!user) return null;
                      
                      return (
                        <div key={userId} className="flex items-center gap-2 bg-blue-100 border border-blue-200 rounded-full px-3 py-1">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user.profileImageUrl || ""} className="object-cover" />
                            <AvatarFallback className="bg-blue-200 text-blue-900 text-xs">
                              {getUserInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-blue-900">{getUserDisplayName(user)}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveUser(userId)}
                            className="w-4 h-4 p-0 hover:bg-blue-200 rounded-full text-blue-700"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search Results */}
              <div className="max-h-80 overflow-y-auto space-y-2">
                {searchQuery.length >= 2 && (
                  <>
                    {searchLoading ? (
                      <div className="text-center py-4 text-gray-500">Searching...</div>
                    ) : filteredResults.length > 0 ? (
                      <>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Search Results
                        </h4>
                        {filteredResults.map((user: User) => (
                          <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Avatar 
                                className="w-10 h-10 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                                onClick={() => navigateToProfile(user.id)}
                              >
                                <AvatarImage src={user.profileImageUrl || ""} className="object-cover" />
                                <AvatarFallback className="bg-gray-200 text-gray-900">
                                  {getUserInitials(user)}
                                </AvatarFallback>
                              </Avatar>
                              <div 
                                className="cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => navigateToProfile(user.id)}
                              >
                                <span className="font-medium">{getUserDisplayName(user)}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleToggleUser(user.id)}
                              className={`w-8 h-8 rounded-full p-0 ${
                                selectedUsers.has(user.id)
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {selectedUsers.has(user.id) ? (
                                <X className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        {Array.isArray(searchResults) && searchResults.length > 0 
                          ? "All found users are already members of this group"
                          : "No users found"
                        }
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Added Users List */}
          {currentStep === 'added' && (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="Profile Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>

              {/* Selected users for adding */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.from(selectedUsers).map(userId => {
                  const user = userCache.get(userId);
                  if (!user) return null;
                  
                  return (
                    <div key={userId} className="flex items-center gap-2 bg-blue-100 border border-blue-200 rounded-full px-3 py-1">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={user.profileImageUrl || ""} className="object-cover" />
                        <AvatarFallback className="bg-blue-200 text-blue-900 text-xs">
                          {getUserInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-blue-900">{getUserDisplayName(user)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveUser(userId)}
                        className="w-4 h-4 p-0 hover:bg-blue-200 rounded-full text-blue-700"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Added users list */}
              <div className="max-h-60 overflow-y-auto space-y-2">
                <div className="text-sm text-gray-500 mb-2">
                  {addedUsers.size > 0 ? `${addedUsers.size} member(s) added` : 'No members added yet'}
                </div>
              </div>

              {/* Search results */}
              {searchQuery.length >= 2 && filteredResults.length > 0 && (
                <div className="space-y-2">
                  {filteredResults.map((user: User) => (
                    <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.profileImageUrl || ""} className="object-cover" />
                          <AvatarFallback className="bg-gray-200 text-gray-900">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{getUserDisplayName(user)}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => selectedUsers.has(user.id) ? handleRemoveUser(user.id) : handleToggleUser(user.id)}
                        className={`w-8 h-8 rounded-full p-0 ${
                          selectedUsers.has(user.id)
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {selectedUsers.has(user.id) ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Group Members List */}
          {currentStep === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Group Members</h3>
                <span className="text-sm text-gray-500">{groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}</span>
              </div>
              
              <div className="max-h-80 overflow-y-auto space-y-3">
                {groupMembers.length > 0 ? (
                  groupMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          className="w-10 h-10 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                          onClick={() => navigateToProfile(member.id)}
                        >
                          <AvatarImage src={member.profileImageUrl || ""} className="object-cover" />
                          <AvatarFallback className="bg-gray-200 text-gray-900">
                            {getUserInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div 
                            className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => navigateToProfile(member.id)}
                          >
                            {getUserDisplayName(member)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.role === 'owner' ? 'Group Owner' : 'Member'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.role === 'owner' ? (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Owner</span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => removeMemberMutation.mutate(member.id)}
                            disabled={removeMemberMutation.isPending}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs"
                          >
                            {removeMemberMutation.isPending ? 'Removing...' : 'Remove'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No members in this group yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {currentStep === 'search' && (
              <>
                {selectedUsers.size > 0 && (
                  <Button
                    onClick={addSelectedUsers}
                    disabled={addMemberMutation.isPending}
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {addMemberMutation.isPending ? 'Adding...' : `Add ${selectedUsers.size} User${selectedUsers.size > 1 ? 's' : ''}`}
                  </Button>
                )}
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="px-6"
                >
                  Done
                </Button>
              </>
            )}
            
            {currentStep === 'added' && (
              <Button
                onClick={onClose}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              >
                Done
              </Button>
            )}
            
            {currentStep === 'members' && (
              <Button
                onClick={onClose}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}