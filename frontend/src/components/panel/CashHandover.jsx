import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, Plus } from 'lucide-react';
import { cashHandoverApi } from '../../api';

export default function CashHandover() {
    const { t } = useTranslation('cashHandover');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const [cashHandoverData, setCashHandoverData] = useState([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        const fetchCashHandovers = async () => {
            setLoading(true);
            try {
                const response = await cashHandoverApi.getAll();
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
        };
        fetchCashHandovers();
    }, [t]);

    const handleEdit = async (cashHandover) => {
        const isAdmin = location.pathname.includes('/admin');
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

    const handleAddCashHandover = () => {
        navigate('/admin/cash-handover-form');
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
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onBulkDelete={handleBulkDelete}
                showBulkActions={true}
                showFilters={false}
                showSearch={true}
                showDateFilter={true}
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
        </div>
    );
}

