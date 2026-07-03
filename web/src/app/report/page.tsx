'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const ORG_NAME = '인천구월그린컴퓨터아트학원';

type Row = {
  inspected_on: string; history_type: string | null; inspection_type: string | null;
  target: string | null; facility_name: string | null; asset_no: string | null;
  item: string | null; manager_primary: string | null; result: string | null; action: string | null;
};

const pad = (n: number) => String(n).padStart(2, '0');
const isNormal = (r: string) => r === '정상' || r === '검토 완료';

export default function ReportPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const start = `${year}-${pad(month)}-01`;
    const next = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
    supabase.from('inspection_log').select('*')
      .gte('inspected_on', start).lt('inspected_on', next)
      .order('inspected_on', { ascending: true })
      .then(({ data }) => { setRows((data as Row[]) ?? []); setLoading(false); });
  }, [year, month]);

  const inspections = useMemo(() => rows.filter((r) => (r.history_type ?? '점검') === '점검'), [rows]);
  const others = useMemo(() => rows.filter((r) => (r.history_type ?? '점검') !== '점검'), [rows]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    inspections.forEach((r) => { const k = r.result || '미분류'; counts[k] = (counts[k] || 0) + 1; });
    return { total: inspections.length, counts };
  }, [inspections]);

  const groups = useMemo(() => {
    const order: Record<string, number> = { 상시: 0, 월간: 1, 연간: 2 };
    const map: Record<string, { type: string; target: string; cnt: number; normal: number; abn: number }> = {};
    inspections.forEach((r) => {
      const type = r.inspection_type || '-'; const target = r.target || r.facility_name || '-';
      const key = `${type}|${target}`;
      if (!map[key]) map[key] = { type, target, cnt: 0, normal: 0, abn: 0 };
      map[key].cnt++; if (isNormal(r.result || '')) map[key].normal++; else map[key].abn++;
    });
    return Object.values(map).sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9) || a.target.localeCompare(b.target));
  }, [inspections]);

  const abnormal = useMemo(() => inspections.filter((r) => !isNormal(r.result || '')), [inspections]);

  return (
    <div className="report-root">
      <style>{CSS}</style>

      <div className="toolbar">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
        </select>
        <button className="btn" onClick={() => window.close()}>닫기</button>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ 인쇄 / PDF 저장</button>
      </div>

      <div className="page">
        <div className="report-header">
          <div className="head-row">
            <div className="head-left">
              <div className="org">{ORG_NAME}</div>
              <div className="title">월간 점검 보고서</div>
              <div className="period">{year}년 {month}월</div>
            </div>
            <table className="approval">
              <tbody>
                <tr><td className="ap-label" rowSpan={2}>결<br />재</td><th>담당</th><th>원장</th></tr>
                <tr><td></td><td></td></tr>
              </tbody>
            </table>
          </div>
          <div className="meta"><span></span><span>문서번호: INSP-{year}{pad(month)}</span></div>
        </div>

        {loading ? <div className="empty">불러오는 중…</div> : (
          <>
            <div className="section">
              <div className="section-title">종합 요약<span className="count">총 {stats.total}건</span></div>
              {stats.total === 0 ? <div className="empty">해당 월 점검 내역이 없습니다.</div> : (
                <div className="summary">
                  <div className="stat"><div className="stat-label">총 점검</div><div className="stat-val">{stats.total}</div></div>
                  {Object.entries(stats.counts).map(([k, v]) => (
                    <div className="stat" key={k}><div className="stat-label">{k}</div><div className={`stat-val ${colorOf(k)}`}>{v}</div></div>
                  ))}
                </div>
              )}
            </div>

            {groups.length > 0 && (
              <div className="section">
                <div className="section-title">점검 요약 (유형·대상별)</div>
                <table>
                  <thead><tr><th>점검유형</th><th>대상/시설</th><th className="num">건수</th><th className="num">정상</th><th className="num">이상</th></tr></thead>
                  <tbody>
                    {groups.map((g, i) => (
                      <tr key={i}><td>{g.type}</td><td>{g.target}</td><td className="num">{g.cnt}</td>
                        <td className="num">{g.normal}</td><td className="num">{g.abn ? <b className="red">{g.abn}</b> : 0}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {abnormal.length > 0 && (
              <div className="section">
                <div className="section-title">이상 항목 상세<span className="count">{abnormal.length}건</span></div>
                <table>
                  <thead><tr><th>일자</th><th>유형</th><th>대상/시설</th><th>자산번호</th><th>내용</th><th>결과</th><th>조치내용</th><th>담당자</th></tr></thead>
                  <tbody>
                    {abnormal.map((r, i) => (
                      <tr key={i}><td>{r.inspected_on}</td><td>{r.inspection_type || '-'}</td>
                        <td>{r.target || r.facility_name || '-'}</td><td>{r.asset_no || '-'}</td>
                        <td>{r.item || '-'}</td><td className="red">{r.result || '-'}</td>
                        <td>{r.action || '-'}</td><td>{r.manager_primary || '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {others.length > 0 && (
              <div className="section">
                <div className="section-title">기타 이력 (정비·구입·폐기 등)<span className="count">{others.length}건</span></div>
                <table>
                  <thead><tr><th>일자</th><th>구분</th><th>대상/시설</th><th>자산번호</th><th>내용</th><th>결과</th><th>담당자</th></tr></thead>
                  <tbody>
                    {others.map((r, i) => (
                      <tr key={i}><td>{r.inspected_on}</td><td>{r.history_type}</td>
                        <td>{r.target || r.facility_name || '-'}</td><td>{r.asset_no || '-'}</td>
                        <td>{r.item || '-'}</td><td>{r.result || '-'}</td><td>{r.manager_primary || '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        <div className="footer">{ORG_NAME} · {year}년 {month}월 점검 보고서</div>
      </div>
    </div>
  );
}

function colorOf(k: string) {
  if (k === '정상' || k === '완료' || k === '검토 완료') return 'green';
  if (k.includes('교체') || k.includes('수리') || k.includes('오작동') || k === '폐기') return 'red';
  if (k.includes('예정') || k.includes('요주의') || k.includes('필요') || k.includes('진행')) return 'amber';
  return 'gray';
}

const CSS = `
.report-root{font-family:"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif;color:#1F2937;background:#F3F4F6;min-height:100vh;padding:20px}
.toolbar{max-width:800px;margin:0 auto 16px;display:flex;gap:8px;justify-content:flex-end;align-items:center}
.toolbar select{padding:6px 10px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px}
.btn{padding:8px 16px;font-size:13px;border-radius:6px;cursor:pointer;border:1px solid #D1D5DB;background:#FFF}
.btn-primary{background:#2563EB;color:#FFF;border-color:#2563EB}
.page{background:#FFF;max-width:800px;margin:0 auto;padding:40px 36px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.report-header{border-bottom:2px solid #1F2937;padding-bottom:16px;margin-bottom:24px}
.head-row{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
.head-left{flex:1 1 auto;min-width:0}
.org{font-size:11pt;color:#6B7280;margin-bottom:6px;white-space:nowrap}
.title{font-size:22pt;font-weight:700;letter-spacing:-.5px;margin-bottom:4px;white-space:nowrap}
.period{font-size:12pt;color:#4B5563;white-space:nowrap}
.approval{width:auto;border-collapse:collapse;font-size:9pt;table-layout:auto;flex:0 0 auto}
.approval th,.approval td{border:1px solid #1F2937;text-align:center;vertical-align:middle}
.approval th{background:#F3F4F6;padding:4px 6px;font-weight:600;width:64px}
.approval .ap-label{background:#F3F4F6;font-weight:600;width:22px;padding:4px 2px;line-height:1.2}
.approval td{height:44px;width:64px}
.meta{display:flex;justify-content:space-between;margin-top:12px;font-size:10pt;color:#6B7280}
.section{margin-bottom:26px;page-break-inside:avoid}
.section-title{font-size:14pt;font-weight:600;padding:6px 0 8px;border-bottom:1px solid #1F2937;margin-bottom:12px}
.section-title .count{font-size:10pt;color:#6B7280;font-weight:400;margin-left:8px}
.summary{display:flex;gap:8px;flex-wrap:wrap}
.stat{flex:1;min-width:80px;padding:10px 12px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;text-align:center}
.stat-label{font-size:9pt;color:#6B7280;margin-bottom:3px}
.stat-val{font-size:14pt;font-weight:600}
.stat-val.green{color:#059669}.stat-val.amber{color:#D97706}.stat-val.red{color:#DC2626}.stat-val.gray{color:#6B7280}
table{width:100%;border-collapse:collapse;font-size:10pt}
th,td{padding:7px 8px;text-align:left;border:1px solid #D1D5DB;vertical-align:top}
th{background:#F3F4F6;font-weight:600;font-size:9.5pt;color:#374151}
td.num,th.num{text-align:center}
.red{color:#DC2626;font-weight:500}
.empty{padding:24px;text-align:center;color:#9CA3AF;background:#F9FAFB;border-radius:6px;font-size:10pt}
.footer{margin-top:30px;padding-top:12px;border-top:1px solid #E5E7EB;text-align:center;font-size:9pt;color:#9CA3AF}
@media print{
  .report-root{background:#FFF;padding:0}
  .toolbar{display:none !important}
  .page{box-shadow:none;max-width:100%;padding:0}
  @page{size:A4 portrait;margin:18mm 16mm}
  .section{page-break-inside:avoid}
  table{font-size:9pt}th,td{padding:5px 6px}
}
`;
