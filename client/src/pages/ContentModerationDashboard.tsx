import { useState } from "react";
import { ArrowLeft, Users, MessageSquare, Video, FileText, Shield, Plus, Mail, Play, CheckCircle, XCircle, Clock, AlertTriangle, ChevronRight, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth.ts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient.ts";
import { useToast } from "@/hooks/use-toast.ts";
import type { ModerationStats, VideoAppeal, Moderator } from "@/types/moderation.ts";

// User Strikes Section Component
function UserStrikesSection() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

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
  
  const filteredUsers = safeUsersWithStrikes.filter((user: any) =>
    !searchTerm || 
    user.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
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
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(selectedUser === userStrike.userId ? null : userStrike.userId)}
                >
                  <div className="flex items-center justify-between">
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

                  {/* Expanded User Details */}
                  {selectedUser === userStrike.userId && userDetails && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="space-y-4">
                        {/* Account Status Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                              Account Status
                            </h4>
                            <p className={`text-sm font-medium ${getStatusColor(userDetails.strikeRecord.accountStatus)}`}>
                              {userDetails.strikeRecord.accountStatus.toUpperCase()}
                            </p>
                            {userDetails.strikeRecord.suspensionEndDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                Suspended until: {new Date(userDetails.strikeRecord.suspensionEndDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                              Current Strikes
                            </h4>
                            <p className="text-lg font-bold text-red-600">
                              {userDetails.strikeRecord.currentStrikes} / 3
                            </p>
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                              Total Violations
                            </h4>
                            <p className="text-lg font-bold text-orange-600">
                              {userDetails.strikeRecord.totalViolations}
                            </p>
                          </div>
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
                                <div key={violation.id} className="border rounded-lg p-3 bg-white dark:bg-gray-900">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="text-xs">
                                          Strike #{violation.strikeNumber}
                                        </Badge>
                                        <Badge variant={violation.consequence === 'warning' ? 'secondary' : 'destructive'}>
                                          {violation.consequence}
                                        </Badge>
                                        {violation.appealStatus && (
                                          <Badge variant={violation.appealStatus === 'approved' ? 'default' : 'secondary'}>
                                            Appeal: {violation.appealStatus}
                                          </Badge>
                                        )}
                                      </div>
                                      <h5 className="font-medium text-sm text-gray-900 dark:text-white">
                                        {violation.violationType}
                                      </h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {violation.description}
                                      </p>
                                      {violation.moderatorNotes && (
                                        <p className="text-xs text-gray-500 mt-2">
                                          <strong>Moderator Notes:</strong> {violation.moderatorNotes}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                        <span>
                                          {new Date(violation.createdAt).toLocaleDateString()}
                                        </span>
                                        {violation.moderator && (
                                          <span>
                                            By: {violation.moderator.firstName} {violation.moderator.lastName}
                                          </span>
                                        )}
                                        {violation.suspensionDays && (
                                          <span>
                                            Suspension: {violation.suspensionDays} days
                                          </span>
                                        )}
                                      </div>
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
    </div>
  );
}

function VideoModerationSection() {
  // Fetch videos needing moderation
  const { data: moderationVideos = [], isLoading } = useQuery({
    queryKey: ['/api/moderation/videos'],
    queryFn: async () => {
      const response = await fetch('/api/moderation/videos', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch videos');
      return response.json();
    }
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'uploaded': return 'secondary';
      case 'rejected_by_moderation': return 'destructive';
      case 'under_appeal': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Videos Requiring Moderation ({moderationVideos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-300">
              Loading videos for moderation...
            </div>
          ) : moderationVideos.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-300">
              <Video className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Videos Awaiting Moderation</h3>
              <p className="text-sm">
                All videos have been reviewed. New uploads and appeals will appear here for moderation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {moderationVideos.map((video: any) => (
                <div
                  key={video.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white break-words">{video.title}</h3>
                        <Badge variant={getStatusBadgeVariant(video.processingStatus)} className="self-start sm:self-center">
                          {video.processingStatus === 'uploaded' ? 'Pending Review' :
                           video.processingStatus === 'rejected_by_moderation' ? 'Rejected' :
                           video.processingStatus === 'under_appeal' ? 'Appeal Pending' : video.processingStatus}
                        </Badge>
                      </div>
                      {video.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 break-words">{video.description}</p>
                      )}
                      {video.flaggedReason && (
                        <p className="text-sm text-red-600 mb-2 break-words">
                          <strong>Flagged:</strong> {video.flaggedReason}
                        </p>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500">
                        <span className="break-words">User: {video.user?.firstName} {video.user?.lastName}</span>
                        <span className="break-all">Email: {video.user?.email}</span>
                        <span>Uploaded: {new Date(video.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link href={`/moderation/video/${video.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          Review
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ContentModerationDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [newModeratorEmail, setNewModeratorEmail] = useState("");

  // Grant super admin access to the app creator
  const isAdmin = user && (
    (user as any)?.role === 'admin' || 
    (user as any)?.id === 'jemzyapp' || // Replit auth admin ID
    (user as any)?.id === 'google-oauth2|117032826996185616207' // Legacy Auth0 ID (fallback)
  );

  // Fetch moderation statistics
  const { data: moderationStats } = useQuery<ModerationStats>({
    queryKey: ["/api/moderation/stats"],
    enabled: Boolean(user && (isAdmin || (user as any).role === 'moderator')),
  });

  // Fetch moderator list (admin only)
  const { data: moderators } = useQuery<Moderator[]>({
    queryKey: ["/api/moderation/access"],
    enabled: Boolean(isAdmin),
  });

  // Fetch video appeals for overview
  const { data: appeals = [] } = useQuery<VideoAppeal[]>({
    queryKey: ["/api/moderation/video-appeals"],
    enabled: Boolean(user && (isAdmin || (user as any).role === 'moderator')),
  });

  // Add moderator mutation
  const addModeratorMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest("/api/moderation/moderators", "POST", { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/moderators"] });
      setNewModeratorEmail("");
      toast({
        title: "Moderator Added",
        description: "Invitation sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add moderator",
        variant: "destructive",
      });
    },
  });

  // Remove moderator mutation
  const removeModeratorMutation = useMutation({
    mutationFn: async (moderatorId: string) => {
      await apiRequest(`/api/moderation/moderators/${moderatorId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/moderators"] });
      toast({
        title: "Moderator Removed",
        description: "Access revoked successfully",
      });
    },
  });

  const handleAddModerator = () => {
    if (newModeratorEmail.trim()) {
      addModeratorMutation.mutate(newModeratorEmail.trim());
    }
  };

  const handleRemoveModerator = (moderatorId: string) => {
    removeModeratorMutation.mutate(moderatorId);
  };

  if (!user || (!isAdmin && (user as any).role !== 'moderator')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Access Restricted
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              You don't have permission to access content moderation features.
            </p>
            <Link href="/settings">
              <Button className="mt-4">Back to Settings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4 sm:mb-6">
          <Link href="/settings">
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
        </div>

        {/* Title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Content Moderation
            </h1>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-300 px-4">
            Manage content and community safety
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Pending Reviews</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(moderationStats as any)?.pending || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Flagged Comments</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(moderationStats as any)?.flaggedComments || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Video className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Flagged Videos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(moderationStats as any)?.flaggedVideos || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">AI Appeals</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(moderationStats as any)?.aiAppeals || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <Link href="/moderation-decisions" className="block">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Moderation Decision History
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      View all moderation decisions and moderator actions
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <Link href="/user-strikes" className="block">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Users with Strikes
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Monitor users with violations and strike history
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue={isAdmin ? "user-management" : "comments"} className="space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="grid w-full min-w-max grid-cols-5 lg:grid-cols-5 md:grid-cols-3 sm:grid-cols-2 gap-1 p-1 h-auto">
              {isAdmin && (
                <TabsTrigger value="user-management" className="flex-col gap-1 h-14 sm:h-10 text-xs sm:text-sm whitespace-nowrap px-2">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">User Management</span>
                  <span className="sm:hidden">Users</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="strikes" className="flex-col gap-1 h-14 sm:h-10 text-xs sm:text-sm whitespace-nowrap px-2">
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">User Strikes</span>
                <span className="sm:hidden">Strikes</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex-col gap-1 h-14 sm:h-10 text-xs sm:text-sm whitespace-nowrap px-2">
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Comments & Chat</span>
                <span className="sm:hidden">Comments</span>
              </TabsTrigger>
              <TabsTrigger value="video-comments" className="flex-col gap-1 h-14 sm:h-10 text-xs sm:text-sm whitespace-nowrap px-2">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Video Comments</span>
                <span className="sm:hidden">Video</span>
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex-col gap-1 h-14 sm:h-10 text-xs sm:text-sm whitespace-nowrap px-2">
                <Video className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Jem Videos</span>
                <span className="sm:hidden">Jems</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* User Management Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="user-management">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Moderator Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add Moderator Section */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Add New Moderator
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        placeholder="Enter email address"
                        value={newModeratorEmail}
                        onChange={(e) => setNewModeratorEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleAddModerator}
                        disabled={!newModeratorEmail.trim() || addModeratorMutation.isPending}
                        className="gap-2 w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Moderator</span>
                        <span className="sm:hidden">Add</span>
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      An invitation email will be sent. If they have a Jemzy account, moderation access will be added immediately.
                    </p>
                  </div>

                  {/* Current Moderators */}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Current Moderators
                    </h3>
                    <div className="space-y-3">
                      {(moderators as any)?.map((moderator: any) => (
                        <div key={moderator.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {moderator.email}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {moderator.status === 'active' ? 'Active' : 'Pending invitation'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={moderator.status === 'active' ? 'default' : 'secondary'}>
                              {moderator.status}
                            </Badge>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveModerator(moderator.id)}
                              disabled={removeModeratorMutation.isPending}
                              className="w-full sm:w-auto"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                      {!((moderators as any)?.length) && (
                        <p className="text-gray-600 dark:text-gray-300 text-center py-6">
                          No moderators added yet
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* User Strikes Tab */}
          <TabsContent value="strikes">
            <UserStrikesSection />
          </TabsContent>

          {/* Video Moderation Tab */}
          <TabsContent value="videos">
            <VideoModerationSection />
          </TabsContent>

          {/* Comments & Chat Tab */}
          <TabsContent value="comments">
            <CommentModerationSection />
          </TabsContent>

          {/* Video Comments Tab */}
          <TabsContent value="video-comments">
            <CommentModerationSection contentType="video_comment" />
          </TabsContent>

          {/* Videos Tab - Overview List */}
          <TabsContent value="videos">
            <div className="space-y-6">
              {/* AI Flagged Jems (Appeals) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    AI Flagged Jems (Appeals) ({appeals?.filter(appeal => appeal.flagged_by_ai)?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appeals?.filter(appeal => appeal.flagged_by_ai)?.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-300 text-center py-8">
                      No AI flagged video appeals pending review.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {appeals?.filter(appeal => appeal.flagged_by_ai)?.map((appeal: VideoAppeal) => (
                        <div key={appeal.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-blue-200 dark:border-blue-800">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900 dark:text-white break-words">
                                  {appeal.video_title}
                                </h3>
                                <Badge variant="outline" className="text-blue-600 border-blue-600">
                                  AI Flagged
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
                                <span className="font-medium">Flag:</span> {appeal.original_flag_reason}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <span className="text-xs text-gray-500">
                                  Appeal submitted: {new Date(appeal.created_at).toLocaleDateString()}
                                </span>
                                <Badge 
                                  variant={appeal.status === 'pending' ? 'secondary' : 'default'}
                                  className="w-fit"
                                >
                                  {appeal.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {appeal.status === 'pending' && (
                                <Button
                                  onClick={() => setLocation(`/moderation/review/${appeal.id}`)}
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Review Appeal
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* User Flagged Jems */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-600" />
                    User Flagged Jems ({appeals?.filter(appeal => !appeal.flagged_by_ai)?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appeals?.filter(appeal => !appeal.flagged_by_ai)?.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-300 text-center py-8">
                      No user flagged videos pending review.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {appeals?.filter(appeal => !appeal.flagged_by_ai)?.map((appeal: VideoAppeal) => (
                        <div key={appeal.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-orange-200 dark:border-orange-800">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900 dark:text-white break-words">
                                  {appeal.video_title}
                                </h3>
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  User Flagged
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
                                <span className="font-medium">Flag:</span> {appeal.original_flag_reason}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <span className="text-xs text-gray-500">
                                  Reported: {new Date(appeal.created_at).toLocaleDateString()}
                                </span>
                                <Badge 
                                  variant={appeal.status === 'pending' ? 'secondary' : 'default'}
                                  className="w-fit"
                                >
                                  {appeal.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {appeal.status === 'pending' && (
                                <Button
                                  onClick={() => setLocation(`/moderation/review/${appeal.id}`)}
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Review Report
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Component for displaying video appeals
function VideoAppealsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [moderatorDecision, setModeratorDecision] = useState('');

  // Fetch pending video appeals
  const { data: appeals = [], isLoading } = useQuery({
    queryKey: ['/api/moderation/video-appeals'],
    queryFn: async () => {
      const response = await fetch('/api/moderation/video-appeals', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch appeals');
      return response.json();
    }
  });

  // Mutation for moderator decisions
  const moderateAppealMutation = useMutation({
    mutationFn: async ({ appealId, decision, reason }: { appealId: string; decision: 'approve' | 'reject'; reason: string }) => {
      return apiRequest(`/api/moderation/appeals/${appealId}/decide`, "POST", {
        decision,
        reason
      });
    },
    onSuccess: () => {
      toast({
        title: "Decision Recorded",
        description: "Your moderation decision has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/video-appeals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/stats'] });
      setSelectedAppeal(null);
      setModeratorDecision('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save decision.",
        variant: "destructive",
      });
    }
  });

  const handleModerate = (decision: 'approve' | 'reject') => {
    if (!selectedAppeal || !moderatorDecision.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for your decision.",
        variant: "destructive",
      });
      return;
    }

    moderateAppealMutation.mutate({
      appealId: selectedAppeal.id,
      decision,
      reason: moderatorDecision
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Appeals for Review ({appeals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appeals.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300">
              No video appeals pending review.
            </p>
          ) : (
            <div className="space-y-4">
              {appeals.map((appeal: any) => (
                <div key={appeal.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-semibold">{appeal.video_title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Original Flag:</strong> {appeal.original_flag_reason}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>User Appeal:</strong> {appeal.appeal_message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        Submitted: {new Date(appeal.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={appeal.status === 'pending' ? 'secondary' : 'default'}>
                      {appeal.status}
                    </Badge>
                  </div>

                  {appeal.gcs_processing_url && (
                    <div className="space-y-2">
                      <Label>Video Status:</Label>
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          <strong>Video stored in temporary Google Cloud Storage</strong>
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          GCS Path: {appeal.gcs_processing_url}
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          Video will be moved to final storage upon approval or deleted upon rejection.
                        </p>
                      </div>
                    </div>
                  )}

                  {appeal.status === 'pending' && (
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setLocation(`/moderation/review/${appeal.id}`)}
                          variant="outline"
                          size="sm"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Review Appeal
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Moderation Decision Modal */}
      {selectedAppeal && (
        <Card>
          <CardHeader>
            <CardTitle>Moderate Appeal: {selectedAppeal.video_title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Original Flag Reason:</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedAppeal.original_flag_reason}
                </p>
              </div>
              <div>
                <Label>User's Appeal Message:</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedAppeal.appeal_message}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moderator-decision">Your Decision Reason:</Label>
              <Textarea
                id="moderator-decision"
                value={moderatorDecision}
                onChange={(e) => setModeratorDecision(e.target.value)}
                placeholder="Explain your decision to approve or reject this appeal..."
                className="min-h-[100px]"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleModerate('approve')}
                disabled={moderateAppealMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Appeal
              </Button>
              <Button
                onClick={() => handleModerate('reject')}
                disabled={moderateAppealMutation.isPending}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Appeal
              </Button>
              <Button
                onClick={() => setSelectedAppeal(null)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Component for displaying comment moderation
function CommentModerationSection({ contentType = "comment" }: { contentType?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch all flagged content for this content type (both AI and user flags)
  const { data: allFlags = [], isLoading } = useQuery({
    queryKey: [`/api/moderation/flags`, { contentType, status: 'pending' }],
    queryFn: async () => {
      const response = await fetch(`/api/moderation/flags?contentType=${contentType}&status=pending`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch flagged content');
      return response.json();
    }
  });

  // Separate AI flags and user flags
  const aiFlags = allFlags.filter((flag: any) => flag.flaggedByAI || flag.isAppeal);
  const userFlags = allFlags.filter((flag: any) => !flag.flaggedByAI && !flag.isAppeal);

  const handleFlagClick = (flag: any) => {
    console.log('User flag clicked:', flag);
    setLocation(`/moderation/${contentType}/${flag.id}`);
  };

  const getContentTypeTitle = () => {
    return contentType === 'video_comment' ? 'Video Comments' : 'Comments & Chat';
  };

  const getContentPreview = (flag: any) => {
    if (!flag.contentSnapshot) return 'Content not available';
    
    try {
      const snapshot = typeof flag.contentSnapshot === 'string' 
        ? JSON.parse(flag.contentSnapshot) 
        : flag.contentSnapshot;
      
      if (snapshot.content) return snapshot.content;
      if (snapshot.comment) return snapshot.comment;
      return JSON.stringify(snapshot).slice(0, 100);
    } catch {
      return String(flag.contentSnapshot).slice(0, 100);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Condensed Overview - AI Flagged Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            AI Flagged {getContentTypeTitle()} ({aiFlags.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aiFlags.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300 text-center py-8">
              No AI flagged {getContentTypeTitle().toLowerCase()} pending review.
            </p>
          ) : (
            <div className="space-y-2">
              {aiFlags.map((flag: any) => (
                <div 
                  key={flag.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors border-blue-200 dark:border-blue-800"
                  onClick={() => handleFlagClick(flag)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
                        {flag.isAppeal ? 'Appeal' : 'AI Flag'}
                      </Badge>
                      <span className="text-xs text-gray-500 truncate">
                        {flag.reason}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {getContentPreview(flag)}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {flag.flaggedByUser ? `${flag.flaggedByUser.firstName} ${flag.flaggedByUser.lastName}` : 'AI System'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(flag.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Badge variant="secondary" className="text-xs">
                      {flag.status}
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Condensed Overview - User Flagged Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            User Flagged {getContentTypeTitle()} ({userFlags.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userFlags.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300 text-center py-8">
              No user flagged {getContentTypeTitle().toLowerCase()} pending review.
            </p>
          ) : (
            <div className="space-y-2">
              {userFlags.map((flag: any) => (
                <div 
                  key={flag.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer transition-colors border-orange-200 dark:border-orange-800"
                  onClick={() => handleFlagClick(flag)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                        User Flag
                      </Badge>
                      <span className="text-xs text-gray-500 truncate">
                        {flag.reason}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {getContentPreview(flag)}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {flag.flaggedByUser ? `${flag.flaggedByUser.firstName} ${flag.flaggedByUser.lastName}` : 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(flag.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Badge variant="secondary" className="text-xs">
                      {flag.status}
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}