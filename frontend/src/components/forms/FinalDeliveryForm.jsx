import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Alert from '../ui/Alert';
import Input from '../ui/Input';
import { Calendar, Edit, Trash2, Plus, X, FileSpreadsheet, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
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
        // Navbardakı filialdan başla; create modu üçün ilkin dəyər
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
        limit: 20
    });

    // Stock filter state: 'all' | 'inStock' | 'lowStock' | 'outOfStock'
    const [stockFilter, setStockFilter] = useState('all');

    // Purchase value breakdown modal
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [purchaseModalSort, setPurchaseModalSort] = useState({ key: 'total', dir: 'desc' });
    const printRef = useRef(null);
    
    // Stock modal
    const [showStockModal, setShowStockModal] = useState(false);
    const [stockModalSort, setStockModalSort] = useState({ key: 'stock', dir: 'desc' });
    const printStockRef = useRef(null);

    // Prevent body scroll when modals are open
    useEffect(() => {
        if (showEditModal || showAddModal || showPurchaseModal || showStockModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showEditModal, showAddModal, showPurchaseModal, showStockModal]);

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

    useEffect(() => {
        if (isEditMode || !canPickAnyBranch) return;
        if (!selectedBranchId || selectedBranchId === 'central') return;
        setFormData((p) => (p.branchId === selectedBranchId ? p : { ...p, branchId: selectedBranchId }));
    }, [isEditMode, canPickAnyBranch, selectedBranchId]);

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

    // Reset table page when preview/detail or filter changes
    useEffect(() => {
        setTablePagination(prev => ({ ...prev, page: 1 }));
    }, [previewData, detailDelivery, stockFilter]);

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

    // Statistics computed from ALL tableItems (before filter)
    const totalProducts = tableItems.length;
    const totalStock = tableItems.reduce(
        (sum, item) => sum + (item.remainingStock ?? item.stock ?? 0),
        0
    );
    const totalPurchaseValue = tableItems.reduce((sum, item) => {
        const stock = item.remainingStock ?? item.stock ?? 0;
        const rawPrice = item.product?.purchasePrice ?? item.product?.costPrice ?? item.product?.unitPrice ?? 0;
        const purchasePrice = parseFloat(rawPrice) || 0;
        return sum + stock * purchasePrice;
    }, 0);
    const inStockCount = tableItems.filter(item => (item.remainingStock ?? item.stock ?? 0) > 10).length;
    const lowStockCount = tableItems.filter(item => { const s = item.remainingStock ?? item.stock ?? 0; return s > 0 && s <= 10; }).length;
    const outOfStockCount = tableItems.filter(item => (item.remainingStock ?? item.stock ?? 0) === 0).length;

    // Apply stock filter
    const filteredTableItems = useMemo(() => {
        if (stockFilter === 'inStock') return tableItems.filter(item => (item.remainingStock ?? item.stock ?? 0) > 10);
        if (stockFilter === 'lowStock') return tableItems.filter(item => { const s = item.remainingStock ?? item.stock ?? 0; return s > 0 && s <= 10; });
        if (stockFilter === 'outOfStock') return tableItems.filter(item => (item.remainingStock ?? item.stock ?? 0) === 0);
        return tableItems;
    }, [tableItems, stockFilter]);

    const paginatedItems = filteredTableItems.slice(
        (tablePagination.page - 1) * tablePagination.limit,
        tablePagination.page * tablePagination.limit
    );

    const totalFilteredPages = Math.ceil(filteredTableItems.length / tablePagination.limit);

    // Smart pagination page numbers with ellipsis
    const getPaginationPages = (current, total) => {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const pages = [];
        if (current <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', total);
        } else if (current >= total - 3) {
            pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
        } else {
            pages.push(1, '...', current - 1, current, current + 1, '...', total);
        }
        return pages;
    };

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

                        {/* ─── Ümumi Statistika Kartları ─── */}
                        {totalProducts > 0 && (
                            <div className="px-6 pt-5 pb-4 print:hidden">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    Ümumi Statistika
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                    {/* Ümumi Məhsul */}
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Ümumi Məhsul</span>
                                        <span className="text-2xl font-bold text-blue-700">{totalProducts}</span>
                                        <span className="text-xs text-blue-500">məhsul növü</span>
                                    </div>
                                    {/* Ümumi Stok — clickable */}
                                    <button
                                        type="button"
                                        onClick={() => setShowStockModal(true)}
                                        className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-3 flex flex-col gap-1 text-left hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer group"
                                        title="Ətraflı bax"
                                    >
                                        <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide flex items-center gap-1">
                                            Ümumi Stok
                                            <FileSpreadsheet className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                        </span>
                                        <span className="text-2xl font-bold text-indigo-700">{totalStock.toLocaleString()}</span>
                                        <span className="text-xs text-indigo-500 flex items-center justify-between w-full">
                                            <span>ədəd</span>
                                            <span className="underline underline-offset-2">ətraflı bax →</span>
                                        </span>
                                    </button>
                                    {/* Alış Qiyməti × Stok — clickable */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPurchaseModal(true)}
                                        className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-3 flex flex-col gap-1 text-left hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group"
                                        title="Ətraflı bax"
                                    >
                                        <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide flex items-center gap-1">
                                            Alış Dəyəri
                                            <FileSpreadsheet className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                        </span>
                                        <span className="text-xl font-bold text-emerald-700 truncate">
                                            {totalPurchaseValue > 0
                                                ? `${totalPurchaseValue.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`
                                                : '—'}
                                        </span>
                                        <span className="text-xs text-emerald-500 underline underline-offset-2">ətraflı bax →</span>
                                    </button>
                                    {/* Stokda var */}
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-green-600 uppercase tracking-wide">Stokda Var</span>
                                        <span className="text-2xl font-bold text-green-700">{inStockCount}</span>
                                        <span className="text-xs text-green-500">&gt; 10 ədəd</span>
                                    </div>
                                    {/* Az stok + Stokda yox */}
                                    <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-red-500 uppercase tracking-wide">Az / Yox</span>
                                        <span className="text-2xl font-bold text-red-600">{lowStockCount + outOfStockCount}</span>
                                        <span className="text-xs text-red-400">{lowStockCount} az • {outOfStockCount} yox</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Başlıq + Filter Toolbar */}
                        <div className="px-6 py-4 border-b border-gray-200 print:hidden">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {t('products_preview') || 'Məhsullar (Önizləmə)'}
                                    </h3>
                                    {stockFilter !== 'all' && (
                                        <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
                                            {filteredTableItems.length} nəticə
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Stock status filter buttons */}
                                    {[
                                        { key: 'all', label: 'Hamısı', count: totalProducts },
                                        { key: 'inStock', label: '✓ Stokda Var', count: inStockCount },
                                        { key: 'lowStock', label: '⚠ Az Stok', count: lowStockCount },
                                        { key: 'outOfStock', label: '✕ Yoxdur', count: outOfStockCount },
                                    ].map(({ key, label, count }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setStockFilter(key)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${
                                                stockFilter === key
                                                    ? key === 'inStock' ? 'bg-green-600 text-white border-green-600 shadow-sm'
                                                    : key === 'lowStock' ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                                    : key === 'outOfStock' ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                                    : 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {label} <span className="opacity-75 ml-1">({count})</span>
                                        </button>
                                    ))}
                                    {isEditMode && (
                                        <button
                                            type="button"
                                            onClick={handleOpenAddModal}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold ml-2"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {t('add_product') || 'Məhsul əlavə et'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowStockModal(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 shadow-md transition-all text-sm font-bold ml-2 animate-pulse-once"
                                    >
                                        <FileSpreadsheet className="w-4 h-4" />
                                        Cari Qalıq Hesabatı (Çap)
                                    </button>
                                </div>
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
                                        {paginatedItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={isEditMode ? 8 : 7} className="px-6 py-12 text-center text-gray-400 text-sm">
                                                    Bu filterdə məhsul tapılmadı
                                                </td>
                                            </tr>
                                        ) : paginatedItems.map((item) => {
                                            const remainingStock = item.remainingStock ?? item.stock ?? 0;
                                            const stockBadge = remainingStock === 0
                                                ? <span className="inline-block text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Yoxdur</span>
                                                : remainingStock <= 10
                                                ? <span className="inline-block text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">Az</span>
                                                : <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Var</span>;
                                            return (
                                            <tr key={item.productId || item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 text-sm font-medium text-gray-900">
                                                    {item.product?.name || '-'}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-500">
                                                    {item.product?.category?.name || '-'}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-500">
                                                    {item.product?.subCategory?.name || '-'}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-500">
                                                    {unitTypeLabelAz(item.product?.unitType)}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-900 text-right">
                                                    {item.fullBoxes || 0}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-900 text-right">
                                                    {item.openedBoxQuantity || 0}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="font-semibold text-gray-900">{remainingStock}</span>
                                                        {stockBadge}
                                                    </div>
                                                </td>
                                                {isEditMode && (
                                                    <td className="px-6 py-3 text-sm text-center print:hidden">
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
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}

                            {/* ─── Smart Pagination ─── */}
                            {totalFilteredPages > 1 && (
                                <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 print:hidden">
                                    {/* Info text */}
                                    <p className="text-sm text-gray-600 order-2 sm:order-1">
                                        <span className="font-semibold text-gray-800">
                                            {(tablePagination.page - 1) * tablePagination.limit + 1}–{Math.min(tablePagination.page * tablePagination.limit, filteredTableItems.length)}
                                        </span>
                                        {' '}/ {filteredTableItems.length} nəticə
                                        {stockFilter !== 'all' && (
                                            <span className="ml-1 text-blue-600">(filterlənib)</span>
                                        )}
                                    </p>
                                    {/* Page buttons */}
                                    <div className="flex items-center gap-1 order-1 sm:order-2">
                                        {/* Prev */}
                                        <button
                                            type="button"
                                            onClick={() => handleTablePageChange(tablePagination.page - 1)}
                                            disabled={tablePagination.page === 1}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                                        >
                                            ‹
                                        </button>
                                        {/* Page numbers with ellipsis */}
                                        {getPaginationPages(tablePagination.page, totalFilteredPages).map((page, idx) =>
                                            page === '...' ? (
                                                <span key={`ellipsis-${idx}`} className="inline-flex items-center justify-center w-8 h-8 text-gray-400 text-sm">…</span>
                                            ) : (
                                                <button
                                                    key={page}
                                                    type="button"
                                                    onClick={() => handleTablePageChange(page)}
                                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium border transition-colors ${
                                                        tablePagination.page === page
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            )
                                        )}
                                        {/* Next */}
                                        <button
                                            type="button"
                                            onClick={() => handleTablePageChange(tablePagination.page + 1)}
                                            disabled={tablePagination.page === totalFilteredPages}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                                        >
                                            ›
                                        </button>
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

            {/* ─── Alış Dəyəri Breakdown Modal ─── */}
            {showPurchaseModal && (() => {
                // Build row data for ALL tableItems (no stock filter)
                const rows = tableItems.map(item => {
                    const stock = item.remainingStock ?? item.stock ?? 0;
                    const rawPrice = item.product?.purchasePrice ?? item.product?.costPrice ?? item.product?.unitPrice ?? 0;
                    const price = parseFloat(rawPrice) || 0;
                    return {
                        name: item.product?.name || '—',
                        category: item.product?.category?.name || '—',
                        subCategory: item.product?.subCategory?.name || '—',
                        unitType: unitTypeLabelAz(item.product?.unitType),
                        stock,
                        price,
                        total: stock * price,
                    };
                });

                // Sort
                const sorted = [...rows].sort((a, b) => {
                    const av = a[purchaseModalSort.key];
                    const bv = b[purchaseModalSort.key];
                    if (typeof av === 'string') return purchaseModalSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
                    return purchaseModalSort.dir === 'asc' ? av - bv : bv - av;
                });

                const grandTotal = rows.reduce((s, r) => s + r.total, 0);
                const hasPrice = rows.some(r => r.price > 0);

                const handleSort = (key) => {
                    setPurchaseModalSort(prev => ({
                        key,
                        dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc'
                    }));
                };

                const SortIcon = ({ col }) => {
                    if (purchaseModalSort.key !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
                    return purchaseModalSort.dir === 'asc'
                        ? <ChevronUp className="w-3 h-3 text-emerald-600" />
                        : <ChevronDown className="w-3 h-3 text-emerald-600" />;
                };

                const exportExcel = () => {
                    const wsData = [
                        ['Məhsul Adı', 'Kateqoriya', 'Alt Kateqoriya', 'Ölçü', 'Stok Miqdarı', 'Alış Qiyməti (₼)', 'Cəmi Dəyər (₼)'],
                        ...sorted.map(r => [r.name, r.category, r.subCategory, r.unitType, r.stock, r.price, r.total]),
                        [],
                        ['', '', '', '', '', 'ÜMUMİ CƏM:', grandTotal],
                    ];
                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                    // Column widths
                    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Alış Dəyəri');
                    const dateStr = new Date().toLocaleDateString('az-AZ').replace(/\./g, '-');
                    XLSX.writeFile(wb, `alis-deyeri-${dateStr}.xlsx`);
                };

                const handlePrint = () => {
                    const printContent = printRef.current?.innerHTML;
                    if (!printContent) return;
                    const win = window.open('', '_blank', 'width=900,height=700');
                    win.document.write(`
                        <html><head><title>Alış Dəyəri Hesabatı</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 24px; font-size: 12px; }
                            h2 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
                            p.sub { color: #555; margin-bottom: 16px; font-size: 11px; }
                            table { width: 100%; border-collapse: collapse; }
                            th { background: #f0fdf4; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; border: 1px solid #d1fae5; }
                            td { padding: 7px 8px; border: 1px solid #e5e7eb; }
                            tr:nth-child(even) td { background: #f9fafb; }
                            .text-right { text-align: right; }
                            .total-row td { font-weight: bold; background: #f0fdf4; border-top: 2px solid #059669; }
                            .warn { color: #dc2626; font-style: italic; font-size: 10px; margin-top: 12px; }
                        </style></head><body>${printContent}</body></html>
                    `);
                    win.document.close();
                    win.focus();
                    setTimeout(() => { win.print(); win.close(); }, 400);
                };

                return (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                        Alış Dəyəri — Ətraflı Hesabat
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {rows.length} məhsul • Ümumi:{' '}
                                        <span className="font-semibold text-emerald-700">
                                            {grandTotal.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼
                                        </span>
                                        {!hasPrice && (
                                            <span className="ml-2 text-red-500 text-xs">(bəzi məhsulların alış qiyməti daxil edilməyib)</span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={exportExcel}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                                    >
                                        <FileSpreadsheet className="w-4 h-4" />
                                        Excel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePrint}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Çap et
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowPurchaseModal(false)}
                                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Print content */}
                            <div ref={printRef} className="hidden">
                                <h2>Alış Dəyəri Hesabatı</h2>
                                <p className="sub">
                                    {isEditMode && detailDelivery ? detailDelivery.title : `${formData.startDate} – ${formData.endDate}`}
                                    {' '} | {rows.length} məhsul | Ümumi: {grandTotal.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼
                                </p>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Məhsul Adı</th>
                                            <th>Kateqoriya</th>
                                            <th>Alt Kateqoriya</th>
                                            <th>Ölçü</th>
                                            <th className="text-right">Stok</th>
                                            <th className="text-right">Alış Qiyməti</th>
                                            <th className="text-right">Cəmi Dəyər</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sorted.map((r, i) => (
                                            <tr key={i}>
                                                <td>{i + 1}</td>
                                                <td>{r.name}</td>
                                                <td>{r.category}</td>
                                                <td>{r.subCategory}</td>
                                                <td>{r.unitType}</td>
                                                <td className="text-right">{r.stock}</td>
                                                <td className="text-right">{r.price > 0 ? `${r.price.toFixed(2)} ₼` : '—'}</td>
                                                <td className="text-right">{r.total > 0 ? `${r.total.toFixed(2)} ₼` : '—'}</td>
                                            </tr>
                                        ))}
                                        <tr className="total-row">
                                            <td colSpan={7} className="text-right">ÜMUMİ CƏM:</td>
                                            <td className="text-right">{grandTotal.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼</td>
                                        </tr>
                                    </tbody>
                                </table>
                                {!hasPrice && (
                                    <p className="warn">* Alış qiyməti daxil edilməmiş məhsullar hesablamaya təsir etmir.</p>
                                )}
                            </div>

                            {/* Scrollable table */}
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-emerald-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                                            {[
                                                { key: 'name', label: 'Məhsul Adı' },
                                                { key: 'category', label: 'Kateqoriya' },
                                                { key: 'unitType', label: 'Ölçü' },
                                            ].map(({ key, label }) => (
                                                <th key={key}
                                                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-emerald-700 select-none"
                                                    onClick={() => handleSort(key)}
                                                >
                                                    <div className="flex items-center gap-1">{label}<SortIcon col={key} /></div>
                                                </th>
                                            ))}
                                            {[
                                                { key: 'stock', label: 'Stok' },
                                                { key: 'price', label: 'Alış Qiyməti' },
                                                { key: 'total', label: 'Cəmi Dəyər' },
                                            ].map(({ key, label }) => (
                                                <th key={key}
                                                    className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-emerald-700 select-none"
                                                    onClick={() => handleSort(key)}
                                                >
                                                    <div className="flex items-center justify-end gap-1">{label}<SortIcon col={key} /></div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sorted.map((r, i) => (
                                            <tr key={i} className={`hover:bg-emerald-50/40 transition-colors ${r.price === 0 ? 'opacity-60' : ''}`}>
                                                <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                                <td className="px-4 py-2.5 font-medium text-gray-900">{r.name}</td>
                                                <td className="px-4 py-2.5 text-gray-500 text-xs">{r.category}</td>
                                                <td className="px-4 py-2.5 text-gray-400 text-xs">{r.unitType}</td>
                                                <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{r.stock.toLocaleString()}</td>
                                                <td className="px-4 py-2.5 text-right text-gray-600">
                                                    {r.price > 0 ? (
                                                        <span className="font-medium">{r.price.toFixed(2)} ₼</span>
                                                    ) : (
                                                        <span className="text-red-400 text-xs italic">qiymət yox</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    {r.total > 0 ? (
                                                        <span className="font-bold text-emerald-700">
                                                            {r.total.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-emerald-50 border-t-2 border-emerald-200 sticky bottom-0">
                                        <tr>
                                            <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-emerald-800 uppercase tracking-wide">
                                                ÜMUMİ CƏM:
                                            </td>
                                            <td className="px-4 py-3 text-right text-lg font-black text-emerald-700">
                                                {grandTotal.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>

                                {!hasPrice && (
                                    <div className="px-6 py-3 bg-red-50 border-t border-red-100">
                                        <p className="text-xs text-red-500 italic">
                                            ⚠ Bəzi məhsulların alış qiyməti sistemə daxil edilməyib. Bu məhsullar cəm hesablamaya daxil edilmir.
                                            Düzgün hesab üçün həmin məhsullara alış qiyməti əlavə edin.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ─── Ümumi Stok Breakdown Modal ─── */}
            {showStockModal && (() => {
                const rows = tableItems.map(item => {
                    const stock = item.remainingStock ?? item.stock ?? 0;
                    const rawPurchasePrice = item.product?.purchasePrice ?? item.product?.costPrice ?? item.product?.unitPrice ?? 0;
                    const purchasePrice = parseFloat(rawPurchasePrice) || 0;
                    const rawSalePrice = item.product?.salePrice ?? 0;
                    const salePrice = parseFloat(rawSalePrice) || 0;
                    return {
                        name: item.product?.name || '—',
                        category: item.product?.category?.name || '—',
                        subCategory: item.product?.subCategory?.name || '—',
                        unitType: unitTypeLabelAz(item.product?.unitType),
                        stock,
                        purchasePrice,
                        salePrice
                    };
                }).filter(r => r.stock > 0);

                const sorted = [...rows].sort((a, b) => {
                    const av = a[stockModalSort.key];
                    const bv = b[stockModalSort.key];
                    if (typeof av === 'string') return stockModalSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
                    return stockModalSort.dir === 'asc' ? av - bv : bv - av;
                });

                const grandTotalStock = rows.reduce((s, r) => s + r.stock, 0);
                const grandTotalPurchase = rows.reduce((s, r) => s + (r.stock * r.purchasePrice), 0);
                const grandTotalSale = rows.reduce((s, r) => s + (r.stock * r.salePrice), 0);

                const handleSort = (key) => {
                    setStockModalSort(prev => ({
                        key,
                        dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc'
                    }));
                };

                const SortIcon = ({ col }) => {
                    if (stockModalSort.key !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
                    return stockModalSort.dir === 'asc'
                        ? <ChevronUp className="w-3 h-3 text-indigo-600" />
                        : <ChevronDown className="w-3 h-3 text-indigo-600" />;
                };

                const exportExcel = () => {
                    const wsData = [
                        ['Məhsul Adı', 'Kateqoriya', 'Alt Kateqoriya', 'Ölçü', 'Stok Miqdarı', 'Alış Qiyməti (₼)', 'Satış Qiyməti (₼)'],
                        ...sorted.map(r => [r.name, r.category, r.subCategory, r.unitType, r.stock, r.purchasePrice, r.salePrice]),
                        [],
                        ['', '', '', 'ÜMUMİ CƏM:', grandTotalStock, grandTotalPurchase, grandTotalSale],
                    ];
                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Ümumi Stok');
                    const dateStr = new Date().toLocaleDateString('az-AZ').replace(/\./g, '-');
                    XLSX.writeFile(wb, `umumi-stok-${dateStr}.xlsx`);
                };

                const handlePrint = () => {
                    const printContent = printStockRef.current?.innerHTML;
                    if (!printContent) return;
                    const win = window.open('', '_blank', 'width=900,height=700');
                    win.document.write(`
                        <html><head><title>Ümumi Stok Hesabatı</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 24px; font-size: 12px; }
                            h2 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
                            p.sub { color: #555; margin-bottom: 16px; font-size: 11px; }
                            table { width: 100%; border-collapse: collapse; }
                            th { background: #e0e7ff; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; border: 1px solid #c7d2fe; }
                            td { padding: 7px 8px; border: 1px solid #e5e7eb; }
                            tr:nth-child(even) td { background: #f9fafb; }
                            .text-right { text-align: right; }
                            .total-row td { font-weight: bold; background: #e0e7ff; border-top: 2px solid #4f46e5; }
                        </style></head><body>${printContent}</body></html>
                    `);
                    win.document.close();
                    win.focus();
                    setTimeout(() => { win.print(); win.close(); }, 400);
                };

                return (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                                        Ümumi Stok — Ətraflı Hesabat
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {rows.length} məhsul • Ümumi:{' '}
                                        <span className="font-semibold text-indigo-700">
                                            {grandTotalStock.toLocaleString('az-AZ')} ədəd
                                        </span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={exportExcel}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                    >
                                        <FileSpreadsheet className="w-4 h-4" />
                                        Excel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePrint}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Çap et
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowStockModal(false)}
                                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div ref={printStockRef} className="hidden">
                                <h2>Ümumi Stok Hesabatı</h2>
                                <p className="sub">
                                    {isEditMode && detailDelivery ? detailDelivery.title : `${formData.startDate} – ${formData.endDate}`}
                                    {' '} | {rows.length} məhsul | Ümumi: {grandTotalStock.toLocaleString('az-AZ')} ədəd
                                </p>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Məhsul Adı</th>
                                            <th>Kateqoriya</th>
                                            <th>Alt Kateqoriya</th>
                                            <th>Ölçü</th>
                                            <th className="text-right">Stok</th>
                                            <th className="text-right">Alış Qiyməti</th>
                                            <th className="text-right">Satış Qiyməti</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sorted.map((r, i) => (
                                            <tr key={i}>
                                                <td>{i + 1}</td>
                                                <td>{r.name}</td>
                                                <td>{r.category}</td>
                                                <td>{r.subCategory}</td>
                                                <td>{r.unitType}</td>
                                                <td className="text-right">{r.stock}</td>
                                                <td className="text-right">{r.purchasePrice.toFixed(2)} ₼</td>
                                                <td className="text-right">{r.salePrice.toFixed(2)} ₼</td>
                                            </tr>
                                        ))}
                                        <tr className="total-row">
                                            <td colSpan={5} className="text-right">ÜMUMİ CƏM:</td>
                                            <td className="text-right">{grandTotalStock.toLocaleString('az-AZ')}</td>
                                            <td className="text-right">{grandTotalPurchase.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼</td>
                                            <td className="text-right">{grandTotalSale.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-indigo-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                                            {[
                                                { key: 'name', label: 'Məhsul Adı' },
                                                { key: 'category', label: 'Kateqoriya' },
                                                { key: 'unitType', label: 'Ölçü' },
                                            ].map(({ key, label }) => (
                                                <th key={key}
                                                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-700 select-none"
                                                    onClick={() => handleSort(key)}
                                                >
                                                    <div className="flex items-center gap-1">{label}<SortIcon col={key} /></div>
                                                </th>
                                            ))}
                                            {[
                                                { key: 'stock', label: 'Stok' },
                                                { key: 'purchasePrice', label: 'Alış Q.' },
                                                { key: 'salePrice', label: 'Satış Q.' },
                                            ].map(({ key, label }) => (
                                                <th key={key}
                                                    className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-700 select-none"
                                                    onClick={() => handleSort(key)}
                                                >
                                                    <div className="flex items-center justify-end gap-1">{label}<SortIcon col={key} /></div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sorted.map((r, i) => (
                                            <tr key={i} className="hover:bg-indigo-50/40 transition-colors">
                                                <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                                <td className="px-4 py-2.5 font-medium text-gray-900">{r.name}</td>
                                                <td className="px-4 py-2.5 text-gray-500 text-xs">{r.category}</td>
                                                <td className="px-4 py-2.5 text-gray-400 text-xs">{r.unitType}</td>
                                                <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{r.stock.toLocaleString()}</td>
                                                <td className="px-4 py-2.5 text-right text-gray-600">
                                                    {r.purchasePrice > 0 ? (
                                                        <span className="font-medium">{r.purchasePrice.toFixed(2)} ₼</span>
                                                    ) : (
                                                        <span className="text-red-400 text-xs italic">yox</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-gray-600">
                                                    {r.salePrice > 0 ? (
                                                        <span className="font-medium">{r.salePrice.toFixed(2)} ₼</span>
                                                    ) : (
                                                        <span className="text-red-400 text-xs italic">yox</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-indigo-50 border-t-2 border-indigo-200 sticky bottom-0">
                                        <tr>
                                            <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-indigo-800 uppercase tracking-wide">
                                                ÜMUMİ CƏM:
                                            </td>
                                            <td className="px-4 py-3 text-right text-lg font-black text-indigo-700">
                                                {grandTotalStock.toLocaleString('az-AZ')}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-black text-indigo-700">
                                                {grandTotalPurchase.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-black text-indigo-700">
                                                {grandTotalSale.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

