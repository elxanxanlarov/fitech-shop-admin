import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import SearchDropdown from '../ui/SearchDropdown';
import { Edit, Trash2, Eye, Plus, CreditCard, ShoppingCart, DollarSign, Wallet, TrendingUp } from 'lucide-react';
import { getSaleColumns } from '../../data/table-columns/SaleColumns';
import { saleApi, receiptApi, productApi, authApi } from '../../api';

export default function Sales() {
    const { t, i18n } = useTranslation('sale');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const [saleData, setSaleData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'cash', 'card', 'credit'
    const [currentUser, setCurrentUser] = useState(null);
    const [products, setProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Tarix filteri üçün state
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [startDate, setStartDate] = useState(getTodayDate());
    const [endDate, setEndDate] = useState(getTodayDate());
    const [datePreset, setDatePreset] = useState('today'); // 'today', 'week', 'month', 'all', 'custom'

    const columns = useMemo(() => getSaleColumns(t, i18n.language), [t, i18n.language]);

    // Fetch current user to check role
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await authApi.me();
                if (response.success && response.data) {
                    setCurrentUser(response.data);
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };
        fetchCurrentUser();
    }, []);

    // Fetch products for search
    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                const response = await productApi.getAll();
                if (response.success && response.date) {
                    setProducts(response.date);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        const fetchSales = async () => {
            setLoading(true);
            try {
                const params = {};
                if (startDate && endDate && datePreset !== 'all') {
                    params.startDate = startDate;
                    params.endDate = endDate;
                }

                const response = await saleApi.getAll(params);
                if (response.success && (response.data || response.date)) {
                    const list = response.data || response.date;
                    setSaleData(list);
                    setFilteredData(list);
                } else {
                    setSaleData([]);
                    setFilteredData([]);
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

        // Custom event dinlə - satış bərpa ediləndə yenilə
        const handleSaleRestored = () => {
            fetchSales();
        };

        window.addEventListener('saleRestored', handleSaleRestored);

        return () => {
            window.removeEventListener('saleRestored', handleSaleRestored);
        };
    }, [t, i18n.language, startDate, endDate, datePreset]);

    // Date preset handler
    const handleDatePresetChange = (preset) => {
        setDatePreset(preset);
        const today = new Date();

        const formatDate = (date) => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        if (preset === 'today') {
            const todayStr = formatDate(today);
            setStartDate(todayStr);
            setEndDate(todayStr);
        } else if (preset === 'week') {
            const weekStart = new Date(today);
            const day = today.getDay(); // 0 is Sunday, 1 is Monday...
            const diff = (day === 0 ? -6 : 1) - day; // Azerbaijan week starts on Monday
            weekStart.setDate(today.getDate() + diff);

            const weekStartStr = formatDate(weekStart);
            const todayStr = formatDate(today);
            setStartDate(weekStartStr);
            setEndDate(todayStr);
        } else if (preset === 'month') {
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthStartStr = formatDate(monthStart);
            const todayStr = formatDate(today);
            setStartDate(monthStartStr);
            setEndDate(todayStr);
        } else if (preset === 'all') {
            setStartDate('');
            setEndDate('');
        } else if (preset === 'custom') {
            // Custom seçiləndə əgər boşdursa bu günü qoy
            if (!startDate || !endDate) {
                const todayStr = formatDate(today);
                setStartDate(todayStr);
                setEndDate(todayStr);
            }
        }
    };

    const handleEdit = async (sale) => {
        const isAdmin = location.pathname.includes('/admin');
        const rolePrefix = isAdmin ? 'admin' : 'reception';
        const editPath = `/${rolePrefix}/sale-form?id=${sale.id.toString()}`;
        navigate(editPath);
    };

    const handleDelete = async (sale) => {
        // Check if user is superadmin
        const roleName = currentUser?.role?.name?.toLowerCase() || '';
        if (roleName !== 'superadmin') {
            Alert.error(
                tAlert('error') || 'Xəta!',
                t('only_superadmin_can_delete') || 'Yalnız Superadmin satışları silə bilər'
            );
            return;
        }

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

                // Custom event dispatch et - DeletedProductsBell yenilənsin
                window.dispatchEvent(new CustomEvent('saleDeleted', {
                    detail: { saleId: sale.id }
                }));

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
                const isAdmin = location.pathname.includes('/admin');
                const rolePrefix = isAdmin ? 'admin' : 'reception';
                navigate(`/${rolePrefix}/check?id=${sale.id}`);
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
        // Check if user is superadmin
        const roleName = currentUser?.role?.name?.toLowerCase() || '';
        if (roleName !== 'superadmin') {
            Alert.error(
                tAlert('error') || 'Xəta!',
                t('only_superadmin_can_delete') || 'Yalnız Superadmin satışları silə bilər'
            );
            return;
        }

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

                // Custom event dispatch et - DeletedProductsBell yenilənsin
                selectedIds.forEach(id => {
                    window.dispatchEvent(new CustomEvent('saleDeleted', {
                        detail: { saleId: id }
                    }));
                });

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

    // Filter sales by payment type and product
    useEffect(() => {
        let filtered = saleData;

        // Filter by payment type
        if (paymentFilter === 'credit') {
            filtered = filtered.filter(sale => sale.isCredit === true);
        } else if (paymentFilter !== 'all') {
            filtered = filtered.filter(sale => sale.paymentType === paymentFilter && !sale.isCredit);
        }

        // Filter by product
        if (selectedProductId) {
            filtered = filtered.filter(sale => {
                return sale.items?.some(item => item.productId === selectedProductId);
            });
        }

        setFilteredData(filtered);
    }, [paymentFilter, saleData, selectedProductId]);

    // Calculate summary statistics
    const summaryStats = useMemo(() => {
        const totalSales = filteredData.length;
        const totalAmount = filteredData.reduce((sum, sale) => {
            return sum + parseFloat(sale.totalAmount || 0);
        }, 0);
        const totalPaidAmount = filteredData.reduce((sum, sale) => {
            return sum + parseFloat(sale.paidAmount || 0);
        }, 0);
        const totalProfit = filteredData.reduce((sum, sale) => {
            return sum + parseFloat(sale.profitAmount || 0);
        }, 0);

        return {
            totalSales,
            totalAmount,
            totalPaidAmount,
            totalProfit
        };
    }, [filteredData]);

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
                data={filteredData}
                columns={columns}
                title={t('sales') || 'Satışlar'}
                searchFields={[]}
                onEdit={handleEdit}
                onDelete={currentUser?.role?.name?.toLowerCase() === 'superadmin' ? handleDelete : null}
                onView={handleView}
                onBulkDelete={currentUser?.role?.name?.toLowerCase() === 'superadmin' ? handleBulkDelete : null}
                showBulkActions={currentUser?.role?.name?.toLowerCase() === 'superadmin'}
                showFilters={false}
                showSearch={false}
                showDateFilter={false}
                loading={loading}
                headerRightContent={
                    <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
                        {/* Hamısını təmizlə */}
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedProductId('');
                                setPaymentFilter('all');
                                setStartDate(getTodayDate());
                                setEndDate(getTodayDate());
                                setDatePreset('today');
                            }}
                            className="px-3 h-10 rounded-lg text-xs md:text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                            {t('clear_filter') || 'Hamısını təmizlə'}
                        </button>

                        <div className="flex flex-col md:flex-row gap-3 items-start">
                            {/* Tarix preset + custom */}
                            <div className="flex flex-col gap-1">
                                <select
                                    onChange={(e) => handleDatePresetChange(e.target.value)}
                                    value={datePreset}
                                    className="px-3 h-10 border border-gray-300 rounded-lg bg-white text-xs md:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                >
                                    <option value="today">{t('today') || 'Bu gün'}</option>
                                    <option value="week">{t('this_week') || 'Bu həftə'}</option>
                                    <option value="month">{t('this_month') || 'Bu ay'}</option>
                                    <option value="all">{t('all') || 'Hamısı'}</option>
                                    <option value="custom">{t('custom') || 'Xüsusi tarix'}</option>
                                </select>

                                {datePreset === 'custom' && (
                                    <div className="flex gap-2 mt-1">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="px-3 h-10 border border-gray-300 rounded-lg bg-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        />
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="px-3 h-10 border border-gray-300 rounded-lg bg-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Məhsul search */}
                            <div className="min-w-[220px]">
                                <SearchDropdown
                                    label=""
                                    options={products}
                                    value={selectedProductId}
                                    onChange={(value) => setSelectedProductId(value)}
                                    placeholder={t('select_product') || 'Məhsul seçin'}
                                    disabled={loadingProducts}
                                    searchFields={['name', 'barcode']}
                                    className="w-full"
                                />
                            </div>

                            {/* Ödəniş növü düymələri */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPaymentFilter('all')}
                                    className={`px-3 h-10 rounded-lg text-xs md:text-sm transition-colors ${paymentFilter === 'all'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {t('all') || 'Hamısı'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentFilter('cash')}
                                    className={`px-3 h-10 rounded-lg text-xs md:text-sm transition-colors ${paymentFilter === 'cash'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {t('cash') || 'Nağd'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentFilter('card')}
                                    className={`px-3 h-10 rounded-lg text-xs md:text-sm transition-colors ${paymentFilter === 'card'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {t('card') || 'Kart'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentFilter('credit')}
                                    className={`px-3 h-10 rounded-lg text-xs md:text-sm transition-colors ${paymentFilter === 'credit'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {t('credit') || 'Kredit'}
                                </button>
                            </div>
                        </div>
                    </div>
                }
                emptyState={{
                    icon: 'shopping-cart',
                    title: t('no_sales_found') || 'Satış tapılmadı',
                    description: t('no_sales_description') || 'Hələ heç bir satış əlavə edilməyib',
                    actionText: t('add_first_sale') || 'İlk satışı əlavə et',
                    onAction: handleAddSale,
                    showAction: true
                }}
            />

            {/* Summary Statistics */}
            {filteredData.length > 0 && (
                <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('summary') || 'Nəticə'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-600 mb-1">
                                        {t('total_sales_count') || 'Ümumi Satış Sayı'}
                                    </p>
                                    <p className="text-2xl font-bold text-blue-900">{summaryStats.totalSales}</p>
                                </div>
                                <div className="bg-blue-100 rounded-full p-3">
                                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-600 mb-1">
                                        {t('total_amount') || 'Ümumi Məbləğ'}
                                    </p>
                                    <p className="text-2xl font-bold text-green-900">
                                        {summaryStats.totalAmount.toFixed(2)} ₼
                                    </p>
                                </div>
                                <div className="bg-green-100 rounded-full p-3">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-purple-600 mb-1">
                                        {t('paid_amount') || 'Ödənilən Məbləğ'}
                                    </p>
                                    <p className="text-2xl font-bold text-purple-900">
                                        {summaryStats.totalPaidAmount.toFixed(2)} ₼
                                    </p>
                                </div>
                                <div className="bg-purple-100 rounded-full p-3">
                                    <Wallet className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-orange-600 mb-1">
                                        {t('profit') || 'Ümumi Qazanc'}
                                    </p>
                                    <p className="text-2xl font-bold text-orange-900">
                                        {summaryStats.totalProfit.toFixed(2)} ₼
                                    </p>
                                </div>
                                <div className="bg-orange-100 rounded-full p-3">
                                    <TrendingUp className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

