import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import { MdInventory, MdDescription, MdImage, MdAttachMoney, MdLocalOffer, MdQrCode, MdStorage, MdCloudUpload, MdAdd, MdRemove, MdEdit, MdHistory, MdShoppingCart } from 'react-icons/md';
import { productApi, uploadApi, categoryApi, subCategoryApi, branchApi, authApi } from '../../api';
import { createInputChangeHandler } from '../../utils/validation';
import SearchDropdown from '../ui/SearchDropdown';
import ProductStockHistoryModal from '../modals/ProductStockHistoryModal';
import ProductBasicInfo from './productform/ProductBasicInfo';
import ProductPricing from './productform/ProductPricing';
import ProductUnitInfo from './productform/ProductUnitInfo';
import ProductStockSection from './productform/ProductStockSection';
import { useProductDiscountHandler, useProductFormChangeDetection, useProductStockManagement, useProductFormValidation, useBranch } from '../../hooks';

/** Superadmin və baş admin (admin + isBoss) filial seçə bilər — digər formlarla eyni */
function canPickProductBranch(user) {
    if (!user?.role?.name) return false;
    const r = user.role.name.toLowerCase();
    return r === 'superadmin' || (r === 'admin' && user.isBoss === true);
}

export default function ProductForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const categoryIdFromQuery = searchParams.get('categoryId');
    const subCategoryIdFromQuery = searchParams.get('subCategoryId');
    const { t } = useTranslation('product');
    const { t: tAlert } = useTranslation('alert');
    const { selectedBranchId } = useBranch();

    const isAdmin = location.pathname.includes('/admin');
    const productPagePath = isAdmin ? '/admin/products' : '/reception/products';
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        imageUrl: '',
        purchasePrice: '',
        salePrice: '',
        hasDiscount: false,
        discountPrice: '',
        discountPercent: '',
        barcode: '',
        stock: '',
        isActive: true,
        isOfficial: false,
        categoryId: '',
        subCategoryId: '',
        unitType: 'PIECE',
        piecesPerBox: '',
        openedBoxQuantity: 0,
        boxPrice: '',
        fullBoxes: 0,
        branchId: ''
    });

    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [initialFormData, setInitialFormData] = useState(null);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [showStockHistoryModal, setShowStockHistoryModal] = useState(false);
    const [historyTab, setHistoryTab] = useState('movements');
    const [existingProducts, setExistingProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [branchSettings, setBranchSettings] = useState({ showPurchasePrice: true });

    // Validation hook
    const { validateForm } = useProductFormValidation(formData, setErrors, { showPurchasePrice: branchSettings.showPurchasePrice });

    // Stock management hook
    const {
        stockQuantity,
        stockBoxes,
        stockPieces,
        stockNote,
        stockMovementType,
        processingStock,
        showStockManagement,
        setStockQuantity,
        setStockBoxes,
        setStockPieces,
        setStockNote,
        setStockMovementType,
        setShowStockManagement,
        handleStockMovement
    } = useProductStockManagement(id, formData, setFormData, t, tAlert);

    // Fetch product data (if edit mode)
    useEffect(() => {
        const fetchProduct = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const resolvedBranchForApi =
                        formData.branchId && formData.branchId !== 'central'
                            ? formData.branchId
                            : selectedBranchId && selectedBranchId !== 'central'
                                ? selectedBranchId
                                : undefined;
                    const response = await productApi.getById(
                        id,
                        resolvedBranchForApi ? { branchId: resolvedBranchForApi } : {}
                    );
                    if (response.success && response.date) {
                        const product = response.date;

                        const imageUrl = product.imageUrl || '';
                        const initialData = {
                            name: product.name || '',
                            description: product.description || '',
                            imageUrl: imageUrl,
                            purchasePrice: product.purchasePrice?.toString() || '',
                            salePrice: product.salePrice?.toString() || '',
                            hasDiscount: product.hasDiscount || false,
                            discountPrice: product.discountPrice?.toString() || '',
                            discountPercent: product.discountPercent?.toString() || '',
                            barcode: product.barcode || '',
                            stock: product.stock || 0,
                            isActive: product.isActive !== undefined ? product.isActive : true,
                            isOfficial: product.isOfficial !== undefined ? product.isOfficial : false,
                            categoryId: product.categoryId || '',
                            subCategoryId: product.subCategoryId || '',
                            unitType: product.unitType || 'PIECE',
                            piecesPerBox: product.piecesPerBox?.toString() || '',
                            openedBoxQuantity: product.openedBoxQuantity || 0,
                            boxPrice: product.boxPrice?.toString() || '',
                            fullBoxes: product.fullBoxes || 0,
                            branchId: resolvedBranchForApi || 'central'
                        };
                        setFormData(initialData);
                        setInitialFormData(initialData);

                        // Fetch subcategories if categoryId exists
                        if (product.categoryId) {
                            fetchSubCategories(product.categoryId);
                        }

                        // Stock movements are only shown in modal, not fetched here

                        // Set preview if image exists
                        if (imageUrl) {
                            const url = String(imageUrl).trim();
                            let previewUrl = '';
                            if (url.startsWith('http://') || url.startsWith('https://')) {
                                previewUrl = url;
                            } else {
                                // VITE_API_URL-dən /api hissəsini çıxar
                                const apiUrl = import.meta.env.VITE_API_URL || '';
                                const baseUrl = apiUrl.replace('/api', ''); // http://localhost:5000
                                previewUrl = `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
                            }
                            setImagePreview(previewUrl);
                            console.log('Edit mode - Preview URL set:', previewUrl);
                        } else {
                            // Əgər şəkil yoxdursa, preview-i təmizlə
                            setImagePreview(null);
                        }

                        // Edit modunda selectedImageFile-i təmizlə (mövcud şəkil üçün)
                        setSelectedImageFile(null);

                        // Fetch subcategories if categoryId exists
                        if (product.categoryId) {
                            const fetchSubCategories = async (categoryId) => {
                                if (!categoryId) {
                                    setSubCategories([]);
                                    return;
                                }
                                try {
                                    const response = await subCategoryApi.getAll(categoryId);
                                    if (response.success && response.date) {
                                        setSubCategories(response.date);
                                    } else {
                                        setSubCategories([]);
                                    }
                                } catch (error) {
                                    console.error('Error fetching subcategories:', error);
                                    setSubCategories([]);
                                }
                            };
                            fetchSubCategories(product.categoryId);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching product:', error);
                    Alert.error(t('error_fetching'), t('error_fetching_text'));
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchProduct();
        // formData.branchId dependency-si: edit modunda filial dəyişəndə həmin filialın stokunu göstər
    }, [id, isEditMode, t, formData.branchId, selectedBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

    // İstifadəçi və filiallar
    useEffect(() => {
        const fetchData = async () => {
            setLoadingBranches(true);
            try {
                const [userResp, branchesResp] = await Promise.all([
                    authApi.me(),
                    branchApi.getAll()
                ]);
                if (userResp.success) {
                    setCurrentUser(userResp.data);
                }
                if (branchesResp.success && branchesResp.data) {
                    setBranches(branchesResp.data);
                }
            } catch (error) {
                console.error('Error fetching branches/user:', error);
            } finally {
                setLoadingBranches(false);
            }
        };
        fetchData();
    }, []);

    // Yeni məhsul: filiala bağlı admin/reception — öz filialı; superadmin/baş admin — header və ya Kürdəxanı/ilk
    useEffect(() => {
        if (isEditMode || !currentUser || branches.length === 0) return;

        let next = '';
        if (canPickProductBranch(currentUser)) {
            next =
                selectedBranchId && selectedBranchId !== 'central' ? selectedBranchId : '';
            if (!next) {
                const k = branches.find((b) => b.name === 'Kürdəxanı');
                next = k ? k.id : branches[0]?.id || '';
            }
        } else {
            next = currentUser.branchId || '';
            if (!next && selectedBranchId && selectedBranchId !== 'central') {
                next = selectedBranchId;
            }
        }

        setFormData((prev) =>
            prev.branchId === next ? prev : { ...prev, branchId: next }
        );
    }, [isEditMode, currentUser, selectedBranchId, branches]);

    const branchOptionsForForm = useMemo(() => {
        if (!currentUser || canPickProductBranch(currentUser)) return branches;
        const bid = currentUser.branchId;
        if (!bid) return branches;
        const mine = branches.filter((b) => b.id === bid);
        return mine.length ? mine : branches;
    }, [branches, currentUser]);

    // Fetch categories (Bütün kateqoriyalar - qlobal)
    useEffect(() => {
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const response = await categoryApi.getAll();
                if (response.success && response.date) {
                    setCategories(response.date);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []);

    // Fetch existing products for search (only in create mode)
    useEffect(() => {
        if (isEditMode) return; // Edit modunda lazım deyil
        if (!formData.branchId) return; // Filial seçilməyibsə gözlə

        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                const params = {};
                if (formData.branchId && formData.branchId !== 'central') {
                    params.branchId = formData.branchId;
                }
                const response = await productApi.getAll(params);
                if (response.success && (response.data || response.date)) {
                    const list = response.data || response.date;
                    setExistingProducts(list || []);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProducts();
    }, [isEditMode, formData.branchId]);

    // Generate barcode automatically on mount in create mode
    useEffect(() => {
        if (!isEditMode && !formData.barcode) {
            const randomPart = Math.floor(100000 + Math.random() * 900000);
            const newBarcode = `2000006${randomPart}`;
            setFormData(prev => ({ ...prev, barcode: newBarcode }));
        }
    }, [isEditMode]);

    // Fetch branch settings
    useEffect(() => {
        const fetchBranchSettings = async () => {
            const bId = formData.branchId || selectedBranchId;
            if (bId && bId !== 'central') {
                try {
                    const response = await branchApi.getById(bId);
                    if (response.success && response.data) {
                        setBranchSettings({
                            showPurchasePrice: response.data.showPurchasePrice !== false
                        });
                    }
                } catch (error) {
                    console.error('Error fetching branch settings:', error);
                }
            } else {
                setBranchSettings({ showPurchasePrice: true });
            }
        };
        fetchBranchSettings();
    }, [formData.branchId, selectedBranchId]);

    // Fetch subcategories when category changes
    const fetchSubCategories = async (categoryId) => {
        if (!categoryId) {
            setSubCategories([]);
            return;
        }
        try {
            const response = await subCategoryApi.getAll(categoryId);
            if (response.success && response.date) {
                setSubCategories(response.date);
            } else {
                setSubCategories([]);
            }
        } catch (error) {
            console.error('Error fetching subcategories:', error);
            setSubCategories([]);
        }
    };

    // Set category and subcategory from query params (only in new product mode)
    useEffect(() => {
        if (!isEditMode && categoryIdFromQuery) {
            setFormData(prev => ({
                ...prev,
                categoryId: categoryIdFromQuery
            }));
            // Fetch subcategories for the selected category
            if (categoryIdFromQuery) {
                fetchSubCategories(categoryIdFromQuery);
            }
        }
    }, [categoryIdFromQuery, isEditMode]);

    useEffect(() => {
        if (!isEditMode && subCategoryIdFromQuery && categoryIdFromQuery) {
            setFormData(prev => ({
                ...prev,
                subCategoryId: subCategoryIdFromQuery
            }));
        }
    }, [subCategoryIdFromQuery, categoryIdFromQuery, isEditMode]);

    // Handle category change
    const handleCategoryChange = (categoryId) => {
        setFormData(prev => ({
            ...prev,
            categoryId,
            subCategoryId: ''
        }));

        setErrors(prev => ({
            ...prev,
            categoryId: undefined,
            subCategoryId: undefined
        }));

        fetchSubCategories(categoryId);
    };


    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // File validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            Alert.error(t('error') || 'Xəta!', t('invalid_image_type') || 'Yalnız şəkil faylları (jpeg, jpg, png, gif, webp) yüklənə bilər');
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            Alert.error(t('error') || 'Xəta!', t('image_too_large') || 'Şəkil ölçüsü 5MB-dan böyük ola bilməz');
            e.target.value = '';
            return;
        }

        // Save file for later upload
        setSelectedImageFile(file);

        // Preview - FileReader ilə şəkil preview-i yarat
        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.result) {
                setImagePreview(reader.result);
                console.log('Preview set for new file');
            }
        };
        reader.onerror = () => {
            console.error('FileReader error');
            Alert.error(t('error') || 'Xəta!', t('image_preview_error') || 'Şəkil preview-i yaradıla bilmədi');
        };
        reader.readAsDataURL(file);

        // Clear URL input if file is selected
        handleInputChange('imageUrl', '');
    };

    // Number field-lar üçün validation
    const numberFields = ['purchasePrice', 'salePrice', 'discountPrice', 'discountPercent', 'stock', 'piecesPerBox', 'openedBoxQuantity', 'boxPrice', 'fullBoxes'];

    // Custom handler for discount calculations
    const { customDiscountHandler } = useProductDiscountHandler(formData, setFormData);

    const handleInputChange = createInputChangeHandler(
        setFormData,
        setErrors,
        errors,
        numberFields,
        t,
        customDiscountHandler
    );

    // Check if form has changed (only in edit mode)
    const { hasFormChanged } = useProductFormChangeDetection(formData, initialFormData, selectedImageFile, isEditMode);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            console.error("Validation failed with errors:", errors);
            // Re-run validation to get the fresh errors immediately for logging
            Alert.error(tAlert('error') || 'Xəta!', t('fill_required_fields') || 'Zəhmət olmasa tələb olunan sahələri düzgün doldurun.');
            return;
        }

        // In edit mode, check if form has changed
        if (isEditMode && !hasFormChanged()) {
            Alert.info(t('no_changes') || 'Xəbərdarlıq', t('no_changes_text') || 'Formda heç bir dəyişiklik edilməyib');
            return;
        }

        setIsLoading(true);

        try {
            let imageUrlValue = formData.imageUrl?.trim() || null;

            // If image file is selected, upload it first
            if (selectedImageFile) {
                try {
                    const uploadResponse = await uploadApi.uploadImage(selectedImageFile);
                    if (uploadResponse.success && uploadResponse.data) {
                        imageUrlValue = uploadResponse.data.url;
                    } else {
                        throw new Error(uploadResponse.message || 'Upload failed');
                    }
                } catch (uploadError) {
                    console.error('Image upload error:', uploadError);
                    Alert.error(t('error') || 'Xəta!', uploadError.response?.data?.message || t('upload_error') || 'Şəkil yüklənərkən xəta baş verdi');
                    setIsLoading(false);
                    return;
                }
            }

            // If no image file in edit mode, show error

            // Stock hesablaması (qutu/ədəd məntiqinə uyğun)
            let calculatedStock = parseInt(formData.stock) || 0;
            let calculatedFullBoxes = parseInt(formData.fullBoxes) || 0;
            let calculatedOpenedBoxQuantity = parseInt(formData.openedBoxQuantity) || 0;
            const piecesPerBox = formData.piecesPerBox ? parseInt(formData.piecesPerBox) : null;

            console.log('=== FRONTEND STOCK DEBUG ===');
            console.log('formData.stock:', formData.stock);
            console.log('formData.fullBoxes:', formData.fullBoxes);
            console.log('formData.openedBoxQuantity:', formData.openedBoxQuantity);
            console.log('formData.piecesPerBox:', formData.piecesPerBox);
            console.log('calculatedStock (initial):', calculatedStock);

            // Əgər qutu tipindədirsə və stok verilibsə, fullBoxes və openedBoxQuantity hesabla
            if (piecesPerBox && piecesPerBox > 0 && formData.stock) {
                calculatedFullBoxes = Math.floor(calculatedStock / piecesPerBox);
                calculatedOpenedBoxQuantity = calculatedStock % piecesPerBox;
                console.log('Calculated from stock - fullBoxes:', calculatedFullBoxes, 'openedBoxQuantity:', calculatedOpenedBoxQuantity);
            } else if (piecesPerBox && piecesPerBox > 0 && (formData.fullBoxes !== undefined || formData.openedBoxQuantity !== undefined)) {
                // fullBoxes və ya openedBoxQuantity verilibsə, stock hesabla
                calculatedStock = (calculatedFullBoxes * piecesPerBox) + calculatedOpenedBoxQuantity;
                console.log('Calculated from boxes - stock:', calculatedStock);
            }

            console.log('Final calculatedStock:', calculatedStock);
            console.log('=== END FRONTEND DEBUG ===');

            // Qutu qiymətini avtomatik hesabla
            let calculatedBoxPrice = null;
            if (formData.unitType !== 'PIECE' && piecesPerBox && piecesPerBox > 0) {
                const salePrice = parseFloat(formData.salePrice) || 0;
                if (salePrice > 0) {
                    calculatedBoxPrice = salePrice * piecesPerBox;
                }
            }

            const payload = {
                name: formData.name.trim(),
                description: formData.description?.trim() || null,
                imageUrl: imageUrlValue,
                purchasePrice: parseFloat(formData.purchasePrice) || 0,
                salePrice: parseFloat(formData.salePrice),
                hasDiscount: formData.hasDiscount,
                discountPrice: formData.hasDiscount && formData.discountPrice ? parseFloat(formData.discountPrice) : null,
                discountPercent: formData.hasDiscount && formData.discountPercent ? parseInt(formData.discountPercent) : null,
                barcode: formData.barcode?.trim() || null,
                unitType: formData.unitType || 'PIECE',
                piecesPerBox: piecesPerBox || null,
                openedBoxQuantity: calculatedOpenedBoxQuantity,
                boxPrice: calculatedBoxPrice,
                fullBoxes: calculatedFullBoxes,
                stock: calculatedStock,
                isActive: formData.isActive,
                isOfficial: formData.isOfficial,
                branchId: formData.branchId,
                categoryId:
                    formData.categoryId && formData.categoryId.trim() !== ''
                        ? formData.categoryId
                        : null,
                subCategoryId:
                    formData.subCategoryId && formData.subCategoryId.trim() !== ''
                        ? formData.subCategoryId
                        : null
            };

            if (isEditMode) {
                await productApi.update(id.toString(), payload);
                Alert.success(t('update_success') || 'Uğurlu!', t('update_success_text') || 'Məhsul məlumatları uğurla yeniləndi');
            } else {
                await productApi.create(payload);
                Alert.success(t('add_success') || 'Uğurlu!', t('add_success_text') || 'Məhsul uğurla əlavə edildi');
            }

            setTimeout(() => {
                navigate(productPagePath);
            }, 1500);

        } catch (error) {
            console.error('Product operation error:', error);
            const errorMessage = error.response?.data?.message || (tAlert('error_text') || 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
            Alert.error(tAlert('error') || 'Xəta!', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? (t('edit_product') || 'Məhsul Məlumatlarını Redaktə Et') : (t('new_product') || 'Yeni Məhsul')}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isEditMode ? (t('edit_product_description') || 'Məhsul məlumatlarını yeniləyin') : (t('new_product_description') || 'Məhsul məlumatlarını daxil edin')}
                    </p>
                </div>
                {isEditMode && (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setHistoryTab('movements');
                                setShowStockHistoryModal(true);
                            }}
                            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <MdHistory className="w-5 h-5" />
                            {t('stock_history') || 'Stok Tarixçəsi'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setHistoryTab('sales');
                                setShowStockHistoryModal(true);
                            }}
                            className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <MdShoppingCart className="w-5 h-5" />
                            {t('sales_history') || 'Satış Tarixçəsi'}
                        </button>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <ProductBasicInfo
                    formData={formData}
                    errors={errors}
                    isLoading={isLoading}
                    loadingCategories={loadingCategories}
                    categories={categories}
                    subCategories={subCategories}
                    imagePreview={imagePreview}
                    isEditMode={isEditMode}
                    existingProducts={existingProducts}
                    loadingProducts={loadingProducts}
                    branches={branchOptionsForForm}
                    loadingBranches={loadingBranches}
                    branchPickerDisabled={!canPickProductBranch(currentUser)}
                    onInputChange={handleInputChange}
                    onCategoryChange={handleCategoryChange}
                    onImageSelect={handleImageSelect}
                    onProductSelect={(productId) => {
                        const isAdmin = location.pathname.includes('/admin');
                        const editPath = isAdmin ? `/admin/product-form?id=${productId}` : `/reception/product-form?id=${productId}`;
                        navigate(editPath);
                    }}
                />

                {/* Price and Discount Information */}
                <ProductPricing
                    formData={formData}
                    errors={errors}
                    onInputChange={handleInputChange}
                    showPurchasePrice={branchSettings.showPurchasePrice}
                />

                {/* Unit Type Information */}
                <ProductUnitInfo
                    formData={formData}
                    errors={errors}
                    isLoading={isLoading}
                    isEditMode={isEditMode}
                    onInputChange={handleInputChange}
                />

                {/* Stock and Status */}
                <ProductStockSection
                    formData={formData}
                    isEditMode={isEditMode}
                    productId={id}
                    showStockManagement={showStockManagement}
                    stockQuantity={stockQuantity}
                    stockBoxes={stockBoxes}
                    stockPieces={stockPieces}
                    stockNote={stockNote}
                    stockMovementType={stockMovementType}
                    processingStock={processingStock}
                    onInputChange={handleInputChange}
                    onToggleStockManagement={() => setShowStockManagement(!showStockManagement)}
                    onStockQuantityChange={setStockQuantity}
                    onStockBoxesChange={setStockBoxes}
                    onStockPiecesChange={setStockPieces}
                    onStockNoteChange={setStockNote}
                    onStockMovementTypeChange={setStockMovementType}
                    onStockMovement={handleStockMovement}
                    onShowHistoryModal={(tab) => {
                        setHistoryTab(tab || 'movements');
                        setShowStockHistoryModal(true);
                    }}
                />

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(productPagePath)}
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('cancel') || 'Ləğv et'}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white mr-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isEditMode ? (t('updating') || 'Yenilənir...') : (t('adding') || 'Əlavə edilir...')}
                            </>
                        ) : (
                            isEditMode ? (t('update') || 'Yenilə') : (t('add_product') || 'Məhsul Əlavə Et')
                        )}
                    </button>
                </div>
            </form>

            {/* Stock History Modal */}
            {isEditMode && id && (
                <ProductStockHistoryModal
                    isOpen={showStockHistoryModal}
                    onClose={() => setShowStockHistoryModal(false)}
                    productId={id}
                    product={formData}
                    initialTab={historyTab}
                />
            )}
        </div>
    );
}

