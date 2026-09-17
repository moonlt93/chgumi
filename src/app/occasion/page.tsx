import { OccasionGrid } from '@/presentation/styling/components/OccasionGrid';
import { Screen } from '@/presentation/ui/Screen';
import { StepHeader } from '@/presentation/ui/StepHeader';

export default function Occasion() {
  return (
    <Screen>
      <StepHeader step="2 / 3" title="오늘 어디 가세요?" />
      <OccasionGrid />
    </Screen>
  );
}
