import React, { useState } from 'react';
import { KeyRound, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';

export interface OTPVerificationModalProps {
  errandId: string;
  expectedOTP?: string;
  onVerify: (otp: string) => boolean | Promise<boolean>;
  onClose: () => void;
}

export const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  errandId,
  expectedOTP = '7429',
  onVerify,
  onClose,
}) => {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDigitChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);
    setError(null);

    // Auto-focus next input
    if (val && index < 3) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = async () => {
    const enteredOTP = digits.join('');
    if (enteredOTP.length < 4) {
      setError('Please enter the complete 4-digit code provided by the buyer.');
      return;
    }

    const isValid = await onVerify(enteredOTP);
    if (isValid) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setError('Invalid OTP code. Please verify with the student buyer at the drop zone.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="max-w-md w-full p-6 text-center space-y-5 bg-white shadow-2xl">
        <div className="w-12 h-12 bg-red-100 text-msu-maroon rounded-full flex items-center justify-center mx-auto">
          <KeyRound className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Drop-Zone OTP Handoff
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Ask the buyer for their 4-digit verification code to complete delivery for Errand #{errandId}
          </p>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
            (Demo simulation code: {expectedOTP})
          </p>
        </div>

        {/* 4-Digit Input Boxes */}
        <div className="flex justify-center gap-3">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              id={`otp-input-${idx}`}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              className="w-12 h-14 text-center text-2xl font-mono font-bold border-2 border-slate-300 rounded-xl focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20 outline-none transition-all"
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Delivery Verified! Payout released to runner wallet.</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" className="w-1/2" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="w-1/2"
            onClick={handleVerify}
            disabled={success}
          >
            Confirm Handoff
          </Button>
        </div>
      </Card>
    </div>
  );
};
