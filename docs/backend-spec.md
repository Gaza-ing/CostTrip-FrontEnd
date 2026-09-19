# CostTrip 백엔드 설계 스펙

> 기술 스택: **FastAPI** (Python) + **Supabase** (PostgreSQL + Auth + Storage) + **외부 OpenAPI (관광공사 등)**
> 통화: KRW 단일 (원 단위 정수)
> 인증: Supabase Auth (Google/Kakao OAuth + Email)

> **확장성 원칙**: 외부 API는 Provider 추상화(5장)로 언제든 추가 가능하고, 추천 알고리즘은
> 파이프라인 구조(10장)로 단계적으로 고도화할 수 있게 설계했습니다. 확장 관련 상세는
> 5장(Provider), 10장(추천), 11장(성능/캐싱/버저닝), 12장(PostGIS)을 참고하세요.

---

## 1. 아키텍처 개요

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Next.js    │────▶│  FastAPI Server  │────▶│   Supabase     │
│  Frontend   │     │  (Python 3.11+)  │     │  - PostgreSQL  │
└─────────────┘     └──────────────────┘     │  - Auth        │
                           │                  │  - Storage     │
                           ▼                  └────────────────┘
                    ┌──────────────┐
                    │ 한국관광공사  │
                    │ TourAPI      │
                    └──────────────┘
```

### 1.1 폴더 구조 (FastAPI)

```
costtrip-api/
├── main.py                  # FastAPI 앱 진입점
├── requirements.txt
├── .env                     # 환경변수
├── alembic/                 # DB 마이그레이션
│   └── versions/
├── app/
│   ├── __init__.py
│   ├── config.py            # 설정 (환경변수 로드)
│   ├── database.py          # Supabase/SQLAlchemy 연결
│   ├── dependencies.py      # 공통 의존성 (인증 등)
│   ├── models/              # SQLAlchemy 모델 (DB 테이블)
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── trip.py
│   │   ├── member.py
│   │   ├── day.py
│   │   ├── plan_item.py
│   │   ├── budget.py
│   │   ├── expense.py
│   │   ├── settlement.py
│   │   ├── notification.py
│   │   ├── place.py
│   │   └── attachment.py
│   ├── schemas/             # Pydantic 스키마 (요청/응답)
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── trip.py
│   │   ├── expense.py
│   │   ├── settlement.py
│   │   └── ...
│   ├── routers/             # API 엔드포인트
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── trips.py
│   │   ├── members.py
│   │   ├── days.py
│   │   ├── plan_items.py
│   │   ├── budgets.py
│   │   ├── expenses.py
│   │   ├── settlements.py
│   │   ├── notifications.py
│   │   └── tour_api.py      # 관광공사 API 프록시
│   ├── services/            # 비즈니스 로직
│   │   ├── __init__.py
│   │   ├── expense_service.py    # 분담 계산
│   │   ├── settlement_service.py # 정산 알고리즘
│   │   ├── budget_service.py     # 예산 경고 판정
│   │   ├── invite_service.py     # 초대 토큰/코드
│   │   └── tour_service.py       # 관광공사 API 연동
│   └── utils/
│       ├── __init__.py
│       └── split_calculator.py   # 분담액 계산기
```

---

## 2. DB 테이블 설계 (Supabase PostgreSQL)

### 2.1 users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  default_currency_code TEXT NOT NULL DEFAULT 'KRW',
  locale TEXT NOT NULL DEFAULT 'ko_KR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 trips

```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trip_time_zone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  headcount INT NOT NULL DEFAULT 1,
  total_budget_amount BIGINT NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'KRW',
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'ongoing', 'completed', 'archived')),
  cover_image_url TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.3 trip_members

```sql
CREATE TABLE trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  display_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'registered'
    CHECK (type IN ('registered', 'placeholder')),
  role TEXT NOT NULL DEFAULT 'editor'
    CHECK (role IN ('owner', 'editor', 'viewer')),
  invite_status TEXT NOT NULL DEFAULT 'accepted'
    CHECK (invite_status IN ('invited', 'accepted', 'declined', 'left')),
  share_weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  joined_at TIMESTAMPTZ,
  merged_from_member_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 동일 여행에 같은 유저 중복 방지
  UNIQUE(trip_id, user_id)
);
```

### 2.4 days

```sql
CREATE TABLE days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_index INT NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id, day_index)
);
```

### 2.5 budget_categories

```sql
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  key TEXT NOT NULL
    CHECK (key IN ('lodging', 'transport', 'food', 'sightseeing', 'shopping', 'etc')),
  name TEXT NOT NULL,
  icon_name TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id, key)
);
```

### 2.6 budgets

```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category_id UUID REFERENCES budget_categories(id),
  planned_amount BIGINT NOT NULL DEFAULT 0 CHECK (planned_amount >= 0),
  currency_code TEXT NOT NULL DEFAULT 'KRW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- category_id가 NULL이면 전체 예산
```

### 2.7 places

```sql
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_place_id TEXT,
  provider TEXT NOT NULL DEFAULT 'manual'
    CHECK (provider IN ('google', 'apple', 'naver', 'kakao', 'manual')),
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  category_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.7.1 external_places (외부 API 장소 캐시) — 확장용

> 여러 OpenAPI에서 가져온 장소를 캐싱/통합 관리하는 테이블.
> `places`(2.7)는 "사용자가 실제 일정/지출에 연결한 장소 스냅샷"이고,
> `external_places`는 "추천·검색을 위한 외부 데이터 풀"로 역할이 다릅니다.

```sql
CREATE TABLE external_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,              -- 'tour_api' / 'kakao' / 'google' ...
  external_id TEXT NOT NULL,           -- 원본 API의 고유 ID
  name TEXT NOT NULL,
  category TEXT NOT NULL,              -- 통일 카테고리 (lodging/food/...)
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  image_url TEXT,
  rating REAL,                         -- 평점 (추천 알고리즘용)
  price_level INT,                     -- 가격대 1~4 (추천 알고리즘용)
  region_code TEXT,                    -- 지역 코드 (검색 성능용)
  raw_data JSONB,                      -- 원본 응답 보존
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),  -- 캐시 갱신 시점
  UNIQUE(provider, external_id)
);

