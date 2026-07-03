'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import Login from '@/components/Login';
import { SupplyTxnButton, RentalButton, ReturnButton, InspectionButton, BudgetButton } from '@/components/InputForms';
import { DetailLink } from '@/components/DetailModal';
import type {
  SupplyStatus, RentalAvail, BudgetSummary, Inspection, Equipment, Facility, Software,
} from '@/lib/types';

const ORG_NAME = '인천구월그린컴퓨터아트학원';
const BUDGET_ORDER = ['훈련장비 유지보수 및 교체', '훈련시설 및 안전시설 유지관리', '소모품 기타'];

// 로그인 게이트: 세션 없으면 로그인 화면, 있으면 대시보드
export default function Page() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="p-8 text-sm text-slate-500">불러오는 중…</div>;
  if (!session) return <Login />;
  return <Dashboard email={session.user.email ?? ''} />;
}

function Dashboard({ email }: { email: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [supplies, setSupplies] = useState<SupplyStatus[]>([]);
  const [rentals, setRentals] = useState<RentalAvail[]>([]);
  const [budget, setBudget] = useState<BudgetSummary[]>([]);
  const [inspection, setInspection] = useState<Inspection[]>([]);
  const [inspTotal, setInspTotal] = useState(0);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [software, setSoftware] = useState<Software[]>([]);
  const [staff, setStaff] = useState<string[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [tab, setTab] = useState<string>('all');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any = await Promise.all([
        supabase.from('v_supplies_status').select('*'),
        supabase.from('v_rental_availability').select('*'),
        supabase.from('v_budget_summary').select('*'),
        supabase.from('inspection_log').select('*').order('inspected_on', { ascending: false }).limit(300),
        supabase.from('inspection_log').select('*', { count: 'exact', head: true }),
        supabase.from('equipment').select('asset_no,name,qty'),
        supabase.from('facilities').select('mgmt_no,category,name'),
        supabase.from('software_master').select('name,owned_qty,installed_qty'),
        supabase.from('staff').select('name'),
      ]);
      const [sup2, ren2, bud2, insp2, inspCnt2, eq2, fac2, sw2, st2] = results;
      const firstErr = results.find((r: { error: unknown }) => r.error)?.error;
      if (firstErr) throw firstErr;
      setSupplies((sup2.data as SupplyStatus[]) ?? []);
      setRentals((ren2.data as RentalAvail[]) ?? []);
      setBudget((bud2.data as BudgetSummary[]) ?? []);
      setInspection((insp2.data as Inspection[]) ?? []);
      setInspTotal(inspCnt2.count ?? 0);
      setEquipment((eq2.data as Equipment[]) ?? []);
      setFacilities((fac2.data as Facility[]) ?? []);
      setSoftware((sw2.data as Software[]) ?? []);
      setStaff(((st2.data as { name: string }[]) ?? []).map((s) => s.name).filter(Boolean));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const years = useMemo(() => {
    const ys = Array.from(new Set(budget.map((b) => b.year))).sort((a, b) => b - a);
    return ys.length ? ys : [year];
  }, [budget, year]);

  const inspFiltered = useMemo(
    () => (tab === 'all' ? inspection : inspection.filter((r) => r.inspection_type === tab)),
    [inspection, tab],
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs text-slate-500">{ORG_NAME}</div>
            <h1 className="mt-0.5 text-xl font-bold">🏢 시설장비관리</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <a href="/report" target="_blank" className="rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-50">📄 월간 보고서</a>
            <button onClick={load} className="rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-50">🔄 새로고침</button>
            <span className="hidden text-xs text-slate-500 sm:inline">{email}</span>
            <button onClick={() => supabase.auth.signOut()} className="rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-50">로그아웃</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {err && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">오류: {err}</div>}
        {loading && <div className="mb-4 text-sm text-slate-500">불러오는 중…</div>}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SuppliesCard rows={supplies} action={
            <div className="flex items-center gap-2">
              <DetailLink configKey="supplies" onChange={load} />
              <SupplyTxnButton items={supplies.map((s) => ({ item_name: s.item_name, current_stock: s.current_stock }))} staff={staff} onDone={load} />
            </div>
          } />
          <RentalCard rows={rentals} action={
            <div className="flex items-center gap-2">
              <DetailLink configKey="rental" onChange={load} />
              <DetailLink configKey="rentalMaster" label="보유수량" onChange={load} />
              <RentalButton items={rentals.map((r) => ({ item_name: r.item_name, available: r.available }))} onDone={load} />
              <ReturnButton onDone={load} />
            </div>
          } />
        </div>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">📋 점검 및 관리 이력</h2>
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{inspFiltered.length} / {inspTotal}건</span>
              <DetailLink configKey="inspection" onChange={load} />
              <InspectionButton staff={staff} facilities={facilities.map((f) => f.name)} equipment={equipment.map((e) => ({ asset_no: e.asset_no, name: e.name }))} onDone={load} />
            </div>
          </div>
          <div className="mb-3 flex gap-1">
            {['all', '상시', '월간', '연간'].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded px-3 py-1 text-xs ${tab === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {t === 'all' ? '전체' : t}
              </button>
            ))}
          </div>
          <Table
            head={['일자', '구분', '유형', '대상/시설', '자산번호', '내용', '담당자', '결과']}
            rows={inspFiltered.slice(0, 10).map((r) => [
              r.inspected_on, r.history_type ?? '점검', r.inspection_type ?? '-',
              r.target && r.target !== '-' ? r.target : (r.facility_name ?? '-'),
              r.asset_no ?? '-', r.item ?? '-', r.manager_primary ?? '-', r.result ?? '-',
            ])}
          />
        </section>

        <div className="mt-6 mb-2 flex items-center justify-between">
          <h2 className="font-semibold">💰 예산·사용기록</h2>
          <DetailLink configKey="budget" onChange={load} />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {BUDGET_ORDER.map((cat) => {
            const b = budget.find((x) => x.year === year && x.category === cat);
            return <BudgetCard key={cat} category={cat} data={b} action={<BudgetButton category={cat} staff={staff} onDone={load} />} />;
          })}
        </div>

        <div className="mt-6 mb-2 font-semibold">🗂️ 자산 관리</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AssetCard title="💻 장비" main={`${equipment.reduce((s, e) => s + (e.qty ?? 0), 0)}대`} sub={`항목 ${equipment.length}개`} link={<DetailLink configKey="equipment" onChange={load} />} />
          <AssetCard title="🏢 시설·안전시설" main={`${facilities.length}개`}
            sub={`안전시설 ${facilities.filter((f) => f.category === '안전시설').length} · 시설 ${facilities.filter((f) => f.category !== '안전시설').length}`}
            link={<DetailLink configKey="facilities" onChange={load} />} />
          <AssetCard title="💿 소프트웨어" main={`${software.length}종`}
            sub={`보유 ${software.reduce((s, x) => s + (x.owned_qty ?? 0), 0)} · 설치 ${software.reduce((s, x) => s + (x.installed_qty ?? 0), 0)}`}
            link={<DetailLink configKey="software" onChange={load} />} />
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Supabase 실시간 조회 · 로그인 사용자 전용. (입력·상세·보고서는 다음 단계)
        </p>
      </div>
    </main>
  );
}

function statusColor(s: string) {
  if (s === '결품') return 'text-red-600';
  if (s === '부족') return 'text-amber-600';
  return 'text-emerald-600';
}

function SuppliesCard({ rows, action }: { rows: SupplyStatus[]; action?: React.ReactNode }) {
  const lacking = rows.filter((r) => r.status === '부족' || r.status === '결품').length;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">📦 소모품 현황</h2>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs ${lacking ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {lacking ? `부족 ${lacking}종` : '정상'}
          </span>
          {action}
        </div>
      </div>
      <Table
        head={['품목', '현재고', '기준', '상태']}
        rows={rows.map((r) => [
          r.item_name, `${r.current_stock}${r.unit ?? ''}`, `${r.reorder_level}${r.unit ?? ''}`,
          <span key="s" className={statusColor(r.status)}>● {r.status}</span>,
        ])}
      />
    </section>
  );
}

function RentalCard({ rows, action }: { rows: RentalAvail[]; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">🎒 대여장비 관리 현황</h2>
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{rows.length}종</span>
          {action}
        </div>
      </div>
      <Table
        head={['장비명', '보유', '대여중', '가능']}
        rows={rows.map((r) => [
          r.item_name, `${r.owned_qty}`, `${r.rented}`,
          <span key="a" className={r.available > 0 ? 'font-semibold text-emerald-600' : 'text-red-600'}>{r.available}</span>,
        ])}
      />
    </section>
  );
}

function BudgetCard({ category, data, action }: { category: string; data?: BudgetSummary; action?: React.ReactNode }) {
  const rate = data?.rate ?? 0;
  const barColor = rate >= 90 ? 'bg-red-500' : rate >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold">{category}</div>
        {action}
      </div>
      <div className="mt-2 text-2xl font-bold">{(data?.spent ?? 0).toLocaleString()}<span className="text-sm font-normal text-slate-400">원 집행</span></div>
      <div className="mt-1 text-xs text-slate-500">
        예산 {(data?.annual_budget ?? 0).toLocaleString()}원 · 잔액 {(data?.remaining ?? 0).toLocaleString()}원
      </div>
      <div className="mt-3 h-2 w-full rounded bg-slate-100">
        <div className={`h-2 rounded ${barColor}`} style={{ width: `${Math.min(100, rate)}%` }} />
      </div>
      <div className="mt-1 text-right text-xs text-slate-500">집행률 {rate}%</div>
    </section>
  );
}

function AssetCard({ title, main, sub, link }: { title: string; main: string; sub: string; link?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="text-sm font-semibold">{title}</div>
        {link}
      </div>
      <div className="mt-2 text-2xl font-bold">{main}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) return <div className="rounded bg-slate-50 py-6 text-center text-sm text-slate-400">데이터가 없습니다</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs text-slate-500">
            {head.map((h) => <th key={h} className="whitespace-nowrap px-2 py-2 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100">
              {r.map((c, j) => <td key={j} className="whitespace-nowrap px-2 py-2">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
