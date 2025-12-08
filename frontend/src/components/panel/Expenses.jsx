import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, Plus } from 'lucide-react';
import { expenseApi } from '../../api';

export default function Expenses() {
    const { t } = useTranslation('expense');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const [expenseData, setExpenseData] = useState([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        const fetchExpenses = async () => {
            setLoading(true);
            try {
                const response = await expenseApi.getAll();
                if (response.success && response.date) {
                    setExpenseData(response.date);
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
        };
        fetchExpenses();
    }, [t]);

    const handleEdit = async (expense) => {
        const isAdmin = location.pathname.includes('/admin');
        if (!isAdmin) return;
        const editPath = `/admin/expense-form?id=${expense.id.toString()}`;
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
        navigate('/admin/expense-form');
    };

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
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onBulkDelete={handleBulkDelete}
                showBulkActions={true}
                showFilters={false}
                showSearch={true}
                showDateFilter={false}
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
        </div>
    );
}

