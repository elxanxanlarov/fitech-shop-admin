import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, Plus, ShoppingBag, TrendingDown } from 'lucide-react';
import { expenseApi } from '../../api';
import { useBranch } from '../../hooks';

export default function Expenses() {
    const { t } = useTranslation('expense');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const [expenseData, setExpenseData] = useState([]);
    const [loading, setLoading] = useState(true);
    const { selectedBranchId } = useBranch();

    const defaultDateRange = useMemo(() => {
        const today = new Date();
        const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return { start: localToday, end: localToday };
    }, []);

    const [dateRange, setDateRange] = useState(defaultDateRange);
    const [datePreset, setDatePreset] = useState('today');
    const isAdmin = useMemo(() => location.pathname.includes('/admin'), [location.pathname]);

    const columns = useMemo(() => [
        {
            key: 'title',
            label: t('title') || 'Başlıq',
        },
        {
            key: 'description',
            label: t('description') || 'Təsvir',
            render: (value) => value || '-',
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
            key: 'category',
            label: t('category') || 'Kateqoriya',
            render: (value) => value || '-',
        },
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
            key: 'branch',
            label: t('branch') || 'Filial',
            render: (_value, item) => item.branch?.name || t('central_warehouse') || 'Mərkəzi Anbar',
        },
        {
            key: 'staff',
            label: t('added_by') || 'Əlavə edən',
            render: (value, item) => {
                if (item.staff) {
                    return `${item.staff.name} ${item.staff.surName || ''}`.trim();
                }
                return '-';
            },
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

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };
            if (dateRange.start) params.startDate = dateRange.start;
            if (dateRange.end) params.endDate = dateRange.end;

            // Mərkəzi anbar seçiləndə bütün filial xərclərini gətir
            if (selectedBranchId && selectedBranchId !== 'central') {
                params.branchId = selectedBranchId;
            }

            const response = await expenseApi.getAll(params);
            if (response.success && response.date) {
                setExpenseData(response.date);
                if (response.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        total: response.pagination.total,
                        totalPages: response.pagination.totalPages,
                        totalAmount: response.pagination.totalAmount
                    }));
                }
            } else {
                setExpenseData([]);
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
            Alert.error(t('error_fetching') || 'Xəta!', t('error_fetching_text') || 'Xərclər siyahısı alınarkən xəta baş verdi');
            setExpenseData([]);
        } finally {
            setLoading(false);
        }
    }, [dateRange, selectedBranchId, t, pagination.page, pagination.limit]);

    useEffect(() => {
        fetchExpenses();

        const handleExpenseRestored = () => {
            fetchExpenses();
        };

        window.addEventListener('expenseRestored', handleExpenseRestored);

        return () => {
            window.removeEventListener('expenseRestored', handleExpenseRestored);
        };
    }, [fetchExpenses]);

    // Reset page to 1 when branch or date range changes
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [selectedBranchId, dateRange]);

    const handleEdit = async (expense) => {
        if (!isAdmin) return;
        const editPath = `/${isAdmin ? 'admin' : 'reception'}/expense-form?id=${expense.id.toString()}`;
        navigate(editPath);
    };

    const handleDelete = async (expense) => {
        const result = await Alert.confirm(
            tAlert('delete_confirm') || 'Silinsin?',
            `${tAlert('delete_confirm_text') || 'Bu xərci silmək istədiyinizə əminsiniz?'} ${expense.title}?`,
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

                await expenseApi.delete(expense.id);

                setExpenseData(prev => prev.filter(item => item.id !== expense.id));

                window.dispatchEvent(new CustomEvent('expenseDeleted', {
                    detail: { expenseId: expense.id }
                }));

                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('delete_success') || 'Uğurlu', tAlert('delete_success_text') || 'Xərc uğurla silindi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta', error.response?.data?.message || tAlert('error_text'));
                }, 100);
            }
        }
    };

    const handleView = (expense) => {
        const staffInfo = expense.staff
            ? `\n${t('added_by') || 'Əlavə edən'}: ${expense.staff.name} ${expense.staff.surName || ''}`.trim()
            : '';

        Alert.info(
            `${t('expense')}: ${expense.title}`,
            `${t('description')}: ${expense.description || '-'}\n${t('amount')}: ${parseFloat(expense.amount || 0).toFixed(2)} AZN\n${t('category')}: ${expense.category || '-'}\n${t('date')}: ${expense.date ? new Date(expense.date).toLocaleDateString('az-AZ') : '-'}${staffInfo}${expense.note ? `\n${t('note')}: ${expense.note}` : ''}`
        );
    };

    const handleBulkDelete = async (selectedIds) => {
        const result = await Alert.confirm(
            tAlert('bulk_delete_confirm') || 'Silinsin?',
            `${tAlert('bulk_delete_confirm_text') || 'Seçilmiş xərcləri silmək istədiyinizə əminsiniz?'} (${selectedIds.length})`,
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

                await Promise.all(selectedIds.map(id => expenseApi.delete(id)));

                setExpenseData(prev => prev.filter(item => !selectedIds.includes(item.id)));

                selectedIds.forEach(id => {
                    window.dispatchEvent(new CustomEvent('expenseDeleted', {
                        detail: { expenseId: id }
                    }));
                });

                Alert.close();
                setTimeout(() => {
                    Alert.success(tAlert('bulk_delete_success') || 'Uğurlu', tAlert('bulk_delete_success_text') || 'Xərclər uğurla silindi');
                }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(tAlert('error') || 'Xəta', error.response?.data?.message || tAlert('error_text'));
                }, 100);
            }
        }
    };

    const handleAddExpense = () => {
        const isAdmin = location.pathname.includes('/admin');
        const addExpensePath = isAdmin ? '/admin/expense-form' : '/reception/expense-form';
        navigate(addExpensePath);
    };

    const summaryStats = useMemo(() => {
        return {
            totalCount: pagination.total || 0,
            totalAmount: pagination.totalAmount || 0
        };
    }, [pagination.total, pagination.totalAmount]);

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('expense_management') || 'Xərc İdarəetməsi'}</h1>
                    <p className="text-gray-600">{t('manage_expenses') || 'Xərcləri idarə edin'}</p>
                </div>
                <button
                    onClick={handleAddExpense}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('add_expense') || 'Xərc Əlavə Et'}
                </button>
            </div>

            <TableTemplate
                data={expenseData}
                columns={columns}
                title={t('expenses') || 'Xərclər'}
                searchFields={['title', 'description', 'category']}
                onEdit={isAdmin ? handleEdit : undefined}
                onDelete={isAdmin ? handleDelete : undefined}
                onView={handleView}
                onBulkDelete={isAdmin ? handleBulkDelete : undefined}
                showBulkActions={isAdmin}
                showFilters={false}
                showSearch={true}
                showDateFilter={true}
                serverSidePagination={true}
                pagination={pagination}
                onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                dateRangeValue={dateRange}
                onDateRangeChange={(start, end) => setDateRange({ start, end })}
                datePresetValue={datePreset}
                onDatePresetChange={(preset) => setDatePreset(preset)}
                loading={loading}
                emptyState={{
                    icon: 'dollar-sign',
                    title: t('no_expenses_found') || 'Xərc tapılmadı',
                    description: t('no_expenses_description') || 'Hal-hazırda heç bir xərc yoxdur',
                    actionText: t('add_first_expense') || 'İlk xərci əlavə et',
                    onAction: handleAddExpense,
                    showAction: true
                }}
            />

            {expenseData.length > 0 && (
                <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('summary') || 'Xülasə'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-600 mb-1">
                                        {t('total_expenses_count') || 'Ümumi Xərc Sayı'}
                                    </p>
                                    <p className="text-2xl font-bold text-blue-900">{summaryStats.totalCount}</p>
                                </div>
                                <div className="bg-blue-100 rounded-full p-3">
                                    <ShoppingBag className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-red-600 mb-1">
                                        {t('total_expenses_amount') || 'Ümumi Xərc Məbləği'}
                                    </p>
                                    <p className="text-2xl font-bold text-red-900">
                                        {(Number(summaryStats.totalAmount) || 0).toFixed(2)} AZN
                                    </p>
                                </div>
                                <div className="bg-red-100 rounded-full p-3">
                                    <TrendingDown className="w-6 h-6 text-red-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
