'use client';

import { TripCreateModal } from '@/components/trip/TripCreateModal';
import { useRouter } from 'next/navigation';

/**
 * /trip/create 라우트로 직접 접근 시 모달을 표시하고,
 * 닫으면 홈으로 돌아갑니다.
 */
export default function TripCreatePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-surface-bg">
      <TripCreateModal open={true} onClose={() => router.push('/home')} />
    </div>
  );
}
