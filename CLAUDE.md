# 시설장비관리 시스템 — 작업 규칙 (CLAUDE.md)

인천구월그린컴퓨터아트학원 시설장비관리 웹앱. **Supabase(Postgres) + Next.js(App Router) + Vercel**.
저장소 루트 = `supabase-rebuild/`, 앱 = `web/`(Vercel Root Directory = `web`).

## 작업 준수사항 (필수)
1. **브랜치 우선**: 모든 작업은 별도 브랜치(`feature/*`·`fix/*`)에서. 빌드·검증 후 만족 시에만 `main`에 병합. **main 직행 금지**(저위험 변경 포함).
2. **커밋 전 빌드 통과**: `npm --prefix web run build` (TypeScript+lint) 통과 확인 후 커밋.
3. **배포 = git push**: `main`에 push하면 Vercel이 자동 배포. **수동 `vercel --prod` CLI 지양**(과거 PowerShell 파이프 BOM 사고 원인).
4. **코드 변경 안내**: 변경/추가 위치를 파일·함수 단위로 상세히 안내.

## 비밀·개인정보
- **커밋 금지**: `web/.env.local`(anon 키·OIDC 토큰), `migration.sql`·`gas_all.json`(대여자 연락처 등 PII), `service_role` 키. → `.gitignore`로 제외됨.
- Supabase **URL·anon(publishable) 키는 공개값** → `web/src/lib/supabaseClient.ts`에 폴백 하드코딩(배포 env 불필요). `service_role`은 절대 소스/깃에 넣지 말 것.

## DB 마이그레이션
- 스키마/정책 변경은 `*.sql` 파일로 저장 후 **Supabase SQL Editor에서 1회 적용**, "적용 완료·재실행 금지" 기록.
- 현재 파일: `schema.sql`(테이블·뷰·RLS) / `dev_open_read.sql`(개발용 익명읽기, **`lockdown.sql`로 폐기됨**) / `lockdown.sql`(익명 차단, 적용됨). `migration.sql`은 1회 데이터 이관(PII, untracked).

## 배포/운영 메모
- 정식 URL: https://web-seven-delta-27.vercel.app (Vercel 프로젝트 `greenartgu/web`).
- 인증: Supabase Auth 이메일 로그인. 계정은 Supabase → Authentication → Users(Add user, Auto Confirm).
- 보안: 로그인 사용자만 데이터 접근(RLS `p_auth_all` authenticated 전용, 뷰는 anon revoke).
- 상세 개발 이력은 Claude Code 자동메모리(`.claude/.../memory/`) 참조.
