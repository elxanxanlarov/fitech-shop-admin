import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import { MdInventory, MdDescription, MdImage, MdAttachMoney, MdLocalOffer, MdQrCode, MdStorage, MdCloudUpload, MdAdd, MdRemove, MdEdit } from 'react-icons/md';
import { productApi, uploadApi, categoryApi, subCategoryApi, stockApi } from '../../api';
import { createInputChangeHandler } from '../../utils/validation';
import SearchDropdown from '../ui/SearchDropdown';

export default function ProductForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const categoryIdFromQuery = searchParams.get('categoryId');
    const subCategoryIdFromQuery = searchParams.get('subCategoryId');
    const { t } = useTranslation('product');
    const { t: tAlert } = useTranslation('alert');

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
        stock: 0,
        isActive: true,
        isOfficial: false,
        categoryId: '',
        subCategoryId: ''
    });

    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [initialFormData, setInitialFormData] = useState(null);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [showStockManagement, setShowStockManagement] = useState(false);
    const [stockMovementType, setStockMovementType] = useState('IN');
    const [stockQuantity, setStockQuantity] = useState('');
    const [stockNote, setStockNote] = useState('');
    const [stockMovements, setStockMovements] = useState([]);
    const [loadingStockMovements, setLoadingStockMovements] = useState(false);
    const [processingStock, setProcessingStock] = useState(false);

    // Fetch product data (if edit mode)
    useEffect(() => {
        const fetchProduct = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const response = await productApi.getById(id);
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
                            subCategoryId: product.subCategoryId || ''
                        };
                        setFormData(initialData);
                        setInitialFormData(initialData);

                        // Fetch subcategories if categoryId exists
                        if (product.categoryId) {
                            fetchSubCategories(product.categoryId);
                        }

                        // Fetch stock movements if in edit mode
                        if (isEditMode && product.id) {
                            fetchStockMovements(product.id);
                        }

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
    }, [id, isEditMode, t]);

    // Fetch categories
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Fetch stock movements
    const fetchStockMovements = async (productId) => {
        setLoadingStockMovements(true);
        try {
            const response = await stockApi.getAll(productId);
            if (response.success && response.date) {
                setStockMovements(response.date);
            }
        } catch (error) {
            console.error('Error fetching stock movements:', error);
        } finally {
            setLoadingStockMovements(false);
        }
    };

    // Handle stock movement
    const handleStockMovement = async () => {
        if (!id) {
            Alert.error(tAlert('error') || 'Xəta!', t('product_must_be_saved_first') || 'Əvvəlcə məhsulu saxlayın');
            return;
        }

        if (!stockQuantity || parseInt(stockQuantity) <= 0) {
            Alert.error(tAlert('error') || 'Xəta!', t('quantity_required') || 'Miqdar tələb olunur və 0-dan böyük olmalıdır');
            return;
        }

        setProcessingStock(true);
        try {
            await stockApi.create({
                productId: id,
                type: stockMovementType,
                quantity: parseInt(stockQuantity),
                note: stockNote.trim() || null
            });

            // Refresh product data to get updated stock
            const productResponse = await productApi.getById(id);
            if (productResponse.success && productResponse.date) {
                const updatedProduct = productResponse.date;
                setFormData(prev => ({
                    ...prev,
                    stock: updatedProduct.stock
                }));
            }

            // Refresh stock movements
            await fetchStockMovements(id);

            // Reset form
            setStockQuantity('');
            setStockNote('');
            setShowStockManagement(false);

            Alert.success(t('stock_movement_success') || 'Uğurlu!', t('stock_movement_success_text') || 'Stok hərəkəti uğurla yaradıldı');
        } catch (error) {
            console.error('Error creating stock movement:', error);
            Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || t('stock_movement_error') || 'Stok hərəkəti yaradılarkən xəta baş verdi');
        } finally {
            setProcessingStock(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Ad
        if (!formData.name.trim()) {
            newErrors.name = t('name_required') || 'Ad tələb olunur';
        }

        // Qiymətlər (string -> number)
        const purchasePriceNum = parseFloat(formData.purchasePrice || '0');
        const salePriceNum = parseFloat(formData.salePrice || '0');

        // Alış qiyməti
        if (!formData.purchasePrice || purchasePriceNum <= 0) {
            newErrors.purchasePrice =
                t('purchase_price_required') ||
                'Alış qiyməti tələb olunur və 0-dan böyük olmalıdır';
        }

        // Satış qiyməti
        if (!formData.salePrice || salePriceNum <= 0) {
            newErrors.salePrice =
                t('sale_price_required') ||
                'Satış qiyməti tələb olunur və 0-dan böyük olmalıdır';
        }

        // Satış qiyməti maya dəyərindən kiçik ola bilməz
        if (purchasePriceNum > 0 && salePriceNum > 0 && salePriceNum < purchasePriceNum) {
            newErrors.salePrice =
                t('sale_price_less_than_cost') ||
                'Satış qiyməti maya dəyərindən kiçik ola bilməz';
        }

        // ENDİRİM MƏNTİQİ
        if (formData.hasDiscount) {
            const hasDiscountPrice =
                formData.discountPrice !== '' && formData.discountPrice !== null;
            const hasDiscountPercent =
                formData.discountPercent !== '' && formData.discountPercent !== null;

            const discountPriceNum = parseFloat(formData.discountPrice || '0');
            const discountPercentNum = parseFloat(formData.discountPercent || '0');

            // Heç biri doldurulmayıbsa
            if (!hasDiscountPrice && !hasDiscountPercent) {
                newErrors.discount =
                    t('discount_required') ||
                    'Endirim aktivdirsə, endirim qiyməti və ya faizi tələb olunur';
            }

            // 💸 Endirim qiyməti (endirimdən SONRA satış qiyməti)
            if (hasDiscountPrice) {
                // 0-dan böyük olsun
                if (discountPriceNum <= 0) {
                    newErrors.discountPrice =
                        t('discount_price_invalid') ||
                        'Endirim qiyməti 0-dan böyük olmalıdır';
                }

                // Satış qiymətindən böyük və ya bərabər ola bilməz
                if (salePriceNum > 0 && discountPriceNum >= salePriceNum) {
                    newErrors.discountPrice =
                        t('discount_price_must_be_less_than_sale') ||
                        'Endirim qiyməti satış qiymətindən kiçik olmalıdır';
                }

                // Maya dəyərindən aşağı düşməsin (zərərə satma)
                if (purchasePriceNum > 0 && discountPriceNum < purchasePriceNum) {
                    newErrors.discountPrice =
                        t('discount_price_below_cost') ||
                        'Endirim qiyməti maya dəyərindən kiçik ola bilməz';
                }
            }

            // 📉 Endirim faizi
            if (hasDiscountPercent) {
                if (discountPercentNum <= 0) {
                    newErrors.discountPercent =
                        t('discount_percent_invalid') ||
                        'Endirim faizi 0-dan böyük olmalıdır';
                }

                if (discountPercentNum >= 100) {
                    newErrors.discountPercent =
                        t('discount_percent_too_high') ||
                        'Endirim faizi 100%-dən kiçik olmalıdır';
                }

                // Endirim faizi qazanc üzərindən hesablanır
                // Maksimum endirim faizi = 100% (bütün qazancı endirim edə bilərik)
                // Amma endirim qiyməti maya dəyərindən az ola bilməz
                if (purchasePriceNum > 0 && salePriceNum > 0 && salePriceNum > purchasePriceNum) {
                    const profit = salePriceNum - purchasePriceNum; // Qazanc
                    const discountAmount = profit * (discountPercentNum / 100); // Endirim məbləği
                    const calculatedDiscountPrice = salePriceNum - discountAmount; // Hesablanmış endirim qiyməti

                    // Əgər hesablanmış endirim qiyməti maya dəyərindən azdırsa, xəta göstər
                    if (calculatedDiscountPrice < purchasePriceNum) {
                        newErrors.discountPercent =
                            t('discount_percent_above_margin') ||
                            `Endirim faizi maksimum 100% ola bilər (bütün qazanc). Endirim qiyməti maya dəyərindən (${purchasePriceNum.toFixed(2)} AZN) az ola bilməz.`;
                    }
                }
            }
        }

        // Stok
        if (formData.stock !== undefined && formData.stock < 0) {
            newErrors.stock = t('stock_invalid') || 'Stok mənfi ola bilməz';
        }

        // Edit modunda şəkil yoxdursa, fayl tələb olunur

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
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
    const numberFields = ['purchasePrice', 'salePrice', 'discountPrice', 'discountPercent', 'stock'];

    // Custom handler for discount calculations
    const customDiscountHandler = (field, value) => {
        // Auto-calculate discount (qazanc üzərindən)
        // Qazanc = salePrice - purchasePrice
        // Endirim məbləği = Qazanc * (discountPercent / 100)
        // discountPrice = salePrice - Endirim məbləği
        // discountPrice >= purchasePrice olmalıdır

        const calculateDiscount = (purchasePrice, salePrice, discountPercent) => {
            if (!purchasePrice || !salePrice || purchasePrice <= 0 || salePrice <= 0) return null;
            if (salePrice <= purchasePrice) return null; // Qazanc yoxdursa endirim ola bilməz

            const profit = salePrice - purchasePrice; // Qazanc
            const discountAmount = profit * (discountPercent / 100); // Endirim məbləği
            let discountPrice = salePrice - discountAmount; // Endirim qiyməti

            // Endirim qiyməti maya dəyərindən az ola bilməz
            if (discountPrice < purchasePrice) {
                discountPrice = purchasePrice;
            }

            return discountPrice.toFixed(2);
        };

        const calculateDiscountPercent = (purchasePrice, salePrice, discountPrice) => {
            if (!purchasePrice || !salePrice || !discountPrice || purchasePrice <= 0 || salePrice <= 0 || discountPrice <= 0) return null;
            if (salePrice <= purchasePrice) return null; // Qazanc yoxdursa endirim ola bilməz
            if (discountPrice < purchasePrice) return null; // Endirim qiyməti maya dəyərindən az ola bilməz

            const profit = salePrice - purchasePrice; // Qazanc
            const discountAmount = salePrice - discountPrice; // Endirim məbləği
            const discountPercent = (discountAmount / profit) * 100; // Endirim faizi

            return discountPercent.toFixed(2);
        };

        if (field === 'hasDiscount' && value) {
            // Endirim aktiv edildikdə
        } else if (field === 'discountPercent' && formData.purchasePrice && formData.salePrice) {
            // Endirim faizi dəyişdikdə, endirim qiymətini hesabla
            const purchasePrice = parseFloat(formData.purchasePrice) || 0;
            const salePrice = parseFloat(formData.salePrice) || 0;
            const discountPercent = parseFloat(value) || 0;

            if (discountPercent > 0 && discountPercent <= 100 && purchasePrice > 0 && salePrice > purchasePrice) {
                const calculatedDiscountPrice = calculateDiscount(purchasePrice, salePrice, discountPercent);
                if (calculatedDiscountPrice) {
                    setFormData(prev => ({
                        ...prev,
                        discountPrice: calculatedDiscountPrice
                    }));
                }
            }
        } else if (field === 'discountPrice' && formData.purchasePrice && formData.salePrice) {
            // Endirim qiyməti dəyişdikdə, endirim faizini hesabla
            const purchasePrice = parseFloat(formData.purchasePrice) || 0;
            const salePrice = parseFloat(formData.salePrice) || 0;
            const discountPrice = parseFloat(value) || 0;

            if (discountPrice >= purchasePrice && salePrice > purchasePrice) {
                const calculatedDiscountPercent = calculateDiscountPercent(purchasePrice, salePrice, discountPrice);
                if (calculatedDiscountPercent) {
                    setFormData(prev => ({
                        ...prev,
                        discountPercent: calculatedDiscountPercent
                    }));
                }
            }
        } else if (field === 'purchasePrice' && formData.hasDiscount && formData.salePrice && formData.discountPercent) {
            // Maya dəyəri dəyişdikdə, endirim qiymətini yenilə
            const purchasePrice = parseFloat(value) || 0;
            const salePrice = parseFloat(formData.salePrice) || 0;
            const discountPercent = parseFloat(formData.discountPercent) || 0;

            if (discountPercent > 0 && purchasePrice > 0 && salePrice > purchasePrice) {
                const calculatedDiscountPrice = calculateDiscount(purchasePrice, salePrice, discountPercent);
                if (calculatedDiscountPrice) {
                    setFormData(prev => ({
                        ...prev,
                        discountPrice: calculatedDiscountPrice
                    }));
                }
            }
        } else if (field === 'salePrice' && formData.hasDiscount && formData.purchasePrice && formData.discountPercent) {
            // Satış qiyməti dəyişdikdə, endirim qiymətini yenilə
            const purchasePrice = parseFloat(formData.purchasePrice) || 0;
            const salePrice = parseFloat(value) || 0;
            const discountPercent = parseFloat(formData.discountPercent) || 0;

            if (discountPercent > 0 && purchasePrice > 0 && salePrice > purchasePrice) {
                const calculatedDiscountPrice = calculateDiscount(purchasePrice, salePrice, discountPercent);
                if (calculatedDiscountPrice) {
                    setFormData(prev => ({
                        ...prev,
                        discountPrice: calculatedDiscountPrice
                    }));
                }
            }
        }
    };

    const handleInputChange = createInputChangeHandler(
        setFormData,
        setErrors,
        errors,
        numberFields,
        t,
        customDiscountHandler
    );

    // Check if form has changed (only in edit mode)
    const hasFormChanged = () => {
        if (!isEditMode || !initialFormData) return true; // Always allow submit in create mode

        // Compare form data with initial data
        const currentData = {
            name: formData.name.trim(),
            description: formData.description?.trim() || '',
            imageUrl: formData.imageUrl?.trim() || '',
            purchasePrice: formData.purchasePrice?.toString() || '',
            salePrice: formData.salePrice?.toString() || '',
            hasDiscount: formData.hasDiscount || false,
            discountPrice: formData.discountPrice?.toString() || '',
            discountPercent: formData.discountPercent?.toString() || '',
            barcode: formData.barcode?.trim() || '',
            stock: formData.stock || 0,
            isActive: formData.isActive !== undefined ? formData.isActive : true,
            isOfficial: formData.isOfficial !== undefined ? formData.isOfficial : false,
            categoryId: formData.categoryId || '',
            subCategoryId: formData.subCategoryId || ''
        };

        const initial = {
            name: initialFormData.name.trim(),
            description: initialFormData.description?.trim() || '',
            imageUrl: initialFormData.imageUrl?.trim() || '',
            purchasePrice: initialFormData.purchasePrice?.toString() || '',
            salePrice: initialFormData.salePrice?.toString() || '',
            hasDiscount: initialFormData.hasDiscount || false,
            discountPrice: initialFormData.discountPrice?.toString() || '',
            discountPercent: initialFormData.discountPercent?.toString() || '',
            barcode: initialFormData.barcode?.trim() || '',
            stock: initialFormData.stock || 0,
            isActive: initialFormData.isActive !== undefined ? initialFormData.isActive : true,
            isOfficial: initialFormData.isOfficial !== undefined ? initialFormData.isOfficial : false,
            categoryId: initialFormData.categoryId || '',
            subCategoryId: initialFormData.subCategoryId || ''
        };

        // Check if any field has changed
        const hasChanged = JSON.stringify(currentData) !== JSON.stringify(initial) || selectedImageFile !== null;
        return hasChanged;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
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

            const payload = {
                name: formData.name.trim(),
                description: formData.description?.trim() || null,
                imageUrl: imageUrlValue,
                purchasePrice: parseFloat(formData.purchasePrice),
                salePrice: parseFloat(formData.salePrice),
                hasDiscount: formData.hasDiscount,
                discountPrice: formData.hasDiscount && formData.discountPrice ? parseFloat(formData.discountPrice) : null,
                discountPercent: formData.hasDiscount && formData.discountPercent ? parseInt(formData.discountPercent) : null,
                barcode: formData.barcode?.trim() || null,
                stock: parseInt(formData.stock) || 0,
                isActive: formData.isActive,
                isOfficial: formData.isOfficial,
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
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? (t('edit_product') || 'Məhsul Məlumatlarını Redaktə Et') : (t('new_product') || 'Yeni Məhsul')}
                </h1>
                <p className="text-gray-600 mt-1">
                    {isEditMode ? (t('edit_product_description') || 'Məhsul məlumatlarını yeniləyin') : (t('new_product_description') || 'Məhsul məlumatlarını daxil edin')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdInventory className="inline w-5 h-5 mr-2" />
                        {t('basic_info') || 'Əsas Məlumatlar'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label={t('name')}
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            error={errors.name}
                            placeholder={t('name_placeholder') || 'Məhsul adını daxil edin'}
                            icon={<MdInventory />}
                            required
                        />

                        <Input
                            label={t('barcode')}
                            type="text"
                            value={formData.barcode}
                            onChange={(e) => handleInputChange('barcode', e.target.value)}
                            error={errors.barcode}
                            placeholder={t('barcode_placeholder') || 'Barcode daxil edin'}
                            icon={<MdQrCode />}
                        />

                        <div className="md:col-span-2">
                            <Input
                                label={t('description')}
                                type="text"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                error={errors.description}
                                placeholder={t('description_placeholder') || 'Məhsul təsviri daxil edin'}
                                icon={<MdDescription />}
                            />
                        </div>

                        <div>
                            <SearchDropdown
                                label={t('category') || 'Kateqoriya'}
                                options={categories}
                                value={formData.categoryId}
                                onChange={(value) => handleCategoryChange(value)}
                                placeholder={t('select_category') || 'Kateqoriya seçin'}
                                disabled={isLoading || loadingCategories}
                                error={!!errors.categoryId}
                                searchFields={['name']}
                                className="w-full"
                            />
                            {errors.categoryId && (
                                <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
                            )}
                        </div>

                        <div>
                            <SearchDropdown
                                label={t('subcategory') || 'Alt Kateqoriya'}
                                options={subCategories}
                                value={formData.subCategoryId}
                                onChange={(value) => handleInputChange('subCategoryId', value)}
                                placeholder={t('select_subcategory') || 'Alt kateqoriya seçin'}
                                disabled={isLoading || !formData.categoryId || loadingCategories}
                                error={!!errors.subCategoryId}
                                searchFields={['name']}
                                className="w-full"
                            />
                            {errors.subCategoryId && (
                                <p className="mt-1 text-sm text-red-600">{errors.subCategoryId}</p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('image') || 'Şəkil'}
                            </label>

                            {/* Image Preview */}
                            {(imagePreview || formData.imageUrl) && (
                                <div className="mb-3">
                                    <div className="relative inline-block">
                                        <img
                                            src={imagePreview || (() => {
                                                const url = String(formData.imageUrl || '').trim();
                                                if (!url) return '';
                                                if (url.startsWith('http://') || url.startsWith('https://')) {
                                                    return url;
                                                }
                                                // VITE_API_URL-dən /api hissəsini çıxar
                                                const apiUrl = import.meta.env.VITE_API_URL || '';
                                                const baseUrl = apiUrl.replace('/api', ''); // http://localhost:5000
                                                return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
                                            })()}
                                            alt={formData.name || 'Product image'}
                                            className="h-48 w-48 object-cover rounded-lg border border-gray-300 shadow-sm"
                                            style={{ display: 'block' }}
                                            onError={(e) => {
                                                console.error('Image load error');
                                                e.target.style.display = 'none';
                                            }}
                                            onLoad={() => {
                                                console.log('Image loaded successfully');
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* File Upload */}
                            <div>
                                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-fit">
                                    <MdCloudUpload className="w-5 h-5" />
                                    <span className="text-sm font-medium">
                                        {t('select_image') || 'Şəkil Seç'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageSelect}
                                        disabled={isLoading}
                                    />
                                </label>
                                {selectedImageFile && (
                                    <p className="mt-2 text-xs text-blue-600 font-medium">
                                        {t('image_will_upload') || 'Şəkil form göndərildikdə yüklənəcək'}
                                    </p>
                                )}
                                {isEditMode && !selectedImageFile && formData.imageUrl && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        {t('current_image') || 'Mövcud şəkil'}
                                    </p>
                                )}
                            </div>

                            {errors.imageUrl && (
                                <p className="mt-1 text-sm text-red-600">{errors.imageUrl}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Price Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdAttachMoney className="inline w-5 h-5 mr-2" />
                        {t('price_info') || 'Qiymət Məlumatları'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label={t('purchase_price')}
                            type="text"
                            value={formData.purchasePrice}
                            onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                            error={errors.purchasePrice}
                            placeholder="0.00"
                            icon={<MdAttachMoney />}
                            required
                        />

                        <Input
                            label={t('sale_price')}
                            type="text"
                            value={formData.salePrice}
                            onChange={(e) => handleInputChange('salePrice', e.target.value)}
                            error={errors.salePrice}
                            placeholder="0.00"
                            icon={<MdAttachMoney />}
                            required
                        />
                    </div>
                </div>

                {/* Discount Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdLocalOffer className="inline w-5 h-5 mr-2" />
                        {t('discount_info') || 'Endirim Məlumatları'}
                    </h3>

                    <div className="mb-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.hasDiscount}
                                onChange={(e) => handleInputChange('hasDiscount', e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                {t('has_discount') || 'Endirim var'}
                            </span>
                        </label>
                    </div>

                    {formData.hasDiscount && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label={t('discount_price')}
                                type="text"
                                value={formData.discountPrice}
                                onChange={(e) => handleInputChange('discountPrice', e.target.value)}
                                error={errors.discountPrice || errors.discount}
                                placeholder="0.00"
                                icon={<MdAttachMoney />}
                            />

                            <Input
                                label={t('discount_percent')}
                                type="text"
                                value={formData.discountPercent}
                                onChange={(e) => handleInputChange('discountPercent', e.target.value)}
                                error={errors.discountPercent || errors.discount}
                                placeholder="0"
                                icon={<MdLocalOffer />}
                            />
                        </div>
                    )}
                </div>

                {/* Stock and Status */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 flex-1">
                            <MdStorage className="inline w-5 h-5 mr-2" />
                            {t('stock_status') || 'Stok və Status'}
                        </h3>
                        {isEditMode && (
                            <button
                                type="button"
                                onClick={() => setShowStockManagement(!showStockManagement)}
                                className="ml-4 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                {showStockManagement ? (t('hide_stock_management') || 'Stok İdarəetməsini Gizlət') : (t('manage_stock') || 'Stok İdarə Et')}
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <Input
                                label={t('stock')}
                                type="text"
                                value={formData.stock}
                                onChange={(e) => handleInputChange('stock', e.target.value)}
                                error={errors.stock}
                                placeholder="0"
                                icon={<MdStorage />}
                                disabled={isEditMode}
                            />
                            {isEditMode && (
                                <p className="mt-1 text-xs text-gray-500">
                                    {t('stock_managed_by_movements') || 'Stok hərəkətləri ilə idarə olunur'}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    {t('product_active') || 'Məhsul aktivdir'}
                                </span>
                            </label>
                            <p className="mt-1 text-xs text-gray-500">
                                {t('product_active_description') || 'Deaktiv məhsullar satışda görünməz'}
                            </p>
                        </div>

                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isOfficial}
                                    onChange={(e) => handleInputChange('isOfficial', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    {t('is_official') || 'Rəsmi məhsul'}
                                </span>
                            </label>
                            <p className="mt-1 text-xs text-gray-500">
                                {t('is_official_description') || 'Rəsmi məhsullar qeydiyyatdan keçmiş məhsullardır'}
                            </p>
                        </div>
                    </div>

                    {/* Stock Management Section */}
                    {isEditMode && showStockManagement && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-md font-semibold text-gray-900 mb-4">
                                {t('stock_management') || 'Stok İdarəetməsi'}
                            </h4>

                            {/* Stock Movement Form */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('movement_type') || 'Hərəkət Növü'}
                                        </label>
                                        <select
                                            value={stockMovementType}
                                            onChange={(e) => setStockMovementType(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="IN">{t('stock_in') || 'Stok Girişi'}</option>
                                            <option value="OUT">{t('stock_out') || 'Stok Çıxışı'}</option>
                                            <option value="ADJUSTMENT">{t('stock_adjustment') || 'Stok Düzəlişi'}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('quantity') || 'Miqdar'}
                                        </label>
                                        <input
                                            type="number"
                                            value={stockQuantity}
                                            onChange={(e) => setStockQuantity(e.target.value)}
                                            placeholder="0"
                                            min="1"
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('note') || 'Qeyd'} ({t('optional') || 'İstəyə bağlı'})
                                        </label>
                                        <input
                                            type="text"
                                            value={stockNote}
                                            onChange={(e) => setStockNote(e.target.value)}
                                            placeholder={t('note_placeholder') || 'Qeyd daxil edin...'}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={handleStockMovement}
                                            disabled={processingStock || !stockQuantity}
                                            className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                        >
                                            {processingStock ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    {t('processing') || 'İşlənir...'}
                                                </>
                                            ) : (
                                                <>
                                                    {stockMovementType === 'IN' && <MdAdd className="w-4 h-4" />}
                                                    {stockMovementType === 'OUT' && <MdRemove className="w-4 h-4" />}
                                                    {stockMovementType === 'ADJUSTMENT' && <MdEdit className="w-4 h-4" />}
                                                    {t('apply') || 'Tətbiq Et'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Stock Movements History */}
                            <div>
                                <h5 className="text-sm font-semibold text-gray-700 mb-3">
                                    {t('stock_movements_history') || 'Stok Hərəkətləri Tarixçəsi'}
                                </h5>
                                {loadingStockMovements ? (
                                    <div className="text-center py-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    </div>
                                ) : stockMovements.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm border-collapse border border-gray-300">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('date') || 'Tarix'}</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('type') || 'Növ'}</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('quantity') || 'Miqdar'}</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('previous_stock') || 'Əvvəlki Stok'}</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('new_stock') || 'Yeni Stok'}</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('note') || 'Qeyd'}</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{t('staff') || 'İşçi'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stockMovements.map((movement) => (
                                                    <tr key={movement.id} className="hover:bg-gray-50">
                                                        <td className="border border-gray-300 px-3 py-2">
                                                            {new Date(movement.createdAt).toLocaleString('az-AZ')}
                                                        </td>
                                                        <td className="border border-gray-300 px-3 py-2">
                                                            <span className={`px-2 py-1 text-xs rounded-full ${movement.type === 'IN' ? 'bg-green-100 text-green-800' :
                                                                movement.type === 'OUT' ? 'bg-red-100 text-red-800' :
                                                                    'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                {movement.type === 'IN' ? (t('stock_in') || 'Giriş') :
                                                                    movement.type === 'OUT' ? (t('stock_out') || 'Çıxış') :
                                                                        (t('stock_adjustment') || 'Düzəliş')}
                                                            </span>
                                                        </td>
                                                        <td className="border border-gray-300 px-3 py-2">
                                                            {movement.type === 'OUT' ? '-' : '+'}{Math.abs(movement.quantity)}
                                                        </td>
                                                        <td className="border border-gray-300 px-3 py-2">{movement.previousStock}</td>
                                                        <td className="border border-gray-300 px-3 py-2 font-semibold">{movement.newStock}</td>
                                                        <td className="border border-gray-300 px-3 py-2">{movement.note || '-'}</td>
                                                        <td className="border border-gray-300 px-3 py-2">
                                                            {movement.staff ? `${movement.staff.name} ${movement.staff.surName || ''}`.trim() : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-gray-500 text-sm">
                                        {t('no_stock_movements') || 'Stok hərəkəti yoxdur'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

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
        </div>
    );
}

