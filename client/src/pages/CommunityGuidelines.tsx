import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function CommunityGuidelines() {
  const [, navigate] = useLocation();

  const handleBack = () => {
    navigate("/settings");
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
          Community Guidelines
        </h1>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to Jemzy!
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              We're excited to have you join our community of storytellers and explorers. 
              To keep Jemzy a fun and positive space for everyone, we've established these 
              community guidelines.
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-4 font-medium">
              Please take a moment to review them.
            </p>
          </div>

          {/* Guidelines Sections */}
          <div className="space-y-8">
            {/* Be Respectful */}
            <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Be Respectful
              </h2>
              <div className="space-y-3 text-gray-700 dark:text-gray-300">
                <p>
                  Treat others with kindness and courtesy. This means avoiding hate speech, 
                  insults, harassment, bullying, and threats.
                </p>
                <p>
                  Respect diverse viewpoints and experiences. Disagree respectfully, 
                  and avoid personal attacks.
                </p>
              </div>
            </section>

            {/* Keep it Clean */}
            <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Keep it Clean
              </h2>
              <div className="space-y-3 text-gray-700 dark:text-gray-300">
                <p>
                  We have a zero-tolerance policy for content that is sexually suggestive, 
                  violent, or otherwise inappropriate for a general audience. This includes 
                  pornography, graphic violence, and depictions of self-harm.
                </p>
                <p>
                  Avoid posting spam, irrelevant content, or excessive self-promotion.
                </p>
              </div>
            </section>

            {/* Be Honest and Authentic */}
            <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Be Honest and Authentic
              </h2>
              <div className="space-y-3 text-gray-700 dark:text-gray-300">
                <p>
                  Share your own experiences and perspectives. Don't impersonate others 
                  or spread misinformation.
                </p>
                <p>
                  Don't post copyrighted material without permission from the owner.
                </p>
              </div>
            </section>

            {/* Protect Your Privacy */}
            <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Protect Your Privacy and Others
              </h2>
              <div className="space-y-3 text-gray-700 dark:text-gray-300">
                <p>
                  Don't share personal information that could put yourself or others at risk, 
                  such as phone numbers, addresses, or passwords.
                </p>
                <p>
                  Be mindful of posting content that could identify others without their consent.
                </p>
              </div>
            </section>

            {/* Content Moderation */}
            <section className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
              <h2 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-4">
                Content Moderation
              </h2>
              <div className="space-y-3 text-red-800 dark:text-red-200">
                <p>
                  We reserve the right to remove content that violates these guidelines 
                  at our discretion.
                </p>
                <p>
                  Users have the ability to report content they find objectionable. 
                  We will review all reports and take appropriate action.
                </p>
                <p className="font-semibold">
                  Violations of these guidelines may result in warnings, temporary suspension, 
                  or permanent account termination.
                </p>
              </div>
            </section>

            {/* Building a Positive Community */}
            <section className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-4">
                Building a Positive Community
              </h2>
              <div className="space-y-3 text-blue-800 dark:text-blue-200">
                <p>
                  We encourage you to use Jemzy to share your creativity, explore your 
                  local community, and connect with others. By following these guidelines, 
                  you'll help us maintain a safe and enjoyable experience for everyone.
                </p>
                <p className="text-xl font-semibold text-center mt-6">
                  Thank you for being a part of Jemzy!
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}