import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { 
  ArrowLeft, Shield, Clock, CheckCircle, Plus, Minus, 
  Calendar, User, AlertTriangle, Ban, UserCheck 
} from "lucide-react";

export default function UserStrikeDetails() {
  const { userId } = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'extend' | 'cancel' | 'add-strike' | 'remove-strike' | 'ban' | 'unban' | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState("");
  const [currentActionUserId, setCurrentActionUserId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user details
  const { data: userDetails, isLoading } = useQuery({
    queryKey: [`/api/moderation/strikes/${userId}`],
    enabled: !!userId,
  }) as { data: any, isLoading: boolean };



  // Moderator action mutation
  const moderatorAction = useMutation({
    mutationFn: async ({ userId, action, data }: { userId: string; action: string; data: any }) => {
      return fetch(`/api/moderation/strikes/${userId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Action completed",
        description: "Moderator action has been executed successfully.",
      });
      setDialogOpen(false);
      setActionReason("");
      setSuspensionDays("");
      // Invalidate both the specific user query and the general strikes list
      queryClient.invalidateQueries({ queryKey: [`/api/moderation/strikes/${userId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/strikes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Action failed",
        description: error.message || "Failed to execute moderator action",
        variant: "destructive",
      });
    },
  });

  const handleModeratorAction = (type: 'extend' | 'cancel' | 'add-strike' | 'remove-strike' | 'ban' | 'unban', userId?: string) => {
    if (userId) {
      setCurrentActionUserId(userId);
    }
    
    setActionType(type);
    setActionReason("");
    setSuspensionDays("");
    setDialogOpen(true);
  };

  const executeAction = () => {
    const userIdToUse = currentActionUserId || userId;
    
    if (!userIdToUse || !actionType) {
      return;
    }

    const actionData: any = {
      reason: actionReason,
    };

    if (actionType === 'extend' && suspensionDays) {
      actionData.days = parseInt(suspensionDays);
    }

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
      case 'add-strike': return 'Add Manual Strike';
      case 'remove-strike': return 'Remove Strike';
      case 'ban': return 'Permanent Ban';
      case 'unban': return 'Remove Permanent Ban';
      default: return 'Moderator Action';
    }
  };

  const getActionDescription = () => {
    switch (actionType) {
      case 'extend': return 'Extend the current suspension period. Requires a reason and number of additional days.';
      case 'cancel': return 'Cancel the current suspension and restore account access. Requires justification.';
      case 'add-strike': return 'Manually add a strike to this user account. This may trigger automatic suspension.';
      case 'remove-strike': return 'Remove a strike from this user account. This may lift current suspensions.';
      case 'ban': return 'Permanently ban this user account. This action cannot be undone by the automated system.';
      case 'unban': return 'Remove the permanent ban and restore account access. Requires detailed justification.';
      default: return 'Execute a moderator override action.';
    }
  };

  const getStrikeIcon = (strikes: number) => {
    if (strikes === 0) return <UserCheck className="w-5 h-5 text-green-500" />;
    if (strikes === 1) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    if (strikes >= 2 && strikes < 4) return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    return <Ban className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'suspended': return 'text-red-600';
      case 'banned': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'default';
      case 'warning': return 'secondary';
      case 'suspended': return 'destructive';
      case 'banned': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/strikes')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Strikes
            </Button>
          </div>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/strikes')}
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
          </div>
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">User not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/strikes')}
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
          </div>

          {/* User Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userDetails?.user?.firstName} {userDetails?.user?.lastName}
            </h1>
            {userDetails?.user?.username && (
              <p className="text-lg text-gray-500">@{userDetails.user.username}</p>
            )}
            <p className="text-gray-600 dark:text-gray-400">{userDetails?.user?.email}</p>
          </div>

          {/* Account Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Account Status</h3>
                <div className="flex items-center gap-2">
                  {getStrikeIcon(userDetails?.strikeRecord?.currentStrikes || 0)}
                  <p className={`text-xl font-bold ${getStatusColor(userDetails?.strikeRecord?.accountStatus || 'active')}`}>
                    {(userDetails?.strikeRecord?.accountStatus || 'active').toUpperCase()}
                  </p>
                </div>
                {userDetails?.strikeRecord?.suspensionEndDate && (
                  <p className="text-sm text-gray-500 mt-1">
                    Until: {new Date(userDetails.strikeRecord.suspensionEndDate).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Current Strikes</h3>
                    <p className="text-3xl font-bold text-red-600">
                      {userDetails?.strikeRecord?.currentStrikes || 0} / 3
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Total Violations</h3>
                    <p className="text-3xl font-bold text-orange-600">
                      {userDetails?.strikeRecord?.totalViolations || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Moderator Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Moderator Override Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Suspension Controls */}
                {userDetails?.strikeRecord?.accountStatus === 'suspended' ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleModeratorAction('extend', userDetails.userId)}
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Extend
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleModeratorAction('cancel', userDetails.userId)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <div className="col-span-2 text-sm text-gray-500 py-2">
                    Suspension controls available when user is suspended
                  </div>
                )}
                
                {/* Strike Controls */}
                <Button
                  variant="outline"
                  onClick={() => handleModeratorAction('add-strike', userDetails?.userId)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Strike
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleModeratorAction('remove-strike', userDetails?.userId)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  disabled={(userDetails?.strikeRecord?.currentStrikes || 0) === 0}
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Remove Strike
                </Button>

                {/* Ban Controls */}
                {userDetails?.strikeRecord?.accountStatus === 'banned' ? (
                  <Button
                    variant="outline"
                    onClick={() => handleModeratorAction('unban', userDetails.userId)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Unban
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleModeratorAction('ban', userDetails?.userId)}
                    className="text-red-700 border-red-300 hover:bg-red-50"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Permanent Ban
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                These actions override the automated suspension system and require justification.
              </p>
            </CardContent>
          </Card>

          {/* Violation History */}
          <Card>
            <CardHeader>
              <CardTitle>Violation History</CardTitle>
            </CardHeader>
            <CardContent>
              {(!userDetails?.violations || userDetails.violations.length === 0) ? (
                <p className="text-gray-600 dark:text-gray-400 py-8 text-center">
                  No violations recorded.
                </p>
              ) : (
                <div className="space-y-4">
                  {userDetails.violations.map((violation: any) => (
                    <div key={violation.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="space-y-3">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            Strike #{violation.strikeNumber}
                          </Badge>
                          <Badge variant={violation.consequence === 'warning' ? 'secondary' : 'destructive'}>
                            {violation.consequence}
                          </Badge>
                          {violation.appealStatus && violation.appealStatus !== 'none' && (
                            <Badge variant={violation.appealStatus === 'approved' ? 'default' : 'secondary'}>
                              Appeal: {violation.appealStatus}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Violation details */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {violation.violationType}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400">
                            {violation.description}
                          </p>
                          {violation.moderatorNotes && (
                            <p className="text-sm text-gray-500">
                              <strong>Moderator Notes:</strong> {violation.moderatorNotes}
                            </p>
                          )}
                        </div>
                        
                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(violation.createdAt).toLocaleDateString()}</span>
                          </div>
                          {violation.moderator && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>
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
            </CardContent>
          </Card>
        </div>
      </div>

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
  );
}