import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { CheckCircle2, Coins, Home } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient.ts';
import { useCoinCollectionSound } from '@/hooks/useCoinCollectionSound.ts';

export default function PaymentSuccess() {
  const [location, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [coinsAwarded, setCoinsAwarded] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const playCoinCollectionSound = useCoinCollectionSound();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const coins = urlParams.get('coins');

    if (!sessionId) {
      setStatus('error');
      setMessage('Missing payment session information');
      return;
    }

    // Process the successful payment
    const processPayment = async () => {
      try {
        const response = await apiRequest(`/api/payments/success?session_id=${sessionId}&coins=${coins}`, 'GET');
        const data = await response.json();
        
        if (response.ok) {
          setStatus('success');
          setCoinsAwarded(data.coinsAwarded);
          setMessage(data.message);
          playCoinCollectionSound();
        } else {
          setStatus('error');
          setMessage(data.message || 'Payment processing failed');
        }
      } catch (error) {
        console.error('Payment processing error:', error);
        setStatus('error');
        setMessage('Failed to process payment confirmation');
      }
    };

    processPayment();
  }, []);

  const handleReturnHome = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            )}
            {status === 'error' && (
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-500 text-2xl">✕</span>
              </div>
            )}
          </div>
          
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Processing Payment...'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'error' && 'Payment Issue'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <p className="text-gray-600">
              Please wait while we confirm your payment and award your coins.
            </p>
          )}
          
          {status === 'success' && (
            <>
              <div className="flex items-center justify-center space-x-2 text-lg font-medium text-green-600">
                <Coins className="h-5 w-5" />
                <span>{coinsAwarded} Coins Added to Your Account!</span>
              </div>
              <p className="text-gray-600">{message}</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">
                  Your coins have been successfully added to your account. You can now use them to participate in quests and activities!
                </p>
              </div>
            </>
          )}
          
          {status === 'error' && (
            <>
              <p className="text-red-600">{message}</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  If you believe this is an error or if you were charged, please contact support with your payment details.
                </p>
              </div>
            </>
          )}
          
          <Button 
            onClick={handleReturnHome}
            className="w-full mt-6"
            disabled={status === 'loading'}
          >
            <Home className="h-4 w-4 mr-2" />
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}