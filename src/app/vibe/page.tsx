import { Preferences } from '@/presentation/styling/components/Preferences';
import { VibeList } from '@/presentation/styling/components/VibeList';
import { Screen } from '@/presentation/ui/Screen';
import { StepHeader } from '@/presentation/ui/StepHeader';

export default function Vibe() {
  return (
    <Screen>
      <StepHeader step="3 / 3" title="어떤 느낌이고 싶나요?" />
      <Preferences />
      <VibeList />
    </Screen>
  );
}
