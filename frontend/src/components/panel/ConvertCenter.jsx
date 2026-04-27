import { useState, useEffect, useCallback } from 'react';
import Alert from '../ui/Alert';
import { convertApi, branchApi } from '../../api';
import {
    Users,
    Truck,
    Receipt,
    Wallet,
    Package,
    ShoppingCart,
    Tag,
    Layers,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    Building2
} from 'lucide-react';
import DeletedElements from './DeletedElements.jsx';

const ENTITY_CONFIG = [
    {
        key: 'staff',
        label: 'İşçilər',
        description: 'Filialsız işçiləri seçilmiş filiala bağla',
        icon: Users,
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        badgeColor: 'bg-blue-100 text-blue-700',
        btnColor: 'bg-blue-600 hover:bg-blue-700',
    },
    {
        key: 'finalDelivery',
        label: 'Yekun Təslimat',
        description: 'Filialsız təslimatları seçilmiş filiala bağla',
        icon: Truck,
        color: 'purple',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        badgeColor: 'bg-purple-100 text-purple-700',
        btnColor: 'bg-purple-600 hover:bg-purple-700',
    },
    {
        key: 'expense',
        label: 'Xərclər',
        description: 'Filialsız xərcləri seçilmiş filiala bağla',
        icon: Receipt,
        color: 'orange',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        badgeColor: 'bg-orange-100 text-orange-700',
        btnColor: 'bg-orange-600 hover:bg-orange-700',
    },
    {
        key: 'cashHandover',
        label: 'Məbləğ Təslimi',
        description: 'Filialsız məbləğ təslimlərini seçilmiş filiala bağla',
        icon: Wallet,
        color: 'green',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        badgeColor: 'bg-green-100 text-green-700',
        btnColor: 'bg-green-600 hover:bg-green-700',
    },
    {
        key: 'product',
        label: 'Məhsullar',
        description: 'BranchStock-u olmayan köhnə məhsulları seçilmiş filialda stok yaradaraq bağla',
        icon: Package,
        color: 'cyan',
        bgColor: 'bg-cyan-50',
        borderColor: 'border-cyan-200',
        iconBg: 'bg-cyan-100',
        iconColor: 'text-cyan-600',
        badgeColor: 'bg-cyan-100 text-cyan-700',
        btnColor: 'bg-cyan-600 hover:bg-cyan-700',
    },
    {
        key: 'sale',
        label: 'Satış',
        description: 'Filialsız satışları seçilmiş filiala bağla',
        icon: ShoppingCart,
        color: 'indigo',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        badgeColor: 'bg-indigo-100 text-indigo-700',
        btnColor: 'bg-indigo-600 hover:bg-indigo-700',
    },
];

