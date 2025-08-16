import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { ArrowLeft, CheckCircle, XCircle, Play } from "lucide-react";
import { apiRequest } from "@/lib/queryClient.ts";
import { useParams } from "react-router-dom";
import Hls from 'hls.js';

export default function ModerationDetailPage() {
  const [, params] = useRoute("/moderation/:contentType/:flagId.");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [moderatorDecision, setModeratorDecision] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
const { contentType, flagId } = useParams<{ contentType: string; flagId: string }>();


  // Fetch the specific content details based on content type
  const { data: contentData, isLoading } = useQuery({
    queryKey: [`/api/moderation/${contentType}/${flagId}`],
    queryFn: async () => {
      if (contentType === 'video') {
        // For videos, use the video moderation endpoint
        const response = await fetch(`/api/moderation/videos/${flagId}`, {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch video details');
        return response.json();
      } else {
        // For other content types, use the flag endpoint
        const response = await fetch(`/api/moderation/flags/${flagId}`, {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch flag details');
        return response.json();
      }
    },
    enabled: !!(contentType && flagId)
  });

  // Get the correct video URL for playback
  const getVideoUrl = (video: any) => {
    if (!video) return '';
    
    // For videos under appeal with review video ID, use the moderation streaming endpoint
    if (video.bunnyReviewVideoId && (video.processingStatus === 'under_appeal' || !video.videoUrl)) {
      return `/api/moderation/video-stream/${video.id}`;
    }
    
    // For regular videos, use the standard video URL
    return video.videoUrl || '';
  };

  // Initialize HLS video player for video content
  useEffect(() => {
    if (contentData && contentType === 'video' && videoRef.current) {
      const videoUrl = getVideoUrl(contentData);
      console.log('Initializing video player with URL:', videoUrl);
      
      // Cleanup previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      if (Hls.isSupported()) {
        console.log('HLS is supported, initializing HLS.js');
        const hls = new Hls({
          enableWorker: false,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          debug: false,
          capLevelToPlayerSize: true,
          autoStartLoad: true,
          startLevel: -1
        });
        hlsRef.current = hls;
        hls.loadSource(videoUrl);
        hls.attachMedia(videoRef.current);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest loaded successfully');
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('Network error, trying to recover...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.log('Fatal error, destroying HLS instance');
                hls.destroy();
                break;
            }
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('Native HLS support detected');
        videoRef.current.src = videoUrl;
      } else {
        console.error('HLS not supported');
      }
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [contentData, contentType]);

  const moderateFlagMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: 'approve' | 'reject', reason: string }) => {
      const endpoint = contentType === 'video' 
        ? `/api/moderation/videos/${flagId}/decide`
        : `/api/moderation/flags/${flagId}/moderate`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          decision: action,
          reason
        })
      });
      if (!response.ok) throw new Error('Failed to moderate content');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Moderation decision submitted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/flags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/videos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/stats'] });
      setLocation(`/moderation?tab=${contentType === 'video' ? 'videos' : contentType || 'comment'}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit moderation decision",
        variant: "destructive"
      });
    }
  });

  const handleModerate = (action: 'approve' | 'reject') => {
    if (!moderatorDecision.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for your decision",
        variant: "destructive"
      });
      return;
    }
    moderateFlagMutation.mutate({ action, reason: moderatorDecision });
  };

  const handleBack = () => {
    setLocation(`/moderation?tab=${contentType === 'video' ? 'videos' : contentType || 'comment'}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center">Loading content details...</div>
        </div>
      </div>
    );
  }

  if (!contentData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4">
          <Button onClick={handleBack} variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Moderation
          </Button>
          <div className="text-center">Content not found</div>
        </div>
      </div>
    );
  }

  const isVideo = contentType === 'video';
  const displayData = isVideo ? contentData : contentData;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        <Button onClick={handleBack} variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Moderation
        </Button>

        <div className="grid gap-6">
          {/* Content Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{isVideo ? 'Video' : 'Content'} Details</span>
                <Badge variant={isVideo ? 'default' : 'secondary'}>
                  {contentType?.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isVideo && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Video Player</Label>
                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-contain"
                        controls
                        playsInline
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Title</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {displayData.title || 'No title'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {displayData.description || 'No description'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">User</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {displayData.user ? `${displayData.user.firstName} ${displayData.user.lastName}` : 'Unknown user'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">User Email</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {displayData.user?.email || 'No email available'}
                      </p>
                    </div>
                  </div>

                  {displayData.flaggedReason && (
                    <div>
                      <Label className="text-sm font-medium">Flagged Reason</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {displayData.flaggedReason}
                      </p>
                    </div>
                  )}
                </>
              )}

              {!isVideo && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Content Type</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {contentType}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Reason</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {displayData.reason || 'No reason provided'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={displayData.status === 'pending' ? 'default' : 'secondary'}>
                      {displayData.status?.toUpperCase() || 'PENDING'}
                    </Badge>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Created</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {displayData.createdAt ? new Date(displayData.createdAt).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Moderation Decision */}
          <Card>
            <CardHeader>
              <CardTitle>Moderation Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="decision">Reason for Decision</Label>
                <Textarea
                  id="decision"
                  placeholder="Provide a detailed reason for your moderation decision..."
                  value={moderatorDecision}
                  onChange={(e) => setModeratorDecision(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => handleModerate('approve')}
                  disabled={moderateFlagMutation.isPending || !moderatorDecision.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  variant="default"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleModerate('reject')}
                  disabled={moderateFlagMutation.isPending || !moderatorDecision.trim()}
                  className="flex-1"
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}