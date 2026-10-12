import React, { useState } from 'react';
import { Stepper, type StepItem } from '../ui/Stepper';
import { Button } from '../ui/Button';

export interface WizardStep {
  step: StepItem;
  validate?: () => boolean | Promise<boolean>;
  content: React.ReactNode;
}

export interface WizardProps {
  steps: WizardStep[];
  onComplete: () => void | Promise<void>;
  isSubmitting?: boolean;
  completeLabel?: string;
  initialStep?: number;
}

export function Wizard({
  steps,
  onComplete,
  isSubmitting = false,
  completeLabel = 'Complete',
  initialStep = 0,
}: WizardProps): React.ReactElement {
  const [currentStep, setCurrentStep] = useState(initialStep);

  React.useEffect(() => {
    if (initialStep >= 0 && initialStep < steps.length) {
      setCurrentStep(initialStep);
    }
  }, [initialStep, steps.length]);

  const handleNext = async () => {
    const active = steps[currentStep];
    if (active?.validate) {
      const valid = await active.validate();
      if (!valid) return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      await onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="space-y-8">
      <Stepper
        steps={steps.map((s) => s.step)}
        activeStep={currentStep}
        onStepClick={(idx) => {
          if (idx < currentStep) setCurrentStep(idx);
        }}
      />

      <div className="min-h-[240px] pt-4">{steps[currentStep]?.content}</div>

      <div className="flex items-center justify-between border-t border-border-subtle/50 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || isSubmitting}
        >
          Back
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={handleNext}
          isLoading={isSubmitting}
        >
          {currentStep === steps.length - 1 ? completeLabel : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
