import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Share2, Copy, Check } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA.ts';
import { useToast } from '@/hooks/use-toast.ts';

interface ShareButtonProps {
  title?: string;
  text?: string;
  url?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export default function ShareButton({ 
  title = 'Jemzy - Location-Based Video Sharing',
  text = 'Check out this awesome location-based video sharing app!',
  url = window.location.href,
  variant = 'ghost',
  size = 'icon',
  className = ''
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const { canShare, share } = usePWA();
  const { toast } = useToast();

  const handleShare = async () => {
    const shareData = {
      title,
      text,
      url
    };

    if (canShare) {
      const success = await share(shareData);
      if (success) {
        toast({
          title: "Shared successfully!",
          description: "Thanks for sharing Jemzy with others."
        });
      }
    } else {
      // Fallback to copying to clipboard
      try {
        await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
        setCopied(true);
        toast({
          title: "Copied to clipboard!",
          description: "Share link has been copied to your clipboard."
        });
        
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
        toast({
          title: "Share failed",
          description: "Unable to share at this time.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={className}
      title={canShare ? "Share Jemzy" : "Copy share link"}
    >
      {copied ? (
        <Check className="w-4 h-4" />
      ) : (
        <>
          {canShare ? (
            <Share2 className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {size !== 'icon' && (
            <span className="ml-2">
              {canShare ? 'Share' : 'Copy Link'}
            </span>
          )}
        </>
      )}
    </Button>
  );
}