import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Alert from '../ui/Alert';
import Input from '../ui/Input';
import { Calendar, Edit, Trash2, Plus, X } from 'lucide-react';
import { finalDeliveryApi, productApi, authApi, branchApi } from '../../api';
import SearchDropdown from '../ui/SearchDropdown';
import { useBranch } from '../../hooks';

export default function FinalDeliveryForm() {
    const { t, i18n } = useTranslation('finalDelivery');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedBranchId } = useBranch();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const isEditMode = !!id;

    const isAdmin = location.pathname.includes('/admin');
    const listPath = isAdmin ? '/admin/final-delivery' : '/reception/final-delivery';
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11
    const todayStr = today.toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        // 'today', 'this_week', 'this_month', 'custom', 'month_january' ... 'month_december'
        datePreset: 'this_month',
        year: currentYear,
        startDate: '',
        endDate: '',
        note: '',
        branchId: (selectedBranchId && selectedBranchId !== 'central') ? selectedBranchId : '',
    });

    const [branches, setBranches] = useState([]);

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [previewData, setPreviewData] = useState([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [detailDelivery, setDetailDelivery] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Edit modal state
    const [editingItem, setEditingItem] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        remainingStock: '',
        stock: '',
        fullBoxes: '',
        openedBoxQuantity: ''
    });
    const [editLoading, setEditLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [availableProducts, setAvailableProducts] = useState([]);
    const [addFormData, setAddFormData] = useState({
        productId: '',
        remainingStock: '',
        stock: '',
        fullBoxes: '',
        openedBoxQuantity: ''
    });
    const [addLoading, setAddLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Table pagination state
    const [tablePagination, setTablePagination] = useState({
        page: 1,
        limit: 10
    });

    // Fetch current user to check role
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await authApi.me();
                if (response.success && (response.data || response.date)) {
                    setCurrentUser(response.data || response.date);
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };
        fetchCurrentUser();
    }, []);

    const canPickAnyBranch = useMemo(() => {
        const r = currentUser?.role?.name?.toLowerCase() || '';
        const boss = currentUser?.isBoss === true;
        return r === 'superadmin' || (r === 'admin' && boss);
    }, [currentUser]);

    const branchChoices = useMemo(() => {
        if (!branches.length) return [];
        if (canPickAnyBranch) return branches;
        const onlyId =
            currentUser?.branchId ||
            (selectedBranchId && selectedBranchId !== 'central' ? selectedBranchId : null);
        if (!onlyId) return branches;
        const filtered = branches.filter((b) => b.id === onlyId);
        return filtered.length ? filtered : branches;
    }, [branches, currentUser, selectedBranchId, canPickAnyBranch]);

    useEffect(() => {
        if (isEditMode || canPickAnyBranch || !currentUser) return;
        const pin =
            currentUser.branchId ||
            (selectedBranchId && selectedBranchId !== 'central' ? selectedBranchId : null);
        if (!pin) return;
        setFormData((p) => (p.branchId === pin ? p : { ...p, branchId: pin }));
    }, [isEditMode, canPickAnyBranch, currentUser, selectedBranchId]);

    // Edit (detail) rejimində mövcud yekun təslimat məlumatlarını yüklə
    useEffect(() => {
        if (!isEditMode || !id) return;

        const fetchDetail = async () => {
            setDetailLoading(true);
            try {
                const response = await finalDeliveryApi.getById(id);
                if (response.success && response.data) {
                    setDetailDelivery(response.data);
                    const start = new Date(response.data.startDate);
                    const end = new Date(response.data.endDate);
                    setFormData(prev => ({
                        ...prev,
                        startDate: response.data.startDate.split('T')[0],
                        endDate: response.data.endDate.split('T')[0],
                        year: start.getFullYear(),
                        note: response.data.note || '',
                        branchId: response.data.branchId || ''
                    }));
                }
            } catch (error) {
                console.error('Error fetching final delivery detail:', error);
                Alert.error(t('error_fetching') || 'Xəta!', t('error_fetching_text') || 'Təslimat detalları alınarkən xəta baş verdi');
            } finally {
                setDetailLoading(false);
            }
        };

        fetchDetail();
    }, [isEditMode, id]);

    // Fetch branches
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await branchApi.getAll();
                if (response.success && response.data) {
                    setBranches(response.data);
                }
            } catch (error) {
                console.error('Error fetching branches:', error);
            }
        };
        fetchBranches();
    }, []);

    useEffect(() => {
        // Set default dates based on preset (yalnız create rejimində mənalıdır)
        const updateDates = () => {
            let start;
            let end;
            const year = formData.year || today.getFullYear();

            switch (formData.datePreset) {
                case 'today': {
                    start = new Date(today);
                    end = new Date(today);
                    break;
                }
                case 'this_week': {
                    start = new Date(today);
                    start.setDate(today.getDate() - today.getDay()); // Həftənin əvvəli
                    end = new Date(today);
                    end.setDate(today.getDate() + (6 - today.getDay())); // Həftənin sonu
                    break;
                }
                case 'this_month': {
                    start = new Date(year, today.getMonth(), 1);
                    end = new Date(year, today.getMonth() + 1, 0);
                    break;
                }
                case 'month_january': {
                    start = new Date(year, 0, 1);
                    end = new Date(year, 1, 0);
                    break;
                }
                case 'month_february': {
                    start = new Date(year, 1, 1);
                    end = new Date(year, 2, 0);
                    break;
                }
                case 'month_march': {
                    start = new Date(year, 2, 1);
                    end = new Date(year, 3, 0);
                    break;
                }
                case 'month_april': {
                    start = new Date(year, 3, 1);
                    end = new Date(year, 4, 0);
                    break;
                }
                case 'month_may': {
                    start = new Date(year, 4, 1);
                    end = new Date(year, 5, 0);
                    break;
                }
                case 'month_june': {
                    start = new Date(year, 5, 1);
                    end = new Date(year, 6, 0);
                    break;
                }
                case 'month_july': {
                    start = new Date(year, 6, 1);
                    end = new Date(year, 7, 0);
                    break;
                }
                case 'month_august': {
                    start = new Date(year, 7, 1);
                    end = new Date(year, 8, 0);
                    break;
                }
                case 'month_september': {
                    start = new Date(year, 8, 1);
                    end = new Date(year, 9, 0);
                    break;
                }
                case 'month_october': {
                    start = new Date(year, 9, 1);
                    end = new Date(year, 10, 0);
                    break;
                }
                case 'month_november': {
                    start = new Date(year, 10, 1);
                    end = new Date(year, 11, 0);
                    break;
                }
                case 'month_december': {
                    start = new Date(year, 11, 1);
                    end = new Date(year + 1, 0, 0);
                    break;
                }
                default:
                    // 'custom' üçün avtomatik dəyişmə
                    return;
            }

            // Gələcək tarixlərin qarşısını almaq üçün max olaraq bu günü nəzərə alırıq
            const maxDate = new Date(todayStr);
            if (end > maxDate) {
                end = maxDate;
                if (start > end) {
                    start = end;
                }
            }

            setFormData(prev => ({
                ...prev,
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
            }));
        };

        if (formData.datePreset !== 'custom' && !isEditMode) {
            updateDates();
        }
    }, [formData.datePreset, formData.year, isEditMode]);

    // Preview məhsulları yüklə (yalnız create rejimində)
    useEffect(() => {
        if (isEditMode) return;

        const fetchPreview = async () => {
            if (!formData.startDate || !formData.endDate) {
                setPreviewData([]);
                return;
            }

            try {
                const response = await finalDeliveryApi.preview(formData.startDate, formData.endDate, formData.branchId);
                if (response.success && (response.data || response.date)) {
                    setPreviewData(response.data || response.date);
                } else {
                    setPreviewData([]);
                }
            } catch (error) {
                console.error('Error fetching preview:', error);
                setPreviewData([]);
            } finally {
                setPreviewLoading(false);
            }
        };

        fetchPreview();
    }, [formData.startDate, formData.endDate, isEditMode, formData.branchId]);

    // Reset table page when preview/detail changes
    useEffect(() => {
        setTablePagination(prev => ({ ...prev, page: 1 }));
    }, [previewData, detailDelivery]);

    const handleTablePageChange = (newPage) => {
        setTablePagination(prev => ({ ...prev, page: newPage }));
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.startDate) {
            newErrors.startDate = t('start_date_required') || 'Başlanğıc tarix tələb olunur';
        }

        if (!formData.endDate) {
            newErrors.endDate = t('end_date_required') || 'Bitmə tarixi tələb olunur';
        }

        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            if (start > end) {
                newErrors.endDate = t('end_date_before_start') || 'Bitmə tarixi başlanğıc tarixdən sonra olmalıdır';
            }
        }

        if (!formData.branchId || formData.branchId === 'central') {
            newErrors.branchId = t('branch_required') || 'Filial seçilməlidir';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Detail rejimində submit istifadə olunmur
        if (isEditMode) {
            return;
        }

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const payload = {
                startDate: formData.startDate,
                endDate: formData.endDate,
                note: formData.note?.trim() || null,
                branchId: formData.branchId
            };

            const response = await finalDeliveryApi.create(payload);

            if (response.success) {
                Alert.success(
                    t('create_success') || 'Yaradıldı',
                    t('create_success_text') || 'Yekun təslimat uğurla yaradıldı'
                );
                const basePath = isAdmin ? '/admin/final-delivery-form' : '/reception/final-delivery-form';
                const newId = response.data?.id;
                if (newId) {
                    navigate(`${basePath}?id=${newId}`);
                } else {
                    navigate(listPath);
                }
            } else {
                Alert.error(t('error') || 'Xəta!', response.message || (t('error_text') || 'Xəta baş verdi'));
            }
        } catch (error) {
            console.error('Error saving final delivery:', error);
            Alert.error(
                t('error') || 'Xəta!',
                error.response?.data?.message || error.message || (t('error_text') || 'Yekun təslimat yaradılarkən xəta baş verdi')
            );
        } finally {
            setLoading(false);
        }
    };

    // Cədvəl üçün istifadə olunacaq itemlər (create: preview, detail: delivery.items)
    const tableItems = isEditMode && detailDelivery
        ? (detailDelivery.items || [])
        : previewData;

    const paginatedItems = tableItems.slice(
        (tablePagination.page - 1) * tablePagination.limit,
        tablePagination.page * tablePagination.limit
    );

    const totalProducts = tableItems.length;
    const totalStock = tableItems.reduce(
        (sum, item) => sum + (item.remainingStock || item.stock || 0),
        0
    );

    // Detail üçün tarix aralığı başlığı (table üzərində)
    const dateRangeLabel = isEditMode && detailDelivery
        ? (detailDelivery.title || '')
        : '';

    const unitTypeLabelAz = (unitType) => {
        switch (unitType) {
            case 'PIECE': return 'Ədəd';
            case 'BOX': return 'Qutu';
            case 'LITER': return 'Litr';
            case 'METER': return 'Metr';
            case 'KILOGRAM': return 'Kiloqram';
            default: return unitType || '-';
        }
    };

    // Edit item modal aç
    const handleEditItem = (item) => {
        setEditingItem(item);
        setEditFormData({
            remainingStock: item.remainingStock || '',
            stock: item.stock || '',
            fullBoxes: item.fullBoxes || 0,
            openedBoxQuantity: item.openedBoxQuantity || 0
        });
        setShowEditModal(true);
    };

    // Edit item save
    const handleSaveEditItem = async () => {
        if (!editingItem) return;

        setEditLoading(true);
        try {
            const payload = {
                remainingStock: parseInt(editFormData.remainingStock) || 0,
                stock: parseInt(editFormData.stock) || 0,
                fullBoxes: parseInt(editFormData.fullBoxes) || 0,
                openedBoxQuantity: parseInt(editFormData.openedBoxQuantity) || 0
            };

            const response = await finalDeliveryApi.updateItem(editingItem.id, payload);

            if (response.success) {
                Alert.success(t('update_success') || 'Uğurlu!', t('update_success_text') || 'Məhsul yeniləndi');
                // Detail delivery-i yenidən yüklə
                const detailResponse = await finalDeliveryApi.getById(id);
                if (detailResponse.success && (detailResponse.data || detailResponse.date)) {
                    setDetailDelivery(detailResponse.data || detailResponse.date);
                }
                setShowEditModal(false);
                setEditingItem(null);
            } else {
                Alert.error(t('error') || 'Xəta!', response.message || t('error_text'));
            }
        } catch (error) {
            console.error('Error updating item:', error);
            Alert.error(t('error') || 'Xəta!', error.response?.data?.message || t('error_text'));
        } finally {
            setEditLoading(false);
        }
    };

    // Delete item
    const handleDeleteItem = async (item) => {
        // Check if user is superadmin - yalnız superadmin silə bilər
        const roleName = currentUser?.role?.name?.toLowerCase() || '';
        if (roleName !== 'superadmin') {
            Alert.error(
                tAlert('error') || 'Xəta!',
                t('only_superadmin_can_delete') || 'Yalnız Superadmin məhsul silə bilər'
            );
            return;
        }

        const result = await Alert.confirm(
            t('delete_confirm') || 'Silinsin?',
            `${t('delete_confirm_text') || 'Bu məhsulu silmək istədiyinizə əminsiniz?'} ${item.product?.name || ''}?`,
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
                const response = await finalDeliveryApi.deleteItem(item.id);

                if (response.success) {
                    Alert.close();
                    setTimeout(() => {
                        Alert.success(t('delete_success') || 'Uğurlu!', t('delete_success_text') || 'Məhsul silindi');
                    }, 100);
                    // Detail delivery-i yenidən yüklə
                    const detailResponse = await finalDeliveryApi.getById(id);
                    if (detailResponse.success && (detailResponse.data || detailResponse.date)) {
                        setDetailDelivery(detailResponse.data || detailResponse.date);
                    }
                } else {
                    Alert.close();
                    setTimeout(() => {
                        Alert.error(t('error') || 'Xəta!', response.message || t('error_text'));
                    }, 100);
                }
            } catch (error) {
                Alert.close();
                setTimeout(() => {
                    Alert.error(t('error') || 'Xəta!', error.response?.data?.message || t('error_text'));
                }, 100);
            }
        }
    };

    // Add item modal aç
    const handleOpenAddModal = async () => {
        try {
            // Mövcud məhsulları yüklə
            const response = await productApi.getAll({ branchId: formData.branchId === 'central' ? null : formData.branchId });
            if (response.success && (response.data || response.date)) {
                const allProducts = response.data || response.date;
                // Artıq təslimatda olan məhsulları çıxar
                const existingProductIds = (detailDelivery?.items || []).map(item => item.productId);
                const available = allProducts.filter(p =>
                    p.isActive &&
                    p.deleteType === 'NONE' &&
                    !existingProductIds.includes(p.id)
                );
                setAvailableProducts(available);
                setAddFormData({
                    productId: '',
                    remainingStock: '',
                    stock: '',
                    fullBoxes: '',
                    openedBoxQuantity: ''
                });
                setShowAddModal(true);
            } else {
                setAvailableProducts([]);
                setShowAddModal(true);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            Alert.error(t('error') || 'Xəta!', t('error_fetching') || 'Məhsullar alınarkən xəta baş verdi');
        }
    };

    // Add item save
    const handleSaveAddItem = async () => {
        if (!addFormData.productId) {
            Alert.error(t('error') || 'Xəta!', t('product_required') || 'Məhsul seçilməlidir');
            return;
        }

        setAddLoading(true);
        try {
            const payload = {
                productId: addFormData.productId,
                remainingStock: parseInt(addFormData.remainingStock) || 0,
                stock: parseInt(addFormData.stock) || 0,
                fullBoxes: parseInt(addFormData.fullBoxes) || 0,
                openedBoxQuantity: parseInt(addFormData.openedBoxQuantity) || 0
            };

            const response = await finalDeliveryApi.addItem(id, payload);

            if (response.success) {
                Alert.success(t('add_success') || 'Uğurlu!', t('add_success_text') || 'Məhsul əlavə edildi');
                // Detail delivery-i yenidən yüklə
                const detailResponse = await finalDeliveryApi.getById(id);
                if (detailResponse.success && (detailResponse.data || detailResponse.date)) {
                    setDetailDelivery(detailResponse.data || detailResponse.date);
                }
                setShowAddModal(false);
                setAddFormData({
                    productId: '',
                    remainingStock: '',
                    stock: '',
                    fullBoxes: '',
                    openedBoxQuantity: ''
                });
            } else {
                Alert.error(t('error') || 'Xəta!', response.message || t('error_text'));
            }
        } catch (error) {
            console.error('Error adding item:', error);
            Alert.error(t('error') || 'Xəta!', error.response?.data?.message || t('error_text'));
        } finally {
            setAddLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Yalnız create rejimində başlıq göstərilir, print-də gizlidir */}
            {!isEditMode && (
                <div className="flex items-center justify-between mb-4 print:hidden">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {t('create_delivery') || 'Yekun Təslimat Yarat'}
                        </h1>
                        <p className="text-gray-600 text-sm mt-1">
                            {t('description') || 'Yekun təslimatları idarə edin'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate(listPath)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {t('cancel') || 'Ləğv et'}
                    </button>
                </div>
            )}

            {/* Edit (detail) rejimində yalnız Çap et + Geri, print-də gizlidir */}
            {isEditMode && (
                <div className="flex justify-end gap-2 mb-4 print:hidden">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {t('print') || 'Çap et'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(listPath)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {t('cancel') || 'Ləğv et'}
                    </button>
                </div>
            )}

            {/* Branch Selection or Display */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:hidden">
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('branch') || 'Filial'}
                        </label>
                        {isEditMode ? (
                            <div className="px-3 py-2 border border-gray-100 bg-gray-50 rounded-lg text-gray-900 font-medium h-[42px] flex items-center">
                                {detailDelivery?.branch?.name || t('central_warehouse') || 'Mərkəzi Anbar'}
                            </div>
                        ) : (
                            <div className="w-full">
                                <SearchDropdown
                                    options={branchChoices}
                                    value={formData.branchId}
                                    onChange={(val) => handleInputChange('branchId', val)}
                                    error={!!errors.branchId}
                                    placeholder={t('select_branch') || 'Filial seçin...'}
                                    getOptionLabel={(option) => option.name || ''}
                                    getOptionValue={(option) => option.id?.toString() || ''}
                                    searchFields={['name']}
                                    disabled={!canPickAnyBranch}
                                />
                                {!canPickAnyBranch && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        {t('branch_locked_own') || 'Yalnız öz filialınız üçün təyin olunur'}
                                    </p>
                                )}
                                {errors.branchId && (
                                    <p className="mt-1 text-xs font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200 pl-1">
                                        {errors.branchId}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    {isEditMode && detailDelivery?.staff && (
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('created_by') || 'Yaradan'}
                            </label>
                            <div className="px-3 py-2 border border-gray-100 bg-gray-50 rounded-lg text-gray-900 font-medium h-[42px] flex items-center">
                                {`${detailDelivery.staff.name} ${detailDelivery.staff.surName || ''}`.trim()}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 w-full print:text-xs">
                {/* Date Preset Selector + Year - yalnız create rejimində göstərilir (print-də gizlidir) */}
                {!isEditMode && (
                    <>
                        <div className="print:hidden">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('date_range') || 'Tarix Aralığı'}
                            </label>
                            <div className="flex flex-col md:flex-row gap-3 items-center">
                                <select
                                    value={formData.datePreset}
                                    onChange={(e) => handleInputChange('datePreset', e.target.value)}
                                    className="w-full md:w-auto min-w-[180px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="today">{t('today') || 'Bu gün'}</option>
                                    <option value="this_week">{t('this_week') || 'Bu həftə'}</option>
                                    <option value="this_month">{t('this_month') || 'Bu ay'}</option>
                                    <option value="month_january" disabled={formData.year === currentYear && currentMonth < 0}>{t('month_january') || 'Yanvar'}</option>
                                    <option value="month_february" disabled={formData.year === currentYear && currentMonth < 1}>{t('month_february') || 'Fevral'}</option>
                                    <option value="month_march" disabled={formData.year === currentYear && currentMonth < 2}>{t('month_march') || 'Mart'}</option>
                                    <option value="month_april" disabled={formData.year === currentYear && currentMonth < 3}>{t('month_april') || 'Aprel'}</option>
                                    <option value="month_may" disabled={formData.year === currentYear && currentMonth < 4}>{t('month_may') || 'May'}</option>
                                    <option value="month_june" disabled={formData.year === currentYear && currentMonth < 5}>{t('month_june') || 'İyun'}</option>
                                    <option value="month_july" disabled={formData.year === currentYear && currentMonth < 6}>{t('month_july') || 'İyul'}</option>
                                    <option value="month_august" disabled={formData.year === currentYear && currentMonth < 7}>{t('month_august') || 'Avqust'}</option>
                                    <option value="month_september" disabled={formData.year === currentYear && currentMonth < 8}>{t('month_september') || 'Sentyabr'}</option>
                                    <option value="month_october" disabled={formData.year === currentYear && currentMonth < 9}>{t('month_october') || 'Oktyabr'}</option>
                                    <option value="month_november" disabled={formData.year === currentYear && currentMonth < 10}>{t('month_november') || 'Noyabr'}</option>
                                    <option value="month_december" disabled={formData.year === currentYear && currentMonth < 11}>{t('month_december') || 'Dekabr'}</option>
                                    <option value="custom">{t('custom') || 'Xüsusi aralıq'}</option>
                                </select>

                                {/* İl seçimi - yalnız ay və ya bu ay seçiləndə məna verir */}
                                {formData.datePreset !== 'today' && formData.datePreset !== 'this_week' && formData.datePreset !== 'custom' && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">{t('year') || 'İl'}:</span>
                                        <input
                                            type="number"
                                            value={formData.year}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value, 10);
                                                if (Number.isNaN(val)) return;
                                                // Gələcək illərə icazə vermirik
                                                if (val > currentYear) return;
                                                handleInputChange('year', val);
                                            }}
                                            max={currentYear}
                                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Custom Date Range - Only show when "custom" preset is selected */}
                        {formData.datePreset === 'custom' && (
                            <div className="grid grid-cols-2 gap-4 print:hidden">
                                <Input
                                    label={t('start_date') || 'Başlanğıc Tarix'}
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                                    error={errors.startDate}
                                    icon={<Calendar className="w-5 h-5" />}
                                    max={todayStr}
                                />
                                <Input
                                    label={t('end_date') || 'Bitmə Tarix'}
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                                    error={errors.endDate}
                                    icon={<Calendar className="w-5 h-5" />}
                                    max={todayStr}
                                />
                            </div>
                        )}

                        {/* Show selected date range for non-custom presets */}
                        {formData.datePreset !== 'custom' && formData.startDate && formData.endDate && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 print:hidden">
                                <p className="text-sm text-blue-800">
                                    <span className="font-medium">{t('selected_range') || 'Seçilmiş aralıq'}: </span>
                                    {new Date(formData.startDate).toLocaleDateString(i18n.language === 'az' ? 'az-AZ' : 'en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}{' '}
                                    -{' '}
                                    {new Date(formData.endDate).toLocaleDateString(i18n.language === 'az' ? 'az-AZ' : 'en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* Preview / Detail Table - Məhsullar */}
                {(isEditMode ? !!detailDelivery : !!(formData.startDate && formData.endDate)) && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm print:border-none print:shadow-none w-full">
                        {/* Başlıq və ümumi məlumatlar yalnız ekranda görünür */}
                        <div className="px-6 py-4 border-b border-gray-200 print:hidden">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {t('products_preview') || 'Məhsullar (Önizləmə)'}
                                    </h3>
                                    {totalProducts > 0 && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            {t('total_products') || 'Ümumi Məhsul Sayı'}: {totalProducts} •{' '}
                                            {t('total_stock') || 'Ümumi Stok'}: {totalStock}
                                        </p>
                                    )}
                                </div>
                                {isEditMode && (
                                    <button
                                        type="button"
                                        onClick={handleOpenAddModal}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t('add_product') || 'Məhsul əlavə et'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="w-full">
                            {(isEditMode && detailLoading) || (!isEditMode && previewLoading) ? (
                                <div className="p-8 text-center text-gray-500 print:hidden">
                                    {t('loading') || 'Yüklənir...'}
                                </div>
                            ) : tableItems.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 print:hidden">
                                    {t('no_products') || 'Məhsul tapılmadı'}
                                </div>
                            ) : (
                                <table className="final-delivery-print w-full divide-y divide-gray-200 print:text-xs">
                                    {dateRangeLabel && (
                                        <caption className="text-sm font-semibold text-gray-800 mb-2">
                                            {(t('date_range') || 'Tarix Aralığı') + ': ' + dateRangeLabel}
                                        </caption>
                                    )}
                                    <thead className="bg-gray-50 print:bg-white">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {t('product_name') || 'Məhsul Adı'}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {t('category') || 'Kateqoriya'}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {t('subcategory') || 'Alt Kateqoriya'}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {t('unit_type') || 'Ölçü Vahidi'}
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {t('full_boxes') || 'Tam Qutular'}
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {t('opened_box_quantity') || 'Açıq Qutu Miqdarı'}
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {t('remaining_stock') || 'Qalan Stok'}
                                            </th>
                                            {isEditMode && (
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider print:hidden">
                                                    {t('actions') || 'Əməliyyatlar'}
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedItems.map((item) => (
                                            <tr key={item.productId || item.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.product?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.product?.category?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.product?.subCategory?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {unitTypeLabelAz(item.product?.unitType)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {item.fullBoxes || 0}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {item.openedBoxQuantity || 0}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                                    {item.remainingStock || 0}
                                                </td>
                                                {isEditMode && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center print:hidden">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditItem(item)}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                title={t('edit') || 'Redaktə et'}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            {(() => {
                                                                const roleName = currentUser?.role?.name?.toLowerCase() || '';
                                                                const isSuperAdmin = roleName === 'superadmin';
                                                                // Yalnız superadmin silə bilər, admin və digər rollar silə bilməz
                                                                return isSuperAdmin ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteItem(item)}
                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                        title={t('delete') || 'Sil'}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Pagination */}
                            {tableItems.length > tablePagination.limit && (
                                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 print:hidden">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button
                                            type="button"
                                            onClick={() => handleTablePageChange(Math.max(1, tablePagination.page - 1))}
                                            disabled={tablePagination.page === 1}
                                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            {t('previous') || 'Əvvəlki'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleTablePageChange(Math.min(Math.ceil(tableItems.length / tablePagination.limit), tablePagination.page + 1))}
                                            disabled={tablePagination.page === Math.ceil(tableItems.length / tablePagination.limit)}
                                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            {t('next') || 'Növbəti'}
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                {t('showing') || 'Göstərilir'}{' '}
                                                <span className="font-medium">{(tablePagination.page - 1) * tablePagination.limit + 1}</span>{' '}
                                                {t('to') || 'ilə'}{' '}
                                                <span className="font-medium">{Math.min(tablePagination.page * tablePagination.limit, tableItems.length)}</span>{' '}
                                                {t('of') || 'arasında'}{' '}
                                                <span className="font-medium">{tableItems.length}</span>{' '}
                                                {t('results') || 'nəticə'}
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                <button
                                                    type="button"
                                                    onClick={() => handleTablePageChange(Math.max(1, tablePagination.page - 1))}
                                                    disabled={tablePagination.page === 1}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <Calendar className="w-4 h-4 rotate-90" />
                                                </button>
                                                {[...Array(Math.ceil(tableItems.length / tablePagination.limit))].map((_, i) => (
                                                    <button
                                                        key={i + 1}
                                                        type="button"
                                                        onClick={() => handleTablePageChange(i + 1)}
                                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                            tablePagination.page === i + 1
                                                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => handleTablePageChange(Math.min(Math.ceil(tableItems.length / tablePagination.limit), tablePagination.page + 1))}
                                                    disabled={tablePagination.page === Math.ceil(tableItems.length / tablePagination.limit)}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <Calendar className="w-4 h-4 -rotate-90" />
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Form Actions */}
                {!isEditMode && (
                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 print:hidden">
                        <button
                            type="button"
                            onClick={() => navigate(listPath)}
                            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            {t('cancel') || 'Ləğv et'}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (t('saving') || 'Yadda saxlanılır...') : (t('create') || 'Yarat')}
                        </button>
                    </div>
                )}
            </form>

            {/* Edit Item Modal */}
            {showEditModal && editingItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {t('edit_product') || 'Məhsul Redaktə Et'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingItem(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-2">{t('product_name') || 'Məhsul'}:</p>
                                <p className="text-base font-medium text-gray-900">{editingItem.product?.name || '-'}</p>
                            </div>
                            <Input
                                label={t('remaining_stock') || 'Qalan Stok'}
                                type="number"
                                value={editFormData.remainingStock}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, remainingStock: e.target.value }))}
                                min="0"
                            />
                            <Input
                                label={t('stock') || 'Ümumi Stok'}
                                type="number"
                                value={editFormData.stock}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, stock: e.target.value }))}
                                min="0"
                            />
                            <Input
                                label={t('full_boxes') || 'Tam Qutular'}
                                type="number"
                                value={editFormData.fullBoxes}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, fullBoxes: e.target.value }))}
                                min="0"
                            />
                            <Input
                                label={t('opened_box_quantity') || 'Açıq Qutu Miqdarı'}
                                type="number"
                                value={editFormData.openedBoxQuantity}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, openedBoxQuantity: e.target.value }))}
                                min="0"
                            />
                            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingItem(null);
                                    }}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    {t('cancel') || 'Ləğv et'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveEditItem}
                                    disabled={editLoading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {editLoading ? (t('saving') || 'Yadda saxlanılır...') : (t('save') || 'Yadda saxla')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Item Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {t('add_product') || 'Məhsul Əlavə Et'}
                            </h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <SearchDropdown
                                label={t('product_name') || 'Məhsul Adı'}
                                options={availableProducts}
                                value={addFormData.productId}
                                onChange={(value) => setAddFormData(prev => ({ ...prev, productId: value }))}
                                placeholder={t('select_product') || 'Məhsul seçin'}
                                getOptionLabel={(option) => option.name || ''}
                                getOptionValue={(option) => option.id || ''}
                                searchFields={['name']}
                            />
                            <Input
                                label={t('remaining_stock') || 'Qalan Stok'}
                                type="number"
                                value={addFormData.remainingStock}
                                onChange={(e) => setAddFormData(prev => ({ ...prev, remainingStock: e.target.value }))}
                                min="0"
                            />
                            <Input
                                label={t('stock') || 'Ümumi Stok'}
                                type="number"
                                value={addFormData.stock}
                                onChange={(e) => setAddFormData(prev => ({ ...prev, stock: e.target.value }))}
                                min="0"
                            />
                            <Input
                                label={t('full_boxes') || 'Tam Qutular'}
                                type="number"
                                value={addFormData.fullBoxes}
                                onChange={(e) => setAddFormData(prev => ({ ...prev, fullBoxes: e.target.value }))}
                                min="0"
                            />
                            <Input
                                label={t('opened_box_quantity') || 'Açıq Qutu Miqdarı'}
                                type="number"
                                value={addFormData.openedBoxQuantity}
                                onChange={(e) => setAddFormData(prev => ({ ...prev, openedBoxQuantity: e.target.value }))}
                                min="0"
                            />
                            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    {t('cancel') || 'Ləğv et'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveAddItem}
                                    disabled={addLoading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {addLoading ? (t('saving') || 'Yadda saxlanılır...') : (t('add') || 'Əlavə et')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

