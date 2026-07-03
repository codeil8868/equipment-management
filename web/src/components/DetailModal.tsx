'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Col = { key: string; label: string; money?: boolean; num?: boolean; date?: boolean };
type Config = { title: string; table: string; order?: string; editable?: boolean; columns: Col[] };

const CONFIGS: Record<string, Config> = {
  inspection: {
    title: '📋 점검·이력 — 전체', table: 'inspection_log', order: 'inspected_on', editable: true,
    columns: [
      { key: 'inspected_on', label: '일자', date: true }, { key: 'history_type', label: '이력구분' },
      { key: 'inspection_type', label: '유형' }, { key: 'facility_name', label: '시설명' },
      { key: 'asset_no', label: '자산번호' }, { key: 'item', label: '내용' },
      { key: 'manager_primary', label: '담당자' }, { key: 'result', label: '결과' },
    ],
  },
  supplies: {
    title: '📦 소모품 현황 — 전체 (읽기전용, 집계)', table: 'v_supplies_status', order: 'item_name', editable: false,
    columns: [
      { key: 'item_name', label: '품목' }, { key: 'unit', label: '단위' },
      { key: 'current_stock', label: '현재고' }, { key: 'reorder_level', label: '기준' },
      { key: 'status', label: '상태' }, { key: 'manager', label: '담당자' }, { key: 'last_date', label: '최근거래' },
    ],
  },
  rental: {
    title: '🎒 대여 기록 — 전체', table: 'rental', order: 'rent_date', editable: true,
    columns: [
      { key: 'rent_date', label: '대여일', date: true }, { key: 'item_name', label: '장비명' }, { key: 'qty', label: '수량', num: true },
      { key: 'renter', label: '대여자' }, { key: 'dept', label: '소속' }, { key: 'due_date', label: '반납예정', date: true },
      { key: 'return_date', label: '반납일', date: true }, { key: 'status', label: '상태' },
    ],
  },
  rentalMaster: {
    title: '🎒 대여장비 보유수량 — 편집', table: 'rental_master', order: 'item_name', editable: true,
    columns: [
      { key: 'item_name', label: '장비명' }, { key: 'class', label: '분류' },
      { key: 'owned_qty', label: '보유수량', num: true }, { key: 'manager', label: '담당자' }, { key: 'note', label: '비고' },
    ],
  },
  budget: {
    title: '💰 예산 집행 — 전체', table: 'budget_usage', order: 'spent_on', editable: true,
    columns: [
      { key: 'spent_on', label: '집행일', date: true }, { key: 'year', label: '연도', num: true }, { key: 'category', label: '구분' },
      { key: 'item', label: '항목명' }, { key: 'target', label: '대상' }, { key: 'amount', label: '금액', money: true, num: true },
      { key: 'status', label: '상태' }, { key: 'manager', label: '담당자' },
    ],
  },
  equipment: {
    title: '💻 장비목록 — 전체', table: 'equipment', order: 'asset_no', editable: true,
    columns: [
      { key: 'asset_no', label: '자산번호' }, { key: 'name', label: '장비명' }, { key: 'class', label: '분류' },
      { key: 'spec', label: '세부사양' }, { key: 'qty', label: '수량', num: true }, { key: 'location', label: '설치위치' },
      { key: 'acquired_on', label: '취득일', date: true }, { key: 'manager_primary', label: '담당자' },
    ],
  },
  facilities: {
    title: '🏢 시설·안전시설 — 전체', table: 'facilities', order: 'mgmt_no', editable: true,
    columns: [
      { key: 'mgmt_no', label: '관리번호' }, { key: 'category', label: '구분' }, { key: 'name', label: '시설명' },
      { key: 'class', label: '분류' }, { key: 'location', label: '위치' }, { key: 'installed_on', label: '설치일', date: true },
      { key: 'manager_primary', label: '담당자' },
    ],
  },
  software: {
    title: '💿 소프트웨어 — 전체', table: 'software_master', order: 'name', editable: true,
    columns: [
      { key: 'name', label: '소프트웨어명' }, { key: 'category', label: '구분' }, { key: 'license_type', label: '라이선스' },
      { key: 'owned_qty', label: '보유', num: true }, { key: 'installed_qty', label: '설치', num: true }, { key: 'renew_on', label: '갱신일', date: true },
      { key: 'manager_primary', label: '담당자' },
    ],
  },
};

