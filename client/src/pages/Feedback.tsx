import { ArrowLeft, MessageCircle, Users } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button.tsx";

export default function Feedback() {
  const [, navigate] = useLocation();

  const handleBack = () => {
    navigate("/settings");
  };

  const handleJoinDiscord = () => {
    window.open("https://discord.gg/e4JxqAdR", "_blank");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="flex-1 text-center text-xl font-semibold text-gray-900 dark:text-white pr-10">
          Feedback
        </h1>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="text-center space-y-8">
          {/* Icon and Title */}
          <div className="space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              We'd Love Your Feedback!
            </h1>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              We're always looking for feedback for our app and want to hear from you! 
              The best way to communicate with us is through our Discord community.
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              Join our Discord to share your thoughts, report issues, suggest new features, 
              and connect with other members of the Jemzy community.
            </p>
          </div>

          {/* Discord Features */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-indigo-900 dark:text-indigo-100 flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              What You Can Do on Discord
            </h2>
            <div className="grid gap-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-indigo-800 dark:text-indigo-200">
                  Share feedback and suggestions for improving Jemzy
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-indigo-800 dark:text-indigo-200">
                  Report bugs or technical issues you encounter
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-indigo-800 dark:text-indigo-200">
                  Connect with other Jemzy community members
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-indigo-800 dark:text-indigo-200">
                  Get help and tips from our team and community
                </p>
              </div>
            </div>
          </div>

          {/* Discord Button */}
          <div className="pt-4">
            <Button
              onClick={handleJoinDiscord}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg transition-all transform hover:scale-105"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Join our Discord!
            </Button>
          </div>

          {/* Additional Note */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your feedback helps us make Jemzy better for everyone. 
              We read every message and truly appreciate your input!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}