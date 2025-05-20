import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pdfManager } from '../utils/pdfUtils';

export default function PaymentSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const processPaymentSuccess = async () => {
      try {
        // Get client data from location state
        const clientData = location.state?.clientData;
        if (!clientData) {
          console.error('No client data found in state');
          navigate('/');
          return;
        }

        // Process all forms and send emails
        const result = await pdfManager.processFormsAfterPayment(clientData);
        
        if (result.success) {
          console.log('All forms processed and emails sent successfully');
        } else {
          console.error('Error processing forms:', result.error);
        }
      } catch (error) {
        console.error('Error in payment success processing:', error);
      }
    };

    processPaymentSuccess();
  }, [location.state, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Payment Successful!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Thank you for your payment. We have sent you an email with all your completed forms.
          </p>
        </div>
      </div>
    </div>
  );
} 