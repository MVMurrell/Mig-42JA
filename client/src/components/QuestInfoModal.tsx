import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Coins, Users, MapPin, Shield, Trophy, Clock, Target } from "lucide-react";

interface QuestInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuestInfoModal({ isOpen, onClose }: QuestInfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <Trophy className="w-6 h-6 text-yellow-600" />
            <span>What are Quests?</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Introduction */}
          <div className="text-lg text-gray-700">
            <p>
              Quests are location-based challenges that bring the Jemzy community together in real-world locations. 
              Create exciting challenges for other users to participate in and earn Jem Coins for everyone involved!
            </p>
          </div>

          {/* How Quests Work */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-600" />
                How Quests Work
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Location-Based Participation</h4>
                      <p className="text-sm text-gray-600">Participants must be within the quest radius AND post a gem to qualify for the bounty</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Community Driven</h4>
                      <p className="text-sm text-gray-600">Require a minimum number of participants to complete the quest</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Time-Limited</h4>
                      <p className="text-sm text-gray-600">Set start and end dates to create urgency and excitement</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Coins className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Rewarding</h4>
                      <p className="text-sm text-gray-600">All participants earn Jem Coins when the quest is completed</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits for Quest Creators */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-green-600" />
                For Quest Creators: What You Need to Know
              </h3>
              <div className="bg-green-100 p-4 rounded-lg mb-4">
                <h4 className="font-semibold text-green-800 mb-2">Participant Tracking System:</h4>
                <p className="text-sm text-green-700">
                  Participants must be within your quest radius AND post a gem to qualify as participants. 
                  This automatic tracking ensures accurate participant counts and fair bounty distribution. 
                  You don't need to manually verify participants - the system handles everything.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">✨ <strong>Build Community:</strong> Bring people together at your favorite locations</p>
                  <p className="text-sm text-gray-700">🎯 <strong>Drive Engagement:</strong> Create memorable experiences for your audience</p>
                  <p className="text-sm text-gray-700">📍 <strong>Promote Locations:</strong> Highlight businesses, events, or special places</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">💰 <strong>Investment Return:</strong> Successful quests create lasting community value</p>
                  <p className="text-sm text-gray-700">🏆 <strong>Recognition:</strong> Be known as a community builder and organizer</p>
                  <p className="text-sm text-gray-700">🔄 <strong>Recurring Events:</strong> Build anticipation for future quests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participation Requirements */}
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-orange-600" />
                How to Participate & Qualify for Rewards
              </h3>
              <div className="bg-orange-100 p-4 rounded-lg mb-4">
                <h4 className="font-semibold text-orange-800 mb-2">Required Steps to Qualify:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-orange-700">
                  <li><strong>Join the quest</strong> - Select to participate from the quest page</li>
                  <li><strong>Go to the quest location</strong> - You must be physically within the quest radius</li>
                  <li><strong>Post a gem to the quest</strong> - Upload a video and select the quest from the visibility dropdown</li>
                  <li><strong>Wait for quest completion</strong> - Once minimum participants are reached, everyone gets rewards</li>
                </ol>
              </div>
              <p className="text-sm text-gray-600">
                This three-step verification ensures accurate participant tracking and prevents remote participation. 
                Only users who complete all steps will be counted toward the participant limit and receive bounty rewards. 
                Your gem will remain publicly visible for everyone to enjoy.
              </p>
            </CardContent>
          </Card>

          {/* Benefits for Participants */}
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-600" />
                Benefits for Participants
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">🎁 <strong>Earn Jem Coins:</strong> Get rewarded for participating in community events</p>
                  <p className="text-sm text-gray-700">🤝 <strong>Meet People:</strong> Connect with others who share your interests</p>
                  <p className="text-sm text-gray-700">🗺️ <strong>Discover Places:</strong> Explore new locations in your area</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">🎉 <strong>Free Fun:</strong> Participate in exciting activities at no cost</p>
                  <p className="text-sm text-gray-700">📱 <strong>Easy Participation:</strong> Join quest, go to location, and select quest when uploading</p>
                  <p className="text-sm text-gray-700">🏅 <strong>Achievement:</strong> Be part of completing community challenges</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Rules */}
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-red-600" />
                Important Rules & Protections
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-red-800">No Early Cancellation</h4>
                    <p className="text-sm text-gray-700">
                      Once created, quests cannot be deleted or ended before the deadline. This protects participants 
                      who have made plans to attend and ensures fair play for everyone.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-red-800">Coin Commitment</h4>
                    <p className="text-sm text-gray-700">
                      Your Jem Coins are committed when you create a quest. Make sure you have enough coins 
                      to cover the total reward amount (participants × reward per participant).
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-red-800">Participation Requirements</h4>
                    <p className="text-sm text-gray-700">
                      To qualify as a participant and earn the bounty, users must be physically within the quest radius 
                      AND post a gem (video) to the quest location. This ensures accurate tracking and fair reward distribution.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-red-800">Minimum Participation</h4>
                    <p className="text-sm text-gray-700">
                      If the minimum number of participants isn't reached, the quest will not complete 
                      and coins will be returned to the creator.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Getting Started */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-yellow-600" />
                Ready to Create Your First Quest?
              </h3>
              <p className="text-gray-700 mb-4">
                Start by thinking about a location that's meaningful to you or your community. Consider events, 
                meetups, or just fun gatherings that would benefit from bringing people together. 
                Remember that participants must come to your location and post a gem to qualify for rewards.
              </p>
              <div className="bg-yellow-100 p-4 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">
                  💡 Pro Tip: Choose locations that are accessible and engaging for filming. Participants need to be 
                  physically present and post content, so pick spots that inspire great gems!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
              Got it! Let's Create Quests
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}