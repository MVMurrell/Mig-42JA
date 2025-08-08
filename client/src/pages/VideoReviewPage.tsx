import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient.ts";
import Hls from 'hls.js';

export default function VideoReviewPage() {
  const { appealId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [moderationNotes, setModerationNotes] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Fetch appeal details
  const { data: appeal = {}, isLoading } = useQuery({
    queryKey: ['/api/moderation/video-appeals', appealId],
    queryFn: async () => {
      const response = await fetch(`/api/moderation/video-appeals/${appealId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch appeal details');
      return response.json();
    },
    enabled: !!appealId,
  });

  // Initialize HLS video player
  useEffect(() => {
    if (appeal.content_id && videoRef.current) {
      const videoUrl = `/api/moderation/video-stream/${appeal.content_id}`;
      
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(videoUrl);
        hls.attachMedia(videoRef.current);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest loaded successfully');
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        videoRef.current.src = videoUrl;
      }
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [appeal.content_id]);

  // Approve appeal mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/moderation/video-appeals/${appealId}/approve`, {
        moderationNotes
      });
    },
    onSuccess: () => {
      toast({
        title: "Appeal Approved",
        description: "Video has been approved and restored to public visibility",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/video-appeals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/stats'] });
      setLocation('/moderation');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve appeal",
        variant: "destructive",
      });
    },
  });

  // Reject appeal mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/moderation/video-appeals/${appealId}/reject`, {
        moderationNotes
      });
    },
    onSuccess: () => {
      toast({
        title: "Appeal Rejected",
        description: "Video has been permanently removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/video-appeals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/stats'] });
      setLocation('/moderation');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject appeal",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mt-20" />
        </div>
      </div>
    );
  }

  if (!appeal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="mt-20">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">Appeal not found</p>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Review Video Appeal
          </h1>
        </div>

        {/* Appeal Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Video: {appeal.video_title}</span>
              <Badge variant={appeal.status === 'pending' ? 'default' : 'secondary'}>
                {appeal.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Video Player Section */}
            <div className="space-y-4">
              <Label className="text-lg font-medium text-gray-900 dark:text-white">
                Video Under Review
              </Label>
              
              {appeal.content_id ? (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <video 
                    ref={videoRef}
                    controls 
                    className="w-full max-h-96 rounded-lg bg-black"
                    preload="metadata"
                    onError={(e) => {
                      console.error('Video failed to load:', e);
                      e.currentTarget.style.display = 'none';
                      const errorDiv = e.currentTarget.nextElementSibling as HTMLElement;
                      if (errorDiv) errorDiv.style.display = 'block';
                    }}
                  >
                    Your browser does not support HLS video streaming.
                  </video>
                  
                  {/* Fallback error message */}
                  <div className="hidden text-center py-8">
                    <div className="w-16 h-16 mx-auto bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Video could not be loaded
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      The video may be processing or temporarily unavailable
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No video URL available for this appeal
                  </p>
                </div>
              )}
            </div>

            {/* Appeal Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    AI Flag Reason
                  </Label>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    {appeal.ai_flag_reason || appeal.original_flag_reason || 'No flag reason provided'}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    User's Appeal Message
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    {appeal.appeal_message || 'No appeal message provided'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Appeal Submitted
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {appeal.created_at ? new Date(appeal.created_at).toLocaleString() : 'Date not available'}
                  </p>
                </div>
              </div>

              {/* Processing Information */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Processing Status
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {appeal.processing_status || 'Unknown'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Content ID
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded break-all">
                    {appeal.content_id || 'Not available'}
                  </p>
                </div>

                {appeal.gcs_processing_url && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Storage Location
                    </Label>
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 mt-2">
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Video will be moved to final storage upon approval or deleted upon rejection.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Moderation Decision Section */}
            {appeal.status === 'pending' && (
              <div className="border-t pt-6">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Moderation Notes (Optional)
                </Label>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={moderationNotes}
                  onChange={(e) => setModerationNotes(e.target.value)}
                  className="mb-4"
                  rows={3}
                />

                <div className="flex gap-3">
                  <Button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {approveMutation.isPending ? "Approving..." : "Approve Appeal"}
                  </Button>
                  
                  <Button
                    onClick={() => rejectMutation.mutate()}
                    disabled={rejectMutation.isPending}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {rejectMutation.isPending ? "Rejecting..." : "Reject Appeal"}
                  </Button>
                </div>
              </div>
            )}

            {/* Show previous decision if already processed */}
            {appeal.status !== 'pending' && (
              <div className="border-t pt-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Decision: {appeal.status === 'approved' ? 'Approved' : 'Rejected'}
                  </p>
                  {appeal.moderation_notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Notes: {appeal.moderation_notes}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Processed: {new Date(appeal.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}