export default function ConvertCenter() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState(null); // key of currently converting entity or 'all'
    const [converted, setConverted] = useState({});
    const [branches, setBranches] = useState([]);
    const [targetBranchId, setTargetBranchId] = useState('');

    const fetchBranches = useCallback(async () => {
        try {
            const response = await branchApi.getAll();
            if (response.success && Array.isArray(response.data)) {
                setBranches(response.data);
                setTargetBranchId((prev) => {
                    if (prev && response.data.some((b) => b.id === prev)) return prev;
                    return response.data[0]?.id ?? '';
                });
            }
        } catch (e) {
            console.error('ConvertCenter branches:', e);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const response = await convertApi.getStats();
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching convert stats:', error);
            Alert.error('Xəta', 'Statistika alınarkən xəta baş verdi');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    const targetBranchName = branches.find((b) => b.id === targetBranchId)?.name ?? '';

    const handleConvert = async (entityKey) => {
        const entity = ENTITY_CONFIG.find(e => e.key === entityKey);
        const count = stats?.[entityKey] ?? 0;

        if (!targetBranchId) {
            Alert.error('Filial yoxdur', 'Əvvəlcə hədəf filial seçin');
            return;
        }

        if (count === 0) {
            Alert.info('Məlumat yoxdur', 'Köçürüləcək məlumat tapılmadı');
            return;
        }

        const result = await Alert.confirm(
            'Köçürmə təsdiqi',
            `${count} ədəd "${entity.label}" məlumatı "${targetBranchName}" filialına bağlanacaq. Davam etmək istəyirsiniz?`,
            { confirmText: 'Bəli, köçür', cancelText: 'Xeyr' }
        );

        if (!result.isConfirmed) return;

        try {
            const response = await convertApi.assignToBranch([entityKey], targetBranchId);
            if (response.success) {
                setConverted(prev => ({ ...prev, [entityKey]: true }));
                Alert.success('Uğurlu!', response.message);
                await fetchStats();
            } else {
                Alert.error('Xəta', response.message || 'Köçürmə zamanı xəta baş verdi');
            }
        } catch (error) {
            console.error('Convert error:', error);
            Alert.error('Xəta', 'Köçürmə zamanı xəta baş verdi');
        } finally {
            setConverting(null);
        }
    };

    const handleConvertAll = async () => {
        const totalUnassigned = ENTITY_CONFIG.reduce((sum, e) => sum + (stats?.[e.key] ?? 0), 0);

        if (!targetBranchId) {
            Alert.error('Filial yoxdur', 'Əvvəlcə hədəf filial seçin');
            return;
        }

        if (totalUnassigned === 0) {
            Alert.info('Məlumat yoxdur', 'Köçürüləcək məlumat tapılmadı');
            return;
        }

        const result = await Alert.confirm(
            'Hamısını köçür',
            `Cəmi ${totalUnassigned} ədəd filialsız məlumat "${targetBranchName}" filialına bağlanacaq. Davam etmək istəyirsiniz?`,
            { confirmText: 'Bəli, hamısını köçür', cancelText: 'Xeyr', confirmColor: '#16a34a' }
        );

        if (!result.isConfirmed) return;

        setConverting('all');
        try {
            const response = await convertApi.assignToBranch([], targetBranchId);
            if (response.success) {
                const allKeys = ENTITY_CONFIG.reduce((acc, e) => ({ ...acc, [e.key]: true }), {});
                setConverted(allKeys);
                Alert.success('Uğurlu!', response.message);
                await fetchStats();
            } else {
                Alert.error('Xəta', response.message || 'Köçürmə zamanı xəta baş verdi');
            }
        } catch (error) {
            console.error('Convert all error:', error);
            Alert.error('Xəta', 'Köçürmə zamanı xəta baş verdi');
        } finally {
            setConverting(null);
        }
    };

    const totalUnassigned = ENTITY_CONFIG.reduce((sum, e) => sum + (stats?.[e.key] ?? 0), 0);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Convert Mərkəzi</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Filialsız məlumatları seçdiyiniz filiala bağlayın
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label htmlFor="convert-target-branch" className="text-sm text-gray-600 whitespace-nowrap">
                            Hədəf filial:
                        </label>
                        <select
                            id="convert-target-branch"
                            value={targetBranchId}
                            onChange={(e) => setTargetBranchId(e.target.value)}
                            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white min-w-[10rem] max-w-[14rem]"
                        >
                            {branches.length === 0 ? (
                                <option value="">Filial yüklənir...</option>
                            ) : (
                                branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))
                            )}
                        </select>
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
                    <button
                        type="button"
                        onClick={handleConvertAll}
                        disabled={converting !== null || loading || totalUnassigned === 0 || !targetBranchId}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {converting === 'all' ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Building2 className="w-4 h-4" />
                        )}
                        Hamısını filiala köçür
                    </button>
                </div>
            </div>

            {/* Summary banner */}
            {!loading && (
                <div className={`flex items-center gap-4 p-4 rounded-xl border ${totalUnassigned > 0
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}>
                    {totalUnassigned > 0 ? (
                        <>
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-amber-800">
                                    Cəmi <span className="text-lg">{totalUnassigned}</span> filialsız məlumat tapıldı
                                </p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                    Bu məlumatlar heç bir filialə bağlı deyil. Aşağıdakı kartlardan köçürün.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <p className="text-sm font-semibold text-emerald-800">
                                Bütün məlumatlar filialə bağlıdır. Köçürülməli məlumat yoxdur.
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ENTITY_CONFIG.map((entity) => {
                    const Icon = entity.icon;
                    const count = stats?.[entity.key] ?? 0;
                    const isConverting = converting === entity.key;
                    const isDone = converted[entity.key] && count === 0;

                    return (
                        <div
                            key={entity.key}
                            className={`relative flex flex-col gap-4 p-5 rounded-2xl border-2 transition-all duration-200 ${isDone
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : entity.bgColor + ' ' + entity.borderColor
                                }`}
                        >
                            {/* Card header */}
                            <div className="flex items-center justify-between">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDone ? 'bg-emerald-100' : entity.iconBg
                                    }`}>
                                    {isDone
                                        ? <CheckCircle className="w-6 h-6 text-emerald-600" />
                                        : <Icon className={`w-6 h-6 ${entity.iconColor}`} />
                                    }
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${isDone
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : count > 0
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {loading ? '...' : count === 0 ? 'Təmiz' : `${count} qeyd`}
                                </span>
                            </div>

                            {/* Card body */}
                            <div className="flex-1">
                                <h3 className={`font-bold text-lg ${isDone ? 'text-emerald-800' : 'text-gray-800'
                                    }`}>
                                    {entity.label}
                                </h3>
                                <p className={`text-xs mt-1 leading-relaxed ${isDone ? 'text-emerald-600' : 'text-gray-500'
                                    }`}>
                                    {entity.description}
                                </p>
                            </div>

                            {/* Convert button */}
                            <button
                                onClick={() => handleConvert(entity.key)}
                                disabled={converting !== null || loading || count === 0}
                                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${isDone
                                        ? 'bg-emerald-500 hover:bg-emerald-600'
                                        : entity.btnColor
                                    }`}
                            >
                                {isConverting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Köçürülür...
                                    </>
                                ) : isDone || count === 0 ? (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Tamamlandı
                                    </>
                                ) : (
                                    <>
                                        Filiala köçür
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
