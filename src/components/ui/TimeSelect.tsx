'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

/** 부모가 명령형으로 시(hour) 입력에 포커스할 수 있는 핸들. */
export interface TimeSelectHandle {
  focusHour: () => void;
}

interface TimeSelectProps {
  label?: string;
  /** "HH:mm" 또는 빈 문자열 */
  value: string;
  onChange: (value: string) => void;
  /** 분 드롭다운 제안 간격(분). 기본 10 */
  minuteStep?: number;
  /** 분까지 다 고르면 호출(부모가 다음 필드로 포커스 이동). */
  onComplete?: () => void;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));

type Field = 'hour' | 'minute';

/**
 * 시/분 콤보박스로 시간을 고르는 컴포넌트.
 *
 * - 클릭/포커스하면 옵션 드롭다운이 뜨고(마우스 선택),
 * - 키보드로 직접 숫자 타이핑,
 * - ↑/↓로 옵션 이동, Enter로 선택, Esc로 닫기.
 * 타이핑 중에는 로컬 문자열을 유지하고, 확정 시 "HH:mm"으로 정규화한다.
 */
export const TimeSelect = forwardRef<TimeSelectHandle, TimeSelectProps>(
  function TimeSelect(
    { label, value, onChange, minuteStep = 10, onComplete, className },
    ref,
  ) {
    const minuteOptions = Array.from(
      { length: Math.ceil(60 / minuteStep) },
      (_, i) => String(i * minuteStep).padStart(2, '0'),
    );

    const [vHH, vMM] = value ? value.split(':') : ['', ''];

    const [hourText, setHourText] = useState(vHH);
    const [minuteText, setMinuteText] = useState(vMM);
    const [openField, setOpenField] = useState<Field | null>(null);
    // 키보드 방향키로 하이라이트 중인 옵션 인덱스
    const [activeIndex, setActiveIndex] = useState(-1);
    const rootRef = useRef<HTMLDivElement>(null);
    const hourInputRef = useRef<HTMLInputElement>(null);
    const minuteInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusHour: () => {
        hourInputRef.current?.focus();
        hourInputRef.current?.select();
      },
    }));

    // 부모 value가 외부 요인(프리필/리셋)으로 바뀌면 로컬 입력값 동기화.
    const [prevValue, setPrevValue] = useState(value);
    if (value !== prevValue) {
      setPrevValue(value);
      setHourText(vHH);
      setMinuteText(vMM);
    }

    // 바깥 클릭 시 드롭다운 닫기
    useEffect(() => {
      if (!openField) return;
      function onDocClick(e: MouseEvent) {
        if (!rootRef.current?.contains(e.target as Node)) setOpenField(null);
      }
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }, [openField]);

    function clampNum(raw: string, max: number): number | null {
      const digits = raw.replace(/\D/g, '');
      if (digits === '') return null;
      return Math.min(Math.max(parseInt(digits, 10), 0), max);
    }

    function commit(hRaw: string, mRaw: string) {
      const h = clampNum(hRaw, 23);
      const m = clampNum(mRaw, 59);
      if (h === null && m === null) {
        onChange('');
        return;
      }
      onChange(
        `${String(h ?? 0).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`,
      );
    }

    function open(field: Field) {
      setOpenField(field);
      setActiveIndex(-1);
    }

    function pick(field: Field, v: string) {
      if (field === 'hour') {
        setHourText(v);
        commit(v, minuteText || '00');
        setOpenField(null);
        setActiveIndex(-1);
        // 시를 고르면 분 입력으로 이동(드롭다운도 자동으로 열림)
        requestAnimationFrame(() => {
          minuteInputRef.current?.focus();
          minuteInputRef.current?.select();
        });
      } else {
        setMinuteText(v);
        commit(hourText || '00', v);
        setOpenField(null);
        setActiveIndex(-1);
        // 분까지 고르면 완료 → 부모가 다음 필드로 이동
        minuteInputRef.current?.blur();
        onComplete?.();
      }
    }

    function handleKeyDown(field: Field, e: React.KeyboardEvent) {
      const options = field === 'hour' ? HOURS : minuteOptions;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (openField !== field) open(field);
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (openField !== field) open(field);
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        if (openField === field && activeIndex >= 0) {
          e.preventDefault();
          pick(field, options[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        setOpenField(null);
        setActiveIndex(-1);
      }
    }

    const inputCls =
      'h-10 w-full rounded-xs border border-surface-line bg-surface-card px-2 text-center text-sm text-ink transition-colors hover:border-surface-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand';

    function renderDropdown(field: Field, options: string[], selected: string) {
      if (openField !== field) return null;
      return (
        <ul
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-52 w-full overflow-y-auto rounded-sm border border-surface-line bg-surface-card p-1 shadow-md"
        >
          {options.map((opt, idx) => {
            const isSelected = opt === selected;
            const isActive = idx === activeIndex;
            return (
              <li key={opt} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(field, opt);
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={cn(
                    'block w-full rounded-xs px-3 py-1.5 text-center text-sm transition-colors',
                    isActive && 'bg-brand-soft',
                    isSelected
                      ? 'font-semibold text-brand'
                      : 'text-ink-2 hover:bg-surface-bg-alt',
                  )}
                >
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
      );
    }

    return (
      <div className={cn('flex flex-col gap-1.5', className)} ref={rootRef}>
        {label && (
          <span className="text-sm font-medium text-ink-2">{label}</span>
        )}
        <div className="flex items-center gap-1.5">
          {/* 시 */}
          <div className="flex flex-1 items-center gap-1">
            <div className="relative flex-1">
              <input
                ref={hourInputRef}
                type="text"
                inputMode="numeric"
                maxLength={2}
                aria-label={label ? `${label} 시` : '시'}
                placeholder="시"
                className={inputCls}
                value={hourText}
                onFocus={() => open('hour')}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                  setHourText(digits);
                  open('hour');
                  // 두 자리 또는 2~9 입력(10시 이상 불가)이면 시 확정 후 분으로 이동
                  const asNum = parseInt(digits, 10);
                  if (
                    digits.length === 2 ||
                    (digits.length === 1 && asNum >= 3)
                  ) {
                    commit(digits, minuteText || '00');
                    setOpenField(null);
                    requestAnimationFrame(() => {
                      minuteInputRef.current?.focus();
                      minuteInputRef.current?.select();
                    });
                  }
                }}
                onKeyDown={(e) => handleKeyDown('hour', e)}
                onBlur={() => commit(hourText, minuteText)}
              />
              {renderDropdown('hour', HOURS, vHH)}
            </div>
            <span className="text-xs text-ink-3">시</span>
          </div>

          <span className="text-ink-3">:</span>

          {/* 분 */}
          <div className="flex flex-1 items-center gap-1">
            <div className="relative flex-1">
              <input
                ref={minuteInputRef}
                type="text"
                inputMode="numeric"
                maxLength={2}
                aria-label={label ? `${label} 분` : '분'}
                placeholder="분"
                className={inputCls}
                value={minuteText}
                onFocus={() => open('minute')}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                  setMinuteText(digits);
                  open('minute');
                  // 두 자리 또는 6~9 입력(분 첫자리 6 이상 불가)이면 완료 처리
                  const asNum = parseInt(digits, 10);
                  if (
                    digits.length === 2 ||
                    (digits.length === 1 && asNum >= 6)
                  ) {
                    commit(hourText || '00', digits);
                    setOpenField(null);
                    requestAnimationFrame(() => {
                      minuteInputRef.current?.blur();
                      onComplete?.();
                    });
                  }
                }}
                onKeyDown={(e) => handleKeyDown('minute', e)}
                onBlur={() => commit(hourText, minuteText)}
              />
              {renderDropdown('minute', minuteOptions, vMM)}
            </div>
            <span className="text-xs text-ink-3">분</span>
          </div>
        </div>
      </div>
    );
  },
);
