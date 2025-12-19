import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import SearchDropdown from '../ui/SearchDropdown';
import { MdPerson, MdShoppingCart, MdAdd, MdDelete, MdAttachMoney, MdNote, MdUndo, MdCreditCard, MdMoney, MdCheckCircle } from 'react-icons/md';
import { saleApi, productApi, returnApi, creditTermApi, creditPaymentApi } from '../../api';
import { validateNumberInput } from '../../utils/validation';
import { getFullMonthYear } from '../../data/months';

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
        note: '',
        isCredit: false, // Kredit satışı?
        creditTermId: '', // Kredit müddəti
        initialPaymentAmount: '' // Kredit üçün ilk ödəniş məbləği
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
    const [creditTerms, setCreditTerms] = useState([]);
    const [creditPayments, setCreditPayments] = useState([]);
    const [saleData, setSaleData] = useState(null); // Edit modunda sale məlumatları
    const [paymentData, setPaymentData] = useState({
        amount: '',
        paymentType: 'cash',
        note: ''
    });
    const [paymentLoading, setPaymentLoading] = useState(false);

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

    // Fetch credit terms
    useEffect(() => {
        const fetchCreditTerms = async () => {
            try {
                const response = await creditTermApi.getAll();
                if (response.success && response.date) {
                    setCreditTerms(response.date);
                }
            } catch (error) {
                console.error('Error fetching credit terms:', error);
            }
        };
        fetchCreditTerms();
    }, []);

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
                            note: sale.note || '',
                            isCredit: sale.isCredit || false,
                            creditTermId: sale.creditTermId || ''
                        });
                        
                        // Kredit ödənişləri yüklə
                        if (sale.isCredit && sale.id) {
                            try {
                                const paymentsResponse = await creditPaymentApi.getBySaleId(sale.id);
                                if (paymentsResponse.success && paymentsResponse.date) {
                                    setCreditPayments(paymentsResponse.date);
                                }
                            } catch (error) {
                                console.error('Error fetching credit payments:', error);
                            }
                        }
                        
                        // Sale məlumatlarını saxla (kredit məlumatları üçün)
                        if (sale.isCredit) {
                            // Sale məlumatlarını state-də saxla
                            setSaleData(sale);
                        }
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
                // Endirim varsa, endirim məbləğini default olaraq yaz
                if (product.hasDiscount && product.discountPrice) {
                    const discountPrice = parseFloat(product.discountPrice);
                    const discountAmount = defaultSalePrice - discountPrice;
                    newProducts[index].discountAmount = discountAmount.toFixed(2);
                } else {
                    newProducts[index].discountAmount = '';
                }
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
        // Yalnız rəqəm və boş buraxıla bilər
        if (quantity === '' || quantity === null || quantity === undefined) {
            const newProducts = [...selectedProducts];
            newProducts[index].quantity = '';
            setSelectedProducts(newProducts);
            if (errors[`quantity_${index}`]) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[`quantity_${index}`];
                    return newErrors;
                });
            }
            return;
        }
        
        // Yalnız rəqəm yazıla bilər
        const isValidNumber = /^\d*$/.test(quantity);
        if (!isValidNumber) {
            return; // Yalnız rəqəm yazıla bilər
        }
        
        const qtyNum = parseInt(quantity) || 0;
        
        // 0 ola bilməz
        if (qtyNum === 0 && quantity !== '') {
            setErrors(prev => ({
                ...prev,
                [`quantity_${index}`]: t('quantity_cannot_be_zero') || 'Miqdar 0 ola bilməz'
            }));
            return;
        }
        
        const newProducts = [...selectedProducts];
        newProducts[index].quantity = quantity; // Formatlanmamış dəyəri saxla
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
        // Yalnız rəqəm və onluq nöqtə yazıla bilər
        if (salePrice === '' || salePrice === null || salePrice === undefined) {
            const newProducts = [...selectedProducts];
            newProducts[index].salePrice = '';
            setSelectedProducts(newProducts);
            return;
        }
        
        // Yalnız rəqəm və onluq nöqtə yazıla bilər
        const isValidNumber = /^\d*\.?\d*$/.test(salePrice);
        if (!isValidNumber) {
            return; // Yalnız rəqəm və onluq nöqtə yazıla bilər
        }
        
        const newProducts = [...selectedProducts];
        const priceNum = parseFloat(salePrice) || 0;
        
        if (priceNum < 0) {
            setErrors(prev => ({
                ...prev,
                [`salePrice_${index}`]: t('price_cannot_be_negative') || 'Qiymət mənfi ola bilməz'
            }));
            return;
        }
        
        newProducts[index].salePrice = salePrice; // Formatlanmamış dəyəri saxla
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
            if (formData.isCredit) {
                // Kredit satışında paidAmount-u sıfırla
                setFormData(prev => ({
                    ...prev,
                    paidAmount: ''
                }));
            } else if (total > 0) {
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
    }, [selectedProducts, isEditMode, formData.isCredit]);
    
    // Kredit müddəti seçildikdə ilk ödəniş məbləğini hesabla və default olaraq doldur
    useEffect(() => {
        if (!isEditMode && formData.isCredit && formData.creditTermId) {
            const selectedTerm = creditTerms.find(t => t.id === formData.creditTermId);
            const total = calculateTotal();
            if (selectedTerm && total > 0) {
                const monthlyPayment = total / selectedTerm.months;
                // Default olaraq aylıq ödəniş məbləğini doldur (həmişə yenilə)
                setFormData(prev => ({
                    ...prev,
                    initialPaymentAmount: monthlyPayment.toFixed(2)
                }));
            }
        } else if (!formData.isCredit) {
            setFormData(prev => ({
                ...prev,
                initialPaymentAmount: ''
            }));
        }
    }, [formData.isCredit, formData.creditTermId, selectedProducts, creditTerms, isEditMode]);

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
                
                // Kredit məlumatları
                if (formData.isCredit && formData.creditTermId) {
                    payload.isCredit = true;
                    payload.creditTermId = formData.creditTermId;
                    // İlk ödəniş məbləği varsa göndər
                    if (formData.initialPaymentAmount && parseFloat(formData.initialPaymentAmount) > 0) {
                        payload.initialPaymentAmount = parseFloat(formData.initialPaymentAmount);
                        payload.initialPaymentType = formData.paymentType;
                    }
                }
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

                        {/* Kredit seçimi */}
                        {!isEditMode && (
                            <div className="mt-6">
                                <label className="flex items-center gap-2 cursor-pointer mb-4">
                                    <input
                                        type="checkbox"
                                        checked={formData.isCredit}
                                        onChange={(e) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                isCredit: e.target.checked,
                                                creditTermId: e.target.checked ? prev.creditTermId : ''
                                            }));
                                        }}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                                        disabled={isLoading}
                                    />
                                    <MdCreditCard className="w-5 h-5 text-purple-600" />
                                    <span className="text-sm font-medium text-gray-700">
                                        {t('credit_sale') || 'Kredit satışı'}
                                    </span>
                                </label>

                                {formData.isCredit && (
                                    <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('credit_term') || 'Kredit müddəti'}
                                        </label>
                                        <select
                                            value={formData.creditTermId}
                                            onChange={(e) => handleInputChange('creditTermId', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            disabled={isLoading}
                                            required={formData.isCredit}
                                        >
                                            <option value="">{t('select_credit_term') || 'Kredit müddəti seçin'}</option>
                                            {creditTerms.length > 0 ? (
                                                creditTerms.map(term => (
                                                    <option key={term.id} value={term.id}>
                                                        {term.months} {t('months') || 'ay'} - {parseFloat(term.interestRate).toFixed(1)}% ({term.description || ''})
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="" disabled>{t('loading') || 'Yüklənir...'}</option>
                                            )}
                                        </select>
                                        
                                        {formData.creditTermId && (() => {
                                            const selectedTerm = creditTerms.find(t => t.id === formData.creditTermId);
                                            const total = calculateTotal();
                                            if (!selectedTerm || total === 0) return null;
                                            
                                            const interestRate = parseFloat(selectedTerm.interestRate) / 100;
                                            const creditTotal = total * (1 + interestRate);
                                            const monthlyPayment = total / selectedTerm.months;
                                            
                                            return (
                                                <div className="mt-4 space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">{t('base_amount') || 'Əsas məbləğ'}:</span>
                                                        <span className="font-medium">{total.toFixed(2)} ₼</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">{t('interest_rate') || 'Faiz'}:</span>
                                                        <span className="font-medium">{parseFloat(selectedTerm.interestRate).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">{t('total_with_interest') || 'Faizlə birlikdə ümumi'}:</span>
                                                        <span className="font-medium text-purple-600">{creditTotal.toFixed(2)} ₼</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">{t('monthly_payment') || 'Aylıq ödəniş'}:</span>
                                                        <span className="font-medium text-green-600">{monthlyPayment.toFixed(2)} ₼</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        
                                        {/* İlk ödəniş inputu */}
                                        <div className="mt-6 pt-6 border-t-2 border-purple-300 bg-purple-50 rounded-lg p-4">
                                            <label className="block text-base font-semibold text-gray-900 mb-3">
                                                <MdAttachMoney className="inline w-5 h-5 mr-2 text-purple-600" />
                                                {t('initial_payment') || 'Bu ayın ödənişi'}
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="text"
                                                    value={formData.initialPaymentAmount}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        // Yalnız rəqəm və onluq nöqtəyə icazə ver
                                                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                initialPaymentAmount: value
                                                            }));
                                                        }
                                                    }}
                                                    onKeyPress={(e) => {
                                                        if (!/[0-9.]/.test(e.key)) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    placeholder={(() => {
                                                        const selectedTerm = creditTerms.find(t => t.id === formData.creditTermId);
                                                        const total = calculateTotal();
                                                        if (selectedTerm && total > 0) {
                                                            return (total / selectedTerm.months).toFixed(2);
                                                        }
                                                        return '0.00';
                                                    })()}
                                                    className="flex-1 text-lg font-semibold py-3 px-4 border-2 border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                                                    disabled={isLoading}
                                                />
                                                <span className="text-xl font-bold text-purple-700">₼</span>
                                            </div>
                                            <p className="mt-2 text-sm text-gray-600 font-medium">
                                                {t('initial_payment_hint') || 'Bu ayın ödənişi avtomatik olaraq qeyd olunacaq'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
                                                    onKeyPress={(e) => {
                                                        // Yalnız rəqəm yazıla bilər
                                                        const char = String.fromCharCode(e.which);
                                                        if (!/[0-9]/.test(char)) {
                                                            e.preventDefault();
                                                        }
                                                    }}
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

                                            {/* Endirim inputu yalnız məhsulun endirimi olduqda görünsün */}
                                            {selectedProduct && selectedProduct.hasDiscount && selectedProduct.discountPrice && (
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
                                                        onKeyPress={(e) => {
                                                            // Yalnız rəqəm və onluq nöqtə yazıla bilər
                                                            const char = String.fromCharCode(e.which);
                                                            if (!/[0-9.]/.test(char)) {
                                                                e.preventDefault();
                                                            }
                                                        }}
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
                                            )}
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

                        {/* Kredit ödənişləri (Edit modunda) */}
                        {isEditMode && formData.isCredit && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h4 className="text-md font-semibold text-gray-900 mb-4">
                                    {t('credit_payments') || 'Kredit Ödənişləri'}
                                </h4>
                                
                                {/* Kredit məlumatları */}
                                {(() => {
                                    if (!saleData) return null;
                                    
                                    const creditTotalAmount = parseFloat(saleData.creditTotalAmount || saleData.totalAmount || 0);
                                    const totalPaid = creditPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                                    const creditRemainingAmount = Math.max(0, creditTotalAmount - totalPaid);
                                    const creditMonthlyPayment = parseFloat(saleData.creditMonthlyPayment || 0);
                                    
                                    const isFullyPaid = creditRemainingAmount <= 0.01; // 0.01-dən kiçik olsa tam ödənilib sayılır
                                    
                                    return (
                                        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4 mb-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                <div>
                                                    <p className="text-sm text-gray-600">{t('total_amount') || 'Ümumi məbləğ'}</p>
                                                    <p className="text-lg font-semibold">{creditTotalAmount.toFixed(2)} ₼</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">{t('paid_amount') || 'Ödənilən'}</p>
                                                    <p className="text-lg font-semibold text-green-600">{totalPaid.toFixed(2)} ₼</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">{t('remaining_amount') || 'Qalan'}</p>
                                                    <p className="text-lg font-semibold text-red-600">{creditRemainingAmount.toFixed(2)} ₼</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">{t('monthly_payment') || 'Aylıq ödəniş'}</p>
                                                    <p className="text-lg font-semibold">{creditMonthlyPayment.toFixed(2)} ₼</p>
                                                </div>
                                            </div>
                                            
                                            {!isFullyPaid && (
                                                <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                                                    <h5 className="text-sm font-semibold text-gray-900 mb-3">{t('make_payment') || 'Ödəniş Et'}</h5>
                                                    <div className="space-y-3">
                                                        <Input
                                                            label={t('amount') || 'Məbləğ'}
                                                            type="number"
                                                            step="0.01"
                                                            min="0.01"
                                                            max={creditRemainingAmount}
                                                            value={paymentData.amount}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                                                            placeholder={t('enter_amount') || 'Məbləğ daxil edin'}
                                                            icon={<MdAttachMoney />}
                                                        />
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                {t('payment_type') || 'Ödəniş növü'}
                                                            </label>
                                                            <div className="flex gap-4">
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        name="paymentType"
                                                                        value="cash"
                                                                        checked={paymentData.paymentType === 'cash'}
                                                                        onChange={(e) => setPaymentData(prev => ({ ...prev, paymentType: e.target.value }))}
                                                                        className="w-4 h-4 text-blue-600"
                                                                    />
                                                                    <span className="text-sm">{t('cash') || 'Nağd'}</span>
                                                                </label>
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        name="paymentType"
                                                                        value="card"
                                                                        checked={paymentData.paymentType === 'card'}
                                                                        onChange={(e) => setPaymentData(prev => ({ ...prev, paymentType: e.target.value }))}
                                                                        className="w-4 h-4 text-blue-600"
                                                                    />
                                                                    <span className="text-sm">{t('card') || 'Kart'}</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                        <Input
                                                            label={t('note') || 'Qeyd'}
                                                            type="text"
                                                            value={paymentData.note}
                                                            onChange={(e) => setPaymentData(prev => ({ ...prev, note: e.target.value }))}
                                                            placeholder={t('note_placeholder') || 'Qeyd (istəyə bağlı)'}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
                                                                    Alert.error(tAlert('error') || 'Xəta!', t('invalid_amount') || 'Düzgün məbləğ daxil edin');
                                                                    return;
                                                                }
                                                                
                                                                    const paymentAmount = parseFloat(paymentData.amount);
                                                                if (paymentAmount > creditRemainingAmount) {
                                                                    Alert.error(tAlert('error') || 'Xəta!', t('payment_exceeds_remaining') || 'Ödəniş məbləği qalan məbləğdən çox ola bilməz');
                                                                    return;
                                                                }
                                                                
                                                                setPaymentLoading(true);
                                                                try {
                                                                    const response = await creditPaymentApi.makePayment({
                                                                        saleId: id,
                                                                        amount: paymentAmount,
                                                                        paymentType: paymentData.paymentType,
                                                                        note: paymentData.note
                                                                    });
                                                                    
                                                                    if (response.success) {
                                                                        Alert.success(t('payment_success') || 'Uğurlu!', t('payment_success_text') || 'Ödəniş uğurla edildi');
                                                                        setPaymentData({ amount: '', paymentType: 'cash', note: '' });
                                                                        const paymentsResponse = await creditPaymentApi.getBySaleId(id);
                                                                        if (paymentsResponse.success && paymentsResponse.date) {
                                                                            setCreditPayments(paymentsResponse.date);
                                                                        }
                                                                        // Sale məlumatlarını yenilə
                                                                        const saleResponse = await saleApi.getById(id);
                                                                        if (saleResponse.success && saleResponse.date) {
                                                                            const updatedSale = saleResponse.date;
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                paidAmount: updatedSale.paidAmount ? parseFloat(updatedSale.paidAmount).toFixed(2) : prev.paidAmount
                                                                            }));
                                                                        }
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Error making payment:', error);
                                                                    Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || tAlert('error_text') || 'Ödəniş edilərkən xəta baş verdi');
                                                                } finally {
                                                                    setPaymentLoading(false);
                                                                }
                                                            }}
                                                            disabled={paymentLoading || !paymentData.amount || parseFloat(paymentData.amount) <= 0}
                                                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            {paymentLoading ? (t('processing') || 'İşlənir...') : (t('make_payment') || 'Ödəniş Et')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {isFullyPaid && (
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 text-green-800">
                                                        <MdCheckCircle className="w-5 h-5" />
                                                        <p className="font-medium">{t('credit_fully_paid') || 'Kredit tam ödənilib'}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                
                                {/* Ödəniş tarixçəsi */}
                                <div className="mt-4">
                                    <h5 className="text-sm font-semibold text-gray-900 mb-3">{t('payment_history') || 'Ödəniş Tarixçəsi'}</h5>
                                    {creditPayments.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">{t('no_payments') || 'Hələ ödəniş edilməyib'}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {creditPayments.map((payment, index) => {
                                                const paymentDate = new Date(payment.paymentDate);
                                                const paymentMonth = getFullMonthYear(paymentDate, 'az');
                                                
                                                // Növbəti ay hesabla
                                                const nextMonth = new Date(paymentDate);
                                                nextMonth.setMonth(nextMonth.getMonth() + 1);
                                                const nextMonthStr = getFullMonthYear(nextMonth, 'az');
                                                
                                                // Qalan məbləği hesabla (bu ödənişdən sonra)
                                                const creditTotal = parseFloat(saleData?.creditTotalAmount || saleData?.totalAmount || 0);
                                                const totalPaidSoFar = creditPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                                                const paidAfterThis = creditPayments
                                                    .slice(index + 1)
                                                    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                                                const paymentRemainingAmount = Math.max(0, creditTotal - totalPaidSoFar + paidAfterThis);
                                                
                                                return (
                                                    <div key={payment.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-base">{parseFloat(payment.amount).toFixed(2)} ₼</p>
                                                                <p className="text-xs font-medium text-purple-600 mt-1">
                                                                    {paymentMonth} {t('month_paid') || 'ayı ödənildi'}
                                                                </p>
                                                                {paymentRemainingAmount > 0 && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {t('remaining_month') || 'Qalan ay'}: {nextMonthStr} ({paymentRemainingAmount.toFixed(2)} ₼)
                                                                    </p>
                                                                )}
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {paymentDate.toLocaleString('az-AZ', {
                                                                        day: 'numeric',
                                                                        month: 'short',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </p>
                                                                {payment.paymentType && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {payment.paymentType === 'cash' ? (t('cash') || 'Nağd') : (t('card') || 'Kart')}
                                                                    </p>
                                                                )}
                                                                {payment.note && (
                                                                    <p className="text-xs text-gray-500 mt-1">{payment.note}</p>
                                                                )}
                                                            </div>
                                                            <MdCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
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

