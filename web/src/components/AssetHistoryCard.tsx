'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const ORG_NAME = '인천구월그린컴퓨터아트학원';

// Google Drive 공유링크 → 표시용 thumbnail URL 변환 (원본 GAS와 동일)
function normalizeImg(url: unknown): string {
  if (!url) return '';
  const u = String(url).trim();
  if (!u) return '';
  const m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || u.match(/[?&]id=([\w-]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800`;
  return u;
}

type Row = Record<string, unknown>;
type Field = { label: string; key: string };
type HCol = { label: string; key: string; money?: boolean };
type Section = { title: string; columns: HCol[]; rows: Row[] };

const s = (v: unknown) => (v === null || v === undefined || v === '' ? '-' : String(v));

type KindCfg = {
  title: string; idLabel: string; idKey: string; nameKey: string; photoKey?: string; spec: Field[];
};

const KINDS: Record<string, KindCfg> = {
  equipment: {
    title: '장비 관리카드', idLabel: '자산번호', idKey: 'asset_no', nameKey: 'name', photoKey: 'photo_url',
    spec: [
      { label: '분류', key: 'class' }, { label: '세부사양', key: 'spec' }, { label: '수량', key: 'qty' },
      { label: '설치위치', key: 'location' }, { label: '취득일', key: 'acquired_on' },
      { label: '담당자(정)', key: 'manager_primary' }, { label: '담당자(부)', key: 'manager_secondary' }, { label: '비고', key: 'note' },
    ],
  },
  facility: {
    title: '시설 관리카드', idLabel: '관리번호', idKey: 'mgmt_no', nameKey: 'name', photoKey: 'photo_url',
    spec: [
      { label: '구분', key: 'category' }, { label: '분류', key: 'class' }, { label: '세부사양', key: 'spec' },
      { label: '위치', key: 'location' }, { label: '설치일', key: 'installed_on' },
      { label: '담당자(정)', key: 'manager_primary' }, { label: '담당자(부)', key: 'manager_secondary' }, { label: '비고', key: 'note' },
    ],
  },
  software: {
    title: '소프트웨어 관리카드', idLabel: '구분', idKey: 'category', nameKey: 'name',
    spec: [
      { label: '라이선스유형', key: 'license_type' }, { label: '보유수량', key: 'owned_qty' }, { label: '설치수량', key: 'installed_qty' },
      { label: '갱신일', key: 'renew_on' }, { label: '담당자(정)', key: 'manager_primary' }, { label: '담당자(부)', key: 'manager_secondary' }, { label: '비고', key: 'note' },
    ],
  },
};

async function loadSections(kind: string, asset: Row): Promise<Section[]> {
  if (kind === 'equipment') {
    const { data } = await supabase.from('inspection_log').select('*')
      .eq('asset_no', String(asset.asset_no ?? '')).order('inspected_on', { ascending: false });
    return [{
      title: '점검·관리 이력', rows: (data as Row[]) ?? [],
      columns: [
        { label: '일자', key: 'inspected_on' }, { label: '구분', key: 'history_type' }, { label: '유형', key: 'inspection_type' },
        { label: '내용', key: 'item' }, { label: '결과', key: 'result' }, { label: '비용', key: 'cost', money: true },
        { label: '담당자', key: 'manager_primary' }, { label: '조치내용', key: 'action' },
      ],
    }];
  }
  if (kind === 'facility') {
    const name = String(asset.name ?? '');
    const [rep, insp] = await Promise.all([
      supabase.from('facility_repairs').select('*').eq('mgmt_no', String(asset.mgmt_no ?? '')),
      supabase.from('inspection_log').select('*').eq('facility_name', name),
    ]);
    const merged: Row[] = [];
    ((rep.data as Row[]) ?? []).forEach((r) => merged.push({
      date: r.repaired_on, gubun: '정비·' + s(r.repair_type), content: r.content, result: r.result, who: r.manager,
    }));
    ((insp.data as Row[]) ?? []).forEach((r) => {
      if (String(r.asset_no ?? '').trim() !== '') return; // 장비 이력 제외
      const it = String(r.inspection_type ?? '');
      merged.push({
        date: r.inspected_on, gubun: (String(r.history_type ?? '점검') === '점검' && it) ? '점검·' + it : s(r.history_type),
        content: r.item, result: r.result, who: r.manager_primary,
      });
    });
    merged.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
    return [{
      title: '점검·정비 이력', rows: merged,
      columns: [
        { label: '일자', key: 'date' }, { label: '구분', key: 'gubun' }, { label: '내용', key: 'content' },
        { label: '결과', key: 'result' }, { label: '담당자', key: 'who' },
      ],
    }];
  }
  // software
  const name = String(asset.name ?? '');
  const [inst, renew] = await Promise.all([
    supabase.from('software_install').select('*').eq('name', name),
    supabase.from('software_renew').select('*').eq('name', name).order('renewed_on', { ascending: false }),
  ]);
  return [
    {
      title: '설치 현황', rows: (inst.data as Row[]) ?? [],
      columns: [{ label: '설치위치', key: 'location' }, { label: '설치수량', key: 'qty' }, { label: '비고', key: 'note' }],
    },
    {
      title: '갱신 이력', rows: (renew.data as Row[]) ?? [],
      columns: [
        { label: '갱신일자', key: 'renewed_on' }, { label: '갱신구분', key: 'renew_type' }, { label: '내용', key: 'content' },
        { label: '담당자', key: 'manager_primary' }, { label: '비고', key: 'note' },
      ],
    },
  ];
}

export function AssetHistoryCard({ kind, asset, onClose }: { kind: string; asset: Row; onClose: () => void }) {
  const cfg = KINDS[kind] ?? KINDS.equipment;
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadSections(kind, asset).then((secs) => { setSections(secs); setLoading(false); });
  }, [kind, asset]);

  const photo = cfg.photoKey ? normalizeImg(asset[cfg.photoKey]) : '';
  const hasPhoto = !!cfg.photoKey;

  return (
    <div className="ehc-overlay" onClick={onClose}>
      <style>{CSS}</style>
      <div className="ehc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ehc-toolbar">
          <button className="ehc-btn" onClick={onClose}>닫기</button>
          <button className="ehc-btn ehc-primary" onClick={() => window.print()}>🖨️ 인쇄 / PDF</button>
        </div>

        <div className="ehc-page">
          <div className="ehc-head">
            <div>
              <div className="ehc-org">{ORG_NAME}</div>
              <div className="ehc-title">{cfg.title}</div>
              <div className="ehc-name">{s(asset[cfg.nameKey])}</div>
            </div>
            <div className="ehc-assetno">{cfg.idLabel}<br /><b>{s(asset[cfg.idKey])}</b></div>
          </div>

          <div className="ehc-body">
            {hasPhoto && (
              <div className="ehc-photo">
                {photo ? <img src={photo} alt="사진" /> : <div className="ehc-nophoto">사진 없음</div>}
              </div>
            )}
            <table className="ehc-spec">
              <tbody>
                {cfg.spec.map((f) => (
                  <tr key={f.key}><th>{f.label}</th><td>{s(asset[f.key])}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading ? <div className="ehc-empty">불러오는 중…</div> : sections.map((sec, si) => (
            <div key={si}>
              <div className="ehc-sec-title">{sec.title} <span>{sec.rows.length}건</span></div>
              {sec.rows.length === 0 ? <div className="ehc-empty">내역이 없습니다.</div> : (
                <table className="ehc-hist">
                  <thead><tr>{sec.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
                  <tbody>
                    {sec.rows.map((r, ri) => (
                      <tr key={ri}>
                        {sec.columns.map((c) => (
                          <td key={c.key} className={c.money ? 'num' : ''}>
                            {c.money ? (r[c.key] ? Number(r[c.key]).toLocaleString() : '-') : s(r[c.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
          <div className="ehc-footer">{ORG_NAME} · {cfg.title}</div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.ehc-overlay{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto}
.ehc-modal{width:100%;max-width:820px}
.ehc-toolbar{display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px}
.ehc-btn{padding:8px 16px;font-size:13px;border-radius:6px;border:1px solid #D1D5DB;background:#FFF;cursor:pointer}
.ehc-primary{background:#2563EB;color:#FFF;border-color:#2563EB}
.ehc-page{background:#FFF;border-radius:8px;padding:32px 30px;color:#1F2937;box-shadow:0 8px 30px rgba(0,0,0,.15)}
.ehc-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1F2937;padding-bottom:14px;margin-bottom:18px}
.ehc-org{font-size:11pt;color:#6B7280}
.ehc-title{font-size:20pt;font-weight:700;margin-top:4px}
.ehc-name{font-size:12pt;color:#374151;margin-top:2px}
.ehc-assetno{font-size:9pt;color:#6B7280;text-align:center;border:1px solid #1F2937;border-radius:6px;padding:6px 12px;line-height:1.5;white-space:nowrap}
.ehc-assetno b{font-size:12pt;color:#111827}
.ehc-body{display:flex;gap:18px;margin-bottom:22px}
.ehc-photo{flex:0 0 240px;height:180px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#F9FAFB}
.ehc-photo img{width:100%;height:100%;object-fit:contain}
.ehc-nophoto{color:#9CA3AF;font-size:10pt}
.ehc-spec{flex:1;border-collapse:collapse;font-size:10.5pt}
.ehc-spec th,.ehc-spec td{border:1px solid #E5E7EB;padding:6px 10px;text-align:left;vertical-align:top}
.ehc-spec th{background:#F3F4F6;width:96px;font-weight:600;color:#374151;white-space:nowrap}
.ehc-sec-title{font-size:13pt;font-weight:600;border-bottom:1px solid #1F2937;padding-bottom:6px;margin:16px 0 10px}
.ehc-sec-title span{font-size:9.5pt;color:#6B7280;font-weight:400;margin-left:6px}
.ehc-hist{width:100%;border-collapse:collapse;font-size:9.5pt}
.ehc-hist th,.ehc-hist td{border:1px solid #D1D5DB;padding:6px 8px;text-align:left;vertical-align:top}
.ehc-hist th{background:#F3F4F6;font-weight:600;color:#374151}
.ehc-hist td.num{text-align:right}
.ehc-empty{padding:20px;text-align:center;color:#9CA3AF;background:#F9FAFB;border-radius:6px;font-size:10pt}
.ehc-footer{margin-top:24px;padding-top:10px;border-top:1px solid #E5E7EB;text-align:center;font-size:9pt;color:#9CA3AF}
@media print{
  .ehc-overlay{position:static;background:#FFF;padding:0;overflow:visible}
  .ehc-toolbar{display:none !important}
  .ehc-page{box-shadow:none;border-radius:0;padding:0;max-width:100%}
  @page{size:A4 portrait;margin:16mm}
}
`;
