import { useState, useEffect } from 'react';
import { ismayilliApi } from '../../api';
import { BarChart, DollarSign, ShoppingCart, Layers, TrendingUp, Award, Activity } from 'lucide-react';

export default function IsmayilliStatistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await ismayilliApi.getStatistics();
      if (res.success) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('Fetch statistics error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Statistikalar yüklənir...</div>;
  }

  if (!stats) {
    return <div className="p-12 text-center text-slate-400">Heç bir statistik məlumat tapılmadı.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart className="text-purple-600 w-7 h-7" /> Statistika (İsmayıllı)
        </h1>
        <p className="text-slate-500 text-sm mt-1">İsmayıllı mağazasının maliyyə, satış və stok göstəriciləri</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ümumi Satış Gəliri</span>
            <span className="text-2xl font-black text-purple-600 block">{parseFloat(stats.totalRevenue).toFixed(2)} AZN</span>
          </div>
          <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Xalis Gəlir (Profit)</span>
            <span className="text-2xl font-black text-emerald-600 block">{parseFloat(stats.totalProfit).toFixed(2)} AZN</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Stokdakı Mal Sayı</span>
            <span className="text-2xl font-black text-slate-800 block">{parseFloat(stats.totalStockQuantity)} ədəd</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Stok Satış Dəyəri</span>
            <span className="text-2xl font-black text-blue-600 block">{parseFloat(stats.totalStockSaleValue).toFixed(2)} AZN</span>
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
    </div>
  );
}
