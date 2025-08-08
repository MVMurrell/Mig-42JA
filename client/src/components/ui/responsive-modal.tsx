import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveModal({ isOpen, onClose, title, children, className = "" }: ResponsiveModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Desktop/Tablet Modal (centered with fixed height) */}
      <div className="hidden sm:flex fixed inset-0 z-50 items-center justify-center p-4">
        <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col ${className}`}>
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-50">
        <div className={`bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300 ${className}`}>
          {/* Handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
          
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}