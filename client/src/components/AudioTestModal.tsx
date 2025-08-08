import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient.ts";

interface AudioTestModalProps {
  videoId: string;
  videoTitle: string;
  onClose: () => void;
}

export default function AudioTestModal({ videoId, videoTitle, onClose }: AudioTestModalProps) {
  const queryClient = useQueryClient();

  const reprocessAudioMutation = useMutation({
    mutationFn: () => apiRequest(`/api/videos/${videoId}/reprocess-audio`, 
     'POST'
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
    }
  });

  const handleReprocessAudio = () => {
    reprocessAudioMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Test Audio Processing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Video: {videoTitle}</h3>
            <p className="text-sm text-gray-600">
              This will reprocess the audio to test profanity detection.
            </p>
          </div>

          {reprocessAudioMutation.data && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Results:</h4>
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify(reprocessAudioMutation.data, null, 2)}
              </pre>
            </div>
          )}

          {reprocessAudioMutation.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">
                Error: {reprocessAudioMutation.error.message}
              </p>
            </div>
          )}

          <div className="flex space-x-3">
            <Button 
              onClick={handleReprocessAudio}
              disabled={reprocessAudioMutation.isPending}
              className="flex-1"
            >
              {reprocessAudioMutation.isPending ? 'Processing...' : 'Test Audio Processing'}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}