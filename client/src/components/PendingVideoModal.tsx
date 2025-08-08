import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog.tsx";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { Clock, Trash2, Edit3, X } from "lucide-react";

interface PendingVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingVideo: any;
}

export default function PendingVideoModal({ 
  isOpen, 
  onClose, 
  pendingVideo 
}: PendingVideoModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState(pendingVideo?.title || "");
  const [description, setDescription] = useState(pendingVideo?.description || "");
  const [category, setCategory] = useState(pendingVideo?.category || "");
  const [visibility, setVisibility] = useState(pendingVideo?.visibility || "everyone");
  const [isEditing, setIsEditing] = useState(false);

  // Fetch current user info
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch user groups for visibility options
  const { data: userGroups = [] } = useQuery<any[]>({
    queryKey: ["/api/groups"],
  });

  const updateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await apiRequest(`/api/videos/${pendingVideo.id}`, "PATCH", updateData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Updated!",
        description: "Your pending Jem has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/user"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update your Jem. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      console.log(`🔥 CLIENT: Starting deletion of video ${pendingVideo.id}`);
      const response = await apiRequest(`/api/videos/${pendingVideo.id}`, "DELETE");
      console.log(`🔥 CLIENT: DELETE response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log(`🔥 CLIENT: DELETE failed with error:`, errorData);
        throw new Error(errorData.message || "Failed to delete video");
      }
      
      const result = await response.json();
      console.log(`🔥 CLIENT: DELETE successful:`, result);
      return result;
    },
    onSuccess: () => {
      console.log(`🔥 CLIENT: Delete mutation successful, invalidating cache for user:`, currentUser?.id);
      toast({
        title: "Cancelled",
        description: "Your pending Jem has been cancelled.",
      });
      // Force remove the exact user videos query from cache
      if (currentUser?.id) {
        queryClient.removeQueries({ queryKey: ["/api/users", currentUser.id, "videos"] });
        console.log(`🔥 CLIENT: Removed cache for key:`, ["/api/users", currentUser.id, "videos"]);
        
        // Then invalidate to trigger refetch
        queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser.id, "videos"] });
        console.log(`🔥 CLIENT: Invalidated cache for key:`, ["/api/users", currentUser.id, "videos"]);
      }
      // Also invalidate other video-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/nearby"] });
      console.log(`🔥 CLIENT: All video caches invalidated, closing modal`);
      onClose();
    },
    onError: (error: any) => {
      console.error("Delete video error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel your Jem. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !category) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and select a category.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      title,
      description,
      category,
      visibility,
    });
  };

  const handleCancel = () => {
    console.log(`🔥 CLIENT: handleCancel called for video:`, pendingVideo);
    console.log(`🔥 CLIENT: Video ID for deletion:`, pendingVideo?.id);
    cancelMutation.mutate();
  };

  const categories = [
    "art", "music", "food", "travel", "nature", "sports", "gaming", 
    "education", "comedy", "dance", "fashion", "tech", "pets", "love"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500 animate-pulse" />
            Pending Jem: "{pendingVideo?.title}"
          </DialogTitle>
          <DialogDescription>
            Manage your video while it's being processed. You can edit details or cancel the upload.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Processing Status
              </span>
            </div>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              Your Jem is currently being processed. This usually takes 1-3 minutes.
            </p>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your video..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Visibility</label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Everyone</SelectItem>
                    <SelectItem value="friends">Friends Only</SelectItem>
                    {userGroups.map((group: any) => (
                      <SelectItem key={group.id} value={`group_${group.id}`}>
                        {group.name} (Group)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Title:</span>
                  <p className="text-sm">{pendingVideo?.title}</p>
                </div>
                
                {pendingVideo?.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Description:</span>
                    <p className="text-sm">{pendingVideo.description}</p>
                  </div>
                )}
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Category:</span>
                  <p className="text-sm capitalize">{pendingVideo?.category}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Visibility:</span>
                  <p className="text-sm capitalize">{pendingVideo?.visibility}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="flex-1"
                  disabled={updateMutation.isPending || cancelMutation.isPending}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={updateMutation.isPending || cancelMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {cancelMutation.isPending ? "Cancelling..." : "Cancel Jem"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Processing Jem?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel this Jem? This action cannot be undone and your upload will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Jem</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancel}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Cancel Jem
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}