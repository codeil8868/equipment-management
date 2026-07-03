-- ============================================================================
--  시설·장비 관리 대시보드 — Supabase(Postgres) 스키마
--  · 시트 15개 → 테이블/뷰로 이관 (PC_가동현황은 미사용이라 제외)
--  · 실행: Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
--  · 컬럼은 영문 snake_case(유지보수), 한글 설명은 주석
-- ============================================================================

-- ---------- 담당자 (담당자_마스터) ----------
create table if not exists staff (
  id           bigint generated always as identity primary key,
  name         text not null,                 -- 이름
  email        text unique,                    -- 로그인 이메일(선택)
  role         text not null default 'staff',  -- 'admin' | 'staff'
  created_at   timestamptz not null default now()
);

-- ---------- 시설 (시설_마스터) ----------
create table if not exists facilities (
  id                 bigint generated always as identity primary key,
  mgmt_no            text unique not null,      -- 관리번호
  category           text,                       -- 구분(시설/안전시설)
  name               text not null,              -- 시설명
  class              text,                       -- 분류
  spec               text,                       -- 세부사양
  location           text,                       -- 위치
  installed_on       date,                       -- 설치일
  manager_primary    text,                       -- 담당자(정)
  manager_secondary  text,                       -- 담당자(부)
  note               text,                       -- 비고
  photo_url          text,                       -- 사진(URL)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- 장비 (장비_마스터) ----------
create table if not exists equipment (
  id                 bigint generated always as identity primary key,
  asset_no           text unique not null,      -- 자산번호
  name               text not null,              -- 장비명
  class              text,                       -- 분류
  spec               text,                       -- 세부사양
  qty                integer default 0,          -- 수량
  location           text,                       -- 설치위치
  acquired_on        date,                       -- 취득일
  manager_primary    text,                       -- 담당자(정)
  manager_secondary  text,                       -- 담당자(부)
  note               text,
  photo_url          text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- 점검·이력 (점검이력) ★ 가장 큰 테이블 ----------
create table if not exists inspection_log (
  id                 bigint generated always as identity primary key,
  inspected_on       date not null,              -- 점검일
  history_type       text not null default '점검',-- 이력구분(점검/정비/구입/폐기/이전/사양변경/기타)
  inspection_type    text,                       -- 점검유형(상시/월간/연간)
  target             text,                       -- 점검대상
  facility_name      text,                       -- 시설명
  asset_no           text,                       -- 자산번호(장비 이력이면)
  item               text,                       -- 점검항목/내용
  manager_primary    text,                       -- 담당자(정)
  manager_secondary  text,                       -- 담당자(부)
  cost               numeric default 0,          -- 비용(원)
  result             text,                       -- 결과
  action             text,                       -- 조치내용
  created_at         timestamptz not null default now()
);
create index if not exists idx_inspection_date   on inspection_log (inspected_on desc);
create index if not exists idx_inspection_asset  on inspection_log (asset_no);
create index if not exists idx_inspection_fac    on inspection_log (facility_name);

-- ---------- 시설 정비이력 (시설_정비이력) ----------
create table if not exists facility_repairs (
  id            bigint generated always as identity primary key,
  repaired_on   date,                            -- 정비일자
  mgmt_no       text,                            -- 관리번호
  facility_name text,                            -- 시설명
  repair_type   text,                            -- 정비구분
  content       text,                            -- 정비내용
  cost          numeric default 0,               -- 비용(원)
  vendor        text,                            -- 정비업체
  manager       text,                            -- 담당자
  result        text,                            -- 결과
  note          text
);
create index if not exists idx_fcrepair_mgmt on facility_repairs (mgmt_no);

-- ---------- 소모품 마스터 (소모품_마스터) ----------
create table if not exists supplies_master (
  id            bigint generated always as identity primary key,
  item_name     text unique not null,            -- 품목명
  unit          text,                            -- 단위
  opening_stock numeric default 0,               -- 기초재고
  base_date     date,                            -- 기초재고기준일(빈값=모든 거래 합산)
  reorder_level numeric default 0,               -- 기준재고
  manager       text,                            -- 담당자
  active        boolean default true             -- 활성여부('활성'→true)
);

-- ---------- 소모품 입출고 (소모품_입출고) ----------
create table if not exists supplies_txn (
  id         bigint generated always as identity primary key,
  txn_date   date not null,                      -- 일자
  item_name  text not null,                      -- 품목명
  txn_type   text not null,                      -- 구분(입고/출고)
  qty        numeric not null,                   -- 수량
  reason     text,                               -- 사유
  manager    text,                               -- 담당자
  created_at timestamptz not null default now()
);
create index if not exists idx_supptxn_item on supplies_txn (item_name);
create index if not exists idx_supptxn_date on supplies_txn (txn_date);

-- ---------- 연도별 예산 (연도별_예산) ----------
create table if not exists budget (
  id            bigint generated always as identity primary key,
  year          integer not null,                -- 연도
  category      text not null,                   -- 구분(훈련장비.../훈련시설.../소모품 기타)
  annual_budget numeric default 0,               -- 연간예산
  unique (year, category)
);

-- ---------- 예산 사용기록 (예산사용기록) ----------
create table if not exists budget_usage (
  id         bigint generated always as identity primary key,
  spent_on   date,                               -- 집행일
  year       integer,                            -- 연도
  category   text,                               -- 구분
  item       text,                               -- 항목명
  target     text,                               -- 대상
  amount     numeric default 0,                  -- 집행금액(원)
  status     text default '완료',                -- 상태(완료/예정/진행중 등)
  manager    text,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists idx_budgetusage_year on budget_usage (year, category);

-- ---------- 소프트웨어 마스터 (소프트웨어_마스터) ----------
create table if not exists software_master (
  id                bigint generated always as identity primary key,
  name              text not null,               -- 소프트웨어명
  category          text,                        -- 구분
  license_type      text,                        -- 라이선스유형
  owned_qty         integer default 0,           -- 보유수량
  installed_qty     integer default 0,           -- 설치수량
  renew_on          date,                        -- 갱신일
  manager_primary   text,
  manager_secondary text,
  note              text
);

-- ---------- 소프트웨어 설치현황 (소프트웨어_설치현황) ----------
create table if not exists software_install (
  id           bigint generated always as identity primary key,
  name         text not null,                    -- 소프트웨어명
  location     text,                             -- 설치위치
  qty          integer default 0,                -- 설치수량
  note         text
);

-- ---------- 소프트웨어 갱신이력 (소프트웨어_갱신이력) ----------
create table if not exists software_renew (
  id                bigint generated always as identity primary key,
  name              text not null,               -- 소프트웨어명
  renewed_on        date,                         -- 갱신일자
  renew_type        text,                         -- 갱신구분
  content           text,                         -- 내용
  manager_primary   text,
  manager_secondary text,
  note              text
);

-- ---------- 대여 관리 (대여_관리) ----------
create table if not exists rental (
  id           bigint generated always as identity primary key,
  rent_date    date not null,                    -- 대여일
  item_name    text not null,                    -- 장비명
  qty          integer default 1,                -- 수량
  renter       text,                             -- 대여자
  dept         text,                             -- 소속
  contact      text,                             -- 연락처
  due_date     date,                             -- 반납예정일
  return_date  date,                             -- 반납일(빈값=대여중)
  status       text default '대여중',            -- 상태
  note         text,
  created_at   timestamptz not null default now()
);

-- ---------- 대여장비 마스터 (대여장비_마스터) ----------
create table if not exists rental_master (
  id         bigint generated always as identity primary key,
  item_name  text unique not null,               -- 장비명
  class      text,                               -- 분류
  owned_qty  integer default 0,                  -- 보유수량
  manager    text,
  note       text
);

-- ============================================================================
--  집계 뷰 (현 GAS 로직 이식)
-- ============================================================================

-- 소모품 현재고 = 기초재고 + (기준일 이후 입고) − (기준일 이후 출고)
create or replace view v_supplies_status as
with txn as (
  select m.item_name,
         sum(case when t.txn_type='입고' then t.qty else 0 end) as in_qty,
         sum(case when t.txn_type='출고' then t.qty else 0 end) as out_qty,
         max(t.txn_date) as last_date
  from supplies_master m
  left join supplies_txn t
    on t.item_name = m.item_name
   and (m.base_date is null or t.txn_date >= m.base_date)
  group by m.item_name
)
select m.item_name, m.unit, m.opening_stock, m.base_date, m.reorder_level, m.manager,
       coalesce(x.in_qty,0)  as in_total,
       coalesce(x.out_qty,0) as out_total,
       (m.opening_stock + coalesce(x.in_qty,0) - coalesce(x.out_qty,0)) as current_stock,
       case
         when (m.opening_stock + coalesce(x.in_qty,0) - coalesce(x.out_qty,0)) <= 0 then '결품'
         when (m.opening_stock + coalesce(x.in_qty,0) - coalesce(x.out_qty,0)) <  m.reorder_level then '부족'
         else '충분'
       end as status,
       x.last_date
from supplies_master m
left join txn x on x.item_name = m.item_name
where m.active = true;

-- 예산 집계(연도·구분별 집행액/집행률) — 예정/진행중 제외
create or replace view v_budget_summary as
select b.year, b.category, b.annual_budget,
       coalesce(u.spent,0) as spent,
       (b.annual_budget - coalesce(u.spent,0)) as remaining,
       case when b.annual_budget > 0
            then round(coalesce(u.spent,0) / b.annual_budget * 100, 1) else 0 end as rate
from budget b
left join (
  select year, category, sum(amount) as spent
  from budget_usage
  where coalesce(status,'') not in ('예정','진행중')
  group by year, category
) u on u.year = b.year and u.category = b.category;

-- 대여 가능수량 = 보유 − 대여중
create or replace view v_rental_availability as
select rm.item_name, rm.class, rm.owned_qty,
       coalesce(r.rented,0) as rented,
       greatest(0, rm.owned_qty - coalesce(r.rented,0)) as available
from rental_master rm
left join (
  select item_name, sum(qty) as rented
  from rental
  where return_date is null and coalesce(status,'') <> '반납완료'
  group by item_name
) r on r.item_name = rm.item_name;

-- ============================================================================
--  RLS(행 수준 보안) — 로그인 사용자만 접근 (초기 정책: 인증=전체 허용)
--  ※ 이후 역할별(admin/staff)로 세분화 가능
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'staff','facilities','equipment','inspection_log','facility_repairs',
    'supplies_master','supplies_txn','budget','budget_usage',
    'software_master','software_install','software_renew','rental','rental_master'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists p_auth_all on %I;', t);
    execute format($f$create policy p_auth_all on %I
      for all to authenticated using (true) with check (true);$f$, t);
  end loop;
end $$;
