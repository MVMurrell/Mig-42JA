import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import { Flag, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient.ts';

interface ContentFlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'video' | 'comment' | 'video_comment' | 'quest_message' | 'jem';
  contentId: string;
  contentTitle?: string;
}

const FLAG_REASONS = [
  {
    id: 'hate_speech',
    label: 'Hate Speech or Discrimination',
    description: 'Content that attacks or demeans a group or individual based on race, ethnicity, national origin, religion, caste, sexual orientation, sex, gender, gender identity, serious disease or disability.'
  },
  {
    id: 'harassment',
    label: 'Harassment or Bullying',
    description: 'Content that is abusive, threatening, intimidating, or designed to upset or humiliate someone. This includes doxing (sharing private information).'
  },
  {
    id: 'violence',
    label: 'Violence or Graphic Content',
    description: 'Content that depicts real-world violence, gore, mutilation, animal abuse, or promotes acts of violence against others.'
  },
  {
    id: 'nudity',
    label: 'Nudity or Sexual Content',
    description: 'Content that is sexually explicit, depicts non-consensual sexual acts, child exploitation, or promotes sexual services.'
  },
  {
    id: 'spam',
    label: 'Spam or Scams',
    description: 'Unsolicited commercial content, deceptive links, phishing attempts, pyramid schemes, or attempts to defraud users.'
  },
  {
    id: 'misinformation',
    label: 'Misinformation or Fake News',
    description: 'Content that is factually inaccurate and designed to deceive, especially concerning public health, safety, or democratic processes.'
  },
  {
    id: 'illegal_activity',
    label: 'Illegal Activity',
    description: 'Content that depicts, promotes, or facilitates illegal acts (e.g., drug use/sales, illegal weapons, human trafficking).'
  },
  {
    id: 'intellectual_property',
    label: 'Intellectual Property Violation',
    description: 'Content that infringes on copyright, trademark, or other intellectual property rights.'
  },
  {
    id: 'self_harm',
    label: 'Self-Harm or Suicide Promotion',
    description: 'Content that encourages self-harm, suicide, eating disorders, or glorifies such acts.'
  },
  {
    id: 'privacy_violation',
    label: 'Privacy Violation',
    description: 'Content that shares someone else\'s private information without their consent.'
  },
  {
    id: 'other',
    label: 'Other (Please describe)',
    description: 'For reasons not covered by the above categories.'
  }
];

export default function ContentFlagModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentTitle
}: ContentFlagModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const flagContentMutation = useMutation({
    mutationFn: async (flagData: {
      contentType: string;
      contentId: string;
      flagReason: string;
      customReason?: string;
    }) => {
      const response = await fetch('/api/content/flag', {
        method: 'POST',
        body: JSON.stringify(flagData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Content flagged successfully",
        description: "Thank you for your report. Our moderation team will review this content.",
      });
      
      // Invalidate relevant queries to refresh content
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      
      // If this is a video comment, invalidate the specific video's comments
      if (contentType === 'video_comment' && contentTitle) {
        // Extract video ID from context if available
        queryClient.invalidateQueries({ 
          queryKey: ['/api/videos', undefined, 'comments'],
          exact: false 
        });
      }
      
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Failed to flag content",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setSelectedReason('');
    setCustomReason('');
    setIsSubmitting(false);
  };

  const handleSubmit = () => {
    if (!selectedReason) {
      toast({
        title: "Please select a reason",
        description: "You must select a reason for flagging this content.",
        variant: "destructive",
      });
      return;
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      toast({
        title: "Please describe the issue",
        description: "For 'Other' reasons, please provide a description.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    flagContentMutation.mutate({
      contentType,
      contentId,
      flagReason: selectedReason,
      customReason: selectedReason === 'other' ? customReason.trim() : undefined
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="flag-modal-description">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Flag className="w-5 h-5 text-red-500" />
            <span>Report Content</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div id="flag-modal-description" className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 mb-1">
                  Reporting {contentTitle ? `"${contentTitle}"` : 'this content'}
                </h4>
                <p className="text-sm text-amber-700">
                  This content will be hidden from other users while our moderation team reviews your report.
                  The content creator will be notified that their content has been flagged.
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-base font-medium mb-4 block">
              Why are you reporting this content?
            </Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              <div className="space-y-4">
                {FLAG_REASONS.map((reason) => (
                  <div key={reason.id} className="flex items-start space-x-3">
                    <RadioGroupItem 
                      value={reason.id} 
                      id={reason.id}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor={reason.id} 
                        className="font-medium text-sm cursor-pointer"
                      >
                        {reason.label}
                      </Label>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {reason.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {selectedReason === 'other' && (
            <div>
              <Label htmlFor="custom-reason" className="text-sm font-medium mb-2 block">
                Please describe the issue
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Describe why this content should be reviewed..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {customReason.length}/500 characters
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedReason || isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}