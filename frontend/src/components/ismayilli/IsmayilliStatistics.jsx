import { useState, useEffect, useCallback } from 'react';
import { ismayilliApi } from '../../api';
import { BarChart, DollarSign, ShoppingCart, Layers, TrendingUp, Award, Activity, ArrowDownLeft, ArrowUpRight, Receipt, History, Calendar } from 'lucide-react';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PRESETS = [
  { label: 'Bu gün', get: () => { const t = todayStr(); return { s: t, e: t }; } },
  {
    label: 'Bu həftə', get: () => {
      const d = new Date(); const mon = new Date(d);
      mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const fmt = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
      return { s: fmt(mon), e: fmt(d) };
    }
  },
  {
    label: 'Bu ay', get: () => {
      const d = new Date();
      return { s: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, e: todayStr() };
    }
  },
  { label: 'Hamısı', get: () => ({ s: '', e: '' }) },
];

export default function IsmayilliStatistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;
      const res = await ismayilliApi.getStatistics(params);
      if (res.success) setStats(res.data);
    } catch (error) {
      console.error('Fetch statistics error:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const applyPreset = (preset) => {
    const { s, e } = preset.get();
    setStartDate(s);
    setEndDate(e);
  };

  const dateLabel = startDate || endDate
    ? `${startDate || '...'} → ${endDate || '...'}`
    : 'Bütün dövr';

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Statistikalar yüklənir...</div>;
  }

  if (!stats) {
    return <div className="p-12 text-center text-slate-400">Heç bir statistik məlumat tapılmadı.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart className="text-purple-600 w-7 h-7" /> Statistika (İsmayıllı)
            </h1>
            <p className="text-slate-500 text-sm mt-1">İsmayıllı mağazasının maliyyə, satış və stok göstəriciləri</p>
          </div>
          <span className="text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-100 rounded-xl px-3 py-1.5 self-center">
            {dateLabel}
          </span>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap gap-2 items-end">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all"
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 w-36"
              />
            </div>
            <span className="text-slate-400 text-xs font-bold">→</span>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 w-36"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 - Ümumi Satış Gəliri */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ümumi Satış Gəliri</span>
            <span className="text-2xl font-black text-purple-600 block">{parseFloat(stats.totalRevenue || 0).toFixed(2)} AZN</span>
          </div>
          <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2 - Xalis Gəlir (Profit) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Xalis Gəlir (Profit)</span>
            <span className="text-2xl font-black text-emerald-600 block">{parseFloat(stats.totalProfit || 0).toFixed(2)} AZN</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3 - Stokdakı Mal Sayı (stokda olan aktiv məhsul çeşidi) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Stokdakı Mal Sayı</span>
            <span className="text-2xl font-black text-slate-800 block">
              {Number(stats.inStockProductsCount ?? stats.totalProductsCount ?? 0).toLocaleString('az-AZ')}
              <span className="text-sm font-bold text-slate-400 ml-1">çeşid</span>
            </span>
            <span className="text-[11px] font-medium text-slate-400 block">
              Cəmi çeşid: {Number(stats.totalProductsCount || 0).toLocaleString('az-AZ')} • Ümumi miqdar: {Number(stats.totalStockQuantity || 0).toLocaleString('az-AZ', { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4 - Stok Satış Dəyəri */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Stok Satış Dəyəri</span>
            <span className="text-2xl font-black text-blue-600 block">{parseFloat(stats.totalStockSaleValue || 0).toFixed(2)} AZN</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Table (Left 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Award className="text-purple-600" /> Kateqoriya Analizi
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Kateqoriya</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Məhsul Sayı</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Anbar Dəyəri</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Satış Gəliri</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Qazanc (Profit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.categoryStats?.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-sm font-semibold text-slate-900">{cat.name}</td>
                    <td className="p-3 text-sm text-slate-500 font-bold">{cat.productCount}</td>
                    <td className="p-3 text-sm text-slate-600 font-semibold">{parseFloat(cat.stockValue).toFixed(2)} AZN</td>
                    <td className="p-3 text-sm text-purple-600 font-bold">{parseFloat(cat.revenue).toFixed(2)} AZN</td>
                    <td className="p-3 text-sm text-emerald-600 font-bold">{parseFloat(cat.profit).toFixed(2)} AZN</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Sales Trend Breakdown (Right 1 col) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Activity className="text-purple-600" /> Son Satışlar Trendi
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {stats.dailyTrend?.length === 0 ? (
              <div className="text-center text-slate-400 py-12">Son 30 gündə heç bir satış yoxdur.</div>
            ) : (
              stats.dailyTrend.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-bold text-slate-600">{t.date}</span>
                  <span className="text-sm font-black text-purple-600">+{parseFloat(t.amount).toFixed(2)} AZN</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Son Əməliyyatlar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <History className="text-purple-600" /> Son Əməliyyatlar
        </h3>
        {(!stats.recentActivities || stats.recentActivities.length === 0) ? (
          <div className="text-center text-slate-400 py-12">Hələ heç bir əməliyyat yoxdur.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.recentActivities.map((a, idx) => {
              const isSale = a.type === 'SALE';
              const date = new Date(a.createdAt);
              const dateStr = date.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const timeStr = date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
              return (
                <div
                  key={`${a.type}-${a.id}-${idx}`}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${isSale ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50/40 border-rose-100'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSale ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {isSale ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-black uppercase tracking-wider ${isSale ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isSale ? 'Satış' : 'Qaytarma'}
                        {a.checkNumber != null && <span className="ml-1 text-slate-400 font-bold">#{a.checkNumber}</span>}
                      </span>
                      <span className={`text-sm font-black ${isSale ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isSale ? '+' : '-'}{Number(a.amount || 0).toFixed(2)} AZN
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 truncate flex items-center gap-1">
                      <Receipt className="w-3 h-3 shrink-0" />
                      {a.firstItemName ? (
                        <>
                          {a.firstItemName}
                          {a.itemsCount > 1 && <span className="text-slate-400">+{a.itemsCount - 1} daha</span>}
                        </>
                      ) : (
                        <span className="text-slate-400">{a.itemsCount} məhsul</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-medium">
                      {dateStr} • {timeStr}
                      {isSale && a.isRefunded && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 font-bold">QAYTARILIB</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
