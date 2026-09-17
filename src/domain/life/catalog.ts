export const PERSONAS = [
  {
    id: 'calm',
    name: '단정한 일상',
    description: '편안하게 입고, 차분하게 나를 돌보는 사람',
    color: '#63796a',
    activity: '15분 산책하며 마음에 드는 장면 찾아보기',
  },
  {
    id: 'curious',
    name: '취향을 찾는 사람',
    description: '새로운 경험에서 나만의 취향을 발견하는 사람',
    color: '#a3724f',
    activity: '관심 있는 책을 10분 읽고 한 문장 남기기',
  },
  {
    id: 'active',
    name: '가볍게 움직이는 나',
    description: '작은 움직임으로 일상에 활력을 더하는 사람',
    color: '#557d99',
    activity: '내가 좋아하는 음악과 함께 10분 스트레칭하기',
  },
] as const;

export const SHOP = [
  {
    id: 'plant',
    name: '작은 초록 친구',
    description: '창가에 놓는 작은 화분',
    slot: 'plant',
    price: 20,
    color: '#61815f',
    icon: '🌱',
  },
  {
    id: 'lamp',
    name: '저녁의 온기',
    description: '하루를 마무리하는 따뜻한 조명',
    slot: 'lamp',
    price: 35,
    color: '#edbc71',
    icon: '💡',
  },
  {
    id: 'rug',
    name: '크림 러그',
    description: '발밑까지 포근한 나의 공간',
    slot: 'rug',
    price: 40,
    color: '#ede0c2',
    icon: '▱',
  },
  {
    id: 'art',
    name: '산책의 기억',
    description: '벽에 거는 초록빛 풍경',
    slot: 'art',
    price: 30,
    color: '#93aa86',
    icon: '🖼️',
  },
  {
    id: 'olive',
    name: '올리브 오버셔츠',
    description: '아바타 전용 · 차분한 가을 색',
    slot: 'outfit',
    price: 35,
    color: '#667150',
    icon: '👕',
  },
  {
    id: 'blue',
    name: '블루 니트',
    description: '아바타 전용 · 맑고 편안한 색',
    slot: 'outfit',
    price: 35,
    color: '#6584a1',
    icon: '👕',
  },
] as const;
export type Slot = (typeof SHOP)[number]['slot'];
export const CATEGORIES = ['outfit', 'activity', 'journal'] as const;
export type Category = (typeof CATEGORIES)[number];
export const REWARDS = {
  outfit: { xp: 20, coins: 20 },
  activity: { xp: 20, coins: 20 },
  journal: { xp: 10, coins: 10 },
};
export const FEELINGS = ['좋았어요', '어려웠어요', '나와 안 맞아요'] as const;
