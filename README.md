# 시설·장비 대시보드 재구축 (Supabase + Next.js)

확정 스택: **Supabase(신규 전용 프로젝트) + Next.js/React + Vercel**
전체 계획: `../재구축_계획_Supabase.md`

---

## Phase 0 — 셋업 체크리스트

### ▶ 사장님이 하실 일 (제가 못 하는 부분)

1. **Supabase 새 프로젝트 생성**
   - https://supabase.com 로그인 → **New project**
   - 이름 예: `equipment-dashboard`
   - Region: `Northeast Asia (Seoul)` 권장
   - Database Password 설정(안전히 보관)

2. **스키마 생성**
   - 프로젝트 → 좌측 **SQL Editor** → `schema.sql` 내용 전체 붙여넣기 → **Run**
   - 좌측 **Table Editor**에서 테이블 14개 + 뷰 3개 생성 확인

3. **접속 정보 공유** (프로젝트 → Settings → API)
   - `Project URL`
   - `anon public` 키
   - ⚠️ `service_role` 키는 데이터 이관 때만 필요 — 요청 시 안전하게 전달

4. **로그인 계정** (Authentication → Users → Add user)
   - 담당자 이메일로 계정 생성(또는 이메일 초대)

### ▶ 제가 할 일

- [x] DB 스키마 SQL 작성 (`schema.sql`) + Supabase에 적용
- [x] Next.js 프로젝트 뼈대 생성 (`web/`, Supabase 클라이언트 연결) — 빌드·연결 검증 완료
- [x] 현 스프레드시트 데이터 → INSERT SQL 변환(이관) — `migration.sql`, 실행·검증 완료(GAS와 숫자 일치)
- [x] 대시보드 화면(카드) 실제 데이터로 재현 — 소모품·대여·예산·점검이력·자산 전부 표시(검증됨)
- [x] 로그인(Supabase Auth) 도입 — 세션 게이트
- [x] 입력 기능: 소모품 입출고·대여·반납·점검 이력·예산 집행 (Phase 2 완성)
- [x] 상세 목록 "전체 보기"(검색) — 소모품/대여/점검/예산/장비/시설/소프트웨어
- [x] 월간 점검 보고서(/report, A4 인쇄·결재란 담당/원장) — 검증 완료
- [x] 보안 잠금(anon 차단) — 로그인 전용 (lockdown.sql)
- [x] **Vercel 배포 완료 → https://web-seven-delta-27.vercel.app**

## 재배포 (코드 수정 후)
```
vercel --prod --yes --cwd C:\equipment\supabase-rebuild\web
```
(PATH에 node 없으면: `$env:PATH='C:\Program Files\nodejs;'+$env:APPDATA+'\npm;'+$env:PATH`)
- [ ] 입력 폼 · 상세 · 보고서 이식 (Phase 2~3)
- [ ] 로그인/RLS 마감, 배포(Vercel)

---

## 로컬에서 보는 법

```
cd supabase-rebuild/web
npm run dev
```
→ 브라우저에서 http://localhost:3000

## 진행 상태

- **현재 위치**: Phase 1 진입. 스키마·앱·연결 완료(화면에 "Supabase 연결 정상" 표시 확인).
- 다음: 데이터 이관(service_role 키 필요 — 요청 예정).
- 현 GAS 대시보드(v17.42)는 전환 완료까지 **그대로 사용**.