-- 좌표 기반 근접 검색 인덱스 (PostGIS 확장 사용 권장)
CREATE INDEX idx_external_places_geo ON external_places(latitude, longitude);
CREATE INDEX idx_external_places_category ON external_places(category);
```

> **PostGIS 권장**: Supabase는 PostGIS 확장을 지원합니다. 경로 기반 추천처럼 "반경 N km 내 장소"를 자주 조회한다면 `geography(Point)` 컬럼 + GiST 인덱스로 바꾸면 훨씬 빠릅니다. (아래 12장 참고)

### 2.7.2 user_preferences (사용자 취향) — 추천 알고리즘용

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 카테고리별 선호도 (0.0~1.0), 방문/저장 이력으로 학습
  category_weights JSONB NOT NULL DEFAULT '{}',
  -- 예: {"food": 0.8, "sightseeing": 0.6, "shopping": 0.2}
  price_sensitivity INT DEFAULT 2,     -- 1(저렴선호)~4(고가허용)
  avoid_categories JSONB DEFAULT '[]', -- 제외할 카테고리
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
```

### 2.8 plan_items

```sql
CREATE TABLE plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'etc'
    CHECK (type IN ('lodging', 'transport', 'sightseeing', 'food', 'shopping', 'etc')),
  category_id UUID REFERENCES budget_categories(id),
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  estimated_amount BIGINT,  -- NULL=비용미정, 0=명시적 무료
  currency_code TEXT NOT NULL DEFAULT 'KRW',
  place_id UUID REFERENCES places(id),
  memo TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.9 expenses

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES budget_categories(id),
  day_id UUID REFERENCES days(id),
  plan_item_id UUID REFERENCES plan_items(id),
  paid_by_member_id UUID NOT NULL REFERENCES trip_members(id),
  title TEXT NOT NULL,
  amount BIGINT NOT NULL,  -- 환불 시 음수 허용
  currency_code TEXT NOT NULL DEFAULT 'KRW',
  spent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  split_method TEXT NOT NULL DEFAULT 'equal'
    CHECK (split_method IN ('equal', 'ratio', 'shares', 'exact', 'none')),
  is_settlement_target BOOLEAN NOT NULL DEFAULT true,
  place_id UUID REFERENCES places(id),
  memo TEXT,
  created_by_member_id UUID NOT NULL REFERENCES trip_members(id),
  refund_of_expense_id UUID REFERENCES expenses(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.10 expense_shares

```sql
CREATE TABLE expense_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES trip_members(id),
  share_amount BIGINT NOT NULL,
  is_settled BOOLEAN NOT NULL DEFAULT false,
  settlement_batch_id UUID REFERENCES settlement_batches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.11 settlement_batches

