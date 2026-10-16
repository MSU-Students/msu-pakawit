import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OTPVerificationModal } from '../modules/guardrails/OTPVerificationModal';

describe('OTPVerificationModal', () => {
  it('submits the buyer-provided four-digit code to the verifier', async () => {
    const onVerify = jest.fn().mockResolvedValue(true);
    const { container } = render(
      <OTPVerificationModal errandId="errand-1" onVerify={onVerify} onClose={jest.fn()} />,
    );
    const inputs = container.querySelectorAll('input');
    ['7', '4', '2', '9'].forEach((digit, index) => fireEvent.change(inputs[index], { target: { value: digit } }));

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Handoff' }));

    await waitFor(() => expect(onVerify).toHaveBeenCalledWith('7429'));
    expect(await screen.findByText(/delivery verified/i)).toBeInTheDocument();
  });
});
