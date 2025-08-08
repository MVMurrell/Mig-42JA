import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AdSenseBannerProps {
  className?: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  style?: React.CSSProperties;
}

interface AdSenseConfig {
  clientId: string;
  slotId: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function AdSenseBanner({ 
  className = "", 
  format = "auto",
  style = {}
}: AdSenseBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const isAdLoaded = useRef(false);
  const adInstanceId = useRef(`ad-${Math.random().toString(36).substr(2, 9)}`);
  
  const { data: adsenseConfig } = useQuery<AdSenseConfig>({
    queryKey: ['/api/config/adsense'],
    retry: false,
  });

  useEffect(() => {
    if (!adsenseConfig?.clientId || !adsenseConfig?.slotId || isAdLoaded.current) {
      return;
    }

    const loadAdSense = () => {
      if (typeof window !== 'undefined' && adRef.current) {
        try {
          // Initialize adsbygoogle array if it doesn't exist
          if (!window.adsbygoogle) {
            window.adsbygoogle = [];
          }
          
          // Clear any existing ad content
          const insElement = adRef.current.querySelector('.adsbygoogle');
          if (insElement && !insElement.getAttribute('data-adsbygoogle-status')) {
            // Push the ad configuration only if the ins element hasn't been processed
            window.adsbygoogle.push({});
            isAdLoaded.current = true;
          }
        } catch (error) {
          console.error('AdSense error:', error);
        }
      }
    };

    // Load AdSense script if not already loaded
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${adsenseConfig.clientId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = loadAdSense;
      script.onerror = (error) => {
        console.error('Failed to load AdSense script:', error);
      };
      document.head.appendChild(script);
    } else {
      // Script already loaded, initialize the ad
      setTimeout(loadAdSense, 100);
    }
  }, [adsenseConfig]);

  if (!adsenseConfig?.clientId || !adsenseConfig?.slotId) {
    // Show placeholder while config loads
    return (
      <div className={`${className} bg-gray-100 border border-gray-200 rounded flex items-center justify-center`} style={style}>
        <span className="text-xs text-gray-500">Ad Space</span>
      </div>
    );
  }

  return (
    <div ref={adRef} className={`${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight: '90px' }}
        data-ad-client={`ca-${adsenseConfig.clientId}`}
        data-ad-slot={adsenseConfig.slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}