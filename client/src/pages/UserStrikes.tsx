import { useState } from "react";
import { ArrowLeft, Search, Filter, User, AlertTriangle, CheckCircle, XCircle, Clock, ChevronRight, Calendar, Plus, Minus, Shield, Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient.ts";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast.ts";

export default function UserStrikes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'extend' | 'cancel' | 'add-strike' | 'remove-strike' | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState("");
  const [currentActionUserId, setCurrentActionUserId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch users with strikes
  const { data: usersWithStrikes = [], isLoading, error } = useQuery({
    queryKey: ["/api/moderation/strikes", { status: statusFilter }],
    queryFn: async () => {
      const response = await apiRequest(`/api/moderation/strikes?status=${statusFilter}&limit=50`, 'GET');
      return await response.json();
    },
  });

  // Fetch detailed user strikes when user is selected
  const { data: userDetails } = useQuery({
    queryKey: ["/api/moderation/strikes", selectedUser],
    queryFn: async () => {
      const response = await apiRequest(`/api/moderation/strikes/${selectedUser}`, 'GET');
      return await response.json();
    },
    enabled: Boolean(selectedUser),
  });

  // Mutation for moderator actions
  const moderatorAction = useMutation({
    mutationFn: async ({ userId, action, data }: { userId: string; action: string; data: any }) => {
      const response = await apiRequest(`/api/moderation/strikes/${userId}/${action}`, 'POST', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/strikes"] });
      setDialogOpen(false);
      setActionReason("");
      setSuspensionDays("");
      toast({
        title: "Action completed",
        description: "User strike record has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Action failed",
        description: error.message || "Failed to update user strike record.",
        variant: "destructive",
      });
    },
  });

  // Helper functions for moderator actions
  const handleModeratorAction = (type: 'extend' | 'cancel' | 'add-strike' | 'remove-strike', userId?: string) => {
    console.log('handleModeratorAction called', { type, userId, selectedUser });
    
    // Set the user ID and action type before opening dialog
    if (userId) {
      setSelectedUser(userId);
      setCurrentActionUserId(userId);
    }
    
    setActionType(type);
    setActionReason(""); // Reset reason
    setSuspensionDays(""); // Reset days
    setDialogOpen(true);
  };

  const executeAction = () => {
    console.log('executeAction called', { currentActionUserId, selectedUser, actionType, actionReason, suspensionDays });
    
    const userIdToUse = currentActionUserId || selectedUser;
    
    if (!userIdToUse || !actionType) {
      console.log('Missing required data:', { userIdToUse, actionType });
      return;
    }

    const actionData: any = {
      reason: actionReason,
    };

    if (actionType === 'extend' && suspensionDays) {
      actionData.days = parseInt(suspensionDays);
    }

    console.log('Executing moderator action:', { userId: userIdToUse, action: actionType, data: actionData });

    moderatorAction.mutate({
      userId: userIdToUse,
      action: actionType,
      data: actionData,
    });
  };

  const getActionTitle = () => {
    switch (actionType) {
      case 'extend': return 'Extend Suspension';
      case 'cancel': return 'Cancel Suspension';
      case 'add-strike': return 'Add Strike';
      case 'remove-strike': return 'Remove Strike';
      default: return 'Moderator Action';
    }
  };

  const getActionDescription = () => {
    switch (actionType) {
      case 'extend': return 'Extend the current user suspension by additional days.';
      case 'cancel': return 'Cancel the current suspension and restore account access.';
      case 'add-strike': return 'Add a manual strike to this user account.';
      case 'remove-strike': return 'Remove one strike from this user account.';
      default: return 'Perform a moderator action on this user account.';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'warning': return 'secondary';
      case 'suspended': return 'destructive';
      case 'banned': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'suspended': return 'text-orange-600';
      case 'banned': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStrikeIcon = (strikes: number) => {
    if (strikes === 0) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (strikes === 1) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    if (strikes === 2) return <Clock className="w-4 h-4 text-orange-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  // Ensure usersWithStrikes is always an array
  const safeUsersWithStrikes = Array.isArray(usersWithStrikes) ? usersWithStrikes : [];
  
  // Debug the data structure
  console.log('Raw usersWithStrikes data:', usersWithStrikes);
  console.log('Safe usersWithStrikes:', safeUsersWithStrikes);
  console.log('Status filter:', statusFilter);
  
  const filteredUsers = safeUsersWithStrikes.filter((user: any) => {
    console.log('Filtering user:', user);
    
    // Apply status filter
    const matchesStatus = statusFilter === 'all' || user.accountStatus === statusFilter;
    
    // Apply search filter
    const matchesSearch = !searchTerm || 
      user.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    console.log(`User ${user.userId}: matchesStatus=${matchesStatus}, matchesSearch=${matchesSearch}`);
    
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/content-moderation">
            <Button 
              variant="ghost" 
              size="sm"
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
          </Link>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Users with Strikes
            </h1>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              User Strike Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search users by name, email, or username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Users with Violations ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-300">
                Loading user strikes...
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600 dark:text-red-400">
                Error loading user strikes. Please try again.
              </div>
            ) : filteredUsers.length === 0 && safeUsersWithStrikes.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-300">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Strike Records Yet</h3>
                <p className="text-sm">
                  The strike system is active and will display user violations here as they occur.
                  Currently, no users have received strikes or violations.
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-300">
                No users found matching the current search and filter criteria.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((userStrike: any) => (
                  <div
                    key={userStrike.userId}
                    className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => {
                      // On mobile, navigate to details page; on desktop, expand inline
                      if (window.innerWidth < 640) {
                        setLocation(`/strikes/${userStrike.userId}`);
                      } else {
                        setSelectedUser(selectedUser === userStrike.userId ? null : userStrike.userId);
                      }
                    }}
                  >
                    {/* Desktop/Tablet Layout */}
                    <div className="hidden sm:flex sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        {getStrikeIcon(userStrike.currentStrikes)}
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {userStrike.user?.firstName} {userStrike.user?.lastName}
                            {userStrike.user?.username && (
                              <span className="text-sm text-gray-500 ml-2">@{userStrike.user.username}</span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {userStrike.user?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {userStrike.currentStrikes} Strike{userStrike.currentStrikes !== 1 ? 's' : ''}
                            </span>
                            <Badge variant={getStatusBadgeVariant(userStrike.accountStatus)}>
                              {userStrike.accountStatus}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            {userStrike.totalViolations} total violations
                          </p>
                          {userStrike.lastViolationDate && (
                            <p className="text-xs text-gray-500">
                              Last: {new Date(userStrike.lastViolationDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                          selectedUser === userStrike.userId ? 'rotate-90' : ''
                        }`} />
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="sm:hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {getStrikeIcon(userStrike.currentStrikes)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {userStrike.user?.firstName} {userStrike.user?.lastName}
                            </h3>
                            {userStrike.user?.username && (
                              <p className="text-sm text-gray-500 truncate">@{userStrike.user.username}</p>
                            )}
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {userStrike.user?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                            selectedUser === userStrike.userId ? 'rotate-90' : ''
                          }`} />
                        </div>
                      </div>
                      
                      {/* Mobile Status Row */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(userStrike.accountStatus)} className="flex-shrink-0">
                          {userStrike.accountStatus}
                        </Badge>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {userStrike.currentStrikes} Strike{userStrike.currentStrikes !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {userStrike.totalViolations} violations
                        </span>
                        {userStrike.lastViolationDate && (
                          <>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">
                              {new Date(userStrike.lastViolationDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded User Details */}
                    {selectedUser === userStrike.userId && userDetails && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="space-y-4">
                          {/* Account Status Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                              <h4 className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white mb-1">
                                Account Status
                              </h4>
                              <p className={`text-sm font-medium ${getStatusColor(userDetails.strikeRecord.accountStatus)}`}>
                                {userDetails.strikeRecord.accountStatus.toUpperCase()}
                              </p>
                              {userDetails.strikeRecord.suspensionEndDate && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Until: {new Date(userDetails.strikeRecord.suspensionEndDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                              <h4 className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white mb-1">
                                Current Strikes
                              </h4>
                              <p className="text-lg font-bold text-red-600">
                                {userDetails.strikeRecord.currentStrikes} / 3
                              </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:col-span-2 lg:col-span-1">
                              <h4 className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white mb-1">
                                Total Violations
                              </h4>
                              <p className="text-lg font-bold text-orange-600">
                                {userDetails.strikeRecord.totalViolations}
                              </p>
                            </div>
                          </div>

                          {/* Moderator Actions */}
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <Shield className="w-4 h-4 text-blue-600" />
                              Moderator Override Actions
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {/* Suspension Controls */}
                              {userDetails.strikeRecord.accountStatus === 'suspended' ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleModeratorAction('extend', userDetails.userId)}
                                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                  >
                                    <Clock className="w-3 h-3 mr-1" />
                                    Extend
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleModeratorAction('cancel', userDetails.userId)}
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <div className="col-span-2 text-xs text-gray-500">
                                  Suspension controls available when user is suspended
                                </div>
                              )}
                              
                              {/* Strike Controls */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleModeratorAction('add-strike', userDetails.userId)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Strike
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleModeratorAction('remove-strike', userDetails.userId)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                disabled={userDetails.strikeRecord.currentStrikes === 0}
                              >
                                <Minus className="w-3 h-3 mr-1" />
                                Remove Strike
                              </Button>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                              These actions override the automated suspension system and require justification.
                            </p>
                          </div>

                          {/* Violation History */}
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                              Violation History
                            </h4>
                            {userDetails.violations.length === 0 ? (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                No violations recorded.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {userDetails.violations.map((violation: any) => (
                                  <div key={violation.id} className="border rounded-lg p-3 bg-white dark:bg-gray-900 overflow-hidden">
                                    <div className="space-y-3">
                                      {/* Mobile-optimized badges */}
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="text-xs flex-shrink-0">
                                          Strike #{violation.strikeNumber}
                                        </Badge>
                                        <Badge variant={violation.consequence === 'warning' ? 'secondary' : 'destructive'} className="flex-shrink-0">
                                          {violation.consequence}
                                        </Badge>
                                        {violation.appealStatus && (
                                          <Badge variant={violation.appealStatus === 'approved' ? 'default' : 'secondary'} className="flex-shrink-0">
                                            Appeal: {violation.appealStatus}
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      {/* Violation details */}
                                      <div className="space-y-2">
                                        <h5 className="font-medium text-sm text-gray-900 dark:text-white break-words">
                                          {violation.violationType}
                                        </h5>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
                                          {violation.description}
                                        </p>
                                        {violation.moderatorNotes && (
                                          <p className="text-xs text-gray-500 break-words">
                                            <strong>Moderator Notes:</strong> {violation.moderatorNotes}
                                          </p>
                                        )}
                                      </div>
                                      
                                      {/* Mobile-optimized metadata */}
                                      <div className="space-y-1 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3 flex-shrink-0" />
                                          <span>{new Date(violation.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        {violation.moderator && (
                                          <div className="flex items-center gap-1">
                                            <User className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">
                                              {violation.moderator.firstName} {violation.moderator.lastName}
                                            </span>
                                          </div>
                                        )}
                                        {violation.suspensionDays && (
                                          <div className="text-orange-600 font-medium">
                                            Suspension: {violation.suspensionDays} days
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Moderator Action Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{getActionTitle()}</DialogTitle>
              <DialogDescription>
                {getActionDescription()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {actionType === 'extend' && (
                <div>
                  <Label htmlFor="suspensionDays">Additional Days</Label>
                  <Input
                    id="suspensionDays"
                    type="number"
                    min="1"
                    max="365"
                    value={suspensionDays}
                    onChange={(e) => setSuspensionDays(e.target.value)}
                    placeholder="Number of days to extend"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="actionReason">Reason (Required)</Label>
                <Textarea
                  id="actionReason"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Provide a detailed reason for this moderator action..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                disabled={moderatorAction.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={executeAction}
                disabled={
                  moderatorAction.isPending || 
                  !actionReason.trim() || 
                  (actionType === 'extend' && !suspensionDays)
                }
              >
                {moderatorAction.isPending ? 'Processing...' : 'Execute Action'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}