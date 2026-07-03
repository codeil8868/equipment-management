-- [임시/개발용] 익명(anon) 읽기 허용 — 로그인 도입 전까지 대시보드 조회용.
-- ⚠️ Phase 4(로그인/RLS 마감)에서 이 정책들을 제거하고 authenticated 전용으로 잠급니다.
do $$
declare t text;
begin
  foreach t in array array[
    'staff','facilities','equipment','inspection_log','facility_repairs',
    'supplies_master','supplies_txn','budget','budget_usage',
    'software_master','software_install','software_renew','rental','rental_master'
  ] loop
    execute format('drop policy if exists p_anon_read on %I;', t);
    execute format('create policy p_anon_read on %I for select to anon using (true);', t);
  end loop;
end $$;
