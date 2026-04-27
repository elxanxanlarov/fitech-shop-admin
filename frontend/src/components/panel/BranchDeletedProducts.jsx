import React, { useState, useEffect, useCallback } from 'react';
import { MdDeleteForever, MdRestore, MdInventory, MdBusiness, MdRefresh } from 'react-icons/md';
import { convertApi } from '../../api';
import Alert from '../ui/Alert';
import Loading from '../Loading';
import { useBranch } from '../../hooks';

const BranchDeletedProducts = () => {
    const { selectedBranchId, selectedBranchName } = useBranch();
    const [stats, setStats] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState(null);

    const branchId = (selectedBranchId && selectedBranchId !== 'central') ? selectedBranchId : null;

    const fetchData = useCallback(async () => {
        if (!branchId) return;
        setLoading(true);
        try {
            const params = { branchId };
            const [statsRes, productsRes] = await Promise.all([
                convertApi.getStats(params),
                convertApi.getDeletedProducts(params)
            ]);

            if (statsRes.success) setStats(statsRes.data);
            if (productsRes.success) setProducts(productsRes.data);
        } catch (error) {
            console.error('Error fetching branch deleted products:', error);
        } finally {
            setLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const productCount = stats?.deleted?.product ?? 0;

    const handleRestoreProduct = async (product) => {
        const result = await Alert.confirm(
            'Məhsulu bərpa et',
            `"${product.name}" məhsulu "${selectedBranchName}" filialına geri qaytarılacaq. Davam edilsin?`,
            { confirmText: 'Bəli, bərpa et', confirmColor: '#16a34a' }
        );

        if (!result.isConfirmed) return;

        setAction(product.id);
        try {
            // Backend update logic - although restoreDeleted currently restores ALL products if list is empty
            // I should either update backend to handle specific IDs or just use the current all-restore if that's what's intended.
            // Wait, convertController.js restoreDeleted handles specific entities but not specific IDs.
            // For now, I'll pass the entity 'product' to restore all branch-deleted products, 
            // OR I can add a specific restore for one product.
            
            // To be precise, I'll update the backend to handle specific productId if needed, 
            // but the user's request for "istese perpa ede bilsin" often implies individual restore.
            
            const params = { branchId };
            const response = await convertApi.restoreDeleted(['product'], params, [product.id]);

            if (response.success) {
                Alert.success('Uğurlu', 'Məhsul(lar) bərpa edildi');
                fetchData();
            } else {
                Alert.error('Xəta', response.message);
            }
        } catch (error) {
            Alert.error('Xəta', 'Əməliyyat zamanı xəta baş verdi');
        } finally {
            setAction(null);
        }
    };

    const handleRestoreAll = async () => {
        const result = await Alert.confirm(
            'Hamısını bərpa et',
            `${productCount} ədəd məhsul bərpa edilsin?`,
            { confirmText: 'Bəli, hamısını bərpa et', confirmColor: '#16a34a' }
        );
        if (!result.isConfirmed) return;
        
        setAction('all');
        try {
            const response = await convertApi.restoreDeleted(['product'], { branchId });
            if (response.success) {
                Alert.success('Uğurlu', response.message);
                fetchData();
            }
        } catch (error) {
            Alert.error('Xəta', 'Xəta baş verdi');
        } finally {
            setAction(null);
        }
    };

    if (!branchId) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
                    <MdBusiness className="text-4xl text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-yellow-800">Filial Seçilməyib</h2>
                    <p className="text-yellow-700 mt-2">Bu bölməni görmək üçün yuxarıdan bir filial seçin.</p>
                </div>
            </div>
        );
    }

    if (loading) return <Loading />;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <MdInventory className="text-red-500" />
                        "{selectedBranchName}" - Silinmiş Məhsullar
                    </h1>
                    <p className="text-gray-500 mt-1">Bu filial üçün gizlədilmiş və ya silinmiş məhsulların siyahısı</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
                        title="Yenilə"
                    >
                        <MdRefresh className="text-xl" />
                    </button>
                    <button
                        onClick={handleRestoreAll}
                        disabled={action || productCount === 0}
                        className="flex items-center gap-2 py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
                    >
                        <MdRestore className="text-xl" />
                        Hamısını Bərpa Et
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Məhsul</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kateqoriya</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stok (Filialda)</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Silinmə Tarixi</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Əməliyyat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <MdInventory className="text-4xl mx-auto mb-2 opacity-20" />
                                        Bu filial üzrə silinmiş məhsul tapılmadı.
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{product.name}</div>
                                            <div className="text-xs text-gray-500 font-mono mt-0.5">{product.barcode || 'Barkodsuz'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium border border-gray-200">
                                                {product.categoryName || 'Daxil edilməyib'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`px-3 py-1 rounded-lg text-sm font-bold ${product.stock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {product.stock} ədəd
                                                </div>
                                                {product.fullBoxes > 0 && (
                                                    <div className="text-xs text-gray-400">
                                                        ({product.fullBoxes} qutu)
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(product.deletedAt).toLocaleDateString('az-AZ', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleRestoreProduct(product)}
                                                disabled={action}
                                                className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-bold text-sm bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 transition-colors"
                                            >
                                                <MdRestore className="text-lg" />
                                                Bərpa et
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <MdBusiness className="text-xl text-blue-600" />
                </div>
                <div>
                    <h3 className="text-blue-900 font-bold mb-1">Məlumat</h3>
                    <p className="text-sm text-blue-700 leading-relaxed">
                        Siyahıdakı məhsullar yalnız <strong>"{selectedBranchName}"</strong> filialında gizlədilmişdir. 
                        Bərpa etdiyiniz zaman həmin məhsullar təkrar bu filialın vitrinində və stokunda görünəcəkdir. 
                        Əgər məhsulun stoku varsa, bərpa edildikdən sonra satışa uyğun olacaq.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BranchDeletedProducts;
