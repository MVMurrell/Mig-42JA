import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { ArrowLeft, CheckCircle, XCircle, Shield, User, Calendar, FileText } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient.ts";
import Hls from 'hls.js';

export default function VideoModerationReviewPage() {
  const { videoId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [moderationDecision, setModerationDecision] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Fetch video details
  const { data: video = {}, isLoading } = useQuery({
    queryKey: ['/api/moderation/videos', videoId],
    queryFn: async () => {
      const response = await fetch(`/api/moderation/videos/${videoId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch video details');
      return response.json();
    },
    enabled: !!videoId,
  });

  // Set up video player
  useEffect(() => {
    if (video?.videoUrl && videoRef.current) {
      const videoElement = videoRef.current;
      
      if (video.videoUrl.includes('.m3u8')) {
        // HLS video
        if (Hls.isSupported()) {
          hlsRef.current = new Hls();
          hlsRef.current.loadSource(video.videoUrl);
          hlsRef.current.attachMedia(videoElement);
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          videoElement.src = video.videoUrl;
        }
      } else {
        // Regular video
        videoElement.src = video.videoUrl;
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [video?.videoUrl]);

  // Submit moderation decision
  const moderateVideoMutation = useMutation({
    mutationFn: async ({ decision, reason }: { decision: 'approve' | 'reject'; reason: string }) => {
      return apiRequest(`/api/moderation/videos/${videoId}/decide`, "POST", {
        decision,
        reason
      });
    },
    onSuccess: () => {
      toast({
        title: "Decision Recorded",
        description: "Your moderation decision has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/videos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/stats'] });
      setLocation('/moderation');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save decision.",
        variant: "destructive",
      });
    }
  });

  const handleSubmitDecision = () => {
    if (!moderationDecision) {
      toast({
        title: "Decision Required",
        description: "Please select approve or reject before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (moderationDecision === 'reject' && !moderationReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejecting this video.",
        variant: "destructive",
      });
      return;
    }

    moderateVideoMutation.mutate({
      decision: moderationDecision as 'approve' | 'reject',
      reason: moderationReason
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'uploaded': return 'secondary';
      case 'rejected_by_moderation': return 'destructive';
      case 'under_appeal': return 'default';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="mt-20">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">Loading video details...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!video?.id) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="mt-20">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">Video not found</p>
              <Button 
                onClick={() => setLocation('/moderation')} 
                className="mt-4"
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Moderation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setLocation('/moderation')} 
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Review Video Content
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {video.title}
                  <Badge variant={getStatusBadgeVariant(video.processingStatus)}>
                    {video.processingStatus === 'uploaded' ? 'Pending Review' :
                     video.processingStatus === 'rejected_by_moderation' ? 'Rejected' :
                     video.processingStatus === 'under_appeal' ? 'Under Appeal' : video.processingStatus}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  <video
                    ref={videoRef}
                    controls
                    className="w-full h-full"
                    poster={video.thumbnailUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                
                {video.description && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Description</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{video.description}</p>
                  </div>
                )}

                {video.flaggedReason && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 mt-4">
                    <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">Flagged Content</h3>
                    <p className="text-sm text-red-700 dark:text-red-300">{video.flaggedReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Video Details & Moderation Actions */}
          <div className="space-y-6">
            {/* Video Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Video Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Creator</Label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {video.user?.firstName} {video.user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{video.user?.email}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Upload Date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-900 dark:text-white">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Current Status</Label>
                  <Badge variant={getStatusBadgeVariant(video.processingStatus)} className="mt-1">
                    {video.processingStatus === 'uploaded' ? 'Pending Review' :
                     video.processingStatus === 'rejected_by_moderation' ? 'Rejected' :
                     video.processingStatus === 'under_appeal' ? 'Under Appeal' : video.processingStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Moderation Decision */}
            <Card>
              <CardHeader>
                <CardTitle>Moderation Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={moderationDecision === 'approve' ? 'default' : 'outline'}
                    onClick={() => setModerationDecision('approve')}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button
                    variant={moderationDecision === 'reject' ? 'destructive' : 'outline'}
                    onClick={() => setModerationDecision('reject')}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>

                {moderationDecision === 'reject' && (
                  <div className="space-y-2">
                    <Label htmlFor="reason">Rejection Reason (Required)</Label>
                    <Textarea
                      id="reason"
                      value={moderationReason}
                      onChange={(e) => setModerationReason(e.target.value)}
                      placeholder="Explain why this content violates community guidelines..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                )}

                <Button
                  onClick={handleSubmitDecision}
                  disabled={!moderationDecision || (moderationDecision === 'reject' && !moderationReason.trim()) || moderateVideoMutation.isPending}
                  className="w-full"
                >
                  {moderateVideoMutation.isPending ? 'Processing...' : 'Submit Decision'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}