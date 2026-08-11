'use client';

import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  ProgressBar,
} from '@/components/ui';
import { CATEGORIES } from '@/lib/constants';
import { formatKRW } from '@/lib/utils';

export default function ComponentsDevPage() {
  return (
    <div className="min-h-screen bg-surface-bg p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <h1 className="text-2xl font-bold text-ink">UI 컴포넌트 미리보기</h1>

        {/* Button */}
        <Section title="Button">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled>Disabled</Button>
            <Button fullWidth>Full Width</Button>
          </div>
        </Section>

        {/* Input */}
        <Section title="Input">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="여행 이름" placeholder="오사카 우정여행" />
            <Input
              label="전체 예산"
              placeholder="2,400,000"
              hint="KRW 단위로 입력"
            />
            <Input
              label="에러 상태"
              defaultValue="abc"
              error="숫자만 입력 가능합니다"
            />
            <Input label="비활성" placeholder="비활성" disabled />
          </div>
        </Section>

        {/* Card */}
        <Section title="Card">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>오사카 우정여행</CardTitle>
                <Badge variant="brand">D-12</Badge>
              </CardHeader>
              <p className="text-sm text-ink-2">
                2026.07.10 – 07.14 (4박5일) · 4명
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-ink-3">
                  <span>예산 사용률</span>
                  <span>65%</span>
                </div>
                <ProgressBar value={65} />
              </div>
            </Card>
            <Card shadow="sm" padding="sm">
              <CardHeader>
                <CardTitle>도쿄 혼자여행</CardTitle>
                <Badge variant="ok">완료</Badge>
              </CardHeader>
              <p className="text-sm text-ink-2">
                2026.05.01 – 05.05 (4박5일) · 1명
              </p>
              <p className="mt-2 text-sm font-medium text-ink">
                {formatKRW(1800000)}
              </p>
            </Card>
          </div>
        </Section>

        {/* Badge */}
        <Section title="Badge">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">기본</Badge>
            <Badge variant="brand">D-12</Badge>
            <Badge variant="ok">정상</Badge>
            <Badge variant="warn">임박</Badge>
            <Badge variant="danger">초과</Badge>
          </div>
          <p className="mt-3 text-sm text-ink-2">카테고리 배지:</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Badge key={cat.id} variant="category" category={cat.id}>
                {cat.icon} {cat.label}
              </Badge>
            ))}
          </div>
        </Section>

        {/* ProgressBar */}
        <Section title="ProgressBar">
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm text-ink-2">정상 (30%)</p>
              <ProgressBar value={30} status="normal" label="예산 사용률 30%" />
            </div>
            <div>
              <p className="mb-1 text-sm text-ink-2">경고 (82%)</p>
              <ProgressBar value={82} status="warn" label="예산 사용률 82%" />
            </div>
            <div>
              <p className="mb-1 text-sm text-ink-2">초과 (105%)</p>
              <ProgressBar value={100} status="danger" label="예산 초과 105%" />
            </div>
            <div>
              <p className="mb-1 text-sm text-ink-2">Small size</p>
              <ProgressBar value={50} size="sm" />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-ink border-b border-surface-line pb-2">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
