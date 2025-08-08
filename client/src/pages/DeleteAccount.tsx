import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button.tsx";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient.ts";
import { useToast } from "@/hooks/use-toast.ts";

export default function DeleteAccount() {
  const [, navigate] = useLocation();
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Get current user info
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const handleBack = () => {
    navigate("/settings");
  };

  const handleKeepAccount = () => {
    navigate("/settings");
  };

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to delete account");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      // Redirect to login or home page after successful deletion
      window.location.href = "/api/auth/logout";
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
      setIsDeleting(false);
    },
  });

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    deleteAccountMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          disabled={isDeleting}
        >
          <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="flex-1 text-center text-xl font-semibold text-gray-900 dark:text-white pr-10">
          Delete Account
        </h1>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="text-center space-y-8">
          {/* Warning Icon */}
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Delete Your Account?
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Are you sure you want to permanently delete your Jemzy account?
            </p>
          </div>

          {/* Warning Message */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              This action cannot be undone
            </h2>
            <div className="text-left space-y-3">
              <p className="text-red-800 dark:text-red-200 font-medium">
                If you delete your account, the following will be permanently removed:
              </p>
              <ul className="space-y-2 text-red-700 dark:text-red-300">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>All your videos and content</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Your profile information and settings</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Your likes, saves, and interactions</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Your quest progress and achievements</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>All account data and cannot be recovered</span>
                </li>
              </ul>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Account to be deleted:
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {(user as any).firstName && (user as any).lastName 
                  ? `${(user as any).firstName} ${(user as any).lastName}` 
                  : (user as any).email || (user as any).id}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4 pt-4">
            {/* Delete Button */}
            <Button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-lg font-semibold rounded-xl shadow-lg transition-all"
            >
              {isDeleting ? "Deleting Account..." : "Yes, Delete My Account"}
            </Button>

            {/* Keep Account Button */}
            <Button
              onClick={handleKeepAccount}
              disabled={isDeleting}
              variant="outline"
              className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 py-3 text-lg font-medium rounded-xl transition-all"
            >
              Keep My Account
            </Button>
          </div>

          {/* Additional Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Need help with something? Consider visiting our{" "}
              <button
                onClick={() => navigate("/feedback")}
                className="underline hover:no-underline font-medium"
                disabled={isDeleting}
              >
                feedback page
              </button>{" "}
              to connect with our community on Discord before deleting your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}