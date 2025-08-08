import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Button } from "@/components/ui/button.tsx";
import { MapPin, Play, Coins, Unlock } from "lucide-react";

interface AppInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppInstructionsModal({ isOpen, onClose }: AppInstructionsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold text-center flex items-center justify-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            How Jemzy Works
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-6 pb-6">
            {/* Location Circle Explanation */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-gray-400 flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Your Location Circle</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  This is your location and play circle. When you get within 100ft of Jem videos on the map, your play circle will turn green and you can play the videos in a feed like your favorite social media.
                </p>
              </div>
            </div>

            {/* Green Play Button */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Play Videos Nearby</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  You can also tap on individual Jems within your activation circle to watch them one at a time. When you play videos that are within your play circle they are free to watch.
                </p>
              </div>
            </div>

            {/* Unlock Feature */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-purple-400 flex items-center justify-center flex-shrink-0 mt-1">
                <Unlock className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Unlock Videos Forever</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Once you've watched a video they are unlocked and you can play them at any time from any distance.
                </p>
              </div>
            </div>

            {/* Coin System */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-100 border-2 border-yellow-400 flex items-center justify-center flex-shrink-0 mt-1">
                <Coins className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Remote Viewing Costs 1 Coin</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Playing videos from anywhere on the map outside your play circle will cost 1 coin.
                </p>
              </div>
            </div>

            {/* Encouragement */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-800 text-center font-medium">
                🎯 It pays to get out there and find jems in person!
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 pt-2">
          <Button 
            onClick={onClose}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}