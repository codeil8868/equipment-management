-- ============================================================
--  Phase 4 보안 잠금 — 익명(비로그인) 접근 완전 차단.
--  실행 후에는 "로그인한 사용자"만 데이터를 읽고 쓸 수 있습니다.
--  (개발 중 열어둔 dev_open_read.sql 의 익명 읽기를 되돌립니다.)
-- ============================================================

-- 1) 테이블: 익명 읽기 정책(p_anon_read) 제거 → 익명은 RLS에 막혀 아무것도 못 읽음
do $$
declare t text;
begin
  foreach t in array array[
    'staff','facilities','equipment','inspection_log','facility_repairs',
    'supplies_master','supplies_txn','budget','budget_usage',
    'software_master','software_install','software_renew','rental','rental_master'
  ] loop
    execute format('drop policy if exists p_anon_read on %I;', t);
  end loop;
end $$;

-- 2) 집계 뷰: 로그인 사용자 권한 보장 후 익명 권한 회수
--    → 뷰의 UNRESTRICTED(익명 접근 가능) 상태 해소, 로그인 사용자는 계속 조회 가능
grant  select on v_supplies_status, v_budget_summary, v_rental_availability to authenticated;
revoke select on v_supplies_status   from anon;
revoke select on v_budget_summary    from anon;
revoke select on v_rental_availability from anon;
