'use client';

type Step = 1 | 2 | 3;

interface CheckoutStepsProps {
  current: Step;
  labels?: { cart: string; checkout: string; confirm: string };
}

const defaultLabels = {
  cart: 'Cart',
  checkout: 'Details & Payment',
  confirm: 'Confirmation',
};

export function CheckoutSteps({ current, labels: l }: CheckoutStepsProps) {
  const labels = l ?? defaultLabels;
  const steps = [
    { step: 1 as Step, label: labels.cart, href: null },
    { step: 2 as Step, label: labels.checkout, href: null },
    { step: 3 as Step, label: labels.confirm, href: null },
  ];

  return (
    <nav className="checkout-steps" aria-label="Checkout progress">
      <ol className="checkout-steps-list">
        {steps.map(({ step, label }) => (
          <li
            key={step}
            className={`checkout-step ${current === step ? 'checkout-step-active' : ''} ${current > step ? 'checkout-step-done' : ''}`}
          >
            <span className="checkout-step-num">{step}</span>
            <span className="checkout-step-label">{label}</span>
            {step < 3 && <span className="checkout-step-sep" aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
