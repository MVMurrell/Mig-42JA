import { ArrowLeft, Shield, Eye, Users, AlertTriangle, Ban, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Link } from "wouter";

export default function ContentModerationRules() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Title Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Content Moderation Rules
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Fostering a Safe and Positive Community
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              At Jemzy LLC, we are committed to creating a welcoming and respectful environment for everyone. 
              Our Community Guidelines outline what kind of content and behavior is not allowed on our platform. 
              To ensure these guidelines are upheld, we employ a multi-layered content moderation system that 
              combines advanced AI technology with human review.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
              This document explains how content is analyzed when flagged or rejected, and the consequences 
              for users who repeatedly violate our policies.
            </p>
          </CardContent>
        </Card>

        {/* Content Analysis Process */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              How Content is Analyzed and Reviewed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-700 dark:text-gray-300">
              Our content moderation process is designed to be fair, efficient, and thorough:
            </p>

            {/* AI Detection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Proactive AI Detection
                </Badge>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  Before any video is published on Jemzy LLC, our AI systems automatically scan both the video and audio for potential violations of our Community Guidelines (e.g., hate speech, graphic violence, nudity, illegal activities).
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  If our AI identifies content that it determines to be a clear violation, the video will be rejected and prevented from being published. You will receive a notification explaining why your content was rejected.
                </li>
              </ul>
            </div>

            <Separator />

            {/* User Flagging */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  User Flagging for Published Content
                </Badge>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  We empower our community to help us maintain a safe environment. If you encounter a video or comment that you believe violates our Community Guidelines, you can flag it for review.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  When content is flagged, it is immediately hidden from public view to prevent further exposure to potentially harmful material.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  The flagged content is then sent to our trained human moderation team for review.
                </li>
              </ul>
            </div>

            <Separator />

            {/* Human Review */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Human Review
                </Badge>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  All content (whether initially rejected by AI or flagged by users) that requires further action is reviewed by our dedicated team of human moderators.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  Our moderators are trained to understand the nuances of context, intent, and cultural sensitivity. They carefully assess the content against our Community Guidelines to determine if a violation has occurred.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  <strong>For AI-Rejected Content:</strong> You have the ability to appeal the rejection. If our human review confirms that the AI correctly identified a violation, the rejection stands. If it was a false positive, the content may be approved.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  <strong>For User-Flagged Content:</strong> If our human review confirms a violation, the content will remain hidden and further action will be taken against the account. If no violation is found, the content will be reinstated, and the flagger will be notified.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Strike System */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Consequences for Violations: Our Strike System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Please Note:</strong> The type of content (video or comment) does not change the core policy or the consequences once a violation is confirmed. Both are treated equally under our Community Guidelines. However, particularly egregious content (e.g., illegal content, direct threats, child sexual abuse material) will result in immediate and severe action, bypassing the strike system entirely.
              </p>
            </div>

            {/* Strike levels */}
            <div className="space-y-6">
              {/* First Strike */}
              <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">First Violation (Warning)</h3>
                </div>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    The violating content (video or comment) will be removed.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    You will receive a warning notification explaining which Community Guideline was violated. This is an educational opportunity to help you understand our policies better.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    No immediate impact on account functionality.
                  </li>
                </ul>
              </div>

              {/* Second Strike */}
              <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Second Violation (Temporary Account Suspension)</h3>
                </div>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    The violating content will be removed.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    Your account will be temporarily suspended for a period (e.g., 24 hours to 7 days, depending on severity). During this time, you will not be able to post new content, comment, or interact with the app.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    You may be required to review our Community Guidelines before your account access is fully restored.
                  </li>
                </ul>
              </div>

              {/* Third Strike */}
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Third Violation (Extended Account Suspension)</h3>
                </div>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    The violating content will be removed.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                    Your account will face an extended temporary suspension (e.g., 30 days or more).
                  </li>
                </ul>
              </div>

              {/* Permanent Ban */}
              <div className="border border-red-500 dark:border-red-600 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center gap-2 mb-3">
                  <Ban className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900 dark:text-red-100">Repeated or Egregious Violations (Permanent Account Ban)</h3>
                </div>
                <ul className="space-y-2 text-red-800 dark:text-red-200 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    We reserve the right to permanently ban any user's account at any time if they repeatedly violate our Community Guidelines or engage in severe, harmful behavior.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    When an account is permanently banned, you will lose access to your account and all content associated with it. Attempts to circumvent a ban by creating new accounts will also result in immediate banning of the new accounts.
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appeals Process */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Appeals Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              If you believe your content was removed or your account was penalized in error, you have the right to appeal our decision. 
              Instructions for submitting an appeal will be provided in your notification. Our human review team will re-examine your case.
            </p>
          </CardContent>
        </Card>

        {/* Conclusion */}
        <Card className="mb-8">
          <CardContent className="p-6 text-center">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              By adhering to these guidelines, you help us build a positive and safe community for everyone on Jemzy LLC. 
              We appreciate your cooperation in making our platform a great place to connect.
            </p>
          </CardContent>
        </Card>

        {/* Back to Settings Button */}
        <div className="text-center">
          <Link href="/settings">
            <Button className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}