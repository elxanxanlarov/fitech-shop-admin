import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, Plus } from 'lucide-react';
import { getSaleColumns } from '../../data/table-columns/SaleColumns';
import { saleApi, receiptApi } from '../../api';

export default function Sales() {
    const { t, i18n } = useTranslation('sale');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const [saleData, setSaleData] = useState([]);
    const [loading, setLoading] = useState(true);

    const columns = useMemo(() => getSaleColumns(t, i18n.language), [t, i18n.language]);

    useEffect(() => {
        const fetchSales = async () => {
            setLoading(true);
            try {
                const response = await saleApi.getAll();
                if (response.success && response.date) {
                    setSaleData(response.date);
                } else {
                    setSaleData([]);
                }
            } catch (error) {
                console.error('Error fetching sales:', error);
                Alert.error(t('error_fetching') || 'Xəta!', t('error_fetching_text') || 'Satışlar siyahısı alınarkən xəta baş verdi');
                setSaleData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchSales();
    }, [t, i18n.language]);

    const handleEdit = async (sale) => {
        const isAdmin = location.pathname.includes('/admin');
        if (!isAdmin) return;
        const editPath = `/admin/sale-form?id=${sale.id.toString()}`;
        navigate(editPath);
    };

    const handleDelete = async (sale) => {
        const result = await Alert.confirm(
            tAlert('delete_confirm'),
            `${tAlert('delete_confirm_text')} ${t('sale')} #${sale.id.substring(0, 8)}?`,
            { confirmText: tAlert('yes'), cancelText: tAlert('no'), confirmColor: '#EF4444', cancelColor: '#6B7280' }
        );
        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading') || 'Yüklənir...');
                await saleApi.delete(sale.id);
                setSaleData(prev => prev.filter(item => item.id !== sale.id));
                Alert.close();
                setTimeout(() => { Alert.success(tAlert('delete_success'), tAlert('delete_success_text')); }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => { Alert.error(tAlert('error'), error.response?.data?.message || tAlert('error_text')); }, 100);
            }
        }
    };

    const handleView = async (sale) => {
        try {
            // Qəbz məlumatlarını gətir
            const response = await receiptApi.getBySaleId(sale.id);
            if (response.success && response.data) {
                // Qəbz səhifəsinə yönləndir
                navigate(`/admin/check?id=${sale.id}`);
            } else {
                // Qəbz yoxdursa, satış məlumatlarını göstər
                const customerInfo = sale.customerName || sale.customerSurname 
                    ? `${t('customer')}: ${sale.customerName || ''} ${sale.customerSurname || ''}` 
                    : `${t('customer')}: -`;
                const itemsInfo = sale.items?.map(item => 
                    `• ${item.product?.name || '-'} x${item.quantity} = ${parseFloat(item.totalPrice || 0).toFixed(2)} ₼`
                ).join('\n') || '-';
                
                Alert.info(
                    `${t('sale')} #${sale.id.substring(0, 8)}`,
                    `${customerInfo}\n${t('phone')}: ${sale.customerPhone || '-'}\n\n${t('items')}:\n${itemsInfo}\n\n${t('total_amount')}: ${parseFloat(sale.totalAmount || 0).toFixed(2)} ₼\n${t('paid_amount')}: ${parseFloat(sale.paidAmount || 0).toFixed(2)} ₼\n${t('profit')}: ${parseFloat(sale.profitAmount || 0).toFixed(2)} ₼\n${t('date')}: ${new Date(sale.createdAt).toLocaleString(i18n.language === 'az' ? 'az-AZ' : 'en-US')}`
                );
            }
        } catch (error) {
            console.error('Error fetching receipt:', error);
            // Xəta halında satış məlumatlarını göstər
            const customerInfo = sale.customerName || sale.customerSurname 
                ? `${t('customer')}: ${sale.customerName || ''} ${sale.customerSurname || ''}` 
                : `${t('customer')}: -`;
            const itemsInfo = sale.items?.map(item => 
                `• ${item.product?.name || '-'} x${item.quantity} = ${parseFloat(item.totalPrice || 0).toFixed(2)} ₼`
            ).join('\n') || '-';
            
            Alert.info(
                `${t('sale')} #${sale.id.substring(0, 8)}`,
                `${customerInfo}\n${t('phone')}: ${sale.customerPhone || '-'}\n\n${t('items')}:\n${itemsInfo}\n\n${t('total_amount')}: ${parseFloat(sale.totalAmount || 0).toFixed(2)} ₼\n${t('paid_amount')}: ${parseFloat(sale.paidAmount || 0).toFixed(2)} ₼\n${t('profit')}: ${parseFloat(sale.profitAmount || 0).toFixed(2)} ₼\n${t('date')}: ${new Date(sale.createdAt).toLocaleString(i18n.language === 'az' ? 'az-AZ' : 'en-US')}`
            );
        }
    };

    const handleBulkDelete = async (selectedIds) => {
        const result = await Alert.confirm(
            tAlert('bulk_delete_confirm'),
            `${tAlert('bulk_delete_confirm_text')} ${selectedIds.length} ${t('items_selected')}?`,
            { confirmText: tAlert('yes'), cancelText: tAlert('no'), confirmColor: '#EF4444', cancelColor: '#6B7280' }
        );
        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading') || 'Yüklənir...');
                await Promise.all(selectedIds.map(id => saleApi.delete(id)));
                setSaleData(prev => prev.filter(item => !selectedIds.includes(item.id)));
                Alert.close();
                setTimeout(() => { Alert.success(tAlert('bulk_delete_success'), tAlert('bulk_delete_success_text')); }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => { Alert.error(tAlert('error'), error.response?.data?.message || tAlert('error_text')); }, 100);
            }
        }
    };

    const handleAddSale = () => {
        const isAdmin = location.pathname.includes('/admin');
        const addSalePath = isAdmin ? '/admin/sale-form' : '/reception/sale-form';
        navigate(addSalePath);
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('sale_management') || 'Satış İdarəetməsi'}</h1>
                    <p className="text-gray-600">{t('manage_sales') || 'Satışlarınızı idarə edin'}</p>
                </div>
                <button
                    onClick={handleAddSale}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('add_sale') || 'Yeni Satış Əlavə Et'}
                </button>
            </div>
            <TableTemplate
                data={saleData}
                columns={columns}
                title={t('sales') || 'Satışlar'}
                searchFields={['customerName', 'customerSurname', 'customerPhone']}
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
                    icon: 'shopping-cart',
                    title: t('no_sales_found') || 'Satış tapılmadı',
                    description: t('no_sales_description') || 'Hələ heç bir satış əlavə edilməyib',
                    actionText: t('add_first_sale') || 'İlk satışı əlavə et',
                    onAction: handleAddSale,
                    showAction: true
                }}
            />
        </div>
    );
}

