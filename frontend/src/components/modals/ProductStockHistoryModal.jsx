import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Package, ShoppingCart, Undo, Send, Info, Activity } from 'lucide-react';
import ModalLayout from '../ui/ModalLayout';
import { stockApi, productApi, branchApi, stockTransferApi } from '../../api';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import Alert from '../ui/Alert';

export default function ProductStockHistoryModal({ isOpen, onClose, productId, product, initialTab = 'details' }) {
    const { t } = useTranslation(['product', 'sale']);
    const [loading, setLoading] = useState(false);
    const [stockMovements, setStockMovements] = useState([]);
    const [sales, setSales] = useState([]);
    const [returns, setReturns] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [activeTab, setActiveTab] = useState(initialTab || 'details'); // 'details', 'movements', 'sales', 'returns', 'transfers', 'all'
    const { selectedBranchId } = useBranch();
    const { user } = useAuth();

    // Müəyyən edirik ki, hansı filialın məlumatlarını göstərməliyik
    // Əgər istifadəçinin xüsusi təyin olunmuş filialı varsa (branchId), onu istifadə edirik, 
    // yoxdursa (superadmin), seçilmiş filialı istifadə edirik.
    const effectiveBranchId = user?.branchId || selectedBranchId;

    // Transfer Form State
    const [transferTargetBranchId, setTransferTargetBranchId] = useState('');
    const [transferQuantity, setTransferQuantity] = useState('');
    const [transferBoxes, setTransferBoxes] = useState('');
    const [transferPieces, setTransferPieces] = useState('');
    const [transferNote, setTransferNote] = useState('');
    const [processingTransfer, setProcessingTransfer] = useState(false);

    useEffect(() => {
        if (isOpen && productId) {
            fetchHistory();
            if (initialTab) setActiveTab(initialTab);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, productId, initialTab]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Stok hərəkətləri
            const stockResponse = await stockApi.getAll(productId);
            if (stockResponse.success) {
                setStockMovements(stockResponse.date || stockResponse.data || []);
            }

            // Satışlar
            const salesResponse = await productApi.getSales(productId);
            if (salesResponse.success) {
                setSales(salesResponse.date || salesResponse.data || []);
            }

            // Qaytarmalar
            const returnsResponse = await productApi.getReturns(productId);
            if (returnsResponse.success) {
                setReturns(returnsResponse.date || returnsResponse.data || []);
            }

            // Transferlər
            const transfersResponse = await stockTransferApi.getAll({ productId });
            if (transfersResponse.success) {
                setTransfers(transfersResponse.data || transfersResponse.date || []);
            }

            // Filiallar
            const branchesResponse = await branchApi.getAll();
            if (branchesResponse.success) {
                setBranches(branchesResponse.data || branchesResponse.date || []);
            }
        } catch (error) {
            console.error('Error fetching stock history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);

        const azMonths = [
            'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
            'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
        ];

        const day = date.getDate();
        const month = azMonths[date.getMonth()];
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (itemDate.getTime() === today.getTime()) {
            return `Bu gün ${hours}:${minutes}`;
        } else if (itemDate.getTime() === yesterday.getTime()) {
            return `Dünən ${hours}:${minutes}`;
        } else {
            return `${day} ${month} ${year}, ${hours}:${minutes}`;
        }
    };

    const formatQuantity = (quantity, unitType, piecesPerBox) => {
        if (unitType === 'PIECE' || !piecesPerBox) {
            return `${quantity} ədəd`;
        }

        const boxes = Math.floor(quantity / piecesPerBox);
        const pieces = quantity % piecesPerBox;
        const unitLabel = unitType === 'BOX' ? 'ədəd' :
            unitType === 'METER' ? 'metr' :
                unitType === 'LITER' ? 'litr' :
                    unitType === 'KILOGRAM' ? 'kq' : 'ədəd';

        if (boxes > 0 && pieces > 0) {
            return `${boxes} ${unitType === 'BOX' ? 'qutu' : 'paket'} + ${pieces} açıq (${quantity} ${unitLabel})`;
        } else if (boxes > 0) {
            return `${boxes} ${unitType === 'BOX' ? 'qutu' : 'paket'} (${quantity} ${unitLabel})`;
        } else if (pieces > 0) {
            return `${pieces} açıq (${quantity} ${unitLabel})`;
        }
        return `${quantity} ${unitLabel}`;
    };

    // Filtered data based on branch
    const filteredMovements = useMemo(() => {
        if (!effectiveBranchId || effectiveBranchId === 'central') return stockMovements;
        return stockMovements.filter(m => m.branchId === effectiveBranchId);
    }, [stockMovements, effectiveBranchId]);

    const filteredSales = useMemo(() => {
        if (!effectiveBranchId || effectiveBranchId === 'central') return sales;
        return sales.filter(s => s.sale?.branchId === effectiveBranchId);
    }, [sales, effectiveBranchId]);

    const filteredReturns = useMemo(() => {
        if (!effectiveBranchId || effectiveBranchId === 'central') return returns;
        return returns.filter(r => r.return?.branchId === effectiveBranchId);
    }, [returns, effectiveBranchId]);

    const filteredTransfers = useMemo(() => {
        if (!effectiveBranchId || effectiveBranchId === 'central') return transfers;
        return transfers.filter(t => t.fromBranchId === effectiveBranchId || t.toBranchId === effectiveBranchId);
    }, [transfers, effectiveBranchId]);

    const calculateTotalStock = () => {
        if (!product) return 0;
        if (product.unitType === 'PIECE' || !product.piecesPerBox) {
            return product.stock || 0;
        }
        const fullBoxes = product.fullBoxes || 0;
        const opened = product.openedBoxQuantity || 0;
        return (fullBoxes * product.piecesPerBox) + opened;
    };

    const allHistory = useMemo(() => {
        // Hide stock movements that are auto-generated from sales to prevent duplicates
        const movementsWithoutSales = filteredMovements.filter(m => !(m.note && m.note.startsWith('Satış #')));
        
        let history = [
            ...movementsWithoutSales.map(m => ({ ...m, historyType: 'movement', date: m.createdAt })),
            ...filteredSales.map(s => ({
                ...s,
                historyType: 'sale',
                date: s.sale?.createdAt || s.createdAt,
                sale: s.sale ? { ...s.sale, staff: s.sale.staff } : s.sale
            })),
            ...filteredReturns.map(r => ({ ...r, historyType: 'return', date: r.return?.createdAt || r.createdAt })),
            ...filteredTransfers.map(t => ({ ...t, historyType: 'transfer', date: t.createdAt }))
        ];

        // Sort descending (newest first)
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Calculate running balance backwards
        let currentRunningStock = calculateTotalStock();

        const enrichedHistory = history.map(item => {
            const newStock = currentRunningStock;
            let previousStock = newStock;
            let qty = Math.abs(item.quantity || 0);

            if (item.historyType === 'sale' || (item.historyType === 'movement' && item.type === 'OUT')) {
                previousStock = newStock + qty;
            } else if (item.historyType === 'return' || (item.historyType === 'movement' && item.type === 'IN')) {
                previousStock = newStock - qty;
            } else if (item.historyType === 'transfer') {
                if (item.fromBranchId === effectiveBranchId) {
                    previousStock = newStock + qty; // Transferred OUT
                } else if (item.toBranchId === effectiveBranchId) {
                    previousStock = newStock - qty; // Transferred IN
                }
            } else if (item.historyType === 'movement' && item.type === 'ADJUSTMENT') {
                if (item.previousStock !== undefined && item.newStock !== undefined) {
                    previousStock = item.previousStock;
                }
            }

            const enrichedItem = {
                ...item,
                calculatedPreviousStock: previousStock,
                calculatedNewStock: newStock
            };

            currentRunningStock = previousStock;
            return enrichedItem;
        });

        // Add an artificial "Creation" event if we still have stock at the beginning
        if (currentRunningStock > 0 && enrichedHistory.length > 0) {
            enrichedHistory.push({
                historyType: 'movement',
                type: 'IN',
                quantity: currentRunningStock,
                calculatedPreviousStock: 0,
                calculatedNewStock: currentRunningStock,
                note: 'İlkin yaradılma (Avtomatik hesablanıb)',
                date: product?.createdAt || new Date(0),
                staff: { name: 'Sistem' }
            });
        }

        return enrichedHistory;
    }, [filteredMovements, filteredSales, filteredReturns, filteredTransfers, product, effectiveBranchId]);

    // Derive display lists from the fully enriched allHistory
    const displayMovements = useMemo(() => allHistory.filter(h => h.historyType === 'movement'), [allHistory]);
    const displaySales = useMemo(() => allHistory.filter(h => h.historyType === 'sale'), [allHistory]);
    const displayReturns = useMemo(() => allHistory.filter(h => h.historyType === 'return'), [allHistory]);

    const formatStockDisplay = () => {
        if (!product) return '0 ədəd';
        if (product.unitType === 'PIECE' || !product.piecesPerBox) {
            return `${product.stock || 0} ədəd`;
        }
        const fullBoxes = product.fullBoxes || 0;
        const opened = product.openedBoxQuantity || 0;
        const total = (fullBoxes * product.piecesPerBox) + opened;
        const unitLabel = product.unitType === 'BOX' ? 'ədəd' :
            product.unitType === 'METER' ? 'metr' :
                product.unitType === 'LITER' ? 'litr' :
                    product.unitType === 'KILOGRAM' ? 'kq' : 'ədəd';
        const boxLabel = product.unitType === 'BOX' ? 'qutu' : 'paket';

        if (fullBoxes > 0 && opened > 0) {
            return `${fullBoxes} tam ${boxLabel} + ${opened} açıq (${total} ${unitLabel})`;
        } else if (fullBoxes > 0) {
            return `${fullBoxes} tam ${boxLabel} (${total} ${unitLabel})`;
        } else if (opened > 0) {
            return `${opened} açıq (${total} ${unitLabel})`;
        }
        return `0 ${unitLabel}`;
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        
        if (!transferTargetBranchId) {
            Alert.error('Xəta!', 'Zəhmət olmasa hədəf filialı seçin');
            return;
        }

        const sourceBranchId = (selectedBranchId && selectedBranchId !== 'central') ? selectedBranchId : null;
        
        if (sourceBranchId === transferTargetBranchId) {
            Alert.error('Xəta!', 'Mənbə və hədəf filial eyni ola bilməz');
            return;
        }

        let finalQuantity = 0;
        if (product.unitType === 'PIECE' || !product.piecesPerBox) {
            if (!transferQuantity || parseInt(transferQuantity) <= 0) {
                Alert.error('Xəta!', 'Miqdar daxil edilməlidir');
                return;
            }
            finalQuantity = parseInt(transferQuantity);
        } else {
            const boxes = parseInt(transferBoxes) || 0;
            const pieces = parseInt(transferPieces) || 0;
            if (boxes === 0 && pieces === 0) {
                Alert.error('Xəta!', 'Miqdar daxil edilməlidir');
                return;
            }
            finalQuantity = (boxes * (product.piecesPerBox || 1)) + pieces;
        }

        // Cari stoku yoxla
        const currentStock = calculateTotalStock();
        if (finalQuantity > currentStock) {
            Alert.error('Xəta!', `Kifayət qədər stok yoxdur. Cari stok: ${currentStock}`);
            return;
        }

        setProcessingTransfer(true);
        try {
            const payload = {
                productId,
                fromBranchId: sourceBranchId,
                toBranchId: transferTargetBranchId,
                quantity: finalQuantity,
                note: transferNote,
                status: 'PENDING'
            };

            const response = await stockTransferApi.create(payload);
            if (response.success) {
                Alert.success('Uğurlu!', 'Stok transferi uğurla yaradıldı');
                setTransferTargetBranchId('');
                setTransferQuantity('');
                setTransferBoxes('');
                setTransferPieces('');
                setTransferNote('');
                fetchHistory(); // Tarixçəni yenilə
                setActiveTab('transfers'); // Transferlər tabına keç
            }
        } catch (error) {
            console.error('Error creating transfer:', error);
            Alert.error('Xəta!', error.response?.data?.message || 'Transfer zamanı xəta baş verdi');
        } finally {
            setProcessingTransfer(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalLayout
            isOpen={isOpen}
            onClose={onClose}
            title={`${product?.name || t('product:product')} - ${t('product:stock_history')}`}
            className="w-[80vw] h-[85vh]"
        >
            <div className="space-y-4 max-h-[calc(85vh-180px)] overflow-y-auto pr-2 custom-scrollbar">
                {/* Current Stock Display */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Package className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-0.5">Cari Stok ({!effectiveBranchId || effectiveBranchId === 'central' ? 'Ümumi' : 'Bu Filial'})</div>
                                <div className="text-2xl font-bold text-blue-900">{formatStockDisplay()}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Ümumi Miqdar</div>
                            <div className="text-xl font-bold text-gray-800">{calculateTotalStock()} {product?.unitType === 'PIECE' || !product?.piecesPerBox ? 'ədəd' :
                                product?.unitType === 'METER' ? 'metr' :
                                    product?.unitType === 'LITER' ? 'litr' :
                                        product?.unitType === 'KILOGRAM' ? 'kq' : 'ədəd'}</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar gap-1 pt-2">
                    {[
                        { id: 'details', label: t('product:basic_info'), icon: Info },
                        { id: 'all', label: t('sale:all'), icon: Activity },
                        { id: 'movements', label: t('product:stock_movements_history'), icon: Package },
                        { id: 'sales', label: t('sale:sales_history'), icon: ShoppingCart },
                        { id: 'returns', label: t('sale:returns_history'), icon: Undo },
                        { id: 'transfers', label: t('product:stock_transfers'), icon: Send },
                    ].map((tab) => {
                        const Icon = tab.icon || Package;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-3 text-sm font-medium transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        <p className="text-gray-500 font-medium">{t('product:loading')}</p>
                    </div>
                ) : (
                    <div className="pb-6">
                        {/* Details Tab */}
                        {activeTab === 'details' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                <div className="space-y-5">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('product:name')}</h3>
                                        <p className="text-xl font-bold text-gray-900 leading-tight">{product?.name || '-'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('product:barcode')}</h3>
                                            <p className="text-sm font-mono bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-lg w-fit text-gray-700">{product?.barcode || '-'}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('product:category')}</h3>
                                            <p className="text-sm font-semibold text-gray-700 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg w-fit">{product?.categoryName || product?.category?.name || '-'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('product:description')}</h3>
                                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 min-h-[60px] italic">{product?.description || t('product:no_products_description')}</p>
                                    </div>
                                </div>
                                <div className="space-y-6 flex flex-col justify-between">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                            <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">{t('product:purchase_price')}</h3>
                                            <p className="text-2xl font-black text-emerald-700">{parseFloat(product?.purchasePrice || 0).toFixed(2)} <span className="text-sm font-bold">₼</span></p>
                                        </div>
                                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">{t('product:sale_price')}</h3>
                                            <p className="text-2xl font-black text-blue-700">{parseFloat(product?.salePrice || 0).toFixed(2)} <span className="text-sm font-bold">₼</span></p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setActiveTab('movements')}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-gray-900 text-white rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200 font-bold text-sm"
                                        >
                                            <Package className="w-5 h-5" />
                                            {t('product:stock_movements_history')}
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('sales')}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-bold text-sm"
                                        >
                                            <ShoppingCart className="w-5 h-5" />
                                            {t('sale:sales_history')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* All History Table */}
                        {activeTab === 'all' && (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                {allHistory.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400">
                                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p className="font-medium">Tarixçə tapılmadı</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarix</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Filial</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Növ</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Miqdar</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kim etdi / Qeyd</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {allHistory.map((item, index) => (
                                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                            {formatDate(item.date)}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">
                                                            {item.branch?.name || item.sale?.branch?.name || item.return?.branch?.name || 
                                                             (item.historyType === 'transfer' ? `${item.fromBranch?.name || 'M.Anbar'} ➔ ${item.toBranch?.name || 'M.Anbar'}` : 'Mərkəzi Anbar')}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {item.historyType === 'movement' ? (
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${item.type === 'IN' ? 'bg-green-100 text-green-700' :
                                                                        item.type === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                                    }`}>
                                                                    {item.type === 'IN' ? 'Giriş' : item.type === 'OUT' ? 'Çıxış' : 'Düzəliş'}
                                                                </span>
                                                            ) : (
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                                    item.historyType === 'sale' ? 'bg-blue-100 text-blue-700' : 
                                                                    item.historyType === 'return' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                                                                }`}>
                                                                    {item.historyType === 'sale' ? 'Satış' : item.historyType === 'return' ? 'Qaytarma' : 'Transfer'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                                            {formatQuantity(Math.abs(item.quantity || 0), product?.unitType || 'PIECE', product?.piecesPerBox)}
                                                            {(item.calculatedPreviousStock !== undefined && item.calculatedPreviousStock !== null && item.calculatedNewStock !== undefined && item.calculatedNewStock !== null) && (
                                                                <div className="mt-1 text-xs font-normal text-gray-500">
                                                                    <span>{item.calculatedPreviousStock}</span>
                                                                    <span className="mx-1">➔</span>
                                                                    <span className="text-blue-600 font-semibold">{item.calculatedNewStock}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            <div className="font-semibold text-gray-700">
                                                                {item.staff?.name || item.sale?.staff?.name || '-'}
                                                            </div>
                                                            <div className="text-xs mt-0.5 max-w-[200px] truncate">
                                                                {item.note || item.description || (item.historyType === 'sale' ? `Satış #${item.sale?.id?.substring(0, 8)}` : '')}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Movements Tab */}
                        {activeTab === 'movements' && (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                {displayMovements.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400">
                                        <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p className="font-medium">Hərəkət tapılmadı</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarix</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Növ</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Miqdar</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stok Dəyişimi</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Qeyd / İcraçı</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {displayMovements.map((movement) => (
                                                    <tr key={movement.id || Math.random()} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatDate(movement.createdAt)}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${movement.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {movement.type === 'IN' ? 'Stok Girişi' : 'Stok Çıxışı'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatQuantity(Math.abs(movement.quantity), product?.unitType, product?.piecesPerBox)}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {movement.calculatedPreviousStock != null && movement.calculatedNewStock != null ? (
                                                                <>
                                                                    <span className="font-medium text-gray-400">{movement.calculatedPreviousStock}</span>
                                                                    <span className="mx-2 text-gray-300">➔</span>
                                                                    <span className="font-bold text-blue-600">{movement.calculatedNewStock}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            <div className="font-semibold text-gray-700">{movement.staff?.name || '-'}</div>
                                                            <div className="text-xs mt-0.5">{movement.note || '-'}</div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sales Tab */}
                        {activeTab === 'sales' && (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                {displaySales.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400">
                                        <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p className="font-medium">Satış tapılmadı</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarix</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Satış #</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Miqdar</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Məbləğ</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stok Dəyişimi</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Müştəri / Satıcı</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {displaySales.map((sale) => (
                                                    <tr key={sale.id || Math.random()} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatDate(sale.date || sale.sale?.createdAt)}</td>
                                                        <td className="px-6 py-4 text-sm font-mono text-blue-600">#{sale.sale?.id?.substring(0, 8)}</td>
                                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatQuantity(sale.quantity, product?.unitType, product?.piecesPerBox)}</td>
                                                        <td className="px-6 py-4 text-sm font-bold text-emerald-600">{parseFloat(sale.totalPrice || 0).toFixed(2)} ₼</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {sale.calculatedPreviousStock != null && sale.calculatedNewStock != null ? (
                                                                <>
                                                                    <span className="font-medium text-gray-400">{sale.calculatedPreviousStock}</span>
                                                                    <span className="mx-2 text-gray-300">➔</span>
                                                                    <span className="font-bold text-blue-600">{sale.calculatedNewStock}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            <div className="font-semibold text-gray-700">{sale.sale?.customerName || 'Müştəri Adsız'}</div>
                                                            <div className="text-xs mt-0.5">{sale.sale?.staff?.name || '-'}</div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Returns Tab */}
                        {activeTab === 'returns' && (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                {displayReturns.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400">
                                        <Undo className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p className="font-medium">Qaytarma tapılmadı</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarix</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Miqdar</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stok Dəyişimi</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Məbləğ</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Səbəb</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {displayReturns.map((item) => (
                                                    <tr key={item.id || Math.random()} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatDate(item.date || item.return?.createdAt)}</td>
                                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatQuantity(item.quantity, product?.unitType, product?.piecesPerBox)}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {item.calculatedPreviousStock != null && item.calculatedNewStock != null ? (
                                                                <>
                                                                    <span className="font-medium text-gray-400">{item.calculatedPreviousStock}</span>
                                                                    <span className="mx-2 text-gray-300">➔</span>
                                                                    <span className="font-bold text-blue-600">{item.calculatedNewStock}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-bold text-orange-600">{parseFloat(item.totalPrice || item.returnedAmount || 0).toFixed(2)} ₼</td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 italic">{item.return?.reason || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Transfers Tab */}
                        {activeTab === 'transfers' && (
                            <div className="space-y-6">
                                {/* Transfer Form */}
                                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                            <Send className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 leading-none">Stok Transferi</h3>
                                            <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">Filiallar arası məhsul göndərilməsi</p>
                                        </div>
                                    </div>
                                    <form onSubmit={handleTransfer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Hədəf Filial</label>
                                            <select
                                                value={transferTargetBranchId}
                                                onChange={(e) => setTransferTargetBranchId(e.target.value)}
                                                className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium text-sm transition-all outline-none"
                                            >
                                                <option value="">Seçin...</option>
                                                <option value="central">Mərkəzi Anbar</option>
                                                {branches.filter(b => b.id !== effectiveBranchId).map(branch => (
                                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {product?.unitType === 'PIECE' || !product?.piecesPerBox ? (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Miqdar (ədəd)</label>
                                                <input
                                                    type="number"
                                                    value={transferQuantity}
                                                    onChange={(e) => setTransferQuantity(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 font-bold text-sm transition-all outline-none"
                                                />
                                            </div>
                                        ) : (
                                            <div className="contents">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                                        {product.unitType === 'BOX' ? 'Qutu' : 'Paket'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={transferBoxes}
                                                        onChange={(e) => setTransferBoxes(e.target.value)}
                                                        placeholder="0"
                                                        className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 font-bold text-sm transition-all outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Açıq Miqdar</label>
                                                    <input
                                                        type="number"
                                                        value={transferPieces}
                                                        onChange={(e) => setTransferPieces(e.target.value)}
                                                        placeholder="0"
                                                        className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 font-bold text-sm transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Qeyd</label>
                                            <input
                                                type="text"
                                                value={transferNote}
                                                onChange={(e) => setTransferNote(e.target.value)}
                                                placeholder="..."
                                                className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium text-sm transition-all outline-none"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={processingTransfer}
                                            className="h-12 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all font-bold text-sm shadow-lg shadow-blue-100 flex items-center justify-center gap-2 px-6"
                                        >
                                            {processingTransfer ? 'Gözləyin...' : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Transferi Et
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>

                                {/* Transfer History Table */}
                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                    {filteredTransfers.length === 0 ? (
                                        <div className="text-center py-16 text-gray-400">
                                            <Send className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <p className="font-medium">Transfer tarixçəsi yoxdur</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarix</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">İstiqamət</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Miqdar</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredTransfers.map((transfer) => (
                                                        <tr key={transfer.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{formatDate(transfer.createdAt)}</td>
                                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                                <span className="font-bold text-gray-400">{transfer.fromBranch?.name || 'M.Anbar'}</span>
                                                                <span className="mx-2 text-blue-400">➔</span>
                                                                <span className="font-bold text-gray-800">{transfer.toBranch?.name || 'M.Anbar'}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-black text-gray-900">{formatQuantity(transfer.quantity, product?.unitType, product?.piecesPerBox)}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                                    transfer.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                                    transfer.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                    {transfer.status === 'COMPLETED' ? 'Tamamlanıb' : transfer.status === 'CANCELLED' ? 'Ləğv edilib' : 'Gözləmədə'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ModalLayout>
    );
}
