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

type Insp = {
  id: number; inspected_on: string; history_type: string | null; inspection_type: string | null;
  item: string | null; result: string | null; cost: number | null; manager_primary: string | null; action: string | null;
};

type Asset = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined || v === '' ? '-' : String(v));

export function AssetHistoryCard({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const [history, setHistory] = useState<Insp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const no = String(asset.asset_no ?? '');
    if (!no) { setLoading(false); return; }
    supabase.from('inspection_log').select('*').eq('asset_no', no)
      .order('inspected_on', { ascending: false })
      .then(({ data }) => { setHistory((data as Insp[]) ?? []); setLoading(false); });
  }, [asset]);

  const photo = normalizeImg(asset.photo_url);

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
              <div className="ehc-title">장비 관리카드</div>
            </div>
            <div className="ehc-assetno">자산번호<br /><b>{s(asset.asset_no)}</b></div>
          </div>

          <div className="ehc-body">
            <div className="ehc-photo">
              {photo
                ? <img src={photo} alt="장비 사진" />
                : <div className="ehc-nophoto">사진 없음</div>}
            </div>
            <table className="ehc-spec">
              <tbody>
                <tr><th>장비명</th><td>{s(asset.name)}</td></tr>
                <tr><th>분류</th><td>{s(asset.class)}</td></tr>
                <tr><th>세부사양</th><td>{s(asset.spec)}</td></tr>
                <tr><th>수량</th><td>{s(asset.qty)}</td></tr>
                <tr><th>설치위치</th><td>{s(asset.location)}</td></tr>
                <tr><th>취득일</th><td>{s(asset.acquired_on)}</td></tr>
                <tr><th>담당자(정)</th><td>{s(asset.manager_primary)}</td></tr>
                <tr><th>담당자(부)</th><td>{s(asset.manager_secondary)}</td></tr>
                <tr><th>비고</th><td>{s(asset.note)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="ehc-sec-title">점검·관리 이력 <span>{history.length}건</span></div>
          {loading ? <div className="ehc-empty">불러오는 중…</div> : history.length === 0 ? (
            <div className="ehc-empty">등록된 이력이 없습니다.</div>
          ) : (
            <table className="ehc-hist">
              <thead>
                <tr><th>일자</th><th>구분</th><th>유형</th><th>내용</th><th>결과</th><th>비용</th><th>담당자</th><th>조치내용</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{s(h.inspected_on)}</td><td>{s(h.history_type)}</td><td>{s(h.inspection_type)}</td>
                    <td>{s(h.item)}</td><td>{s(h.result)}</td><td className="num">{h.cost ? Number(h.cost).toLocaleString() : '-'}</td>
                    <td>{s(h.manager_primary)}</td><td>{s(h.action)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="ehc-footer">{ORG_NAME} · 장비 관리카드</div>
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
.ehc-assetno{font-size:9pt;color:#6B7280;text-align:center;border:1px solid #1F2937;border-radius:6px;padding:6px 12px;line-height:1.5}
.ehc-assetno b{font-size:12pt;color:#111827}
.ehc-body{display:flex;gap:18px;margin-bottom:22px}
.ehc-photo{flex:0 0 240px;height:180px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#F9FAFB}
.ehc-photo img{width:100%;height:100%;object-fit:contain}
.ehc-nophoto{color:#9CA3AF;font-size:10pt}
.ehc-spec{flex:1;border-collapse:collapse;font-size:10.5pt}
.ehc-spec th,.ehc-spec td{border:1px solid #E5E7EB;padding:6px 10px;text-align:left;vertical-align:top}
.ehc-spec th{background:#F3F4F6;width:96px;font-weight:600;color:#374151;white-space:nowrap}
.ehc-sec-title{font-size:13pt;font-weight:600;border-bottom:1px solid #1F2937;padding-bottom:6px;margin-bottom:10px}
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
