import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Package, ShoppingCart, Undo } from 'lucide-react';
import ModalLayout from '../ui/ModalLayout';
import { stockApi, productApi } from '../../api';

export default function ProductStockHistoryModal({ isOpen, onClose, productId, product }) {
    const [loading, setLoading] = useState(false);
    const [stockMovements, setStockMovements] = useState([]);
    const [sales, setSales] = useState([]);
    const [returns, setReturns] = useState([]);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'movements', 'sales', 'returns'

    useEffect(() => {
        if (isOpen && productId) {
            fetchHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, productId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Stok hərəkətləri
            const stockResponse = await stockApi.getAll(productId);
            if (stockResponse.success) {
                setStockMovements(stockResponse.data || []);
            }

            // Satışlar - məhsul üçün satış məlumatlarını al
            const salesResponse = await productApi.getSales(productId);
            if (salesResponse.success) {
                setSales(salesResponse.data || []);
            }

            // Qaytarmalar - məhsul üçün qaytarma məlumatlarını al
            const returnsResponse = await productApi.getReturns(productId);
            if (returnsResponse.success) {
                setReturns(returnsResponse.data || []);
            }
        } catch (error) {
            console.error('Error fetching stock history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('az-AZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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

    const allHistory = [
        ...stockMovements.map(m => ({ ...m, type: 'movement', date: m.createdAt })),
        ...sales.map(s => ({ ...s, type: 'sale', date: s.sale?.createdAt || s.createdAt })),
        ...returns.map(r => ({ ...r, type: 'return', date: r.return?.createdAt || r.createdAt }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const calculateTotalStock = () => {
        if (!product) return 0;
        if (product.unitType === 'PIECE' || !product.piecesPerBox) {
            return product.stock || 0;
        }
        const fullBoxes = product.fullBoxes || 0;
        const opened = product.openedBoxQuantity || 0;
        return (fullBoxes * product.piecesPerBox) + opened;
    };

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

    if (!isOpen) return null;

    return (
        <ModalLayout
            isOpen={isOpen}
            onClose={onClose}
            title={`${product?.name || 'Məhsul'} - Stok Tarixçəsi`}
            className="max-w-6xl"
        >
            <div className="space-y-4">
                {/* Current Stock Display */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-600 mb-1">Cari Stok</div>
                            <div className="text-2xl font-bold text-blue-900">{formatStockDisplay()}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-600 mb-1">Ümumi Miqdar</div>
                            <div className="text-xl font-semibold text-gray-900">{calculateTotalStock()} {product?.unitType === 'PIECE' || !product?.piecesPerBox ? 'ədəd' : 
                                product?.unitType === 'METER' ? 'metr' : 
                                product?.unitType === 'LITER' ? 'litr' : 
                                product?.unitType === 'KILOGRAM' ? 'kq' : 'ədəd'}</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === 'all'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Hamısı
                    </button>
                    <button
                        onClick={() => setActiveTab('movements')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === 'movements'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Stok Hərəkətləri
                    </button>
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === 'sales'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Satışlar
                    </button>
                    <button
                        onClick={() => setActiveTab('returns')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === 'returns'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Qaytarmalar
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* All History */}
                        {activeTab === 'all' && (
                            <div className="overflow-x-auto">
                                {allHistory.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        Tarixçə yoxdur
                                    </div>
                                ) : (
                                    <table className="w-full border-collapse border border-gray-300">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Tarix</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Növ</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Miqdar</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Əvvəlki Stok</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Yeni Stok</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Məbləğ</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Qeyd</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allHistory.map((item, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="border border-gray-300 px-4 py-2 text-sm">
                                                        {formatDate(item.date || item.createdAt)}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2">
                                                        {item.type === 'movement' ? (
                                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                                item.type === 'IN' ? 'bg-green-100 text-green-800' :
                                                                item.type === 'OUT' ? 'bg-red-100 text-red-800' :
                                                                'bg-blue-100 text-blue-800'
                                                            }`}>
                                                                {item.type === 'IN' ? 'Giriş' :
                                                                 item.type === 'OUT' ? 'Çıxış' :
                                                                 'Düzəliş'}
                                                            </span>
                                                        ) : item.type === 'sale' ? (
                                                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                                                Satış
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                                                                Qaytarma
                                                            </span>
                                                        )}
                                                        {item.type === 'sale' && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                #{(item.sale?.id || item.saleId || '').substring(0, 8) || '-'}
                                                            </div>
                                                        )}
                                                        {item.type === 'return' && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                #{(item.return?.id || item.returnId || '').substring(0, 8) || '-'}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm">
                                                        {formatQuantity(
                                                            item.type === 'movement' ? Math.abs(item.quantity) : item.quantity,
                                                            product?.unitType || 'PIECE',
                                                            product?.piecesPerBox
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                                                        {item.type === 'movement' ? item.previousStock : '-'}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm font-medium">
                                                        {item.type === 'movement' ? item.newStock : '-'}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm font-medium">
                                                        {item.type === 'sale' ? `${parseFloat(item.totalPrice || 0).toFixed(2)} ₼` :
                                                         item.type === 'return' ? `${parseFloat(item.totalPrice || item.returnedAmount || 0).toFixed(2)} ₼` :
                                                         '-'}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                                                        {item.note || item.return?.reason || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Stock Movements */}
                        {activeTab === 'movements' && (
                            <div className="overflow-x-auto">
                                {stockMovements.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        Stok hərəkəti yoxdur
                                    </div>
                                ) : (
                                    <table className="w-full border-collapse border border-gray-300">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Tarix</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Növ</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Miqdar</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Əvvəlki Stok</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Yeni Stok</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Qeyd</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stockMovements.map((movement) => (
                                                <tr key={movement.id} className="hover:bg-gray-50">
                                                    <td className="border border-gray-300 px-4 py-2 text-sm">
                                                        {formatDate(movement.createdAt)}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2">
                                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                                            movement.type === 'IN' ? 'bg-green-100 text-green-800' :
                                                            movement.type === 'OUT' ? 'bg-red-100 text-red-800' :
                                                            'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {movement.type === 'IN' ? 'Giriş' :
                                                             movement.type === 'OUT' ? 'Çıxış' :
                                                             'Düzəliş'}
                                                        </span>
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm">
                                                        {formatQuantity(
                                                            Math.abs(movement.quantity),
                                                            product?.unitType || 'PIECE',
                                                            product?.piecesPerBox
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                                                        {movement.previousStock}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm font-medium">
                                                        {movement.newStock}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                                                        {movement.note || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Sales */}
                        {activeTab === 'sales' && (
                            <div className="overflow-x-auto">
                                {sales.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        Satış yoxdur
                                    </div>
                                ) : (
                                    <table className="w-full border-collapse border border-gray-300">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Tarix</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Satış ID</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Miqdar</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Məbləğ</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Müştəri</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sales.map((sale) => (
                                                <tr key={sale.id} className="hover:bg-gray-50">
                                                    <td className="border border-gray-300 px-4 py-2 text-sm">
                                                        {formatDate(sale.sale?.createdAt || sale.createdAt)}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm font-mono text-gray-600">
                                                        #{(sale.sale?.id || sale.saleId || sale.id || '').substring(0, 8)}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm">
                                                        {formatQuantity(
                                                            sale.quantity,
                                                            product?.unitType || 'PIECE',
                                                            product?.piecesPerBox
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm font-medium">
                                                        {parseFloat(sale.totalPrice || 0).toFixed(2)} ₼
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                                                        {sale.sale?.customerName || sale.sale?.customerSurname 
                                                            ? `${sale.sale.customerName || ''} ${sale.sale.customerSurname || ''}`.trim() || 'Gəzinti müştərisi'
                                                            : 'Gəzinti müştərisi'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Returns */}
                        {activeTab === 'returns' && (
                            <div className="overflow-x-auto">
                                {returns.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        Qaytarma yoxdur
                                    </div>
                                ) : (
                                    <table className="w-full border-collapse border border-gray-300">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Tarix</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Qaytarma ID</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Miqdar</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Məbləğ</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Səbəb</th>
                                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Müştəri</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {returns.map((returnItem) => (
                                                <tr key={returnItem.id} className="hover:bg-gray-50">
                                                    <td className="border border-gray-300 px-4 py-2 text-sm">
                                                        {formatDate(returnItem.return?.createdAt || returnItem.createdAt)}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm font-mono text-gray-600">
                                                        #{(returnItem.return?.id || returnItem.returnId || returnItem.id || '').substring(0, 8)}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm">
                                                        {formatQuantity(
                                                            returnItem.quantity,
                                                            product?.unitType || 'PIECE',
                                                            product?.piecesPerBox
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm font-medium">
                                                        {parseFloat(returnItem.totalPrice || returnItem.returnedAmount || 0).toFixed(2)} ₼
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                                                        {returnItem.return?.reason || '-'}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                                                        {returnItem.return?.customerName || returnItem.return?.customerSurname 
                                                            ? `${returnItem.return.customerName || ''} ${returnItem.return.customerSurname || ''}`.trim() || 'Gəzinti müştərisi'
                                                            : 'Gəzinti müştərisi'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ModalLayout>
    );
}