```sql
CREATE TABLE settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  settlement_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'proposed', 'settled', 'reopened')),
  snapshot_expense_ids JSONB NOT NULL DEFAULT '[]',
  created_by_member_id UUID NOT NULL REFERENCES trip_members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.12 settlement_transfers

```sql
CREATE TABLE settlement_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES settlement_batches(id) ON DELETE CASCADE,
  from_member_id UUID NOT NULL REFERENCES trip_members(id),
  to_member_id UUID NOT NULL REFERENCES trip_members(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  is_settled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.13 notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  recipient_member_id UUID NOT NULL REFERENCES trip_members(id),
  type TEXT NOT NULL
    CHECK (type IN (
      'budget_warning', 'budget_exceeded',
      'category_warning', 'category_exceeded',
      'pace_warning', 'member_expense',
      'settlement', 'invite'
    )),
  level TEXT NOT NULL DEFAULT 'info'
    CHECK (level IN ('info', 'warning', 'critical')),
  scope_category_id UUID REFERENCES budget_categories(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_member_id, is_read);
```

### 2.14 attachments

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('expense', 'plan_item')),
  owner_id UUID NOT NULL,
  storage_key TEXT NOT NULL,
  thumb_keys JSONB DEFAULT '{}',
  content_type TEXT NOT NULL,
  byte_size INT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (upload_status IN ('pending', 'uploaded', 'failed')),
  created_by_member_id UUID NOT NULL REFERENCES trip_members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.15 invite_tokens (초대 관리)

```sql
CREATE TABLE invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by_member_id UUID NOT NULL REFERENCES trip_members(id),
  token TEXT UNIQUE NOT NULL,        -- 128bit+ 엔트로피
  code TEXT UNIQUE,                  -- 짧은 초대 코드 (선택)
  default_role TEXT NOT NULL DEFAULT 'editor',
  max_uses INT DEFAULT 1,            -- NULL=무제한
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,   -- 기본 7일 후
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. API 엔드포인트 설계

### 3.1 인증 (Supabase Auth)

Supabase Auth를 직접 사용하므로 FastAPI에서는 토큰 검증만 수행.

```python
# app/dependencies.py
from fastapi import Depends, HTTPException
from supabase import Client

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Supabase JWT 토큰 검증 → user_id 반환"""
    user = supabase.auth.get_user(token)
    if not user:
        raise HTTPException(401, "인증 실패")
    return user
```

### 3.2 여행 (Trips)

| Method | Path                   | 설명                                            |
| ------ | ---------------------- | ----------------------------------------------- |
| POST   | `/api/trips`           | 여행 생성 (+ Day 자동 생성 + 6개 카테고리 시드) |
| GET    | `/api/trips`           | 내 여행 목록                                    |
| GET    | `/api/trips/{trip_id}` | 여행 상세                                       |
| PATCH  | `/api/trips/{trip_id}` | 여행 수정                                       |
| DELETE | `/api/trips/{trip_id}` | 여행 삭제 (소프트)                              |

### 3.3 멤버 (Members)

| Method | Path                                | 설명                  |
| ------ | ----------------------------------- | --------------------- |
| GET    | `/api/trips/{trip_id}/members`      | 멤버 목록             |
| POST   | `/api/trips/{trip_id}/members`      | 가상 멤버 추가        |
| PATCH  | `/api/trips/{trip_id}/members/{id}` | 역할 변경             |
| DELETE | `/api/trips/{trip_id}/members/{id}` | 멤버 제거 (left 처리) |
| POST   | `/api/trips/{trip_id}/invite`       | 초대 링크/코드 생성   |
| POST   | `/api/invite/accept`                | 초대 수락             |

### 3.4 일정 (Days & PlanItems)

| Method | Path                                       | 설명           |
| ------ | ------------------------------------------ | -------------- |
| GET    | `/api/trips/{trip_id}/days`                | Day 목록       |
| GET    | `/api/trips/{trip_id}/days/{day_id}/items` | 일정 항목 목록 |
| POST   | `/api/trips/{trip_id}/days/{day_id}/items` | 일정 항목 추가 |
| PATCH  | `/api/trips/{trip_id}/items/{id}`          | 일정 항목 수정 |
| DELETE | `/api/trips/{trip_id}/items/{id}`          | 일정 항목 삭제 |

### 3.5 예산 (Budgets)

| Method | Path                           | 설명                      |
| ------ | ------------------------------ | ------------------------- |
| GET    | `/api/trips/{trip_id}/budgets` | 예산 조회 (전체+카테고리) |
| PUT    | `/api/trips/{trip_id}/budgets` | 예산 일괄 저장            |

### 3.6 지출 (Expenses)

| Method | Path                                 | 설명                         |
| ------ | ------------------------------------ | ---------------------------- |
| GET    | `/api/trips/{trip_id}/expenses`      | 지출 목록 (필터/정렬)        |
| POST   | `/api/trips/{trip_id}/expenses`      | 지출 추가 (+ 분담 자동 계산) |
| PATCH  | `/api/trips/{trip_id}/expenses/{id}` | 지출 수정                    |
| DELETE | `/api/trips/{trip_id}/expenses/{id}` | 지출 삭제                    |

### 3.7 정산 (Settlements)

| Method | Path                                             | 설명                        |
| ------ | ------------------------------------------------ | --------------------------- |
| GET    | `/api/trips/{trip_id}/settlement`                | 정산 현황 (순잔액 + 송금안) |
| POST   | `/api/trips/{trip_id}/settlement/propose`        | 정산안 생성 (배치 스냅샷)   |
| PATCH  | `/api/trips/{trip_id}/settlement/transfers/{id}` | 송금 완료 체크              |
| POST   | `/api/trips/{trip_id}/settlement/complete`       | 정산 완료                   |

### 3.8 알림 (Notifications)

| Method | Path                           | 설명                |
| ------ | ------------------------------ | ------------------- |
| GET    | `/api/notifications`           | 내 알림 목록 (필터) |
| PATCH  | `/api/notifications/{id}/read` | 읽음 처리           |
| POST   | `/api/notifications/read-all`  | 전체 읽음           |

### 3.9 관광공사 API (TourAPI 프록시)

| Method | Path                            | 설명        |
| ------ | ------------------------------- | ----------- |
| GET    | `/api/tour/search`              | 관광지 검색 |
| GET    | `/api/tour/detail/{content_id}` | 관광지 상세 |
| GET    | `/api/tour/nearby`              | 주변 관광지 |

---

## 4. 핵심 비즈니스 로직 구현

### 4.1 분담액 계산기 (`utils/split_calculator.py`)

```python
def calculate_shares(
    amount: int,
    members: list[str],  # member_id 목록 (정렬됨)
    method: str,         # equal/ratio/shares/exact/none
    weights: dict[str, int] | None = None,  # ratio/shares일 때
    exact_amounts: dict[str, int] | None = None,  # exact일 때
) -> dict[str, int]:
    """
    분담액을 계산하고 dict[member_id → share_amount]를 반환.
    합계 보존 불변식: sum(결과.values()) == amount
    """
    if method == 'none':
        # 개인 지출: 결제자 1인이 전액
        return {members[0]: amount}

    if method == 'equal':
        base = amount // len(members)
        remainder = amount - (base * len(members))
        result = {}
        for i, m in enumerate(members):
            result[m] = base + (1 if i < remainder else 0)
        return result

    if method == 'shares' or method == 'ratio':
        total_weight = sum(weights.values())
        result = {}
        distributed = 0
        sorted_members = sorted(weights.keys())
        for i, m in enumerate(sorted_members):
            if i == len(sorted_members) - 1:
                # 마지막 멤버가 나머지 흡수 (합계 보존)
                result[m] = amount - distributed
            else:
                share = (amount * weights[m]) // total_weight
                result[m] = share
                distributed += share
        return result

    if method == 'exact':
        # 검증: 합계 == amount
        assert sum(exact_amounts.values()) == amount
        return exact_amounts

    raise ValueError(f"Unknown method: {method}")
```

### 4.2 예산 경고 판정 (`services/budget_service.py`)

```python
def check_budget_threshold(
    spent: int,        # S (실지출 합계)
    budget: int,       # B (예산)
    prev_level: str,   # 이전 단계
) -> str | None:
    """
    금액 정수 비교로 임계 단계 판정.
    단계가 상향됐을 때만 알림 type을 반환, 아니면 None.
    """
    if budget <= 0:
        # 예산 미설정: 경고 비활성
        if spent > 0:
            return 'exceeded'  # 예산 0인데 지출 발생 → 즉시 초과
        return None

    # 부동소수 회피: 10*S vs 8*B, 10*B 비교
    ten_s = 10 * spent
    eight_b = 8 * budget
    ten_b = 10 * budget

    if ten_s >= ten_b:
        current = 'critical'
    elif ten_s >= eight_b:
        current = 'warning'
    else:
        current = 'info'

    # 상향 시에만 알림 트리거
    level_order = {'info': 0, 'warning': 1, 'critical': 2}
    if level_order[current] > level_order.get(prev_level, 0):
        return current
    return None
```

### 4.3 정산 알고리즘 (`services/settlement_service.py`)

```python
def calculate_net_balances(
    expenses: list,
    shares: list,
    members: list[str],
) -> dict[str, int]:
    """멤버별 순잔액 계산: net = 결제총액 - 부담총액"""
    paid = {m: 0 for m in members}
    owed = {m: 0 for m in members}

    for exp in expenses:
        if exp.is_settlement_target:
            paid[exp.paid_by_member_id] += exp.amount

    for share in shares:
        if not share.is_settled:
            owed[share.member_id] += share.share_amount

    return {m: paid[m] - owed[m] for m in members}


def calculate_transfers(balances: dict[str, int]) -> list[dict]:
    """그리디 근사로 최소에 가까운 송금 목록 생성"""
    debtors = []   # (member_id, 빚진 금액)
    creditors = [] # (member_id, 받을 금액)

    for m, net in balances.items():
        if net < 0:
            debtors.append([m, -net])
        elif net > 0:
            creditors.append([m, net])

    # 큰 금액 순 정렬
    debtors.sort(key=lambda x: -x[1])
    creditors.sort(key=lambda x: -x[1])

    transfers = []
    di, ci = 0, 0

    while di < len(debtors) and ci < len(creditors):
        transfer_amount = min(debtors[di][1], creditors[ci][1])
        if transfer_amount > 0:
            transfers.append({
                'from_member_id': debtors[di][0],
                'to_member_id': creditors[ci][0],
                'amount': transfer_amount,
            })
        debtors[di][1] -= transfer_amount
        creditors[ci][1] -= transfer_amount
        if debtors[di][1] == 0:
            di += 1
        if creditors[ci][1] == 0:
            ci += 1

    return transfers
```

---

## 5. 외부 데이터 연동 (Provider 추상화)

> **확장성 핵심**: 관광공사 API 하나를 위해 코드를 짜면, 나중에 카카오맵·구글 플레이스·공공데이터포털 다른 API를 추가할 때마다 라우터·서비스가 중복됩니다.
> 그래서 처음부터 **"외부 소스가 무엇이든 동일한 인터페이스로 다루는" Provider 패턴**으로 설계합니다.

### 5.1 설계 원칙

1. 모든 외부 장소 API는 **공통 인터페이스(`PlaceProvider`)** 를 구현한다.
2. 각 API의 응답을 **표준 스키마(`NormalizedPlace`)** 로 변환(normalize)한다.
3. 나머지 코드(라우터·추천 알고리즘)는 개별 API를 몰라도 되고, 표준 스키마만 다룬다.
4. 새 API 추가 = **새 Provider 클래스 1개 추가**로 끝난다 (기존 코드 수정 불필요 = 개방-폐쇄 원칙).

### 5.2 폴더 구조 (providers 추가)

```
app/
├── providers/                    # 외부 데이터 소스 추상화
│   ├── __init__.py
│   ├── base.py                   # PlaceProvider 인터페이스 + NormalizedPlace
│   ├── registry.py               # Provider 등록/조회
│   ├── tour_api.py               # 한국관광공사 구현
│   ├── kakao_local.py            # (향후) 카카오 로컬
│   ├── google_places.py          # (향후) 구글 플레이스
│   └── data_portal.py            # (향후) 공공데이터포털 (맛집/축제 등)
```

### 5.3 공통 인터페이스 (`providers/base.py`)

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class NormalizedPlace:
    """모든 외부 API 응답을 통일하는 표준 장소 스키마."""
    provider: str                  # "tour_api" / "kakao" / "google" ...
    external_id: str               # 원본 API의 고유 ID
    name: str
    latitude: float
    longitude: float
    category: str                  # 통일 카테고리 (아래 CATEGORY_MAP)
    address: Optional[str] = None
    image_url: Optional[str] = None
    rating: Optional[float] = None       # 평점 (있으면)
    price_level: Optional[int] = None    # 가격대 (있으면)
    raw: dict = field(default_factory=dict)  # 원본 응답 보존 (디버깅/확장용)


class PlaceProvider(ABC):
    """외부 장소 데이터 소스가 구현해야 하는 공통 인터페이스."""

    name: str  # provider 식별자

    @abstractmethod
    async def search(
        self, keyword: str, category: Optional[str] = None
    ) -> list[NormalizedPlace]:
        """키워드 검색"""
        ...

    @abstractmethod
    async def nearby(
        self, lat: float, lng: float, radius: int = 2000,
        category: Optional[str] = None,
    ) -> list[NormalizedPlace]:
        """좌표 주변 검색 — 추천 알고리즘의 핵심 입력원"""
        ...

    @abstractmethod
    async def detail(self, external_id: str) -> Optional[NormalizedPlace]:
        """상세 정보"""
        ...
```

### 5.4 관광공사 구현체 (`providers/tour_api.py`)

```python
import httpx
from app.config import settings
from app.providers.base import PlaceProvider, NormalizedPlace

# 관광공사 contentTypeId → 통일 카테고리 매핑
TOUR_CATEGORY_MAP = {
    "12": "sightseeing",  # 관광지
    "14": "sightseeing",  # 문화시설
    "15": "sightseeing",  # 축제/행사
    "28": "sightseeing",  # 레포츠
    "32": "lodging",      # 숙박
    "38": "shopping",     # 쇼핑
    "39": "food",         # 음식점
}

class TourApiProvider(PlaceProvider):
    name = "tour_api"
    BASE = "https://apis.data.go.kr/B551011/KorService1"

    def _common_params(self) -> dict:
        return {
            "serviceKey": settings.TOUR_API_KEY,
            "MobileOS": "ETC",
            "MobileApp": "CostTrip",
            "_type": "json",
        }

    def _normalize(self, item: dict) -> NormalizedPlace:
        return NormalizedPlace(
            provider=self.name,
            external_id=str(item["contentid"]),
            name=item["title"],
            latitude=float(item.get("mapy", 0)),
            longitude=float(item.get("mapx", 0)),
            category=TOUR_CATEGORY_MAP.get(
                str(item.get("contenttypeid", "")), "etc"
            ),
            address=item.get("addr1"),
            image_url=item.get("firstimage") or None,
            raw=item,
        )

    async def search(self, keyword, category=None):
        params = {**self._common_params(), "keyword": keyword,
                  "numOfRows": 20, "pageNo": 1}
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{self.BASE}/searchKeyword1", params=params)
        return self._parse_items(r.json())

    async def nearby(self, lat, lng, radius=2000, category=None):
        params = {**self._common_params(), "mapX": str(lng), "mapY": str(lat),
                  "radius": str(radius), "numOfRows": 30, "pageNo": 1}
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{self.BASE}/locationBasedList1", params=params)
        return self._parse_items(r.json())

    async def detail(self, external_id):
        params = {**self._common_params(), "contentId": external_id,
                  "defaultYN": "Y", "firstImageYN": "Y", "mapinfoYN": "Y"}
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{self.BASE}/detailCommon1", params=params)
        items = self._parse_items(r.json())
        return items[0] if items else None

    def _parse_items(self, data: dict) -> list[NormalizedPlace]:
        try:
            items = data["response"]["body"]["items"]["item"]
        except (KeyError, TypeError):
            return []
        if not isinstance(items, list):
            items = [items]
        return [self._normalize(i) for i in items]
```

### 5.5 Provider 레지스트리 (`providers/registry.py`)

```python
from app.providers.tour_api import TourApiProvider
from app.providers.base import PlaceProvider

# 새 API 추가 시 여기에 클래스만 등록하면 끝
_PROVIDERS: dict[str, PlaceProvider] = {
    "tour_api": TourApiProvider(),
    # "kakao": KakaoLocalProvider(),      # 향후
    # "google": GooglePlacesProvider(),   # 향후
}

def get_provider(name: str) -> PlaceProvider:
    if name not in _PROVIDERS:
        raise ValueError(f"Unknown provider: {name}")
    return _PROVIDERS[name]

def all_providers() -> list[PlaceProvider]:
    return list(_PROVIDERS.values())
```

### 5.6 라우터는 Provider를 모른다 (`routers/places.py`)

```python
@router.get("/api/places/search")
async def search_places(
    q: str,
    provider: str = "tour_api",   # 기본값, 필요 시 전환
    category: str | None = None,
):
    p = get_provider(provider)
    results = await p.search(q, category)
    return [asdict(r) for r in results]


@router.get("/api/places/nearby")
async def nearby_places(
    lat: float, lng: float, radius: int = 2000,
    aggregate: bool = False,   # 여러 API 결과 합치기
):
    if aggregate:
        # 모든 provider 결과를 병렬 호출 후 병합 (5.7 참고)
        results = await aggregate_nearby(lat, lng, radius)
    else:
        results = await get_provider("tour_api").nearby(lat, lng, radius)
    return [asdict(r) for r in results]
```

### 5.7 여러 API 동시 호출 + 병합

```python
import asyncio

async def aggregate_nearby(lat, lng, radius) -> list[NormalizedPlace]:
    """모든 provider를 병렬 호출하고 중복 제거."""
    tasks = [p.nearby(lat, lng, radius) for p in all_providers()]
    results_per_provider = await asyncio.gather(*tasks, return_exceptions=True)

    merged: list[NormalizedPlace] = []
    for res in results_per_provider:
        if isinstance(res, Exception):
            continue  # 한 API 실패해도 나머지는 반환
        merged.extend(res)

    # 이름+좌표 근접 기준 중복 제거 (간단 버전)
    return dedupe_places(merged)
```

> **핵심 이점**: 관광공사만 쓰다가 나중에 카카오·구글을 추가할 때, `providers/`에 클래스 하나 추가하고 registry에 등록만 하면 됩니다. 라우터·추천 알고리즘은 전혀 건드리지 않습니다.

---

## 6. Supabase 설정

### 6.1 환경변수 (`.env`)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
TOUR_API_KEY=your-tour-api-key
JWT_SECRET=your-supabase-jwt-secret
```

### 6.2 Row Level Security (RLS)

Supabase에서 RLS를 활성화하고, 서버 측에서는 `service_role` 키로 접근합니다.

```sql
-- 예시: trips 테이블 RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- 본인이 멤버인 여행만 조회 가능
CREATE POLICY "Users can view their trips" ON trips
  FOR SELECT USING (
    id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid() AND invite_status = 'accepted'
    )
  );
```

### 6.3 Storage (영수증 첨부)

```python
# 영수증 업로드
from supabase import Client

async def upload_receipt(file_bytes: bytes, filename: str):
    bucket = "receipts"
    path = f"{trip_id}/{expense_id}/{filename}"
    result = supabase.storage.from_(bucket).upload(path, file_bytes)
    return result
```

---

## 7. 여행 생성 시 자동 처리 흐름

여행 생성 API가 호출되면 한 트랜잭션 안에서:

```python
@router.post("/api/trips")
async def create_trip(trip_in: TripCreate, user = Depends(get_current_user)):
    # 1. Trip 생성
    trip = Trip(**trip_in.dict(), owner_user_id=user.id)
    db.add(trip)

    # 2. Owner 멤버 자동 등록
    owner_member = TripMember(
        trip_id=trip.id,
        user_id=user.id,
        display_name=user.display_name,
        type='registered',
        role='owner',
        invite_status='accepted',
        joined_at=datetime.utcnow(),
    )
    db.add(owner_member)

    # 3. Day 자동 생성 (startDate ~ endDate)
    delta = (trip.end_date - trip.start_date).days + 1
    for i in range(delta):
        day = Day(
            trip_id=trip.id,
            date=trip.start_date + timedelta(days=i),
            day_index=i + 1,
        )
        db.add(day)

    # 4. 6개 표준 카테고리 시드
    CATEGORIES = [
        ('lodging', '숙소'), ('transport', '교통'),
        ('food', '식비'), ('sightseeing', '관광'),
        ('shopping', '쇼핑'), ('etc', '기타'),
    ]
    for idx, (key, name) in enumerate(CATEGORIES):
        cat = BudgetCategory(
            trip_id=trip.id, key=key, name=name, sort_order=idx
        )
        db.add(cat)

    # 5. 전체 예산 Budget 레코드 생성
    budget = Budget(
        trip_id=trip.id,
        category_id=None,  # 전체 예산
        planned_amount=trip.total_budget_amount,
    )
    db.add(budget)

    await db.commit()
    return trip
```

---

## 8. 지출 추가 시 처리 흐름

```python
@router.post("/api/trips/{trip_id}/expenses")
async def create_expense(trip_id: str, exp_in: ExpenseCreate, ...):
    # 1. Expense 생성
    expense = Expense(**exp_in.dict(), trip_id=trip_id)
    db.add(expense)

    # 2. 분담액 계산 (split_calculator)
    shares = calculate_shares(
        amount=expense.amount,
        members=exp_in.participant_ids,
        method=expense.split_method,
        weights=exp_in.weights,
    )

    # 3. ExpenseShare 생성 (합계 검증)
    assert sum(shares.values()) == expense.amount
    for member_id, share_amount in shares.items():
        es = ExpenseShare(
            expense_id=expense.id,
            member_id=member_id,
            share_amount=share_amount,
        )
        db.add(es)

    # 4. 예산 경고 체크
    total_spent = await get_total_spent(trip_id)
    budget = await get_total_budget(trip_id)
    alert = check_budget_threshold(total_spent, budget, prev_level)
    if alert:
        # 알림 생성
        await create_budget_notification(trip_id, alert, ...)

    await db.commit()
    return expense
```

---

## 9. 초대 흐름 상세

```python
@router.post("/api/trips/{trip_id}/invite")
async def create_invite(trip_id: str, ...):
    """초대 링크/코드 생성"""
    import secrets
    token = secrets.token_urlsafe(32)  # 256bit
    code = secrets.token_hex(3).upper()  # 6자리 코드 "7K9F2A"

    invite = InviteToken(
        trip_id=trip_id,
        token=token,
        code=code,
        expires_at=datetime.utcnow() + timedelta(days=7),
        created_by_member_id=current_member.id,
    )
    db.add(invite)
    await db.commit()

    return {
        "invite_link": f"https://costtrip.app/invite/{token}",
        "invite_code": code,
        "expires_at": invite.expires_at,
    }


@router.post("/api/invite/accept")
async def accept_invite(token: str = None, code: str = None, ...):
    """초대 수락"""
    # 1. 토큰/코드 검증
    invite = await find_valid_invite(token=token, code=code)
    if not invite:
        raise HTTPException(400, "유효하지 않거나 만료된 초대입니다")

    # 2. 이미 멤버인지 확인
    existing = await find_member(invite.trip_id, user.id)
    if existing:
        return {"message": "이미 멤버입니다", "trip_id": invite.trip_id}

    # 3. 멤버 등록
    member = TripMember(
        trip_id=invite.trip_id,
        user_id=user.id,
        display_name=user.display_name,
        role=invite.default_role,
        invite_status='accepted',
        joined_at=datetime.utcnow(),
    )
    db.add(member)

    # 4. 사용 횟수 증가
    invite.used_count += 1

    # 5. 알림 발송
    await create_notification(
        trip_id=invite.trip_id,
        type='invite',
        title=f'{user.display_name}님이 합류했어요',
        ...
    )

    await db.commit()
    return {"trip_id": invite.trip_id}
```

---

## 10. 경로 기반 추천 알고리즘 (확장 기능)

> "여행 경로/일정에 따라 관광명소·음식점을 추천"하는 기능. 처음부터 완벽할 필요는 없고,
> **단계적으로 고도화할 수 있는 구조**로 설계합니다. Provider 추상화(5장) + external_places(2.7.1) + user_preferences(2.7.2)를 기반으로 합니다.

### 10.1 추천 파이프라인 (단계별)

```
1. 후보 수집 (Candidate)   → 일정 좌표 주변 장소를 external_places + Provider에서 수집
2. 필터링 (Filter)         → 예산/카테고리/영업 여부/이미 담긴 장소 제외
3. 점수화 (Scoring)        → 거리·평점·취향·가격대 가중합으로 점수 계산
4. 정렬·다양성 (Rank)      → 점수순 정렬 + 카테고리 편중 방지
5. 반환 (Serve)            → 상위 N개 반환
```

이 5단계를 각각 독립 함수로 두면, 나중에 3단계(점수화)만 ML 모델로 교체하는 식으로 발전시킬 수 있습니다.

### 10.2 추천 서비스 골격 (`services/recommend_service.py`)

```python
from dataclasses import dataclass

@dataclass
class ScoredPlace:
    place: NormalizedPlace
    score: float
    reasons: list[str]   # "가까움", "평점 높음" 등 설명 (UI 노출용)


async def recommend_for_day(
    trip_id: str, day_id: str, user_id: str,
    category: str | None = None, limit: int = 10,
) -> list[ScoredPlace]:
    # 1. 후보 수집: 해당 Day 일정들의 좌표 중심 주변 장소
    anchor = await get_day_route_center(trip_id, day_id)  # 일정 좌표 평균
    candidates = await collect_candidates(anchor.lat, anchor.lng, radius=3000)

    # 2. 필터링
    prefs = await get_user_preferences(user_id)
    already = await get_planned_place_ids(trip_id)
    candidates = [
        c for c in candidates
        if c.external_id not in already
        and c.category not in prefs.avoid_categories
        and (category is None or c.category == category)
    ]

    # 3. 점수화 (규칙 기반 v1 — 나중에 ML로 교체 가능)
    scored = [score_place(c, anchor, prefs) for c in candidates]

    # 4. 정렬 + 카테고리 다양성 보정
    scored.sort(key=lambda s: s.score, reverse=True)
    scored = ensure_diversity(scored)

    return scored[:limit]


def score_place(place, anchor, prefs) -> ScoredPlace:
    """규칙 기반 점수 (가중합). 각 항목은 0~1로 정규화."""
    reasons = []

    # 거리 점수 (가까울수록 높음)
    dist_km = haversine(anchor.lat, anchor.lng, place.latitude, place.longitude)
    dist_score = max(0, 1 - dist_km / 5)  # 5km 밖이면 0
    if dist_km < 1:
        reasons.append("도보 거리")

    # 평점 점수
    rating_score = (place.rating or 3.0) / 5.0
    if place.rating and place.rating >= 4.3:
        reasons.append("평점 높음")

    # 취향 점수
    pref_score = prefs.category_weights.get(place.category, 0.5)
    if pref_score >= 0.7:
        reasons.append("선호 카테고리")

    # 가격 적합도
    price_score = 1.0
    if place.price_level:
        price_score = 1 - abs(place.price_level - prefs.price_sensitivity) / 4

    # 가중합 (가중치는 튜닝 가능한 설정값)
    W = {"dist": 0.35, "rating": 0.25, "pref": 0.30, "price": 0.10}
    total = (
        W["dist"] * dist_score + W["rating"] * rating_score
        + W["pref"] * pref_score + W["price"] * price_score
    )
    return ScoredPlace(place=place, score=round(total, 4), reasons=reasons)
```

### 10.3 API

| Method | Path                                                 | 설명                                |
| ------ | ---------------------------------------------------- | ----------------------------------- |
| GET    | `/api/trips/{trip_id}/days/{day_id}/recommendations` | 해당 날짜 경로 기반 추천            |
| GET    | `/api/trips/{trip_id}/recommendations?category=food` | 여행 전체 기준 음식점 추천          |
| POST   | `/api/recommendations/feedback`                      | 추천 수락/거절 피드백 (취향 학습용) |

### 10.4 발전 로드맵 (알고리즘 고도화)

| 단계     | 방식                                                | 비고                   |
| -------- | --------------------------------------------------- | ---------------------- |
| v1 (MVP) | **규칙 기반 가중합** (위 코드)                      | 빠르게 동작, 설명 가능 |
| v2       | 사용자 피드백으로 `category_weights` 학습           | 수락/거절 로그 누적    |
| v3       | 협업 필터링 (비슷한 여행자가 좋아한 곳)             | 데이터 축적 후         |
| v4       | 경로 최적화 (TSP 근사) — 이동 동선 최소화 순서 추천 | 별도 모듈              |

> **핵심**: `score_place()` 함수만 교체하면 v1→v4로 진화합니다. 파이프라인 구조는 그대로 유지됩니다.

---

## 11. 확장성 · 성능 설계

### 11.1 외부 API 캐싱 전략

외부 API를 매번 실시간 호출하면 느리고, 호출 제한(rate limit)에 걸립니다.

| 데이터              | 캐싱 방식                                 | TTL    |
| ------------------- | ----------------------------------------- | ------ |
| 장소 검색/주변 결과 | `external_places` 테이블에 저장 후 재사용 | 7~30일 |
| 장소 상세           | `external_places.raw_data`                | 30일   |
| 추천 결과           | Redis (선택) 또는 메모리 캐시             | 1시간  |

```python
async def collect_candidates(lat, lng, radius):
    # 1. DB 캐시 먼저 조회 (최근 것)
    cached = await query_external_places_nearby(lat, lng, radius)
    if cached and not is_stale(cached):
        return cached

    # 2. 없으면 Provider 호출 후 캐시에 저장
    fresh = await aggregate_nearby(lat, lng, radius)
    await upsert_external_places(fresh)
    return fresh
```

### 11.2 비동기 / 백그라운드 처리

무거운 작업(여러 API 호출, 추천 계산, 알림 발송)은 요청을 막지 않게 처리합니다.

- **간단한 병렬화**: `asyncio.gather()` (5.7 참고) — API 여러 개 동시 호출
- **백그라운드 작업**: FastAPI `BackgroundTasks` — 알림 발송, 캐시 갱신
- **본격 확장 시**: Celery + Redis 또는 Supabase Edge Functions로 분리

```python
from fastapi import BackgroundTasks

@router.post("/api/trips/{trip_id}/expenses")
async def create_expense(..., background: BackgroundTasks):
    # ... 지출 저장 ...
    # 알림 발송은 백그라운드로 (응답 지연 방지)
    background.add_task(send_budget_notifications, trip_id, alert)
    return expense
```

### 11.3 API 버저닝

기능이 늘고 앱이 배포되면 API 변경이 기존 앱을 깨뜨릴 수 있습니다. 처음부터 버전 prefix를 둡니다.

```python
# main.py
app.include_router(trips_router, prefix="/api/v1")
# 향후 호환 안 되는 변경은 /api/v2로
```

### 11.4 설정 기반 튜닝 (매직 넘버 제거)

추천 가중치·임계값·TTL 등을 코드에 박지 않고 설정으로 뺍니다.

```python
# app/config.py
class Settings(BaseSettings):
    # 추천 가중치
    RECO_WEIGHT_DIST: float = 0.35
    RECO_WEIGHT_RATING: float = 0.25
    RECO_WEIGHT_PREF: float = 0.30
    RECO_WEIGHT_PRICE: float = 0.10
    # 캐시
    EXTERNAL_PLACE_TTL_DAYS: int = 7
    # 예산 경고 임계
    BUDGET_WARNING_PERCENT: int = 80
```

### 11.5 확장성 체크리스트 요약

| 관심사               | 현재 설계의 대응                               |
| -------------------- | ---------------------------------------------- |
| 새 외부 API 추가     | Provider 클래스 1개 추가 + registry 등록 (5장) |
| 추천 알고리즘 고도화 | `score_place()` 교체, 파이프라인 유지 (10장)   |
| 새 기능 추가         | 라우터/서비스/모델 분리 구조로 독립 추가       |
| 트래픽 증가          | 캐싱 → 비동기 → Celery/Redis 단계적 확장       |
| API 호환성           | `/api/v1` 버저닝                               |
| 지리 검색 성능       | PostGIS + GiST 인덱스 (12장)                   |

---

## 12. PostGIS 지리 검색 (선택, 추천 성능용)

주변 장소 검색이 많아지면 위경도 부등호 비교보다 PostGIS가 훨씬 빠르고 정확합니다.

```sql
-- Supabase SQL 에디터에서 확장 활성화
CREATE EXTENSION IF NOT EXISTS postgis;

-- external_places에 geography 컬럼 추가
ALTER TABLE external_places ADD COLUMN geo geography(Point, 4326);
UPDATE external_places SET geo = ST_MakePoint(longitude, latitude)::geography;
CREATE INDEX idx_external_places_gist ON external_places USING GIST(geo);

-- 반경 3km 내 음식점 조회 (빠름)
SELECT *, ST_Distance(geo, ST_MakePoint(:lng, :lat)::geography) AS distance
FROM external_places
WHERE category = 'food'
  AND ST_DWithin(geo, ST_MakePoint(:lng, :lat)::geography, 3000)
ORDER BY distance
LIMIT 10;
```

---

## 13. 시작하기 (로컬 개발 세팅)

```bash
# 1. 가상환경
python -m venv venv
source venv/Scripts/activate  # Windows

# 2. 패키지 설치
pip install fastapi uvicorn supabase sqlalchemy alembic httpx python-dotenv pydantic

# 3. .env 파일 생성 (위 6.1 참고)

# 4. DB 마이그레이션
alembic init alembic
alembic revision --autogenerate -m "initial"
alembic upgrade head

# 5. 서버 실행
uvicorn main:app --reload --port 8000
```

### requirements.txt

```
fastapi==0.115.0
uvicorn==0.30.0
supabase==2.7.0
sqlalchemy==2.0.30
alembic==1.13.0
httpx==0.27.0
python-dotenv==1.0.1
pydantic==2.8.0
python-jose[cryptography]==3.3.0
```

---

## 14. 핵심 체크리스트

구현 순서 추천:

1. [ ] Supabase 프로젝트 생성 + Auth 설정 (Google/Kakao)
2. [ ] DB 테이블 생성 (위 SQL 실행)
3. [ ] FastAPI 기본 셋업 + 인증 미들웨어
4. [ ] Trip CRUD + 자동 Day/카테고리 생성
5. [ ] Member CRUD + 초대 링크/코드
6. [ ] PlanItem CRUD
7. [ ] Budget 저장/조회
8. [ ] Expense 추가 + 분담 계산 + 예산 경고
9. [ ] Settlement 정산 알고리즘
10. [ ] Notification 목록/읽음
11. [ ] Provider 추상화 + 관광공사 구현 (5장)
12. [ ] Storage (영수증 업로드)
13. [ ] 프론트엔드 연결 테스트

**확장 단계 (MVP 이후):**

14. [ ] external_places 캐싱 + PostGIS 지리 검색
15. [ ] user_preferences + 추천 알고리즘 v1 (규칙 기반)
16. [ ] 추가 Provider 연동 (카카오/구글/공공데이터포털)
17. [ ] 추천 피드백 수집 → 취향 학습 (v2)
18. [ ] 비동기/캐싱 최적화 (Redis, BackgroundTasks)
