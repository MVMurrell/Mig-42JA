import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Label } from '@/components/ui/label.tsx';
import { AlertTriangle, MessageSquare, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient.ts';
import { useToast } from '@/hooks/use-toast.ts';

interface RejectedVideo {
  id: string;
  title: string;
  description: string;
  flaggedReason: string;
  processingStatus: string;
  moderationResults: string;
  transcriptionText?: string;
  audioFlagReason?: string;
}

interface ContentModerationModalProps {
  video: RejectedVideo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContentModerationModal({ video, isOpen, onClose }: ContentModerationModalProps) {
  const [appealReason, setAppealReason] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const submitAppealMutation = useMutation({
    mutationFn: async ({ videoId, reason }: { videoId: string; reason: string }) => {
      return apiRequest(`/api/videos/${videoId}/appeal`,
        { method:"POST", 
        data: { 
        message: reason 
      }});
    },
    onSuccess: () => {
      toast({
        title: "Appeal Submitted",
        description: "Your appeal has been submitted for review. You'll be notified of the decision.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/videos/rejected'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', 'videos'] });
      onClose();
      setAppealReason('');
    },
    onError: (error: any) => {
      toast({
        title: "Appeal Failed",
        description: error.message || "Failed to submit appeal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      return apiRequest(`/api/videos/${videoId}/cancel`, 
        {method: 'DELETE'},
      );
    },
    onSuccess: () => {
      toast({
        title: "Video Cancelled",
        description: "Your video has been permanently removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/videos/rejected'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', 'videos'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel video. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitAppeal = async () => {
    if (!video || !appealReason.trim() || appealReason.trim().length < 10) {
      toast({
        title: "Invalid Appeal",
        description: "Please provide a detailed reason for your appeal (at least 10 characters).",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingAppeal(true);
    try {
      await submitAppealMutation.mutateAsync({
        videoId: video.id,
        reason: appealReason.trim(),
      });
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const handleCancelVideo = () => {
    if (!video) return;
    
    if (confirm('Are you sure you want to permanently delete this video? This action cannot be undone.')) {
      cancelVideoMutation.mutate(video.id);
    }
  };

  if (!video) return null;

  const moderationData = video.moderationResults ? JSON.parse(video.moderationResults) : {};
  const isVideoFlagged = moderationData.videoModeration === false;
  const isAudioFlagged = video.audioFlagReason || moderationData.audioModeration === 'failed';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Content Moderation Review Required
          </DialogTitle>
          <DialogDescription>
            Your video "{video.title}" was flagged by our content moderation system and needs review before it can be published.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Flagged Content Details */}
          <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
              Content Issues Detected
            </h3>
            
            {isVideoFlagged && (
              <div className="mb-3">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>Visual Content:</strong> Content flagged by AI moderation system
                </p>
              </div>
            )}

            {isAudioFlagged && (
              <div className="mb-3">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>Audio Content:</strong> {video.audioFlagReason || 'Inappropriate language detected'}
                </p>
                {video.transcriptionText && (
                  <details className="mt-2">
                    <summary className="text-sm font-medium cursor-pointer text-orange-600 dark:text-orange-400">
                      View Transcript
                    </summary>
                    <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded text-sm">
                      "{video.transcriptionText}"
                    </div>
                  </details>
                )}
              </div>
            )}

            <p className="text-sm text-orange-700 dark:text-orange-300">
              <strong>Overall Reason:</strong> {video.flaggedReason}
            </p>
          </div>

          {/* Appeal Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Submit an Appeal</h3>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              If you believe your content was incorrectly flagged, you can submit an appeal for human review. 
              Please explain why you think this content should be approved.
            </p>

            <div className="space-y-2">
              <Label htmlFor="appeal-reason">Appeal Reason</Label>
              <Textarea
                id="appeal-reason"
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="Please explain why you believe this content was incorrectly flagged..."
                className="min-h-[100px]"
                maxLength={500}
              />
              <p className="text-xs text-gray-500">
                {appealReason.length}/500 characters (minimum 10 required)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              onClick={handleSubmitAppeal}
              disabled={isSubmittingAppeal || appealReason.trim().length < 10}
              className="flex-1"
            >
              {isSubmittingAppeal ? 'Submitting...' : 'Submit Appeal'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCancelVideo}
              disabled={cancelVideoMutation.isPending}
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/20"
            >
              {cancelVideoMutation.isPending ? 'Deleting...' : 'Delete Video'}
            </Button>
            
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}