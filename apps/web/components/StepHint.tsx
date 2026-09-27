export function StepHint({ step }: { step: 2 | 3 | 4 }) {
  return <p className="step-hint">Step {step} of 4</p>;
}
