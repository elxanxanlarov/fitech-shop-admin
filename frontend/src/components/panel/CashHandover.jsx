import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, Plus, Wallet, Hash, PiggyBank, ArrowDownCircle, ArrowUpCircle, ReceiptText } from 'lucide-react';
import { cashHandoverApi } from '../../api';
import { useBranch } from '../../hooks';

export default function CashHandover() {
    const { t } = useTranslation('cashHandover');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const [cashHandoverData, setCashHandoverData] = useState([]);
    const [loading, setLoading] = useState(true);
    const { selectedBranchId } = useBranch();
    const [kassaBalance, setKassaBalance] = useState(null);
    const [kassaBreakdown, setKassaBreakdown] = useState(null);
    const [loadingKassa, setLoadingKassa] = useState(false);

    const defaultDateRange = useMemo(() => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const localStart = `${firstDayOfMonth.getFullYear()}-${String(firstDayOfMonth.getMonth() + 1).padStart(2, '0')}-${String(firstDayOfMonth.getDate()).padStart(2, '0')}`;
        const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return { start: localStart, end: localToday };
    }, []);

    const [dateRange, setDateRange] = useState(defaultDateRange);
    const [datePreset, setDatePreset] = useState('thisMonth');
    const isAdmin = useMemo(() => location.pathname.includes('/admin'), [location.pathname]);

    const columns = useMemo(() => [
        {
            key: 'date',
            label: t('date') || 'Tarix',
            render: (value) => {
                if (!value) return '-';
                return new Date(value).toLocaleDateString('az-AZ', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            },
        },
        {
            key: 'amount',
            label: t('amount') || 'Məbləğ',
            render: (value) => {
                const amount = parseFloat(value) || 0;
                return `${amount.toFixed(2)} AZN`;
            },
        },
        {
            key: 'handedOverTo',
            label: t('handed_over_to') || 'Kimə təslim edildi',
            render: (value, item) => {
                if (item.handedOverTo) {
                    return `${item.handedOverTo.name} ${item.handedOverTo.surName || ''}`.trim();
                }
                return '-';
            },
        },
        {
            key: 'handedOverBy',
            label: t('handed_over_by') || 'Kim təslim etdi',
            render: (value, item) => {
                if (item.handedOverBy) {
                    return `${item.handedOverBy.name} ${item.handedOverBy.surName || ''}`.trim();
                }
                return '-';
            },
        },
        {
            key: 'note',
            label: t('note') || 'Qeyd',
            render: (value) => value || '-',
        },
        {
            key: 'createdAt',
            label: t('created_at') || 'Yaradılıb',
            render: (value) => {
                if (!value) return '-';
                return new Date(value).toLocaleDateString('az-AZ');
            },
        },
    ], [t]);

    const fetchCashHandovers = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (dateRange.start) params.startDate = dateRange.start;
            if (dateRange.end) params.endDate = dateRange.end;
            if (selectedBranchId) params.branchId = selectedBranchId;

            const response = await cashHandoverApi.getAll(params);
            if (response.success && response.date) {
                setCashHandoverData(response.date);
            } else {
                setCashHandoverData([]);
            }
        } catch (error) {
            console.error('Error fetching cash handovers:', error);
            Alert.error(t('error_fetching') || 'Xəta!', t('error_fetching_text') || 'Məbləğ təslimləri siyahısı alınarkən xəta baş verdi');
            setCashHandoverData([]);
        } finally {
            setLoading(false);
        }
    }, [dateRange, selectedBranchId, t]);

    const fetchKassaBalance = useCallback(async () => {
        setLoadingKassa(true);
        try {
            const branchId = selectedBranchId && selectedBranchId !== 'central' ? selectedBranchId : null;
            const response = await cashHandoverApi.getPendingDates(branchId);
            if (response.success) {
                setKassaBalance(response.totalAvailable ?? 0);
                setKassaBreakdown(response.breakdown ?? null);
            }
        } catch (error) {
            console.error('Error fetching kassa balance:', error);
        } finally {
            setLoadingKassa(false);
        }
    }, [selectedBranchId]);

    useEffect(() => {
        fetchCashHandovers();
    }, [fetchCashHandovers]);

    useEffect(() => {
        fetchKassaBalance();
    }, [fetchKassaBalance]);

    const handleEdit = async (cashHandover) => {
        if (!isAdmin) return;
        const editPath = `/admin/cash-handover-form?id=${cashHandover.id.toString()}`;
        navigate(editPath);
    };

    const handleDelete = async (cashHandover) => {
        const result = await Alert.confirm(
            tAlert('delete_confirm') || 'Silinsin?',
            `${tAlert('delete_confirm_text') || 'Bu məbləğ təslimini silmək istədiyinizə əminsiniz?'} ${parseFloat(cashHandover.amount || 0).toFixed(2)} AZN?`,
            {
                confirmText: tAlert('yes') || 'Bəli',
                cancelText: tAlert('no') || 'Xeyr',
                confirmColor: '#EF4444',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading') || 'Yüklənir...');

                await cashHandoverApi.delete(cashHandover.id);

                setCashHandoverData(prev => prev.filter(item => item.id !== cashHandover.id));

                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('delete_success') || 'Uğurlu', tAlert('delete_success_text') || 'Məbləğ təslimi uğurla silindi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta', error.response?.data?.message || tAlert('error_text'));
                }, 100);
            }
        }
    };

    const handleView = (cashHandover) => {
        const handedOverToInfo = cashHandover.handedOverTo
            ? `\n${t('handed_over_to') || 'Kimə təslim edildi'}: ${cashHandover.handedOverTo.name} ${cashHandover.handedOverTo.surName || ''}`.trim()
            : '';
        const handedOverByInfo = cashHandover.handedOverBy
            ? `\n${t('handed_over_by') || 'Kim təslim etdi'}: ${cashHandover.handedOverBy.name} ${cashHandover.handedOverBy.surName || ''}`.trim()
            : '';

        Alert.info(
            `${t('cash_handover')}: ${parseFloat(cashHandover.amount || 0).toFixed(2)} AZN`,
            `${t('date')}: ${cashHandover.date ? new Date(cashHandover.date).toLocaleDateString('az-AZ') : '-'}${handedOverToInfo}${handedOverByInfo}${cashHandover.note ? `\n${t('note')}: ${cashHandover.note}` : ''}`
        );
    };

    const handleBulkDelete = async (selectedIds) => {
        const result = await Alert.confirm(
            tAlert('bulk_delete_confirm') || 'Silinsin?',
            `${tAlert('bulk_delete_confirm_text') || 'Seçilmiş məbləğ təslimlərini silmək istədiyinizə əminsiniz?'} (${selectedIds.length})`,
            {
                confirmText: tAlert('yes') || 'Bəli',
                cancelText: tAlert('no') || 'Xeyr',
                confirmColor: '#EF4444',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading') || 'Yüklənir...');

                await Promise.all(selectedIds.map(id => cashHandoverApi.delete(id)));

                setCashHandoverData(prev => prev.filter(item => !selectedIds.includes(item.id)));

                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('bulk_delete_success') || 'Uğurlu', tAlert('bulk_delete_success_text') || 'Məbləğ təslimləri uğurla silindi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta', error.response?.data?.message || tAlert('error_text'));
                }, 100);
            }
        }
    };

    const summary = useMemo(() => {
        const total = cashHandoverData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const count = cashHandoverData.length;
        return { total, count };
    }, [cashHandoverData]);

    const handleAddCashHandover = () => {
        const isAdmin = location.pathname.includes('/admin');
        const addCashHandoverPath = isAdmin ? '/admin/cash-handover-form' : '/reception/cash-handover-form';
        navigate(addCashHandoverPath);
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('cash_handover_management') || 'Məbləğ Təslimi İdarəetməsi'}</h1>
                    <p className="text-gray-600">{t('manage_cash_handovers') || 'Məbləğ təslimlərini idarə edin'}</p>
                </div>
                <button
                    onClick={handleAddCashHandover}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('add_cash_handover') || 'Məbləğ Təslimi Əlavə Et'}
                </button>
            </div>

            <TableTemplate
                data={cashHandoverData}
                columns={columns}
                title={t('cash_handovers') || 'Məbləğ Təslimləri'}
                searchFields={['note']}
                onEdit={isAdmin ? handleEdit : undefined}
                onDelete={isAdmin ? handleDelete : undefined}
                onView={handleView}
                onBulkDelete={isAdmin ? handleBulkDelete : undefined}
                showBulkActions={isAdmin}
                showFilters={false}
                showSearch={true}
                showDateFilter={true}
                serverSidePagination={true} // To enable date filter in main bar
                dateRangeValue={dateRange}
                onDateRangeChange={(start, end) => setDateRange({ start, end })}
                datePresetValue={datePreset}
                onDatePresetChange={(preset) => setDatePreset(preset)}
                loading={loading}
                emptyState={{
                    icon: 'dollar-sign',
                    title: t('no_cash_handovers_found') || 'Məbləğ təslimi tapılmadı',
                    description: t('no_cash_handovers_description') || 'Hal-hazırda heç bir məbləğ təslimi yoxdur',
                    actionText: t('add_first_cash_handover') || 'İlk məbləğ təslimini əlavə et',
                    onAction: handleAddCashHandover,
                    showAction: true
                }}
            />

            {/* Kassa balance — always shown when data loaded */}
            {!loadingKassa && kassaBalance !== null && (
                <div className="mt-4">
                    <div className={`p-5 rounded-2xl border-2 ${
                        kassaBalance > 0
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-emerald-50 border-emerald-200'
                    }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            {/* Left: main balance */}
                            <div className="flex items-center gap-4">
                                <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 ${
                                    kassaBalance > 0 ? 'bg-amber-100' : 'bg-emerald-100'
                                }`}>
                                    <PiggyBank className={`w-7 h-7 ${kassaBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
                                </div>
                                <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wide ${
                                        kassaBalance > 0 ? 'text-amber-500' : 'text-emerald-500'
                                    }`}>
                                        Kassada Qalan Məbləğ
                                    </p>
                                    <p className={`text-3xl font-bold ${
                                        kassaBalance > 0 ? 'text-amber-700' : 'text-emerald-700'
                                    }`}>
                                        {kassaBalance.toFixed(2)}
                                        <span className="text-base font-semibold ml-1">AZN</span>
                                    </p>
                                    <p className={`text-xs mt-0.5 ${kassaBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        {kassaBalance > 0
                                            ? 'Hələ təslim edilməyib'
                                            : 'Bütün məbləğlər təslim edilib'}
                                    </p>
                                </div>
                            </div>

                            {/* Right: breakdown pills */}
                            {kassaBreakdown && (
                                <div className="flex flex-wrap gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 font-medium shadow-sm">
                                        <ArrowDownCircle className="w-3.5 h-3.5 text-green-500" />
                                        Gəlir: <span className="font-bold text-green-700">{parseFloat(kassaBreakdown.cashIn || 0).toFixed(2)} AZN</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 font-medium shadow-sm">
                                        <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />
                                        Çıxım: <span className="font-bold text-red-700">{parseFloat(kassaBreakdown.cashOut || 0).toFixed(2)} AZN</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 font-medium shadow-sm">
                                        <ReceiptText className="w-3.5 h-3.5 text-blue-500" />
                                        Təslim: <span className="font-bold text-blue-700">{parseFloat(kassaBreakdown.handovers || 0).toFixed(2)} AZN</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Summary of current list */}
            {!loading && cashHandoverData.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                            <Wallet className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">
                                Seçilmiş Dövr Üzrə Cəmi
                            </p>
                            <p className="text-xl font-bold text-blue-700">
                                {summary.total.toFixed(2)} <span className="text-sm font-semibold">AZN</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                        <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                            <Hash className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-purple-500 uppercase tracking-wide">
                                Ümumi Təslim Sayı
                            </p>
                            <p className="text-xl font-bold text-purple-700">
                                {summary.count} <span className="text-sm font-semibold">ədəd</span>
                            </p>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

