import { useState, useEffect } from "react";
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Loader2 } from "lucide-react";

interface PaymentFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  amount: number;
  savePaymentMethod?: boolean;
  onSavePaymentMethodChange?: (save: boolean) => void;
  hasSavedMethods?: boolean;
}

export function PaymentForm({ onSuccess, onError, amount, savePaymentMethod = false, onSavePaymentMethodChange, hasSavedMethods = false }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  console.log('PaymentForm hasSavedMethods:', hasSavedMethods);

  // Add timeout fallback for loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn('PaymentElement took too long to load, showing form anyway');
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm the payment on the backend and award coins
        try {
          const response = await fetch(`/api/payments/confirm/${paymentIntent.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          const data = await response.json();
          
          if (response.ok) {
            toast({
              title: "Payment Successful",
              description: `${data.coinsAwarded} coins have been added to your account!`,
            });
            onSuccess();
          } else {
            onError(data.message || "Failed to process payment");
          }
        } catch (confirmError) {
          console.error('Error confirming payment:', confirmError);
          onError("Payment succeeded but failed to award coins. Please contact support.");
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError("An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading payment form...</span>
          </div>
        )}
        <PaymentElement 
          onReady={() => setIsLoading(false)}
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
              radios: false,
              spacedAccordionItems: false
            },
            paymentMethodOrder: ['card'],
            fields: {
              billingDetails: {
                name: 'auto',
                email: 'auto'
              }
            }
          }}
        />
      </div>
      
      {onSavePaymentMethodChange && (
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="savePaymentMethod"
            checked={savePaymentMethod}
            onCheckedChange={(checked) => onSavePaymentMethodChange(!!checked)}
          />
          <Label htmlFor="savePaymentMethod" className="text-sm text-gray-600 dark:text-gray-300">
            Save payment method for future purchases
          </Label>
        </div>
      )}
      
      <Button
        type="submit"
        disabled={!stripe || !elements || isProcessing || isLoading}
        className="w-full bg-gradient-to-r from-gradient-start to-gradient-end hover:from-gradient-start/90 hover:to-gradient-end/90 text-white py-3 text-lg font-semibold rounded-xl shadow-lg transition-all"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          'Complete Purchase'
        )}
      </Button>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        By completing this purchase, you agree to our terms of service.
      </p>
    </form>
  );
}