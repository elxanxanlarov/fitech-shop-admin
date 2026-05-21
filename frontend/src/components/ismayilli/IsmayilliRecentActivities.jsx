import { useState, useEffect, useCallback, useMemo } from 'react';
import { ismayilliApi } from '../../api';
import {
  ArrowUpRight, ArrowDownLeft, Receipt, ChevronLeft, ChevronRight,
  Calendar, Filter, RotateCcw, TrendingUp, TrendingDown, Activity,
} from 'lucide-react';

const TYPE_OPTIONS = [
  { value: '', label: 'Hamısı' },
  { value: 'SALE', label: 'Yalnız Satışlar' },
  { value: 'RETURN', label: 'Yalnız Qaytarmalar' },
];

const PRESET_BUTTONS = [
  { label: 'Bu gün', getValue: () => { const t = today(); return { s: t, e: t }; } },
  { label: 'Bu həftə', getValue: () => { const t = new Date(); const mon = new Date(t); mon.setDate(t.getDate() - t.getDay() + 1); return { s: fmt(mon), e: today() }; } },
  { label: 'Bu ay', getValue: () => { const t = new Date(); return { s: `${t.getFullYear()}-${p2(t.getMonth()+1)}-01`, e: today() }; } },
  { label: 'Hamısı', getValue: () => ({ s: '', e: '' }) },
];

function today() { const t = new Date(); return fmt(t); }
function fmt(d) { return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`; }
function p2(n) { return String(n).padStart(2, '0'); }
function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${p2(d.getDate())}.${p2(d.getMonth()+1)}.${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export default function IsmayilliRecentActivities() {
  const todayStr = today();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, type: type || undefined };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await ismayilliApi.getActivities(params);
      if (res.success) {
        setData(res.data || []);
        setPagination(res.pagination || { total: 0, totalPages: 1 });
        setSummary(res.summary || null);
      }
    } catch (err) {
      console.error('getActivities error', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, type, page]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [startDate, endDate, type]);

  const applyPreset = (preset) => {
    const { s, e } = preset.getValue();
    setStartDate(s);
    setEndDate(e);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Activity className="text-purple-600 w-6 h-6" /> Son Əməliyyatlar (İsmayıllı)
        </h1>
        <p className="text-sm text-slate-500 mt-1">Satışlar və qaytarmaların tarixçəsi</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {PRESET_BUTTONS.map(pb => (
            <button
              key={pb.label}
              onClick={() => applyPreset(pb)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all"
            >
              {pb.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Başlanğıc tarixi</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Son tarix</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Növ</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 appearance-none"
              >
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Satış sayı', value: summary.totalSales, icon: <ArrowUpRight className="w-4 h-4" />, color: 'emerald' },
            { label: 'Satış məbləği', value: `${Number(summary.salesAmount).toFixed(2)} ₼`, icon: <TrendingUp className="w-4 h-4" />, color: 'emerald' },
            { label: 'Qaytarma sayı', value: summary.totalReturns, icon: <ArrowDownLeft className="w-4 h-4" />, color: 'rose' },
            { label: 'Qaytarılan məbləğ', value: `${Number(summary.returnsAmount).toFixed(2)} ₼`, icon: <TrendingDown className="w-4 h-4" />, color: 'rose' },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-${s.color}-100 text-${s.color}-600`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{s.label}</p>
                <p className={`text-lg font-black text-${s.color}-700`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Yüklənir...</div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Activity className="w-10 h-10 text-slate-200 mx-auto" />
            <p className="text-slate-400 text-sm font-medium">Bu dövr üçün əməliyyat tapılmadı</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {data.map((a, idx) => {
              const isSale = a.type === 'SALE';
              return (
                <div key={`${a.type}-${a.id}-${idx}`}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isSale ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                  }`}>
                    {isSale ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                      <span className={`text-sm font-black ${isSale ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isSale ? 'Satış' : 'Qaytarma'}
                      </span>
                      {a.checkNumber != null && (
                        <span className="text-xs font-bold text-slate-400">Çek #{a.checkNumber}</span>
                      )}
                      {isSale && a.isRefunded && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-black">
                          QAYTARILIB
                        </span>
                      )}
                    </div>

                    {/* Items */}
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500 font-medium">
                      <Receipt className="w-3 h-3 shrink-0" />
                      {a.items?.length > 0 ? (
                        <>
                          <span className="truncate">{a.items[0]}</span>
                          {a.itemsCount > 1 && <span className="text-slate-400 shrink-0">+{a.itemsCount - 1}</span>}
                        </>
                      ) : (
                        <span className="text-slate-400">{a.itemsCount} məhsul</span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1">{fmtDate(a.createdAt)}</div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className={`text-base font-black ${isSale ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isSale ? '+' : '-'}{Number(a.amount).toFixed(2)} ₼
                    </p>
                    {isSale && a.returnedAmount > 0 && (
                      <p className="text-[11px] text-rose-500 font-semibold mt-0.5">
                        -{Number(a.returnedAmount).toFixed(2)} ₼ qaytarıldı
                      </p>
                    )}
                    {!isSale && a.originalAmount > 0 && (
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Satış: {Number(a.originalAmount).toFixed(2)} ₼
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Cəmi: {pagination.total} əməliyyat
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-700">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
