'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- 공용 모달 ----------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none';

function SubmitBar({ busy, onClose }: { busy: boolean; onClose: () => void }) {
  return (
    <div className="mt-2 flex justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">취소</button>
      <button type="submit" disabled={busy} className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
        {busy ? '저장 중…' : '저장'}
      </button>
    </div>
  );
}

// ---------- 소모품 입출고 ----------
export function SupplyTxnButton({ items, staff, onDone }: { items: { item_name: string; current_stock: number }[]; staff: string[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('입고');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('');
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  const [manager, setManager] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const q = Number(qty);
    if (!item || !q || q <= 0) { setErr('품목과 수량(1 이상)을 입력하세요.'); return; }
    if (type === '출고') {
      const s = items.find((x) => x.item_name === item);
      if (s && s.current_stock < q) { setErr(`현재고(${s.current_stock})보다 많이 출고할 수 없습니다.`); return; }
    }
    setBusy(true);
    const { error } = await supabase.from('supplies_txn').insert({
      txn_date: date, item_name: item, txn_type: type, qty: q, reason, manager,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOpen(false); setQty(''); setReason('');
    onDone();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">+ 입출고</button>
      {open && (
        <Modal title="소모품 입출고 등록" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field label="구분">
              <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="입고">입고</option>
                <option value="출고">출고</option>
              </select>
            </Field>
            <Field label="품목">
              <select className={inputCls} value={item} onChange={(e) => setItem(e.target.value)}>
                <option value="">— 선택 —</option>
                {items.map((i) => <option key={i.item_name} value={i.item_name}>{i.item_name} (재고 {i.current_stock})</option>)}
              </select>
            </Field>
            <Field label="수량"><input type="number" min="1" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            <Field label="일자"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="사유"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 구매 입고 / 수업 사용" /></Field>
            <Field label="담당자">
              <select className={inputCls} value={manager} onChange={(e) => setManager(e.target.value)}>
                <option value="">— 선택 —</option>
                {staff.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            {err && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            <SubmitBar busy={busy} onClose={() => setOpen(false)} />
          </form>
        </Modal>
      )}
    </>
  );
}

// ---------- 대여 등록 ----------
export function RentalButton({ items, onDone }: { items: { item_name: string; available: number }[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('1');
  const [renter, setRenter] = useState('');
  const [dept, setDept] = useState('');
  const [contact, setContact] = useState('');
  const [rentDate, setRentDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!item || !renter || !rentDate) { setErr('장비명·대여자·대여일은 필수입니다.'); return; }
    setBusy(true);
    const { error } = await supabase.from('rental').insert({
      rent_date: rentDate, item_name: item, qty: Number(qty) || 1, renter, dept, contact,
      due_date: dueDate || null, status: '대여중', note,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOpen(false); setRenter(''); setDept(''); setContact(''); setNote('');
    onDone();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">+ 대여</button>
      {open && (
        <Modal title="대여 등록" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field label="장비명">
              <select className={inputCls} value={item} onChange={(e) => setItem(e.target.value)}>
                <option value="">— 선택 —</option>
                {items.map((i) => <option key={i.item_name} value={i.item_name} disabled={i.available <= 0}>{i.item_name} (가능 {i.available})</option>)}
              </select>
            </Field>
            <Field label="수량"><input type="number" min="1" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            <Field label="대여자"><input className={inputCls} value={renter} onChange={(e) => setRenter(e.target.value)} /></Field>
            <Field label="소속"><input className={inputCls} value={dept} onChange={(e) => setDept(e.target.value)} /></Field>
            <Field label="연락처"><input className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
            <Field label="대여일"><input type="date" className={inputCls} value={rentDate} onChange={(e) => setRentDate(e.target.value)} /></Field>
            <Field label="반납예정일"><input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
            <Field label="비고"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            {err && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            <SubmitBar busy={busy} onClose={() => setOpen(false)} />
          </form>
        </Modal>
      )}
    </>
  );
}

// ---------- 반납 처리 ----------
type OpenRental = { id: number; item_name: string; renter: string | null; rent_date: string };

export function ReturnButton({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<OpenRental[]>([]);
  const [sel, setSel] = useState('');
  const [retDate, setRetDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    // 반납 안 된 건 = 반납일 없음 AND (상태가 비었거나 '반납완료'가 아님)
    //  ※ 상태 NULL도 대여중으로 취급(뷰 v_rental_availability와 동일). neq만 쓰면 NULL이 빠짐.
    supabase.from('rental').select('id,item_name,renter,rent_date')
      .is('return_date', null).or('status.is.null,status.neq.반납완료').order('rent_date', { ascending: false })
      .then(({ data }) => setList((data as OpenRental[]) ?? []));
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!sel) { setErr('반납할 대여 건을 선택하세요.'); return; }
    setBusy(true);
    const { error } = await supabase.from('rental').update({ return_date: retDate, status: '반납완료' }).eq('id', Number(sel));
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOpen(false); setSel('');
    onDone();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">반납</button>
      {open && (
        <Modal title="반납 처리" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field label="대여 건 (대여중)">
              <select className={inputCls} value={sel} onChange={(e) => setSel(e.target.value)}>
                <option value="">— 선택 —</option>
                {list.map((r) => <option key={r.id} value={r.id}>{r.item_name} · {r.renter ?? ''} · {r.rent_date}</option>)}
              </select>
            </Field>
            <Field label="반납일"><input type="date" className={inputCls} value={retDate} onChange={(e) => setRetDate(e.target.value)} /></Field>
            {!list.length && <div className="mb-3 text-sm text-slate-400">현재 대여중인 건이 없습니다.</div>}
            {err && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            <SubmitBar busy={busy} onClose={() => setOpen(false)} />
          </form>
        </Modal>
      )}
    </>
  );
}

// ---------- 점검·관리 이력 등록 ----------
const HISTORY_TYPES = ['점검', '정비', '구입', '폐기', '이전', '사양변경', '기타'];

export function InspectionButton({ staff, facilities, equipment, onDone }: {
  staff: string[]; facilities: string[]; equipment: { asset_no: string; name: string }[]; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [htype, setHtype] = useState('점검');
  const [itype, setItype] = useState('상시');
  const [date, setDate] = useState(today());
  const [facility, setFacility] = useState('');
  const [asset, setAsset] = useState('');
  const [target, setTarget] = useState('');
  const [item, setItem] = useState('');
  const [m1, setM1] = useState('');
  const [m2, setM2] = useState('');
  const [cost, setCost] = useState('');
  const [result, setResult] = useState('');
  const [action, setAction] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!date || !item || !result || !m1) { setErr('점검일·내용·결과·담당자(정)은 필수입니다.'); return; }
    setBusy(true);
    const { error } = await supabase.from('inspection_log').insert({
      inspected_on: date, history_type: htype, inspection_type: htype === '점검' ? itype : null,
      target: target || null, facility_name: facility || null, asset_no: asset || null,
      item, manager_primary: m1, manager_secondary: m2 || null, cost: Number(cost) || 0,
      result, action: action || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOpen(false); setItem(''); setResult(''); setAction(''); setCost('');
    onDone();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">+ 이력 등록</button>
      {open && (
        <Modal title="점검·관리 이력 등록" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field label="이력구분">
              <select className={inputCls} value={htype} onChange={(e) => setHtype(e.target.value)}>
                {HISTORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            {htype === '점검' && (
              <Field label="점검유형">
                <select className={inputCls} value={itype} onChange={(e) => setItype(e.target.value)}>
                  {['상시', '월간', '연간'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            )}
            <Field label="일자"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="시설명">
              <select className={inputCls} value={facility} onChange={(e) => setFacility(e.target.value)}>
                <option value="">— (선택) —</option>
                {facilities.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="자산번호 (장비 이력이면)">
              <select className={inputCls} value={asset} onChange={(e) => setAsset(e.target.value)}>
                <option value="">— (선택) —</option>
                {equipment.map((eq) => <option key={eq.asset_no} value={eq.asset_no}>{eq.asset_no} · {eq.name}</option>)}
              </select>
            </Field>
            <Field label="점검대상 (선택)"><input className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="예: 실습 PC" /></Field>
            <Field label="내용/점검항목"><input className={inputCls} value={item} onChange={(e) => setItem(e.target.value)} /></Field>
            <Field label="담당자(정)">
              <select className={inputCls} value={m1} onChange={(e) => setM1(e.target.value)}>
                <option value="">— 선택 —</option>
                {staff.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="담당자(부) (선택)">
              <select className={inputCls} value={m2} onChange={(e) => setM2(e.target.value)}>
                <option value="">— (선택) —</option>
                {staff.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="결과"><input className={inputCls} value={result} onChange={(e) => setResult(e.target.value)} placeholder="예: 정상 / 교체 필요" /></Field>
            <Field label="비용(원) (선택)"><input type="number" className={inputCls} value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
            <Field label="조치내용 (선택)"><input className={inputCls} value={action} onChange={(e) => setAction(e.target.value)} /></Field>
            {err && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            <SubmitBar busy={busy} onClose={() => setOpen(false)} />
          </form>
        </Modal>
      )}
    </>
  );
}

// ---------- 예산 집행 등록 ----------
export function BudgetButton({ category, staff, onDone }: { category: string; staff: string[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today());
  const [item, setItem] = useState('');
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('완료');
  const [manager, setManager] = useState('');
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(''); // 소모품 기타일 때 소모품 입고 연동
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const isSupply = category === '소모품 기타';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!item || !amount) { setErr('항목명·집행금액은 필수입니다.'); return; }
    setBusy(true);
    const year = Number(String(date).slice(0, 4));
    const { error } = await supabase.from('budget_usage').insert({
      spent_on: date, year, category, item, target: target || null,
      amount: Number(amount) || 0, status, manager: manager || null, note: note || null,
    });
    if (error) { setBusy(false); setErr(error.message); return; }
    // 소모품 기타 + 수량 → 소모품 마스터 자동등록(있으면 유지) + 입고 연동
    if (isSupply && Number(qty) > 0) {
      await supabase.from('supplies_master').upsert(
        { item_name: item, unit: '개', opening_stock: 0, reorder_level: 0, manager: manager || null, active: true },
        { onConflict: 'item_name', ignoreDuplicates: true },
      );
      await supabase.from('supplies_txn').insert({
        txn_date: date, item_name: item, txn_type: '입고', qty: Number(qty), reason: '예산 집행 구매', manager: manager || null,
      });
    }
    setBusy(false);
    setOpen(false); setItem(''); setTarget(''); setAmount(''); setNote(''); setQty('');
    onDone();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">+ 집행</button>
      {open && (
        <Modal title={`예산 집행 등록 — ${category}`} onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field label="집행일"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="항목명"><input className={inputCls} value={item} onChange={(e) => setItem(e.target.value)} /></Field>
            <Field label="대상 (선택)"><input className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
            <Field label="집행금액(원)"><input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="상태">
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                {['완료', '예정', '진행중'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="담당자">
              <select className={inputCls} value={manager} onChange={(e) => setManager(e.target.value)}>
                <option value="">— 선택 —</option>
                {staff.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="비고 (선택)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            {isSupply && (
              <Field label="소모품 수량 (입력 시 소모품 입고 자동 연동)">
                <input type="number" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="예: 10" />
              </Field>
            )}
            {err && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            <SubmitBar busy={busy} onClose={() => setOpen(false)} />
          </form>
        </Modal>
      )}
    </>
  );
}
