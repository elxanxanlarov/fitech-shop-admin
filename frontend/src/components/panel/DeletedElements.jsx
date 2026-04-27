import { useState, useEffect, useCallback } from 'react';
import Alert from '../ui/Alert';
import { convertApi } from '../../api';
import { RefreshCw, Trash2, RotateCcw, Flame } from 'lucide-react';
import { useBranch } from '../../hooks';

const DELETED_LABELS = {
    product: 'Məhsullar',
    sale: 'Satışlar',
    expense: 'Xərclər',
    cashHandover: 'Məbləğ Təslimi',
    finalDelivery: 'Yekun Təslimat',
    category: 'Kateqoriya',
    subCategory: 'Alt Kateqoriya',
};

export default function DeletedElements({ embedded = false }) {
    const { selectedBranchId } = useBranch();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState(null); // 'restore' | 'hardDelete'

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (selectedBranchId && selectedBranchId !== 'central') {
                params.branchId = selectedBranchId;
            }
            const response = await convertApi.getStats(params);
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching deleted stats:', error);
            Alert.error('Xəta', 'Statistika alınarkən xəta baş verdi');
        } finally {
            setLoading(false);
        }
    }, [selectedBranchId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const deletedStats = stats?.deleted ?? null;
    const totalDeleted = deletedStats?.total ?? 0;

    const handleRestore = async () => {
        if (totalDeleted === 0) {
            Alert.info('Məlumat yoxdur', 'Bərpa ediləcək məlumat tapılmadı');
            return;
        }
        const result = await Alert.confirm(
            'Bərpa təsdiqi',
            `${totalDeleted} ədəd silinmiş element geri qaytarılacaq. Davam etmək istəyirsiniz?`,
            { confirmText: 'Bəli, bərpa et', cancelText: 'Xeyr', confirmColor: '#16a34a' }
        );
        if (!result.isConfirmed) return;
        setAction('restore');
        try {
            const params = selectedBranchId && selectedBranchId !== 'central' ? { branchId: selectedBranchId } : {};
            const response = await convertApi.restoreDeleted([], params);
            if (response.success) {
                Alert.success('Uğurlu!', response.message);
                await fetchStats();
            } else {
                Alert.error('Xəta', response.message);
            }
        } catch {
            Alert.error('Xəta', 'Bərpa zamanı xəta baş verdi');
        } finally {
            setAction(null);
        }
    };

    const handleHardDelete = async () => {
        if (totalDeleted === 0) {
            Alert.info('Məlumat yoxdur', 'Silinəcək məlumat tapılmadı');
            return;
        }
        const result = await Alert.confirm(
            '⚠️ Həmişəlik silmə',
            `${totalDeleted} ədəd element verilənlər bazasından həmişəlik silinəcək. Bu əməliyyat GERİ QAYTARILMAZ!`,
            { confirmText: 'Bəli, həmişəlik sil', cancelText: 'Xeyr', confirmColor: '#dc2626' }
        );
        if (!result.isConfirmed) return;
        setAction('hardDelete');
        try {
            const params = selectedBranchId && selectedBranchId !== 'central' ? { branchId: selectedBranchId } : {};
            const response = await convertApi.hardDeleteAll([], params);
            if (response.success) {
                Alert.success('Silindi!', response.message);
                await fetchStats();
            } else {
                Alert.error('Xəta', response.message);
            }
        } catch {
            Alert.error('Xəta', 'Silmə zamanı xəta baş verdi');
        } finally {
            setAction(null);
        }
    };

    const Title = embedded ? 'h2' : 'h1';
    const titleClass = embedded
        ? 'text-xl font-bold text-gray-800'
        : 'text-3xl font-bold text-gray-800';

    return (
        <div className={embedded ? 'space-y-6' : 'p-6 space-y-6'}>
            <div className="flex items-start justify-between">
                <div>
                    <Title className={titleClass}>Silinmiş Elementlər</Title>
                    <p className="mt-1 text-sm text-gray-500">
                        Soft silinmiş qeydləri bərpa edin və ya həmişəlik silin
                    </p>
                </div>
                <button
                    type="button"
                    onClick={fetchStats}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Yenilə
                </button>
            </div>

            <div className={`p-6 rounded-2xl border-2 ${totalDeleted > 0
                    ? 'bg-red-50 border-red-300'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${totalDeleted > 0 ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                            <Trash2 className={`w-6 h-6 ${totalDeleted > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <h2 className={`font-bold text-lg ${totalDeleted > 0 ? 'text-red-800' : 'text-gray-600'}`}>
                                Ümumi silinmiş qeydlər
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Kateqoriya, satış, məhsul və s. üzrə saylar
                            </p>
                        </div>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${totalDeleted > 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                        {loading ? '...' : `${totalDeleted} qeyd`}
                    </span>
                </div>

                {!loading && deletedStats && totalDeleted > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                        {Object.entries(DELETED_LABELS).map(([key, label]) => {
                            const count = deletedStats[key] ?? 0;
                            if (count === 0) return null;
                            return (
                                <span
                                    key={key}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-red-200 text-red-700 text-xs font-semibold rounded-full"
                                >
                                    {label}: {count}
                                </span>
                            );
                        })}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={handleRestore}
                        disabled={action !== null || loading || totalDeleted === 0}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {action === 'restore' ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Bərpa edilir...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-4 h-4" />
                                Hamısını Bərpa Et
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleHardDelete}
                        disabled={action !== null || loading || totalDeleted === 0}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {action === 'hardDelete' ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Silinir...
                            </>
                        ) : (
                            <>
                                <Flame className="w-4 h-4" />
                                Həmişəlik Sil
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
