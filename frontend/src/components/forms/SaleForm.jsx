import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import SearchDropdown from '../ui/SearchDropdown';
import { MdPerson, MdShoppingCart, MdAdd, MdDelete, MdAttachMoney, MdNote, MdUndo, MdCreditCard, MdMoney } from 'react-icons/md';
import { saleApi, productApi, returnApi } from '../../api';
import { validateNumberInput } from '../../utils/validation';

export default function SaleForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const { t } = useTranslation('sale');
    const { t: tAlert } = useTranslation('alert');

    const isAdmin = location.pathname.includes('/admin');
    const salePagePath = isAdmin ? '/admin/sales' : '/reception/sales';
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        customerName: '',
        customerSurname: '',
        customerPhone: '',
        paymentType: 'cash', // Default: nagd
        paidAmount: '', // Ödənilən məbləğ
        note: ''
    });

    const [selectedProducts, setSelectedProducts] = useState([
        { productId: '', quantity: '', salePrice: '', discountAmount: '' }
    ]);

    const [products, setProducts] = useState([]);
    const [saleItems, setSaleItems] = useState([]); // Edit modunda satış məhsulları
    const [saleReturns, setSaleReturns] = useState([]); // Qaytarmalar
    const [returnItems, setReturnItems] = useState([]); // Qaytarma üçün seçilmiş məhsullar
    const [returnFormData, setReturnFormData] = useState({
        reason: '',
        note: ''
    });
    const [showReturnForm, setShowReturnForm] = useState(false);
    const [errors, setErrors] = useState({});
    const [returnErrors, setReturnErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isReturnLoading, setIsReturnLoading] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(true);

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoadingProducts(true);
                const response = await productApi.getAll();
                if (response.success && response.date) {
                    // Yalnız aktiv və stokda olan məhsulları göstər
                    const activeProducts = response.date.filter(p => p.isActive && p.stock > 0);
                    setProducts(activeProducts);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
                Alert.error(t('error_fetching') || 'Xəta!', t('error_fetching_text') || 'Məhsulları əldə etmək mümkün olmadı');
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProducts();
    }, [t]);

    // Fetch sale data (if edit mode)
    useEffect(() => {
        const fetchSale = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const response = await saleApi.getById(id);
                    if (response.success && response.date) {
                        const sale = response.date;
                        setFormData({
                            customerName: sale.customerName || '',
                            customerSurname: sale.customerSurname || '',
                            customerPhone: sale.customerPhone || '',
                            paymentType: sale.paymentType || 'cash',
                            paidAmount: sale.paidAmount ? parseFloat(sale.paidAmount).toFixed(2) : '',
                            note: sale.note || ''
                        });
                        // Sale items-ı selectedProducts-a çevir
                        if (sale.items && sale.items.length > 0) {
                            setSelectedProducts(sale.items.map(item => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                salePrice: item.pricePerItem ? parseFloat(item.pricePerItem).toFixed(2) : '',
                                discountAmount: ''
                            })));
                            // Sale items-ı saxla (qaytarma üçün)
                            setSaleItems(sale.items);
                        }
                        // Qaytarmaları yüklə
                        if (sale.returns && sale.returns.length > 0) {
                            setSaleReturns(sale.returns);
                        } else {
                            // Əgər sale.returns yoxdursa, API-dən yüklə
                            const returnsResponse = await returnApi.getBySaleId(id);
                            if (returnsResponse.success && returnsResponse.date) {
                                setSaleReturns(returnsResponse.date);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error fetching sale:', error);
                    Alert.error(t('error_fetching') || 'Xəta!', t('error_fetching_text') || 'Satış məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchSale();
    }, [id, isEditMode, t]);

    const validateForm = () => {
        const newErrors = {};

        if (selectedProducts.length === 0) {
            newErrors.products = t('products_required') || 'Ən azı bir məhsul seçilməlidir';
        }

        selectedProducts.forEach((item, index) => {
            if (!item.productId) {
                newErrors[`product_${index}`] = t('product_required') || 'Məhsul seçilməlidir';
            }
            // Quantity boş ola bilməz və 0-dan böyük olmalıdır
            if (!item.quantity || item.quantity === '' || item.quantity === null || item.quantity === undefined) {
                newErrors[`quantity_${index}`] = t('quantity_required') || 'Miqdar tələb olunur';
            } else if (parseInt(item.quantity) <= 0) {
                newErrors[`quantity_${index}`] = t('quantity_cannot_be_zero') || 'Miqdar 0 ola bilməz';
            } else {
                // Stok yoxla
                const product = products.find(p => p.id === item.productId);
                if (product && parseInt(item.quantity) > product.stock) {
                    newErrors[`quantity_${index}`] = t('quantity_exceeds_stock', { stock: product.stock }) || `Mövcud stok: ${product.stock}`;
                }
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleProductChange = (index, productId) => {
        const newProducts = [...selectedProducts];
        newProducts[index].productId = productId;
        
        // Məhsul seçildikdə standart satış qiymətini təyin et
        if (productId) {
            const product = products.find(p => p.id === productId);
            if (product) {
                // Həmişə məhsulun salePrice-ını default olaraq təyin et
                const defaultSalePrice = parseFloat(product.salePrice);
                newProducts[index].salePrice = defaultSalePrice.toFixed(2);
                newProducts[index].discountAmount = ''; // Endirim məbləğini sıfırla
            }
        } else {
            newProducts[index].salePrice = '';
            newProducts[index].discountAmount = '';
        }
        
        setSelectedProducts(newProducts);

        // Error-u sil
        if (errors[`product_${index}`]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`product_${index}`];
                return newErrors;
            });
        }
    };

    const handleQuantityChange = (index, quantity) => {
        // Real-time validation for quantity
        const validation = validateNumberInput('quantity', quantity, ['quantity'], t);
        if (!validation.isValid) {
            setErrors(prev => ({
                ...prev,
                [`quantity_${index}`]: validation.error
            }));
            return; // Don't update value if validation fails
        }
        
        // Boş ola bilər (tam silmək), amma 0 ola bilməz
        if (quantity === '' || quantity === null || quantity === undefined) {
            // Boş buraxıla bilər (tam silmək)
            const newProducts = [...selectedProducts];
            newProducts[index].quantity = '';
            setSelectedProducts(newProducts);
            
            // Clear error
            if (errors[`quantity_${index}`]) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[`quantity_${index}`];
                    return newErrors;
                });
            }
            return;
        }
        
        const qtyNum = parseInt(quantity) || 0;
        
        // 0 ola bilməz
        if (qtyNum === 0) {
            setErrors(prev => ({
                ...prev,
                [`quantity_${index}`]: t('quantity_cannot_be_zero') || 'Miqdar 0 ola bilməz'
            }));
            return; // Don't update value if it's 0
        }
        
        const newProducts = [...selectedProducts];
        newProducts[index].quantity = qtyNum;
        setSelectedProducts(newProducts);

        // Error-u sil
        if (errors[`quantity_${index}`]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`quantity_${index}`];
                return newErrors;
            });
        }
    };

    const handleSalePriceChange = (index, salePrice) => {
        const validation = validateNumberInput('price', salePrice, ['price'], t);
        if (!validation.isValid) {
            setErrors(prev => ({
                ...prev,
                [`salePrice_${index}`]: validation.error
            }));
            return;
        }
        
        const newProducts = [...selectedProducts];
        
        if (salePrice === '' || salePrice === null || salePrice === undefined) {
            newProducts[index].salePrice = '';
        } else {
            const priceNum = parseFloat(salePrice) || 0;
            if (priceNum < 0) {
                setErrors(prev => ({
                    ...prev,
                    [`salePrice_${index}`]: t('price_cannot_be_negative') || 'Qiymət mənfi ola bilməz'
                }));
                return;
            }
            newProducts[index].salePrice = priceNum.toFixed(2);
        }
        
        setSelectedProducts(newProducts);

        if (errors[`salePrice_${index}`]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`salePrice_${index}`];
                return newErrors;
            });
        }
    };

    const handleDiscountAmountChange = (index, discountAmount) => {
        const newProducts = [...selectedProducts];
        const product = products.find(p => p.id === newProducts[index].productId);
        
        if (!product) {
            return;
        }
        
        // Həmişə məhsulun salePrice-ını default olaraq istifadə et
        const defaultSalePrice = parseFloat(product.salePrice);
        
        // Maksimum endirim məbləğini hesabla: salePrice - discountPrice (əgər discountPrice varsa)
        let maxDiscountAmount = defaultSalePrice; // Default olaraq satış qiyməti qədər
        if (product.hasDiscount && product.discountPrice) {
            const discountPrice = parseFloat(product.discountPrice);
            maxDiscountAmount = defaultSalePrice - discountPrice;
        }
        
        // Boş ola bilər
        if (discountAmount === '' || discountAmount === null || discountAmount === undefined) {
            newProducts[index].discountAmount = '';
            newProducts[index].salePrice = defaultSalePrice.toFixed(2);
            setSelectedProducts(newProducts);
            
            // Error-u sil
            if (errors[`discount_${index}`]) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[`discount_${index}`];
                    return newErrors;
                });
            }
            return;
        }
        
        // Rəqəm olub-olmadığını yoxla (onluq nöqtə və rəqəmlərə icazə ver)
        const isValidNumber = /^-?\d*\.?\d*$/.test(discountAmount);
        if (!isValidNumber) {
            return; // Yalnız rəqəm və onluq nöqtəyə icazə ver
        }
        
        const discountNum = parseFloat(discountAmount);
        
        // NaN və ya mənfi yoxla
        if (isNaN(discountNum) || discountNum < 0) {
            setErrors(prev => ({
                ...prev,
                [`discount_${index}`]: t('discount_cannot_be_negative') || 'Endirim mənfi ola bilməz'
            }));
            return;
        }
        
        // Maksimum endirim məbləğini yoxla
        if (discountNum > maxDiscountAmount) {
            setErrors(prev => ({
                ...prev,
                [`discount_${index}`]: t('discount_exceeds_max', { max: maxDiscountAmount.toFixed(2) }) || `Maksimum endirim məbləği: ${maxDiscountAmount.toFixed(2)} ₼`
            }));
            // Yenə də dəyəri saxla, amma xəta göstər
            newProducts[index].discountAmount = discountAmount; // Formatlanmış deyil, orijinal
            setSelectedProducts(newProducts);
            return;
        }
        
        // Endirim məbləğini çıx və satış qiymətini yenilə
        const newSalePrice = Math.max(0, defaultSalePrice - discountNum);
        newProducts[index].discountAmount = discountAmount; // Formatlanmamış dəyəri saxla
        newProducts[index].salePrice = newSalePrice.toFixed(2);
        
        setSelectedProducts(newProducts);

        // Error-u sil
        if (errors[`discount_${index}`]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`discount_${index}`];
                return newErrors;
            });
        }
    };

    const addProductRow = () => {
        setSelectedProducts([...selectedProducts, { productId: '', quantity: '', salePrice: '', discountAmount: '' }]);
    };

    const removeProductRow = (index) => {
        if (selectedProducts.length > 1) {
            const newProducts = selectedProducts.filter((_, i) => i !== index);
            setSelectedProducts(newProducts);

            // Error-ları sil
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`product_${index}`];
                delete newErrors[`quantity_${index}`];
                return newErrors;
            });
        }
    };

    const getProductPrice = (productId, customSalePrice) => {
        // Əgər custom sale price varsa, onu istifadə et
        if (customSalePrice && customSalePrice !== '' && !isNaN(parseFloat(customSalePrice))) {
            return parseFloat(customSalePrice);
        }
        // Əks halda məhsulun salePrice-ını istifadə et (həmişə salePrice)
        const product = products.find(p => p.id === productId);
        if (!product) return 0;
        return parseFloat(product.salePrice);
    };

    const calculateTotal = () => {
        return selectedProducts.reduce((total, item) => {
            if (item.productId && item.quantity && item.quantity !== '') {
                const price = getProductPrice(item.productId, item.salePrice);
                const qty = parseInt(item.quantity) || 0;
                return total + (price * qty);
            }
            return total;
        }, 0);
    };

    // TotalAmount dəyişdikdə paidAmount-u avtomatik yenilə (yalnız yeni satış üçün)
    useEffect(() => {
        if (!isEditMode) {
            const total = calculateTotal();
            if (total > 0) {
                setFormData(prev => ({
                    ...prev,
                    paidAmount: total.toFixed(2)
                }));
            } else if (total === 0) {
                setFormData(prev => ({
                    ...prev,
                    paidAmount: ''
                }));
            }
        }
    }, [selectedProducts, isEditMode]);

    // Qaytarma funksiyaları
    const getAvailableReturnQuantity = (saleItem) => {
        if (!saleItem || !saleItem.returnItems) return saleItem.quantity || 0;
        const returned = saleItem.returnItems.reduce((sum, ri) => sum + (ri.quantity || 0), 0);
        return (saleItem.quantity || 0) - returned;
    };

    const handleReturnItemChange = (saleItemId, quantity) => {
        // Real-time validation for return quantity
        const validation = validateNumberInput('quantity', quantity, ['quantity'], t);
        if (!validation.isValid) {
            setReturnErrors(prev => ({
                ...prev,
                [saleItemId]: validation.error
            }));
            return; // Don't update value if validation fails
        }
        
        // Boş ola bilər (tam silmək), amma 0 ola bilməz
        if (quantity === '' || quantity === null || quantity === undefined) {
            // Boş buraxıla bilər (tam silmək) - item-i sil
            setReturnItems(prev => prev.filter(item => item.saleItemId !== saleItemId));
            
            // Clear error
            if (returnErrors[saleItemId]) {
                setReturnErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[saleItemId];
                    return newErrors;
                });
            }
            return;
        }
        
        const existingIndex = returnItems.findIndex(item => item.saleItemId === saleItemId);
        const qty = parseInt(quantity) || 0;
        
        // 0 ola bilməz
        if (qty === 0) {
            setReturnErrors(prev => ({
                ...prev,
                [saleItemId]: t('quantity_cannot_be_zero') || 'Miqdar 0 ola bilməz'
            }));
            return; // Don't update value if it's 0
        }
        
        if (existingIndex >= 0) {
            const newItems = [...returnItems];
            newItems[existingIndex].quantity = qty;
            setReturnItems(newItems);
        } else {
            setReturnItems([...returnItems, { saleItemId, quantity: qty }]);
        }

        // Clear error
        if (returnErrors[saleItemId]) {
            setReturnErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[saleItemId];
                return newErrors;
            });
        }
    };

    const validateReturnForm = () => {
        const newErrors = {};
        
        if (returnItems.length === 0) {
            newErrors.general = t('return_items_required') || 'Ən azı bir məhsul seçilməlidir';
        }

        returnItems.forEach(item => {
            const saleItem = saleItems.find(si => si.id === item.saleItemId);
            if (saleItem) {
                const available = getAvailableReturnQuantity(saleItem);
                if (item.quantity > available) {
                    newErrors[item.saleItemId] = t('return_quantity_exceeds', { available }) || `Mövcud qaytarıla bilən: ${available}`;
                }
            }
        });

        setReturnErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreateReturn = async () => {
        if (!validateReturnForm()) {
            return;
        }

        setIsReturnLoading(true);

        try {
            const items = returnItems
                .filter(item => item.saleItemId && item.quantity > 0)
                .map(item => ({
                    saleItemId: item.saleItemId,
                    quantity: parseInt(item.quantity)
                }));

            const payload = {
                saleId: id,
                customerName: formData.customerName?.trim() || null,
                customerSurname: formData.customerSurname?.trim() || null,
                customerPhone: formData.customerPhone?.trim() || null,
                items,
                reason: returnFormData.reason?.trim() || null,
                note: returnFormData.note?.trim() || null
            };

            const response = await returnApi.create(payload);
            if (response.success) {
                Alert.success(t('return_success') || 'Uğurlu!', t('return_success_text') || 'Qaytarma uğurla yaradıldı');
                // Formu yenilə
                setReturnItems([]);
                setReturnFormData({ reason: '', note: '' });
                setShowReturnForm(false);
                // Satış məlumatlarını yenidən yüklə
                const saleResponse = await saleApi.getById(id);
                if (saleResponse.success && saleResponse.date) {
                    const sale = saleResponse.date;
                    setSaleItems(sale.items || []);
                }
                // Qaytarmaları yenidən yüklə
                const returnsResponse = await returnApi.getBySaleId(id);
                if (returnsResponse.success && returnsResponse.date) {
                    setSaleReturns(returnsResponse.date);
                }
            }
        } catch (error) {
            console.error('Return creation error:', error);
            const errorMessage = error.response?.data?.message || (t('return_error') || 'Qaytarma yaradılarkən xəta baş verdi');
            setReturnErrors({ general: errorMessage });
            Alert.error(t('error') || 'Xəta!', errorMessage);
        } finally {
            setIsReturnLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                customerName: formData.customerName?.trim() || null,
                customerSurname: formData.customerSurname?.trim() || null,
                customerPhone: formData.customerPhone?.trim() || null,
                note: formData.note?.trim() || null
            };

            // Edit modunda items göndərmə, yalnız müştəri məlumatları və qeyd yenilənir
            if (!isEditMode) {
                const items = selectedProducts
                    .filter(item => item.productId && item.quantity && item.quantity !== '' && parseInt(item.quantity) > 0)
                    .map(item => {
                        const itemData = {
                            productId: item.productId,
                            quantity: parseInt(item.quantity)
                        };
                        // Əgər custom sale price varsa, onu göndər
                        if (item.salePrice && item.salePrice !== '' && !isNaN(parseFloat(item.salePrice))) {
                            itemData.pricePerItem = parseFloat(item.salePrice);
                        }
                        return itemData;
                    });
                payload.items = items;
                // Paid amount və payment type əlavə et
                payload.paidAmount = formData.paidAmount ? parseFloat(formData.paidAmount) : calculateTotal();
                payload.paymentType = formData.paymentType;
            } else {
                // Edit modunda paidAmount və paymentType yenilənə bilər
                if (formData.paidAmount) {
                    payload.paidAmount = parseFloat(formData.paidAmount);
                }
                payload.paymentType = formData.paymentType;
            }

            if (isEditMode) {
                await saleApi.update(id.toString(), payload);
                Alert.success(t('update_success') || 'Uğurlu!', t('update_success_text') || 'Satış məlumatları uğurla yeniləndi');
                setTimeout(() => {
                    navigate(salePagePath);
                }, 1500);
            } else {
                const response = await saleApi.create(payload);
                if (response.success && response.date) {
                    Alert.success(t('add_success') || 'Uğurlu!', t('add_success_text') || 'Satış uğurla əlavə edildi');
                    // Yeni satış yaradılanda check səhifəsinə yönləndir
                    setTimeout(() => {
                        const checkPath = isAdmin ? `/admin/check?id=${response.date.id}` : `/reception/sale-form?id=${response.date.id}`;
                        navigate(checkPath);
                    }, 1500);
                } else {
                    setTimeout(() => {
                        navigate(salePagePath);
                    }, 1500);
                }
            }

        } catch (error) {
            console.error('Sale operation error:', error);
            const errorMessage = error.response?.data?.message || (tAlert('error_text') || 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
            setErrors({ general: errorMessage });
            Alert.error(t('error') || 'Xəta!', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? (t('edit_sale') || 'Satış Məlumatlarını Redaktə Et') : (t('new_sale') || 'Yeni Satış')}
                </h1>
                <p className="text-gray-600 mt-1">
                    {isEditMode ? (t('edit_sale_description') || 'Satış məlumatlarını yeniləyin') : (t('new_sale_description') || 'Yeni satış əlavə edin')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Customer Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdPerson className="inline w-5 h-5 mr-2" />
                        {t('customer_info') || 'Müştəri Məlumatları'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label={t('customer_name') || 'Müştəri Adı'}
                            type="text"
                            value={formData.customerName}
                            onChange={(e) => handleInputChange('customerName', e.target.value)}
                            error={errors.customerName}
                            placeholder={t('customer_name_placeholder') || 'Müştəri adını daxil edin'}
                            icon={<MdPerson />}
                        />

                        <Input
                            label={t('customer_surname') || 'Müştəri Soyadı'}
                            type="text"
                            value={formData.customerSurname}
                            onChange={(e) => handleInputChange('customerSurname', e.target.value)}
                            error={errors.customerSurname}
                            placeholder={t('customer_surname_placeholder') || 'Müştəri soyadını daxil edin'}
                            icon={<MdPerson />}
                        />

                        <div className="md:col-span-2">
                            <Input
                                label={t('customer_phone') || 'Telefon'}
                                type="text"
                                value={formData.customerPhone}
                                onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                                error={errors.customerPhone}
                                placeholder={t('customer_phone_placeholder') || 'Telefon nömrəsini daxil edin'}
                                icon={<MdPerson />}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('payment_type') || 'Ödəniş Növü'}
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paymentType"
                                        value="cash"
                                        checked={formData.paymentType === 'cash'}
                                        onChange={(e) => handleInputChange('paymentType', e.target.value)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        disabled={isLoading}
                                    />
                                    <MdMoney className="w-5 h-5 text-green-600" />
                                    <span className="text-sm font-medium text-gray-700">
                                        {t('cash') || 'Nağd'}
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paymentType"
                                        value="card"
                                        checked={formData.paymentType === 'card'}
                                        onChange={(e) => handleInputChange('paymentType', e.target.value)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        disabled={isLoading}
                                    />
                                    <MdCreditCard className="w-5 h-5 text-blue-600" />
                                    <span className="text-sm font-medium text-gray-700">
                                        {t('card') || 'Kart'}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 flex-1">
                            <MdShoppingCart className="inline w-5 h-5 mr-2" />
                            {isEditMode ? (t('sold_products') || 'Satılan Məhsullar') : (t('products') || 'Məhsullar')}
                        </h3>
                        {!isEditMode && (
                            <button
                                type="button"
                                onClick={addProductRow}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <MdAdd className="w-4 h-4" />
                                {t('add_product') || 'Məhsul Əlavə Et'}
                            </button>
                        )}
                    </div>

                    {errors.products && (
                        <p className="text-sm text-red-600 mb-4">{errors.products}</p>
                    )}

                    <div className="space-y-4">
                        {selectedProducts.map((item, index) => {
                            const selectedProduct = products.find(p => p.id === item.productId);
                            const qty = item.quantity && item.quantity !== '' ? parseInt(item.quantity) : 0;
                            const itemTotal = selectedProduct ? getProductPrice(item.productId, item.salePrice) * qty : 0;
                            const defaultPrice = selectedProduct ? getProductPrice(selectedProduct.id) : 0;

                            return (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="lg:col-span-2">
                                                <SearchDropdown
                                                    options={products}
                                                    value={item.productId}
                                                    onChange={(productId) => handleProductChange(index, productId)}
                                                    placeholder={t('select_product') || 'Məhsul seçin'}
                                                    disabled={isLoading || loadingProducts || isEditMode}
                                                    error={!!errors[`product_${index}`]}
                                                    label={`${t('product') || 'Məhsul'} ${index + 1}`}
                                                    getOptionLabel={(product) => `${product.name} - ${parseFloat(product.salePrice).toFixed(2)} ₼${product.hasDiscount && product.discountPrice ? ` (${parseFloat(product.discountPrice).toFixed(2)} ₼)` : ''} (Stok: ${product.stock})`}
                                                    getOptionValue={(product) => product.id}
                                                    searchFields={['name', 'barcode']}
                                                    renderOption={(product) => (
                                                        <div>
                                                            <div className="font-medium text-base">{product.name}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {parseFloat(product.salePrice).toFixed(2)} ₼
                                                                {product.hasDiscount && product.discountPrice && (
                                                                    <span className="text-green-600 ml-1">
                                                                        ({parseFloat(product.discountPrice).toFixed(2)} ₼)
                                                                    </span>
                                                                )}
                                                                <span className="ml-2">Stok: {product.stock}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    className="text-base"
                                                />
                                                {errors[`product_${index}`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`product_${index}`]}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    {t('quantity') || 'Miqdar'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={item.quantity || ''}
                                                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                        errors[`quantity_${index}`] ? 'border-red-500' : 'border-gray-300'
                                                    } ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                    disabled={isLoading || !item.productId || isEditMode}
                                                />
                                                {errors[`quantity_${index}`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`quantity_${index}`]}</p>
                                                )}
                                                {selectedProduct && (
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {t('available_stock') || 'Mövcud stok'}: {selectedProduct.stock}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    {t('sale_price') || 'Satış Qiyməti'} (₼)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={item.salePrice || ''}
                                                    readOnly
                                                    className={`w-full px-4 py-2 border rounded-lg bg-gray-100 cursor-not-allowed ${
                                                        errors[`salePrice_${index}`] ? 'border-red-500' : 'border-gray-300'
                                                    }`}
                                                    disabled={true}
                                                    placeholder={defaultPrice.toFixed(2)}
                                                />
                                                {errors[`salePrice_${index}`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`salePrice_${index}`]}</p>
                                                )}
                                                {selectedProduct && (
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {t('default_price') || 'Standart'}: {defaultPrice.toFixed(2)} ₼
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    {t('discount_amount') || 'Endirim Məbləği'} (₼)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={item.discountAmount || ''}
                                                    onChange={(e) => handleDiscountAmountChange(index, e.target.value)}
                                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                        errors[`discount_${index}`] ? 'border-red-500' : 'border-gray-300'
                                                    } ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                    disabled={isLoading || !item.productId || isEditMode}
                                                    placeholder="0.00"
                                                />
                                                {errors[`discount_${index}`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`discount_${index}`]}</p>
                                                )}
                                                {selectedProduct && (() => {
                                                    const defaultSalePrice = parseFloat(selectedProduct.salePrice);
                                                    const maxDiscount = selectedProduct.hasDiscount && selectedProduct.discountPrice
                                                        ? (defaultSalePrice - parseFloat(selectedProduct.discountPrice))
                                                        : defaultSalePrice;
                                                    return (
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {t('max_discount') || 'Maksimum endirim'}: {maxDiscount.toFixed(2)} ₼
                                                        </p>
                                                    );
                                                })()}
                                                {selectedProduct && item.discountAmount && parseFloat(item.discountAmount) > 0 && (
                                                    <p className="mt-1 text-xs text-green-600">
                                                        {t('new_price') || 'Yeni qiymət'}: {item.salePrice} ₼
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <div className="text-right">
                                                <p className="text-sm text-gray-500">{t('total') || 'Cəmi'}</p>
                                                <p className="text-lg font-semibold text-gray-900">
                                                    {itemTotal.toFixed(2)} ₼
                                                </p>
                                            </div>
                                            {!isEditMode && selectedProducts.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeProductRow(index)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <MdDelete className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">{t('grand_total') || 'Ümumi Cəmi'}</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {calculateTotal().toFixed(2)} ₼
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Return Section - Only in Edit Mode */}
                {isEditMode && saleItems.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 flex-1">
                                <MdUndo className="inline w-5 h-5 mr-2 text-red-600" />
                                {t('return_products') || 'Məhsul Qaytarma'}
                            </h3>
                            {!showReturnForm && (
                                <button
                                    type="button"
                                    onClick={() => setShowReturnForm(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <MdUndo className="w-4 h-4" />
                                    {t('create_return') || 'Qaytarma Yarat'}
                                </button>
                            )}
                        </div>

                        {showReturnForm && (
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    {saleItems.map((saleItem) => {
                                        const availableQty = getAvailableReturnQuantity(saleItem);
                                        const returnItem = returnItems.find(ri => ri.saleItemId === saleItem.id);
                                        const returnQty = returnItem?.quantity || 0;

                                        if (availableQty <= 0) return null;

                                        return (
                                            <div key={saleItem.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {saleItem.product?.name || '-'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {t('sold_quantity') || 'Satılan'}: {saleItem.quantity} | 
                                                            {t('available_to_return') || 'Qaytarıla bilən'}: {availableQty}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <label className="text-sm text-gray-700">
                                                            {t('return_quantity') || 'Qaytarma miqdarı'}:
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={returnQty}
                                                            onChange={(e) => handleReturnItemChange(saleItem.id, e.target.value)}
                                                            className={`w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                                                                returnErrors[saleItem.id] ? 'border-red-500' : 'border-gray-300'
                                                            }`}
                                                            disabled={isReturnLoading}
                                                        />
                                                    </div>
                                                </div>
                                                {returnErrors[saleItem.id] && (
                                                    <p className="mt-1 text-sm text-red-600">{returnErrors[saleItem.id]}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {returnErrors.general && (
                                    <p className="text-sm text-red-600">{returnErrors.general}</p>
                                )}

                                <div className="space-y-3 pt-4 border-t border-gray-200">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('return_reason') || 'Qaytarma səbəbi'}
                                        </label>
                                        <input
                                            type="text"
                                            value={returnFormData.reason}
                                            onChange={(e) => setReturnFormData(prev => ({ ...prev, reason: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                            placeholder={t('return_reason_placeholder') || 'Qaytarma səbəbini daxil edin'}
                                            disabled={isReturnLoading}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('return_note') || 'Qaytarma qeydi'}
                                        </label>
                                        <textarea
                                            value={returnFormData.note}
                                            onChange={(e) => setReturnFormData(prev => ({ ...prev, note: e.target.value }))}
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                            placeholder={t('return_note_placeholder') || 'Qeyd daxil edin (istəyə bağlı)'}
                                            disabled={isReturnLoading}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowReturnForm(false);
                                            setReturnItems([]);
                                            setReturnFormData({ reason: '', note: '' });
                                            setReturnErrors({});
                                        }}
                                        disabled={isReturnLoading}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        {tAlert('cancel') || 'Ləğv et'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreateReturn}
                                        disabled={isReturnLoading || returnItems.length === 0}
                                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    >
                                        {isReturnLoading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white mr-2" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                {t('creating') || 'Yaradılır...'}
                                            </>
                                        ) : (
                                            t('create_return') || 'Qaytarma Yarat'
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Qaytarmaları göstər */}
                        {saleReturns && saleReturns.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h4 className="text-md font-semibold text-gray-900 mb-4">
                                    {t('returns_history') || 'Qaytarma Tarixçəsi'}
                                </h4>
                                <div className="space-y-3">
                                    {saleReturns.map((returnItem, returnIndex) => (
                                        <div key={returnItem.id || returnIndex} className="border border-red-200 rounded-lg p-4 bg-red-50">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {t('return') || 'Qaytarma'} #{returnIndex + 1}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(returnItem.createdAt).toLocaleDateString('az-AZ', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">{t('returned_amount') || 'Qaytarılan məbləğ'}</p>
                                                    <p className="text-lg font-bold text-red-600">
                                                        {parseFloat(returnItem.returnedAmount || 0).toFixed(2)} ₼
                                                    </p>
                                                </div>
                                            </div>
                                            {returnItem.reason && (
                                                <p className="text-sm text-gray-600 mb-2">
                                                    <span className="font-medium">{t('reason') || 'Səbəb'}:</span> {returnItem.reason}
                                                </p>
                                            )}
                                            {returnItem.note && (
                                                <p className="text-sm text-gray-600 mb-3">
                                                    <span className="font-medium">{t('note') || 'Qeyd'}:</span> {returnItem.note}
                                                </p>
                                            )}
                                            {returnItem.items && returnItem.items.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-semibold text-gray-700">
                                                        {t('returned_items') || 'Qaytarılan məhsullar'}:
                                                    </p>
                                                    {returnItem.items.map((item, itemIndex) => (
                                                        <div key={item.id || itemIndex} className="flex justify-between items-center py-1 px-2 bg-white rounded text-xs">
                                                            <span className="text-gray-900">
                                                                {item.product?.name || '-'} x{item.quantity}
                                                            </span>
                                                            <span className="text-red-600 font-semibold">
                                                                {parseFloat(item.totalPrice || 0).toFixed(2)} ₼
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Note */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdNote className="inline w-5 h-5 mr-2" />
                        {t('note') || 'Qeyd'}
                    </h3>

                    <div>
                        <textarea
                            value={formData.note}
                            onChange={(e) => handleInputChange('note', e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={t('note_placeholder') || 'Qeyd daxil edin (istəyə bağlı)'}
                        />
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(salePagePath)}
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {tAlert('cancel') || 'Ləğv et'}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || loadingProducts}
                        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white mr-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isEditMode ? (tAlert('updating') || 'Yenilənir...') : (tAlert('adding') || 'Əlavə edilir...')}
                            </>
                        ) : (
                            isEditMode ? (t('update') || 'Yenilə') : (t('create_sale') || 'Satış Yarat')
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

