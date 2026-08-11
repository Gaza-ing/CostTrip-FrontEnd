'use client';

import { MobileTabBar, Sidebar, Topbar } from '@/components/layout';
import { usePathname } from 'next/navigation';

const pageTitles: Record<string, { title: string; search: boolean }> = {
  '/home': { title: '홈', search: true },
  '/notifications': { title: '알림', search: true },
  '/settings': { title: '설정', search: false },
};

export default function GlobalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageInfo = pageTitles[pathname] || { title: '', search: false };

  return (
    <>
      <Sidebar />
      <div className="lg:ml-60 min-h-screen flex flex-col pb-14 lg:pb-0">
        <Topbar title={pageInfo.title} searchEnabled={pageInfo.search} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
      <MobileTabBar />
    </>
  );
}
