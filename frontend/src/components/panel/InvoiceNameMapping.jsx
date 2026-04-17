import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MdInventory, MdSearch, MdSave, MdRefresh } from 'react-icons/md';
import { BiBuildings } from 'react-icons/bi';
import SearchDropdown from '../ui/SearchDropdown';
import Alert from '../ui/Alert';
import Input from '../ui/Input';
import { branchApi, productApi, authApi } from '../../api';
import { useBranch } from '../../hooks';

function canPickInvoiceBranch(user) {
    if (!user?.role?.name) return false;
    const r = user.role.name.toLowerCase();
    return r === 'superadmin' || (r === 'admin' && user.isBoss === true);
}

export default function InvoiceNameMapping() {
    const { t } = useTranslation('invoice_name');
    const { t: tAlert } = useTranslation('alert');
    
    const { selectedBranchId } = useBranch();
    
    const [products, setProducts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [localBranchId, setLocalBranchId] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [invoiceName, setInvoiceName] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch products when localBranchId changes
    useEffect(() => {
        if (localBranchId) {
            fetchProducts(localBranchId);
        }
    }, [localBranchId]);

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
                    const filtered = branchesResp.data.filter(
                        (b) => b.name !== 'Mərkəz Anbar' && b.id !== 'central'
                    );
                    setBranches(filtered);
                }
            } catch (error) {
                console.error('Error fetching branches/user:', error);
            } finally {
                setLoadingBranches(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!currentUser || branches.length === 0) return;

        let next = '';
        if (canPickInvoiceBranch(currentUser)) {
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

        setLocalBranchId((prev) => (prev === next ? prev : next));
    }, [currentUser, selectedBranchId, branches]);

    const branchOptionsForForm = useMemo(() => {
        if (!currentUser || canPickInvoiceBranch(currentUser)) return branches;
        const bid = currentUser.branchId;
        if (!bid) return branches;
        const mine = branches.filter((b) => b.id === bid);
        return mine.length ? mine : branches;
    }, [branches, currentUser]);

    useEffect(() => {
        setSelectedProduct(null);
        setInvoiceName('');
    }, [localBranchId]);

    const fetchProducts = async (bId) => {
        setLoading(true);
        try {
            const queryString = bId && bId !== 'central' ? `?branchId=${bId}` : '';
            const response = await productApi.getAll(queryString);
            if (response.success && response.date) {
                setProducts(response.date);
            } else {
                setProducts([]);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            Alert.error(tAlert('error') || 'Xəta!', tAlert('error_text') || 'Məhsullar alınarkən xəta baş verdi');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter products for search dropdown
    const filteredProducts = products.filter(product => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            product.name?.toLowerCase().includes(search) ||
            product.barcode?.toLowerCase().includes(search) ||
            product.invoiceName?.toLowerCase().includes(search)
        );
    });

    // Convert products to SearchDropdown format
    const productOptions = filteredProducts.map(product => ({
        id: product.id,
        name: `${product.name}${product.barcode ? ` (${product.barcode})` : ''}`
    }));

    const handleProductSelect = (productId) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            setSelectedProduct(product);
            setInvoiceName(product.invoiceName || '');
        }
    };

    const handleSave = async () => {
        if (!selectedProduct) {
            Alert.warning(t('select_product') || 'Xəbərdarlıq', t('select_product_text') || 'Zəhmət olmasa məhsul seçin');
            return;
        }

        setSaving(true);
        try {
            await productApi.update(selectedProduct.id, {
                invoiceName: invoiceName.trim() || null
            });

            Alert.success(tAlert('success') || 'Uğurlu!', t('save_success') || 'Qaimə adı uğurla saxlanıldı');
            
            // Update local state
            const updatedProducts = products.map(p => 
                p.id === selectedProduct.id 
                    ? { ...p, invoiceName: invoiceName.trim() || null }
                    : p
            );
            setProducts(updatedProducts);
            setSelectedProduct({ ...selectedProduct, invoiceName: invoiceName.trim() || null });
        } catch (error) {
            console.error('Error saving invoice name:', error);
            Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || tAlert('error_text') || 'Qaimə adı saxlanarkən xəta baş verdi');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (selectedProduct) {
            setInvoiceName(selectedProduct.invoiceName || '');
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {t('title') || 'Qaimə Adları Uyğunlaşdırılması'}
                </h1>
                <p className="text-gray-600 mt-1">
                    {t('description') || 'Məhsulların vitrindəki adı ilə qaimədəki adını uyğunlaşdırın'}
                </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
                {/* Branch Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('branch') || 'Filial'}
                    </label>
                    <SearchDropdown
                        options={branchOptionsForForm}
                        value={localBranchId}
                        onChange={(value) => setLocalBranchId(value)}
                        placeholder={t('select_branch') || 'Filial seçin'}
                        getOptionLabel={(branch) => branch.name}
                        getOptionValue={(branch) => branch.id}
                        disabled={loadingBranches || !canPickInvoiceBranch(currentUser)}
                        icon={<BiBuildings className="text-blue-500" />}
                        searchFields={['name']}
                    />
                </div>

                {/* Product Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('select_product') || 'Məhsul Seçin'}
                    </label>
                    <SearchDropdown
                        options={productOptions}
                        value={selectedProduct?.id || ''}
                        onChange={handleProductSelect}
                        placeholder={t('search_product') || 'Məhsul axtarın...'}
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                        disabled={loading}
                    />
                </div>

                {/* Selected Product Info */}
                {selectedProduct && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MdInventory className="text-blue-600" />
                            <h3 className="font-semibold text-blue-900">
                                {t('selected_product') || 'Seçilmiş Məhsul'}
                            </h3>
                        </div>
                        <div className="space-y-1 text-sm">
                            <p>
                                <span className="font-medium">{t('name') || 'Ad'}:</span>{' '}
                                {selectedProduct.name}
                            </p>
                            {selectedProduct.barcode && (
                                <p>
                                    <span className="font-medium">{t('barcode') || 'Barcode'}:</span>{' '}
                                    {selectedProduct.barcode}
                                </p>
                            )}
                            {selectedProduct.category?.name && (
                                <p>
                                    <span className="font-medium">{t('category') || 'Kateqoriya'}:</span>{' '}
                                    {selectedProduct.category.name}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Invoice Name Input */}
                {selectedProduct && (
                    <div>
                        <Input
                            label={t('invoice_name') || 'Qaimə Adı'}
                            type="text"
                            value={invoiceName}
                            onChange={(e) => setInvoiceName(e.target.value)}
                            placeholder={t('invoice_name_placeholder') || 'Qaimədə gələn orijinal adı daxil edin'}
                            icon={<MdInventory />}
                        />
                        <p className="mt-1 text-sm text-gray-500">
                            {t('invoice_name_hint') || 'Bu ad qaimədə gələn orijinal adıdır. Boş buraxa bilərsiniz.'}
                        </p>
                    </div>
                )}

                {/* Actions */}
                {selectedProduct && (
                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <MdSave className="w-5 h-5" />
                            {saving ? (t('saving') || 'Saxlanılır...') : (t('save') || 'Saxla')}
                        </button>
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            <MdRefresh className="w-5 h-5" />
                            {t('reset') || 'Sıfırla'}
                        </button>
                    </div>
                )}

                {/* Info Box */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                        <strong>{t('info_title') || 'Məlumat:'}</strong>{' '}
                        {t('info_text') || 'Bu səhifədə məhsulların vitrindəki adı ilə qaimədə gələn orijinal adını uyğunlaşdıra bilərsiniz. Qaimə adı boş ola bilər.'}
                    </p>
                </div>
            </div>
        </div>
    );
}

