/**
 * 글로벌 컨텍스트 레이아웃
 * 홈(여행 목록), 알림, 설정 — 여행 컨텍스트 없음
 */
export default function GlobalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
