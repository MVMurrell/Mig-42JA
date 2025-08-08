import { useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, MessageSquare, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { apiRequest } from "@/lib/queryClient.ts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface VideoRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  video?: {
    id: string;
    title: string;
    flaggedReason?: string;
    audioFlagReason?: string;
    processingStatus: string;
  };
  comment?: {
    id: string;
    flaggedReason?: string;
    audioFlagReason?: string;
    processingStatus: string;
    messageType?: string; // Add messageType to distinguish thread messages
  };
  isComment?: boolean;
  isThreadMessage?: boolean; // Add flag to distinguish thread messages
  videoId?: string; // Add videoId prop for invalidating comments query
  threadId?: string; // Add threadId prop for proper cache invalidation
  onRefetchComments?: () => void; // Add refetch function for immediate UI update
}

export default function VideoRejectionModal({ isOpen, onClose, video, comment, isComment, isThreadMessage, videoId, threadId, onRefetchComments }: VideoRejectionModalProps) {
  const [appealMessage, setAppealMessage] = useState("");
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const appealMutation = useMutation({
    mutationFn: async (appealData: { id: string; message: string }) => {
      let endpoint: string;
      if (isThreadMessage) {
        // Thread messages don't have appeals yet, use video comment endpoint for now
        endpoint = `/api/video-comments/${appealData.id}/appeal`;
      } else if (isComment) {
        endpoint = `/api/video-comments/${appealData.id}/appeal`;
      } else {
        endpoint = `/api/videos/${appealData.id}/appeal`;
      }
      return apiRequest(endpoint, "POST", { 
        message: appealData.message 
      });
    },
    onSuccess: () => {
      toast({
        title: "Appeal submitted",
        description: "Your appeal has been submitted for review. We'll notify you of the decision.",
      });
      setAppealMessage("");
      setIsSubmittingAppeal(false);
      // Invalidate video comments query to refresh the comments section
      if (videoId) {
        queryClient.invalidateQueries({ queryKey: ["/api/videos", videoId, "comments"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    },
    onError: (error) => {
      console.error("Appeal submission error:", error);
      toast({
        title: "Appeal failed",
        description: "Unable to submit appeal. Please try again.",
        variant: "destructive",
      });
      setIsSubmittingAppeal(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      // Determine the correct endpoint based on content type
      let endpoint: string;
      let actualId = itemId;
      
      if (isThreadMessage) {
        endpoint = `/api/thread-messages/${actualId}`;
        console.log(`🗑️ DELETE REQUEST: Thread message - endpoint ${endpoint}`);
      } else if (isComment) {
        // This is a video comment - handle synthetic IDs
        const itemIdString = String(itemId);
        if (itemIdString.startsWith('comment-')) {
          actualId = itemIdString.replace('comment-', '');
          console.log(`🔄 Converting synthetic video comment ID ${itemId} to actual ID ${actualId}`);
        }
        endpoint = `/api/video-comments/${actualId}`;
        console.log(`🗑️ DELETE REQUEST: Video comment - endpoint ${endpoint}`);
      } else {
        // This is a regular video/Jem
        endpoint = `/api/videos/${actualId}`;
        console.log(`🗑️ DELETE REQUEST: Regular video/Jem - endpoint ${endpoint}`);
      }
      
      return apiRequest(endpoint, "DELETE");
    },
    onSuccess: () => {
      // Determine the correct content type based on context
      let contentType: string;
      if (isThreadMessage) {
        contentType = "thread message";
      } else if (isComment) {
        contentType = "video comment";
      } else {
        contentType = "video"; // This is a regular video (Jem)
      }
      
      toast({
        title: `${contentType} deleted`,
        description: `The rejected ${contentType} has been permanently deleted.`,
      });
      
      // Invalidate appropriate queries to refresh the UI
      console.log("🔄 Cache invalidation triggered - isThreadMessage:", isThreadMessage, "threadId:", threadId, "videoId:", videoId);
      
      if (isThreadMessage && threadId) {
        console.log("🔄 Invalidating thread message cache for threadId:", threadId);
        
        // Remove the item from cache manually before invalidating to ensure immediate UI update
        queryClient.setQueryData(["/api/threads", threadId, "messages"], (oldData: any) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          const messageId = isComment ? comment?.id : video?.id;
          console.log("🗑️ Removing message with ID:", messageId, "from cache");
          return oldData.filter((msg: any) => msg.id !== messageId);
        });
        
        // Invalidate and refetch to sync with server
        queryClient.invalidateQueries({ queryKey: ["/api/threads", threadId, "messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
        console.log("🔄 Cache invalidation complete for threadId:", threadId);
      } else if (isThreadMessage) {
        console.log("🔄 Thread message but no threadId - invalidating all thread queries");
        queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
      } else if (videoId) {
        // For video comments - force immediate refetch to ensure fresh data
        console.log("🔄 Forcing video comments refetch for videoId:", videoId);
        
        // Remove stale data and force immediate refetch
        queryClient.removeQueries({ queryKey: ['/api/videos', videoId, 'comments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/videos', videoId, 'comments'] });
        
        // Force immediate refetch to update UI
        queryClient.refetchQueries({ queryKey: ['/api/videos', videoId, 'comments'] });
        
        // Also call the direct refetch function if provided for immediate UI update
        if (onRefetchComments) {
          console.log("🔄 Calling direct refetch function for immediate UI update");
          onRefetchComments();
        }
        
        // Also invalidate user video comments for profile page
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        queryClient.invalidateQueries({ queryKey: ["/api/video-comments"] });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    },
    onError: (error) => {
      // Determine the correct content type for error message
      let contentType: string;
      if (isThreadMessage) {
        contentType = "thread message";
      } else if (isComment) {
        contentType = "video comment";
      } else {
        contentType = "video"; // This is a regular video (Jem)
      }
      
      console.error(`${contentType} deletion error:`, error);
      toast({
        title: "Delete failed",
        description: `Unable to delete ${contentType}. Please try again.`,
        variant: "destructive",
      });
    }
  });

  const currentItem = video || comment;
  
  const handleDeleteVideo = () => {
    if (currentItem) {
      console.log(`🔍 DELETE DEBUG: currentItem structure:`, {
        id: currentItem.id,
        isVideoComment: isComment,
        isThreadMessage: isThreadMessage,
        allKeys: Object.keys(currentItem)
      });
      
      deleteMutation.mutate(currentItem.id);
    }
  };

  const handleSubmitAppeal = () => {
    if (!appealMessage.trim()) {
      toast({
        title: "Message required",
        description: "Please provide a reason for your appeal.",
        variant: "destructive",
      });
      return;
    }

    if (currentItem) {
      setIsSubmittingAppeal(true);
      appealMutation.mutate({
        id: currentItem.id,
        message: appealMessage.trim()
      });
    }
  };

  const getRejectionReason = () => {
    const processingStatus = currentItem?.processingStatus;
    const flaggedReason = currentItem?.flaggedReason;
    const audioFlagReason = currentItem?.audioFlagReason;
    
    // First check if this is a technical failure
    if (processingStatus === 'failed') {
      return "Upload failed";
    }
    
    // Check if flagged reason indicates a technical error (not content policy violation)
    if (flaggedReason && (
      flaggedReason.includes('Technical processing error') ||
      flaggedReason.includes('unable to analyze') ||
      flaggedReason.includes('processing failed') ||
      flaggedReason.includes('extraction failed') ||
      flaggedReason.includes('Please try uploading again')
    )) {
      return "Technical processing error";
    }
    
    // Check for gesture detection first (more specific than audio)
    if (flaggedReason && (
      flaggedReason.includes('hand gesture') || 
      flaggedReason.includes('inappropriate gesture') ||
      flaggedReason.includes('gesture detection') ||
      flaggedReason.includes('gestures detected')
    )) {
      return "Inappropriate gestures detected";
    }
    
    // Then check for audio content violations
    if (flaggedReason && (
      flaggedReason.includes('Audio content flagged') || 
      (flaggedReason.includes('audio') && !flaggedReason.includes('gesture')) ||
      (flaggedReason.includes('Audio') && !flaggedReason.includes('gesture')) ||
      flaggedReason.includes('inappropriate language') ||
      flaggedReason.includes('speech')
    )) {
      return "Inappropriate audio content detected";
    }
    
    // Check for specific audio flag reason (only if not gesture-related)
    if (audioFlagReason && audioFlagReason !== 'null' && !audioFlagReason.includes('gesture')) {
      return `Audio content: ${audioFlagReason}`;
    }
    
    // Check for visual content flags (only if not technical error)
    if (flaggedReason && flaggedReason !== 'null' && !flaggedReason.includes('Audio') && !flaggedReason.includes('Technical')) {
      return `Visual content: ${flaggedReason}`;
    }
    
    return "Content violated our community guidelines";
  };

  const getRejectionDetails = () => {
    const processingStatus = currentItem?.processingStatus;
    const flaggedReason = currentItem?.flaggedReason;
    
    // First check if this is a technical failure
    if (processingStatus === 'failed') {
      return "There was a technical issue during the upload process. This could be due to network connectivity, file format issues, or server problems. Please try uploading again.";
    }
    
    // Check if flagged reason indicates a technical error (not content policy violation)
    if (flaggedReason && (
      flaggedReason.includes('Technical processing error') ||
      flaggedReason.includes('unable to analyze') ||
      flaggedReason.includes('processing failed') ||
      flaggedReason.includes('extraction failed') ||
      flaggedReason.includes('Please try uploading again')
    )) {
      return flaggedReason; // Return the specific technical error message
    }
    
    // Check for gesture violations first (more specific)
    if (flaggedReason && (
      flaggedReason.includes('hand gesture') || 
      flaggedReason.includes('inappropriate gesture') ||
      flaggedReason.includes('gesture detection') ||
      flaggedReason.includes('gestures detected')
    )) {
      return "Our AI system detected inappropriate hand gestures in your video content. Please ensure your videos follow our community guidelines.";
    }
    
    // Then check for audio content violations
    const isAudioRelated = flaggedReason && (
      flaggedReason.includes('Audio content flagged') || 
      (flaggedReason.includes('audio') && !flaggedReason.includes('gesture')) ||
      (flaggedReason.includes('Audio') && !flaggedReason.includes('gesture')) ||
      flaggedReason.includes('inappropriate language') ||
      flaggedReason.includes('speech')
    );
    
    if (isAudioRelated) {
      return "Our automated system detected inappropriate language or content in the video's audio track.";
    }
    
    const reason = getRejectionReason();
    if (reason.includes('Audio content:') && !reason.includes('gesture')) {
      return "Our automated system detected inappropriate language or content in the video's audio track.";
    }
    if (reason.includes('Visual content:')) {
      return "Our automated system detected inappropriate visual content in the video.";
    }
    return "The content was flagged by our automated moderation system for violating community guidelines.";
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
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Video Rejected
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Content moderation review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Content Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              "{isComment ? 'Video Comment' : ((currentItem as any)?.title || 'Video Content')}"
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isComment ? 'Comment submitted and reviewed' : 'Uploaded and reviewed'}
            </p>
          </div>

          {/* Rejection Reason */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Reason for rejection:
            </h4>
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                {getRejectionReason()}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {getRejectionDetails()}
              </p>
            </div>
          </div>

          {/* Community Guidelines */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Community Guidelines
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>• Keep content family-friendly and respectful</p>
              <p>• No offensive language or inappropriate audio</p>
              <p>• No inappropriate visual content</p>
              <p>• Respect community standards</p>
            </div>
          </div>

          {/* Appeal Section */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Appeal this decision
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              If you believe this decision was made in error, you can submit an appeal with additional context.
            </p>
            
            <textarea
              value={appealMessage}
              onChange={(e) => setAppealMessage(e.target.value)}
              placeholder="Explain why you believe this content doesn't violate our guidelines..."
              className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {appealMessage.length}/500 characters
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 dark:bg-gray-700/50">
          {/* Mobile Layout - Stacked */}
          <div className="flex flex-col gap-3 sm:hidden">
            <Button
              onClick={handleSubmitAppeal}
              disabled={isSubmittingAppeal || !appealMessage.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmittingAppeal ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Appeal
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteVideo}
              disabled={deleteMutation.isPending}
              className="w-full text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20"
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full text-gray-700 dark:text-gray-300"
            >
              Close
            </Button>
          </div>

          {/* Desktop Layout - Horizontal */}
          <div className="hidden sm:flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="text-gray-700 dark:text-gray-300"
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteVideo}
                disabled={deleteMutation.isPending}
                className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20"
              >
                {deleteMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
            <Button
              onClick={handleSubmitAppeal}
              disabled={isSubmittingAppeal || !appealMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmittingAppeal ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Appeal
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}