import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";

interface ReadyPlayerMeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReadyPlayerMeInfoModal({ isOpen, onClose }: ReadyPlayerMeInfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Avatar Connected Successfully!
          </DialogTitle>
          <DialogDescription className="text-left space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900 mb-1">Processing Time</p>
                <p className="text-blue-700 text-sm">
                  Your avatar is being processed by Ready Player Me's servers. This can take anywhere from 
                  <strong> a few minutes to several hours</strong> depending on server load.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-900 mb-1">What to Expect</p>
                <ul className="text-amber-700 text-sm space-y-1">
                  <li>• Your Google profile picture will show until your avatar is ready</li>
                  <li>• We'll automatically check for your avatar every 30 seconds</li>
                  <li>• You'll get a notification when your avatar becomes available</li>
                  <li>• No action needed from you - it's fully automated</li>
                </ul>
              </div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-green-700 text-sm">
                <strong>Check back later!</strong> Your avatar will appear automatically when ready.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center pt-4">
          <Button onClick={onClose} className="w-full">
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}