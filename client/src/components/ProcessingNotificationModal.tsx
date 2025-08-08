import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Clock, CheckCircle } from "lucide-react";

interface ProcessingNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export default function ProcessingNotificationModal({ 
  isOpen, 
  onClose, 
  title 
}: ProcessingNotificationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Jem Submitted!
          </DialogTitle>
          <DialogDescription>
            Your video is now being processed and will be available shortly.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Clock className="h-8 w-8 text-blue-500 animate-pulse" />
            <div>
              <h3 className="font-medium">"{title}" is processing</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You'll be notified once your Jem drops and goes live!
              </p>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 text-center">
            Processing usually takes 1-3 minutes depending on video length.
          </p>
          
          <Button onClick={onClose} className="w-full">
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}