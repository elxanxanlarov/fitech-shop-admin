import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import SearchDropdown from '../ui/SearchDropdown';
import { Edit, Trash2, Eye, Plus, CreditCard, ShoppingCart, DollarSign, Wallet, TrendingUp, Banknote, ReceiptText, AlertCircle } from 'lucide-react';
import { getSaleColumns } from '../../data/table-columns/SaleColumns';
import { saleApi, receiptApi, productApi, authApi } from '../../api';
import { useLocalStorage, useBranch } from '../../hooks';

export default function Sales() {
    const { t, i18n } = useTranslation('sale');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const [saleData, setSaleData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paymentFilter, setPaymentFilter] = useLocalStorage('sales_paymentFilter', 'all'); // 'all', 'cash', 'card', 'credit'
    const [currentUser, setCurrentUser] = useState(null);
    const [products, setProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useLocalStorage('sales_selectedProductId', '');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const { selectedBranchId } = useBranch();

    // Tarix filteri üçün state
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [startDate, setStartDate] = useLocalStorage('sales_startDate', getTodayDate());
    const [endDate, setEndDate] = useLocalStorage('sales_endDate', getTodayDate());
    const [datePreset, setDatePreset] = useLocalStorage('sales_datePreset', 'today'); // 'today', 'week', 'month', 'all', 'custom'

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
                const response = await productApi.getAll({ branchId: selectedBranchId });
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

                if (selectedBranchId) {
                    params.branchId = selectedBranchId;
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
    }, [t, i18n.language, startDate, endDate, datePreset, selectedBranchId]);

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
    // Statistika ilə uyğunluq üçün qaytarılmış (isRefunded) satışlar xaric edilir
    const summaryStats = useMemo(() => {
        const refundedData = filteredData.filter(s => s.isRefunded);
        const activeData = filteredData.filter(s => !s.isRefunded); // Statistika ilə eyni filter

        const totalSales = activeData.length;
        const refundedCount = refundedData.length;
        const totalAmount = activeData.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0);
        const totalPaidAmount = activeData.reduce((sum, s) => sum + parseFloat(s.paidAmount || 0), 0);
        const totalProfit = activeData.reduce((sum, s) => sum + parseFloat(s.profitAmount || 0), 0);

        // Ödəniş növü üzrə (yalnız aktiv satışlar)
        const cashSales = activeData.filter(s => s.paymentType === 'cash' && !s.isCredit);
        const cardSales = activeData.filter(s => s.paymentType === 'card' && !s.isCredit);
        const creditSales = activeData.filter(s => s.isCredit);

        const cashTotal = cashSales.reduce((sum, s) => sum + parseFloat(s.paidAmount || 0), 0);
        const cardTotal = cardSales.reduce((sum, s) => sum + parseFloat(s.paidAmount || 0), 0);
        const creditTotal = creditSales.reduce((sum, s) => sum + parseFloat(s.creditTotalAmount || s.totalAmount || 0), 0);
        const creditRemaining = creditSales.reduce((sum, s) => sum + parseFloat(s.creditRemainingAmount || 0), 0);

        return {
            totalSales,
            refundedCount,
            totalAmount,
            totalPaidAmount,
            totalProfit,
            cashTotal,
            cashCount: cashSales.length,
            cardTotal,
            cardCount: cardSales.length,
            creditTotal,
            creditCount: creditSales.length,
            creditRemaining,
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
                <div className="mt-4 space-y-4">
                    {/* Row 1 — main stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                <ShoppingCart className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">Satış Sayı</p>
                                <p className="text-xl font-bold text-blue-700">{summaryStats.totalSales} <span className="text-sm font-semibold">ədəd</span></p>
                                {summaryStats.refundedCount > 0 && (
                                    <p className="text-xs text-red-400 mt-0.5">+{summaryStats.refundedCount} qaytarılmış</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                                <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-green-500 uppercase tracking-wide">Ümumi Məbləğ</p>
                                <p className="text-xl font-bold text-green-700">{summaryStats.totalAmount.toFixed(2)} <span className="text-sm font-semibold">AZN</span></p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                            <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-orange-500 uppercase tracking-wide">Ümumi Qazanc</p>
                                <p className="text-xl font-bold text-orange-700">{summaryStats.totalProfit.toFixed(2)} <span className="text-sm font-semibold">AZN</span></p>
                            </div>
                        </div>

                    </div>

                    {/* Row 2 — payment type breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Cash */}
                        <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <Banknote className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <span className="font-semibold text-emerald-800">Nəğd</span>
                                </div>
                                <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                                    {summaryStats.cashCount} satış
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-700">
                                {summaryStats.cashTotal.toFixed(2)}
                                <span className="text-sm font-semibold ml-1">AZN</span>
                            </p>
                        </div>

                        {/* Card */}
                        <div className="p-4 bg-sky-50 border-2 border-sky-200 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-sky-600" />
                                    </div>
                                    <span className="font-semibold text-sky-800">Kart</span>
                                </div>
                                <span className="text-xs bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-full">
                                    {summaryStats.cardCount} satış
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-sky-700">
                                {summaryStats.cardTotal.toFixed(2)}
                                <span className="text-sm font-semibold ml-1">AZN</span>
                            </p>
                        </div>

                        {/* Credit */}
                        <div className="p-4 bg-violet-50 border-2 border-violet-200 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                                        <ReceiptText className="w-5 h-5 text-violet-600" />
                                    </div>
                                    <span className="font-semibold text-violet-800">Kredit</span>
                                </div>
                                <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">
                                    {summaryStats.creditCount} satış
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-violet-700">
                                {summaryStats.creditTotal.toFixed(2)}
                                <span className="text-sm font-semibold ml-1">AZN</span>
                            </p>
                            {summaryStats.creditRemaining > 0 && (
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Qalıq: {summaryStats.creditRemaining.toFixed(2)} AZN ödənilməyib
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

