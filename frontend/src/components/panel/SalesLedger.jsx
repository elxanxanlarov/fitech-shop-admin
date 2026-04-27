import { useState, useEffect, useMemo } from 'react';
import { statisticsApi } from '../../api';
import { useBranch } from '../../hooks';
import React from 'react';
import {
  Calculator, RefreshCw, Calendar, TrendingUp, TrendingDown,
  Wallet, HandCoins, ShoppingCart, CreditCard, Banknote,
  ChevronDown, ChevronUp, Info, FileText, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

const fmt = (n) => parseFloat(n || 0).toFixed(2);
const fmtShort = (n) => {
  const v = parseFloat(n || 0);
  if (v === Math.floor(v)) return String(Math.floor(v));
  return v.toFixed(2);
};

const TODAY = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function SalesLedger() {
  const { selectedBranchId, selectedBranchName } = useBranch();
  const [startDate, setStartDate] = useState(TODAY());
  const [endDate, setEndDate] = useState(TODAY());
  const [allTime, setAllTime] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showRefunded, setShowRefunded] = useState(true);
  const [groupBy, setGroupBy] = useState('none'); // 'none' | 'branch' | 'payment'

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await statisticsApi.getLedger(
        allTime ? null : startDate,
        allTime ? null : endDate,
        selectedBranchId || null,
      );
      if (res.success) setData(res.data);
    } catch (e) {
      console.error('SalesLedger fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [startDate, endDate, allTime, selectedBranchId]);
  
  const handleExportExcel = () => {
    if (!data?.sales?.length) return;

    const wsData = [
      ['№', 'Tarix', 'Müştəri', 'Filial', 'Ödəniş Növü', 'Status', 'Məhsullar', 'Məbləğ (AZN)', 'Qazanc (AZN)']
    ];

    data.sales.forEach((s, idx) => {
      wsData.push([
        idx + 1,
        new Date(s.createdAt).toLocaleString('az-AZ'),
        (s.customerName || s.customerSurname) ? `${s.customerName || ''} ${s.customerSurname || ''}`.trim() : '-',
        s.branchName || 'Mərkəzi',
        s.isCredit ? 'Kredit' : s.paymentType === 'cash' ? 'Nəğd' : 'Kart',
        s.isRefunded ? 'Qaytarılıb' : 'Aktiv',
        s.items.map(i => `${i.productName} (${i.quantity} ədəd)`).join(', '),
        Number(s.totalAmount),
        Number(s.profitAmount)
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Satışlar');
    
    const maxWidths = [5, 20, 20, 15, 12, 12, 40, 15, 15];
    ws['!cols'] = maxWidths.map(w => ({ wch: w }));

    XLSX.writeFile(wb, `Satis_Defteri_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleRow = (id) => setExpandedRows(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const filteredSales = useMemo(() => {
    if (!data?.sales) return [];
    if (showRefunded) return data.sales;
    return data.sales.filter(s => !s.isRefunded);
  }, [data, showRefunded]);

  const ledgerFormula = useMemo(() => {
    if (!filteredSales.length) return '';
    const parts = filteredSales.map(s => fmtShort(s.totalAmount));
    const total = fmt(filteredSales.reduce((sum, s) => sum + s.totalAmount, 0));
    return `${parts.join(' + ')} = ${total}`;
  }, [filteredSales]);

  const groupedSales = useMemo(() => {
    if (!filteredSales) return {};
    if (groupBy === 'none') return { 'Bütün satışlar': filteredSales };
    if (groupBy === 'branch') {
      return filteredSales.reduce((acc, s) => {
        const k = s.branchName || 'Mərkəzi';
        (acc[k] = acc[k] || []).push(s);
        return acc;
      }, {});
    }
    if (groupBy === 'payment') {
      return filteredSales.reduce((acc, s) => {
        const k = s.isCredit ? 'Kredit' : s.paymentType === 'cash' ? 'Nəğd' : 'Kart';
        (acc[k] = acc[k] || []).push(s);
        return acc;
      }, {});
    }
    return {};
  }, [filteredSales, groupBy]);

  const payIcon = (s) => {
    if (s.isCredit) return <CreditCard className="w-3.5 h-3.5 text-violet-500" />;
    if (s.paymentType === 'cash') return <Banknote className="w-3.5 h-3.5 text-emerald-500" />;
    return <CreditCard className="w-3.5 h-3.5 text-sky-500" />;
  };

  const payLabel = (s) => {
    if (s.isCredit) return 'Kredit';
    if (s.paymentType === 'cash') return 'Nəğd';
    return 'Kart';
  };

  const sumOf = (arr) => arr.reduce((s, x) => s + x.totalAmount, 0);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 font-medium">Yüklənir...</span>
      </div>
    </div>
  );

  const s = data?.summary;

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-7 h-7 text-indigo-600" />
            Satış Dəftəri
          </h1>
          {selectedBranchName && (
            <span className="inline-flex items-center gap-1.5 mt-1 px-3 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              {selectedBranchName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Excel Yüklə
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Yenilə
          </button>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Başlanğıc tarixi</label>
            <input
              type="date" value={startDate} disabled={allTime}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-400 disabled:opacity-40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Son tarix</label>
            <input
              type="date" value={endDate} disabled={allTime}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-400 disabled:opacity-40"
            />
          </div>
          <button
            onClick={() => { setStartDate(TODAY()); setEndDate(TODAY()); setAllTime(false); }}
            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 transition-colors"
          >Bu gün</button>
          <button
            onClick={() => setAllTime(v => !v)}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${allTime ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
          >
            <Calendar className="w-4 h-4 inline mr-1" />
            Bütün zamanlar
          </button>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <input 
              type="checkbox" id="showRef" checked={showRefunded} 
              onChange={e => setShowRefunded(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <label htmlFor="showRef" className="text-sm font-medium text-gray-700 cursor-pointer">Qaytarılanları göstər</label>
          </div>

          <div className="ml-auto">
            <label className="block text-xs font-medium text-gray-500 mb-1">Qruplaşdır</label>
            <select
              value={groupBy} onChange={e => setGroupBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-indigo-400"
            >
              <option value="none">Qrupsuz</option>
              <option value="branch">Filial üzrə</option>
              <option value="payment">Ödəniş üzrə</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Formula Banner ────────────────────────────────────────────────── */}
      {filteredSales.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 to-violet-900 rounded-2xl p-5 text-white overflow-x-auto shadow-lg border border-indigo-800">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-indigo-300 uppercase tracking-widest flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5" />
              Satış qiymətlərinin cəmi
            </p>
            <span className="px-3 py-1 bg-indigo-500/30 border border-indigo-400/30 rounded-full text-xs font-bold text-indigo-200">
              Cəmi {filteredSales.length} ədəd satış
            </span>
          </div>
          <p className="font-mono text-sm leading-relaxed text-indigo-100 break-all bg-indigo-950/50 p-4 rounded-xl border border-indigo-800/50">
            {ledgerFormula}
          </p>
        </div>
      )}

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ümumi Satış (Gross) */}
          <div className="bg-white rounded-2xl border-2 border-blue-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Ümumi Satış (Gross)</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{fmt(s.totalAmount)} <span className="text-sm">AZN</span></p>
            <p className="text-xs text-blue-400 mt-1">{s.totalSales} ümumi qeydiyyat</p>
          </div>

          {/* Qazanc */}
          <div className="bg-white rounded-2xl border-2 border-emerald-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Qazanc</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{fmt(s.totalProfit)} <span className="text-sm">AZN</span></p>
            <p className="text-xs text-emerald-400 mt-1">Marja: {s.totalAmount > 0 ? ((s.totalProfit / s.totalAmount) * 100).toFixed(1) : 0}%</p>
          </div>

          {/* Xərclər */}
          <div className="bg-white rounded-2xl border-2 border-red-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">Xərclər</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{fmt(s.totalExpenses)} <span className="text-sm">AZN</span></p>
          </div>

          {/* Kassada Qalan */}
          <div className={`bg-white rounded-2xl border-2 p-4 shadow-sm ${s.cashboxBalance > 0 ? 'border-amber-200' : 'border-green-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.cashboxBalance > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
                <Wallet className={`w-5 h-5 ${s.cashboxBalance > 0 ? 'text-amber-600' : 'text-green-600'}`} />
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wide ${s.cashboxBalance > 0 ? 'text-amber-500' : 'text-green-500'}`}>Kassada Qalan</span>
            </div>
            <p className={`text-2xl font-bold ${s.cashboxBalance > 0 ? 'text-amber-700' : 'text-green-700'}`}>{fmt(s.cashboxBalance)} <span className="text-sm">AZN</span></p>
            <p className={`text-xs mt-1 ${s.cashboxBalance > 0 ? 'text-amber-400' : 'text-green-400'}`}>
              {s.cashboxBalance > 0 ? 'Hələ təslim edilməyib' : 'Hamısı təslim edilib'}
            </p>
          </div>
        </div>
      )}

      {/* ── Cashbox Breakdown ─────────────────────────────────────────────── */}
      {s && (
        <div className="bg-gray-900 rounded-2xl p-5 text-white">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Kassa Hesablaması</p>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-300 text-sm">Nəğd Satış:</span>
              <span className="font-bold text-emerald-300">+{fmt(s.cashSales)} AZN</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-400" />
              <span className="text-gray-300 text-sm">Kredit Ödəniş:</span>
              <span className="font-bold text-sky-300">+{fmt(s.creditPayments)} AZN</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-gray-300 text-sm">Xərclər + Qaytarmalar:</span>
              <span className="font-bold text-red-300">−{fmt(s.cashOut)} AZN</span>
            </div>
            <div className="flex items-center gap-2">
              <HandCoins className="w-4 h-4 text-orange-400" />
              <span className="text-gray-300 text-sm">Təslim ({s.handoverCount} dəfə):</span>
              <span className="font-bold text-orange-300">−{fmt(s.totalHandovers)} AZN</span>
            </div>
            <div className="ml-auto flex items-center gap-2 pl-4 border-l border-gray-700">
              <span className="text-gray-300 text-sm">Balans:</span>
              <span className="text-xl font-bold text-yellow-300">{fmt(s.cashboxBalance)} AZN</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Sales Table ───────────────────────────────────────────────────── */}
      {filteredSales.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedSales).map(([groupName, groupSales]) => (
            <div key={groupName} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Group header */}
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="font-bold text-gray-700 text-sm">{groupName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{groupSales.length} satış</span>
                  <span className="font-bold text-indigo-700 text-sm">{fmt(sumOf(groupSales))} AZN</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase">№</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase">Tarix</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase">Müştəri</th>
                      {groupBy !== 'branch' && <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase">Filial</th>}
                      <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase">Ödəniş</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs uppercase">Məbləğ</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs uppercase">Qazanc</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupSales.map((sale, idx) => (
                      <React.Fragment key={sale.id}>
                        <tr
                          className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${sale.isRefunded ? 'bg-red-50/50' : ''}`}
                          onClick={() => toggleRow(sale.id)}
                        >
                          <td className="py-3 px-4 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="py-3 px-4 text-gray-600 text-xs whitespace-nowrap">
                            {new Date(sale.createdAt).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            <div className="flex flex-col">
                              <span className={sale.isRefunded ? 'line-through text-gray-400' : ''}>
                                {sale.customerName || sale.customerSurname
                                  ? `${sale.customerName || ''} ${sale.customerSurname || ''}`.trim()
                                  : <span className="text-gray-400 italic text-xs">—</span>}
                              </span>
                              {sale.isRefunded && <span className="text-[10px] font-bold text-red-500 uppercase">Qaytarılıb</span>}
                            </div>
                          </td>
                          {groupBy !== 'branch' && (
                            <td className="py-3 px-4 text-gray-500 text-xs">{sale.branchName || 'Mərkəzi'}</td>
                          )}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100">
                              {payIcon(sale)} {payLabel(sale)}
                            </span>
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${sale.isRefunded ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {fmt(sale.totalAmount)}
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${sale.isRefunded ? 'text-gray-400 line-through' : 'text-emerald-600'}`}>
                            {fmt(sale.profitAmount)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {expandedRows.has(sale.id)
                              ? <ChevronUp className="w-4 h-4 text-gray-400 inline" />
                              : <ChevronDown className="w-4 h-4 text-gray-400 inline" />}
                          </td>
                        </tr>
                        {expandedRows.has(sale.id) && (
                          <tr key={`${sale.id}-detail`} className="bg-indigo-50">
                            <td colSpan={groupBy !== 'branch' ? 8 : 7} className="px-6 py-3">
                              <div className="space-y-1">
                                {sale.items.map((item, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs text-gray-600">
                                    <span className={sale.isRefunded ? 'line-through' : ''}>• {item.productName} × {item.quantity}</span>
                                    <span className={`font-semibold ${sale.isRefunded ? 'line-through' : ''}`}>
                                      {fmt(item.pricePerItem)} × {item.quantity} = {fmt(item.totalPrice)} AZN
                                    </span>
                                  </div>
                                ))}
                                {sale.isRefunded && (
                                  <div className="text-[10px] text-red-500 mt-2 font-bold italic">
                                    * Bu satış tamamilə qaytarılıb ({new Date(sale.refundedAt).toLocaleString('az-AZ')})
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-xs font-bold text-indigo-700 border-t border-indigo-200 pt-1 mt-1">
                                  <span>Cəmi</span>
                                  <span className={sale.isRefunded ? 'line-through' : ''}>{fmt(sale.totalAmount)} AZN</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan={groupBy !== 'branch' ? 5 : 4} className="py-3 px-4 font-bold text-gray-700">Cəmi</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-700 text-base">
                        {fmt(sumOf(groupSales))} AZN
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        {fmt(groupSales.reduce((s, x) => s + x.profitAmount, 0))} AZN
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center gap-3 text-gray-400">
          <Calculator className="w-12 h-12 opacity-30" />
          <p className="font-medium">Seçilmiş dövr üçün satış tapılmadı</p>
          <p className="text-sm">Tarixi dəyişin və ya "Bütün zamanlar" seçin</p>
        </div>
      )}
    </div>
  );
}
