import { createPortal } from "react-dom";
import { X, Video, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient.ts";

interface VideoAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: {
    id: string;
    processingStatus: string;
    createdAt: string;
    userId: string;
  };
  threadId?: string;
  user?: {
    id: string;
  };
}

export default function VideoAnalysisModal({ 
  isOpen, 
  onClose, 
  message, 
  threadId, 
  user 
}: VideoAnalysisModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest(`/api/thread-messages/${messageId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Video deleted",
        description: "Your video message has been removed",
      });
      
      if (threadId) {
        queryClient.setQueryData(["/api/threads", threadId, "messages"], (oldData: any) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          return oldData.filter((msg: any) => msg.id !== message?.id);
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/threads", threadId, "messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
      }
      
      onClose();
    },
    onError: (error) => {
      console.error('Error deleting thread message:', error);
      toast({
        title: "Error",
        description: "Failed to delete video message",
        variant: "destructive",
      });
    }
  });

  const handleDelete = () => {
    if (message) {
      deleteMutation.mutate(message.id);
    }
  };

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Video Analysis in Progress
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Quality and content safety review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            Your video is being analyzed for quality and content safety.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">Content Safety Check</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">AI reviews video for inappropriate content to ensure community safety</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">Quality Optimization</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Video is processed for optimal streaming and compatibility</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">Final Review</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">System validates processing before making video available</p>
              </div>
            </div>
          </div>
          
          {message && (
            <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Current Status</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {message.processingStatus === 'processing' ? 'Analyzing content...' :
                     message.processingStatus === 'uploaded' ? 'Running safety checks...' :
                     message.processingStatus === 'pending' ? 'Final review...' : 
                     'Processing...'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.floor((new Date().getTime() - new Date(message.createdAt).getTime()) / 60000)}m
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          {message && user && message.userId === user.id && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Video
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}