import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Flag } from 'lucide-react';
import ContentFlagModal from './ContentFlagModal.js';

interface FlagButtonProps {
  contentType: 'video' | 'comment' | 'video_comment' | 'quest_message' | 'jem';
  contentId: string;
  contentTitle?: string;
  className?: string;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'default' | 'lg';
}

export default function FlagButton({
  contentType,
  contentId,
  contentTitle,
  className = '',
  variant = 'ghost',
  size = 'sm'
}: FlagButtonProps) {
  const [showFlagModal, setShowFlagModal] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowFlagModal(true)}
        className={`text-gray-500 hover:text-red-500 ${className}`}
        title="Report content"
      >
        <Flag className="w-4 h-4" />
      </Button>

      <ContentFlagModal
        isOpen={showFlagModal}
        onClose={() => setShowFlagModal(false)}
        contentType={contentType}
        contentId={contentId}
        contentTitle={contentTitle}
      />
    </>
  );
}