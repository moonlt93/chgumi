import type { Occasion, Vibe } from './model';

export type OccasionOption = Readonly<{
  id: Occasion;
  emoji: string;
  title: string;
  description: string;
}>;

export type VibeOption = Readonly<{
  id: Vibe;
  name: string;
  description: string;
  gradient: string;
}>;

export const occasionCatalog: readonly OccasionOption[] = [
  { id: 'WORK', emoji: '💼', title: '직장', description: '출근부터 퇴근까지' },
  { id: 'DATE', emoji: '♥', title: '소개팅', description: '첫인상을 좋게' },
  { id: 'WALK', emoji: '🌳', title: '산책', description: '편안하지만 멋있게' },
  { id: 'WORKOUT', emoji: '🏃', title: '운동', description: '활동적이고 자연스럽게' },
];
export const vibeCatalog: readonly VibeOption[] = [
  {
    id: 'MINIMAL',
    name: 'Minimal',
    description: '깔끔하고 절제된',
    gradient: 'from-zinc-200 to-stone-400',
  },
  {
    id: 'DANDY',
    name: 'Dandy',
    description: '단정하고 세련된',
    gradient: 'from-slate-300 to-zinc-600',
  },
  {
    id: 'CITY_BOY',
    name: 'City Boy',
    description: '여유롭고 트렌디한',
    gradient: 'from-blue-200 to-slate-500',
  },
  {
    id: 'CASUAL',
    name: 'Casual',
    description: '편안하고 자연스러운',
    gradient: 'from-amber-100 to-stone-400',
  },
  {
    id: 'SPORTY',
    name: 'Sporty',
    description: '활동적이고 선명한',
    gradient: 'from-sky-200 to-blue-500',
  },
  {
    id: 'GORPCORE',
    name: 'Gorpcore',
    description: '기능적이고 아웃도어한',
    gradient: 'from-lime-200 to-emerald-700',
  },
];
