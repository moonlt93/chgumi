import './globals.css';

import { AppShell } from '@/presentation/ui/AppShell';

export const metadata = {
  title: 'CHUGUMI | 추구미 관리하는 남자',
  description: '추구미 관리하는 남자. 상황과 원하는 분위기에 맞는 코디를 찾아보세요.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
