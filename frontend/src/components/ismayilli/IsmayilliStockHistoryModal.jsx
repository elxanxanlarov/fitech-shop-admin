import React, { useState, useEffect } from 'react';
import { ismayilliApi } from '../../api';
import Alert from '../ui/Alert';
import { Package, Search, ShoppingCart, ArrowDownRight, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import dayjs from 'dayjs';

export default function IsmayilliStockHistoryModal({ isOpen, onClose, productId, product, initialTab = 'movements' }) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [movements, setMovements] = useState([]);
    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Stock Form
    const [type, setType] = useState('IN');
    const [quantity, setQuantity] = useState('');
    const [note, setNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && productId) {
            fetchData();
        }
    }, [isOpen, productId, activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'movements' || activeTab === 'adjustment') {
                const res = await ismayilliApi.getStockMovements(productId);
                if (res.success) setMovements(res.data);
            } else if (activeTab === 'sales') {
                const res = await ismayilliApi.getSalesHistory(productId);
                if (res.success) setSales(res.data);
            }
        } catch (error) {
            Alert.error('Xəta', 'Məlumatlar yüklənərkən xəta baş verdi');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStockSubmit = async (e) => {
        e.preventDefault();
        if (!quantity || parseFloat(quantity) <= 0) {
            Alert.error('Xəta', 'Düzgün miqdar daxil edin');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                type,
                quantity: parseFloat(quantity),
                note
            };
            const res = await ismayilliApi.adjustStock(productId, payload);
            if (res.success) {
                Alert.success('Uğurlu', 'Stok uğurla yeniləndi');
                setQuantity('');
                setNote('');
                fetchData();
                // We should also notify the parent to refresh the product list
            }
        } catch (error) {
            Alert.error('Xəta', error.response?.data?.message || 'Əməliyyat zamanı xəta baş verdi');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Package className="text-purple-600" />
                            Stok və Tarixçə: {product?.name}
                        </h2>
                        <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
                            <span className="font-semibold text-slate-700">Cari Stok: {parseFloat(product?.quantity || 0)}</span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-white px-6">
                    <button
                        onClick={() => setActiveTab('adjustment')}
                        className={`py-4 px-6 text-sm font-semibold border-b-2 transition-colors ${
                            activeTab === 'adjustment'
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Stok Tənzimləməsi
                    </button>
                    <button
                        onClick={() => setActiveTab('movements')}
                        className={`py-4 px-6 text-sm font-semibold border-b-2 transition-colors ${
                            activeTab === 'movements'
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Stok Tarixçəsi
                    </button>
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`py-4 px-6 text-sm font-semibold border-b-2 transition-colors ${
                            activeTab === 'sales'
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Satış Tarixçəsi
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
                    {activeTab === 'adjustment' && (
                        <div className="max-w-xl mx-auto bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                            <form onSubmit={handleStockSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setType('IN')}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                                            type === 'IN' 
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                                                : 'border-slate-200 hover:border-emerald-200 text-slate-500'
                                        }`}
                                    >
                                        <ArrowDownRight className="w-6 h-6" />
                                        <span className="font-bold">Giriş (Artırma)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('OUT')}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                                            type === 'OUT' 
                                                ? 'border-red-500 bg-red-50 text-red-700' 
                                                : 'border-slate-200 hover:border-red-200 text-slate-500'
                                        }`}
                                    >
                                        <ArrowUpRight className="w-6 h-6" />
                                        <span className="font-bold">Çıxış (Azaltma)</span>
                                    </button>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Miqdar</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                                        placeholder="Məs. 10"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Qeyd (İxtiyari)</label>
                                    <input
                                        type="text"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Səbəb və ya açıqlama..."
                                    />
                                </div>
                                
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? 'Saxlanılır...' : 'Təsdiqlə'}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'movements' && (
                        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                            {isLoading ? (
                                <div className="p-8 text-center text-slate-500">Yüklənir...</div>
                            ) : movements.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">Stok tarixçəsi tapılmadı</div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Tarix</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Əməliyyat</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Miqdar</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Qeyd</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {movements.map((m) => (
                                            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 text-sm font-medium text-slate-700">
                                                    {dayjs(m.createdAt).format('DD.MM.YYYY HH:mm')}
                                                </td>
                                                <td className="p-4">
                                                    {m.type === 'IN' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                                            <ArrowDownRight className="w-3 h-3" /> Giriş
                                                        </span>
                                                    ) : m.type === 'OUT' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                                            <ArrowUpRight className="w-3 h-3" /> Çıxış
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                            <ArrowRightLeft className="w-3 h-3" /> Tənzimləmə
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-sm font-bold text-slate-900">
                                                    {m.type === 'OUT' ? '-' : '+'}{parseFloat(m.quantity)}
                                                </td>
                                                <td className="p-4 text-sm text-slate-500">
                                                    {m.note || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === 'sales' && (
                        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                            {isLoading ? (
                                <div className="p-8 text-center text-slate-500">Yüklənir...</div>
                            ) : sales.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">Satış tarixçəsi tapılmadı</div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Tarix</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Qəbz ID</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Miqdar</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Qiymət</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Ümumi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sales.map((s) => (
                                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 text-sm font-medium text-slate-700">
                                                    {dayjs(s.sale?.createdAt).format('DD.MM.YYYY HH:mm')}
                                                </td>
                                                <td className="p-4 text-sm font-mono text-slate-500">
                                                    {s.saleId?.substring(0, 8)}...
                                                </td>
                                                <td className="p-4 text-sm font-bold text-slate-900">
                                                    {parseFloat(s.quantity)}
                                                </td>
                                                <td className="p-4 text-sm font-medium text-slate-700">
                                                    {parseFloat(s.pricePerItem).toFixed(2)} AZN
                                                </td>
                                                <td className="p-4 text-sm font-bold text-blue-600">
                                                    {parseFloat(s.totalPrice).toFixed(2)} AZN
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
