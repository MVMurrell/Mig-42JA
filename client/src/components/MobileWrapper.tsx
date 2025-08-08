import React from 'react';

interface MobileWrapperProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'fullscreen' | 'bottom-sheet' | 'header' | 'footer' | 'content';
  enableLandscapeSafe?: boolean;
}

/**
 * MobileWrapper - A utility component for proper mobile safe area handling
 * 
 * Variants:
 * - fullscreen: Full screen modal with safe areas on all sides
 * - bottom-sheet: Bottom sheet modal with rounded top corners and bottom safe area
 * - header: Header component with top safe area
 * - footer: Footer component with bottom safe area
 * - content: General content wrapper with appropriate safe areas
 */
export default function MobileWrapper({ 
  children, 
  className = '', 
  variant = 'content',
  enableLandscapeSafe = false 
}: MobileWrapperProps) {
  
  const getVariantClasses = () => {
    const landscapeClass = enableLandscapeSafe ? 'mobile-landscape-safe' : '';
    
    switch (variant) {
      case 'fullscreen':
        return `mobile-modal-fullscreen p-safe ${landscapeClass}`;
      
      case 'bottom-sheet':
        return `mobile-modal-bottom-sheet pb-safe ${landscapeClass}`;
      
      case 'header':
        return `pt-safe mobile-header ${landscapeClass}`;
      
      case 'footer':
        return `pb-safe mobile-footer ${landscapeClass}`;
      
      case 'content':
      default:
        return `mobile-safe-area-all ${landscapeClass}`;
    }
  };

  return (
    <div className={`${getVariantClasses()} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Hook for mobile safe area detection
 */
export function useMobileSafeArea() {
  const [safeAreaInsets, setSafeAreaInsets] = React.useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  React.useEffect(() => {
    const updateSafeAreaInsets = () => {
      const style = getComputedStyle(document.documentElement);
      setSafeAreaInsets({
        top: parseInt(style.getPropertyValue('--safe-area-inset-top').replace('px', '')) || 0,
        right: parseInt(style.getPropertyValue('--safe-area-inset-right').replace('px', '')) || 0,
        bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom').replace('px', '')) || 0,
        left: parseInt(style.getPropertyValue('--safe-area-inset-left').replace('px', '')) || 0,
      });
    };

    updateSafeAreaInsets();
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', updateSafeAreaInsets);
    window.addEventListener('resize', updateSafeAreaInsets);

    return () => {
      window.removeEventListener('orientationchange', updateSafeAreaInsets);
      window.removeEventListener('resize', updateSafeAreaInsets);
    };
  }, []);

  return {
    safeAreaInsets,
    hasNotch: safeAreaInsets.top > 20,
    hasHomeIndicator: safeAreaInsets.bottom > 0,
    isLandscape: window.innerWidth > window.innerHeight,
    isMobile: window.innerWidth <= 768
  };
}

/**
 * Component for creating mobile-optimized buttons with proper touch targets
 */
interface MobileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function MobileButton({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary',
  size = 'md'
}: MobileButtonProps) {
  const getVariantClasses = () => {
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm min-h-[40px] min-w-[40px]',
      md: 'px-4 py-3 text-base min-h-[44px] min-w-[44px]',
      lg: 'px-6 py-4 text-lg min-h-[48px] min-w-[48px]'
    };

    const variantClasses = {
      primary: 'bg-red-500 hover:bg-red-600 text-white',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-600'
    };

    return `${sizeClasses[size]} ${variantClasses[variant]}`;
  };

  return (
    <button
      onClick={onClick}
      className={`touch-target rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${getVariantClasses()} ${className}`}
    >
      {children}
    </button>
  );
}