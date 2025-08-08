import { useState, useEffect } from "react";
import { X, Camera, Save } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { isUnauthorizedError } from "@/lib/authUtils.ts";
import CameraModal from "@/components/CameraModal.tsx";

interface Group {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  coverImageUrl?: string;
}

interface GroupEditModalProps {
  group: Group;
  onClose: () => void;
  onUpdate: () => void;
}

export default function GroupEditModal({ group, onClose, onUpdate }: GroupEditModalProps) {
  const [formData, setFormData] = useState({
    name: group.name || "",
    description: group.description || "",
    isPublic: group.isPublic || false,
    coverImageUrl: group.coverImageUrl || ""
  });
  const [showCameraModal, setShowCameraModal] = useState(false);
  const { toast } = useToast();

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!group?.id) {
        throw new Error("Group ID is required");
      }
      await apiRequest(`/api/groups/${group.id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Group Updated",
        description: "Your group has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${group.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/nearby"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/user"] });
      onUpdate();
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
        description: "Failed to update group. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Group name is required.",
        variant: "destructive",
      });
      return;
    }
    updateGroupMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full h-full md:rounded-lg md:w-full md:max-w-2xl md:mx-4 md:max-h-[90vh] md:h-auto overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Edit Group</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cover Image */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cover Image</Label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                {formData.coverImageUrl ? (
                  <img
                    src={formData.coverImageUrl}
                    alt="Group cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCameraModal(true)}
                    className="w-full mb-2"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            handleInputChange("coverImageUrl", reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="w-full"
                  >
                    Choose from Files
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Take a photo or choose from your files
                </p>
              </div>
            </div>
          </div>

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Group Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter group name"
              maxLength={50}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe your group"
              maxLength={200}
              rows={4}
            />
            <p className="text-xs text-gray-500">
              {(formData.description || "").length}/200 characters
            </p>
          </div>

          {/* Privacy Setting */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Privacy</Label>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">
                  {formData.isPublic ? "Public Group" : "Private Group"}
                </h3>
                <p className="text-sm text-gray-600">
                  {formData.isPublic 
                    ? "Anyone can discover and join this group"
                    : "Only invited members can join this group"
                  }
                </p>
              </div>
              <Switch
                checked={formData.isPublic}
                onCheckedChange={(checked) => handleInputChange("isPublic", checked)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={updateGroupMutation.isPending}
              className="flex-1"
            >
              {updateGroupMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateGroupMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={(imageData) => {
          handleInputChange("coverImageUrl", imageData);
          setShowCameraModal(false);
        }}
      />
    </div>
  );
}