type Row = Record<string, unknown>;
const inputCls = 'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none';

export function DetailLink({ configKey, label, onChange }: { configKey: keyof typeof CONFIGS | string; label?: string; onChange?: () => void }) {
  const cfg = CONFIGS[configKey];
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [vals, setVals] = useState<Row>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function fetchAll() {
    if (!cfg) return;
    setLoading(true);
    const pageSize = 1000;
    let all: Row[] = [];
    for (let from = 0; ; from += pageSize) {
      let query = supabase.from(cfg.table).select('*').range(from, from + pageSize - 1);
      if (cfg.order) query = query.order(cfg.order, { ascending: false });
      const { data, error } = await query;
      if (error || !data || data.length === 0) break;
      all = all.concat(data as Row[]);
      if (data.length < pageSize) break;
    }
    setRows(all);
    setLoading(false);
  }

  useEffect(() => { if (open) fetchAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);

  if (!cfg) return null;

  const filtered = q
    ? rows.filter((r) => cfg.columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q.toLowerCase())))
    : rows;

  function openEdit(r: Row) {
    const v: Row = {};
    cfg.columns.forEach((c) => { v[c.key] = r[c.key] ?? ''; });
    setVals(v);
    setEditRow(r);
    setErr('');
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    setBusy(true); setErr('');
    const patch: Row = {};
    cfg.columns.forEach((c) => {
      let val = vals[c.key];
      if (val === '' ) val = null;
      else if (c.num) val = Number(val);
      patch[c.key] = val;
    });
    const { error } = await supabase.from(cfg.table).update(patch).eq('id', editRow.id as number);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEditRow(null);
    await fetchAll();
    onChange?.();
  }

  async function del(r: Row) {
    if (!window.confirm('이 항목을 삭제할까요? (되돌릴 수 없습니다)')) return;
    const { error } = await supabase.from(cfg.table).delete().eq('id', r.id as number);
    if (error) { window.alert('삭제 실패: ' + error.message); return; }
    await fetchAll();
    onChange?.();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-emerald-700 underline hover:text-emerald-900">
        {label ?? '전체 보기'}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-10" onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-semibold">{cfg.title} <span className="text-xs font-normal text-slate-400">({filtered.length}건)</span></h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="border-b p-3">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색…" className={inputCls} />
            </div>
            <div className="max-h-[65vh] overflow-auto p-3">
              {loading ? <div className="py-8 text-center text-sm text-slate-400">불러오는 중…</div> : (
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b text-xs text-slate-500">
                      {cfg.columns.map((c) => <th key={c.key} className="whitespace-nowrap px-2 py-2 font-medium">{c.label}</th>)}
                      {cfg.editable && <th className="px-2 py-2 font-medium">관리</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {cfg.columns.map((c) => {
                          const v = r[c.key];
                          const text = v === null || v === undefined || v === '' ? '-' : c.money ? Number(v).toLocaleString() : String(v);
                          return <td key={c.key} className="whitespace-nowrap px-2 py-2">{text}</td>;
                        })}
                        {cfg.editable && (
                          <td className="whitespace-nowrap px-2 py-2">
                            <button onClick={() => openEdit(r)} className="mr-2 text-xs text-blue-600 hover:underline">수정</button>
                            <button onClick={() => del(r)} className="text-xs text-red-600 hover:underline">삭제</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* 수정 폼 */}
          {editRow && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setEditRow(null)}>
              <form onSubmit={saveEdit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="mb-4 font-semibold">항목 수정</h3>
                <div className="max-h-[60vh] overflow-auto">
                  {cfg.columns.map((c) => (
                    <label key={c.key} className="mb-3 block">
                      <span className="mb-1 block text-sm font-medium text-slate-600">{c.label}</span>
                      <input
                        type={c.date ? 'date' : c.num ? 'number' : 'text'} className={inputCls}
                        value={String(vals[c.key] ?? '')} onChange={(e) => setVals({ ...vals, [c.key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
                {err && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditRow(null)} className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">취소</button>
                  <button type="submit" disabled={busy} className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? '저장 중…' : '저장'}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}
