'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** 트리거 높이. 기본 h-10 */
  triggerClassName?: string;
  'aria-label'?: string;
}

/**
 * 프로젝트 공용 드롭다운(Select).
 *
 * 네이티브 <select>는 열린 목록 스타일을 커스터마이즈할 수 없어,
 * 직접 렌더하는 드롭다운으로 통일한다. (TimeSelect와 동일한 룩앤필)
 * - 클릭으로 열고 옵션 선택
 * - ↑/↓ 이동, Enter 선택, Esc 닫기
 * - 활성 항목 brand-soft 하이라이트, 선택값 brand 강조
 */
export function Select({
  options,
  value,
  onChange,
  label,
  placeholder = '선택',
  disabled = false,
  className,
  triggerClassName,
  'aria-label': ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function openMenu() {
    if (disabled) return;
    setOpen(true);
    // 현재 선택값 위치를 초기 하이라이트로
    setActiveIndex(options.findIndex((o) => o.value === value));
  }

  function pick(idx: number) {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) return openMenu();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return openMenu();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) openMenu();
      else if (activeIndex >= 0) pick(activeIndex);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)} ref={rootRef}>
      {label && <span className="text-sm font-medium text-ink-2">{label}</span>}
      <div className="relative">
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-label={ariaLabel ?? label}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-xs border border-surface-line bg-surface-card px-3 text-sm text-ink transition-colors',
            'hover:border-surface-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand',
            disabled && 'cursor-not-allowed opacity-60',
            triggerClassName,
          )}
        >
          <span className={cn('truncate', !selected && 'text-ink-3')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              'shrink-0 text-ink-3 transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && !disabled && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-sm border border-surface-line bg-surface-card p-1 shadow-md"
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isActive = idx === activeIndex;
              return (
                <li key={opt.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(idx);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      'block w-full rounded-xs px-3 py-1.5 text-left text-sm transition-colors',
                      isActive && 'bg-brand-soft',
                      isSelected
                        ? 'font-semibold text-brand'
                        : 'text-ink-2 hover:bg-surface-bg-alt',
                    )}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
