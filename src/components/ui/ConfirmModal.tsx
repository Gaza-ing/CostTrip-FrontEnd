'use client';

import { type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  /** 본문 설명(문자열 또는 노드) */
  description?: ReactNode;
  /** 확인 버튼 라벨. 기본 "삭제" */
  confirmLabel?: string;
  /** 취소 버튼 라벨. 기본 "취소" */
  cancelLabel?: string;
  /** 확인 버튼 스타일. 기본 danger */
  confirmVariant?: 'primary' | 'danger';
  /** 처리 중(버튼 비활성화 + 라벨 변경) */
  pending?: boolean;
  pendingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 공용 확인 모달. 브라우저 confirm() 대신 이 컴포넌트를 쓴다.
 * (여행 카드 삭제 확인과 동일한 룩앤필)
 */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = '삭제',
  cancelLabel = '취소',
  confirmVariant = 'danger',
  pending = false,
  pendingLabel = '처리 중...',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onCancel}>
      <div className="p-6">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            {description}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
