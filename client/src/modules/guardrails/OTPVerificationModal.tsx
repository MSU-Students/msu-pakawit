import React, { useState } from 'react';
import { AlertTriangle, KeyRound } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';

export interface OTPVerificationModalProps {
  errandId: string;
  onVerify: (otp: string) => boolean | Promise<boolean>;
  onClose: () => void;
}

export const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  errandId,
  onVerify,
  onClose,
}) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!/^[0-9]{4}$/.test(otp)) {
      setError('Enter the four-digit OTP provided by the recipient.');
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      const verified = await onVerify(otp);
      if (verified) {
        onClose();
      } else {
        setError('The delivery could not be verified. Check the OTP and try again.');
      }
    } catch {
      setError('OTP verification failed. The delivery was not completed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-md space-y-5 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-msu-maroon">
          <KeyRound className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Verify delivery handoff</h3>
          <p className="mt-1 text-xs text-slate-500">
            Enter the four-digit OTP provided by the recipient for errand #{errandId}.
          </p>
        </div>
        <input
          aria-label="Recipient OTP"
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={4}
          pattern="[0-9]{4}"
          value={otp}
          onChange={(event) => {
            setOtp(event.target.value.replace(/[^0-9]/g, '').slice(0, 4));
            setError(null);
          }}
          className="w-full rounded-lg border-2 border-slate-300 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] focus:border-msu-maroon focus:outline-none"
        />
        {error && (
          <div role="alert" className="flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-600">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" className="w-1/2" onClick={onClose} disabled={isVerifying}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="w-1/2"
            onClick={handleVerify}
            isLoading={isVerifying}
            disabled={isVerifying}
          >
            Handoff Successful
          </Button>
        </div>
      </Card>
    </div>
  );
};
