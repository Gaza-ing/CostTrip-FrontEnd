'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar, AVATAR_COLORS } from '@/components/ui/Avatar';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { syncUser } from '@/lib/api/auth';
import { toast } from '@/stores/toast-store';

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
  /** 현재 표시 이름 */
  initialName: string;
  /** 현재 아바타 색(hex). 없으면 첫 번째 색 */
  initialColor?: string;
  /** 이메일(백엔드 sync에 필요) */
  email: string;
  /** 저장 성공 후 콜백(캐시 갱신 등) */
  onSaved?: () => void;
}

/**
 * 프로필(이름·아바타 색) 편집 모달.
 *
 * - 이름/색은 Supabase user_metadata(display_name, avatar_color)에 저장한다.
 *   (백엔드 users 테이블에 색 컬럼이 없어도 동작하도록 metadata 사용)
 * - 이름은 이어서 백엔드 /auth/sync 로도 반영한다.
 */
export function ProfileEditModal({
  open,
  onClose,
  initialName,
  initialColor,
  email,
  onSaved,
}: ProfileEditModalProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor ?? AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);

  // 모달이 열릴 때마다 현재 값으로 초기화
  function handleClose() {
    if (saving) return;
    onClose();
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('이름을 입력해 주세요');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: trimmed, avatar_color: color },
      });
      if (error) throw error;

      // 백엔드 users 테이블에도 이름 반영 (실패해도 치명적이지 않음)
      try {
        await syncUser({ email, displayName: trimmed, photoUrl: null });
      } catch (err) {
        console.error('프로필 sync 실패:', err);
      }

      toast.success('프로필이 저장되었습니다');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '프로필 저장에 실패했습니다',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="p-6">
        <h2 className="text-lg font-bold text-ink">프로필 수정</h2>
        <p className="mt-1 text-sm text-ink-3">
          이름과 프로필 색을 변경할 수 있어요.
        </p>

        {/* 미리보기 */}
        <div className="mt-5 flex items-center gap-4">
          <Avatar name={name || '?'} color={color} size={56} />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-ink">
              {name || '이름 없음'}
            </p>
            <p className="truncate text-sm text-ink-3">{email}</p>
          </div>
        </div>

        {/* 이름 */}
        <div className="mt-5">
          <Input
            label="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="표시할 이름"
            maxLength={20}
          />
        </div>

        {/* 색 선택 */}
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-ink-2">프로필 색</p>
          <div className="flex flex-wrap gap-2.5">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`색상 ${c}`}
                aria-pressed={color === c}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-105',
                  color === c && 'ring-2 ring-offset-2 ring-ink',
                )}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check size={16} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* 액션 */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
