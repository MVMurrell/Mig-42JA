import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Shield, AlertTriangle, Users, Heart, Camera } from "lucide-react";
import { ResponsiveModal } from "./ui/responsive-modal.tsx";

interface CommunityGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function CommunityGuidelinesModal({ 
  isOpen, 
  onClose, 
  onAccept 
}: CommunityGuidelinesModalProps) {
  const [hasAccepted, setHasAccepted] = useState(false);

  const handleAccept = () => {
    if (hasAccepted) {
      onAccept();
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Community Guidelines"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-gray-600">
            Before posting your first video, please review our community guidelines to help keep Jemzy safe and welcoming for everyone.
          </p>
        </div>

        <ScrollArea className="h-96 w-full border rounded-lg p-4">
          <div className="space-y-6">
            {/* Safety First */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-green-600" />
                  Safety First
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Do not share personal information like addresses, phone numbers, or financial details</p>
                <p>• Avoid posting content that could reveal your exact location if privacy is a concern</p>
                <p>• Report any suspicious or harmful behavior immediately</p>
                <p>• Be mindful of your surroundings when recording</p>
              </CardContent>
            </Card>

            {/* Respectful Content */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="w-5 h-5 text-red-500" />
                  Respectful Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• No hate speech, harassment, or bullying of any kind</p>
                <p>• Respect people's privacy - get consent before filming others</p>
                <p>• Keep content appropriate for all ages</p>
                <p>• Be kind and constructive in your interactions</p>
                <p>• Celebrate diversity and different perspectives</p>
              </CardContent>
            </Card>

            {/* Prohibited Content */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Prohibited Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• No nudity, sexually explicit, or suggestive content</p>
                <p>• No violence, illegal activities, or dangerous behavior</p>
                <p>• No spam, misleading information, or scams</p>
                <p>• No copyrighted content without permission</p>
                <p>• No promotion of harmful substances or activities</p>
                <p>• No inappropriate gestures or offensive language</p>
              </CardContent>
            </Card>

            {/* Community Standards */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                  Community Standards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Create original, authentic content that adds value</p>
                <p>• Give credit where credit is due</p>
                <p>• Engage meaningfully with other creators</p>
                <p>• Support and encourage fellow community members</p>
                <p>• Help maintain a positive, creative environment</p>
              </CardContent>
            </Card>

            {/* Quality Guidelines */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Camera className="w-5 h-5 text-purple-500" />
                  Content Quality
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Ensure good video and audio quality when possible</p>
                <p>• Use descriptive titles and relevant categories</p>
                <p>• Keep content engaging and appropriate for the platform</p>
                <p>• Consider your audience when choosing content topics</p>
              </CardContent>
            </Card>

            {/* Consequences */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-orange-800">
                  Enforcement & Consequences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-orange-700">
                <p>• Our AI moderation system reviews all content automatically</p>
                <p>• Violations may result in content removal, warnings, or account restrictions</p>
                <p>• Repeated violations can lead to permanent account suspension</p>
                <p>• You can appeal moderation decisions if you believe they're incorrect</p>
                <p>• We use a strike system to track violations and determine consequences</p>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="accept-guidelines"
              checked={hasAccepted}
              onCheckedChange={(checked) => setHasAccepted(checked as boolean)}
              className="mt-1"
            />
            <label
              htmlFor="accept-guidelines"
              className="text-sm text-gray-700 cursor-pointer leading-relaxed"
            >
              I have read and understand the community guidelines. I agree to follow these rules and understand that violations may result in content removal or account restrictions.
            </label>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!hasAccepted}
              className="flex-1"
            >
              Accept & Continue
            </Button>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}