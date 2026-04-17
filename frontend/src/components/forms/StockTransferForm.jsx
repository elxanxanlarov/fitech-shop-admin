import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, Trash2, ArrowLeft, Package, Info } from 'lucide-react';
import Alert from '../ui/Alert';
import SearchDropdown from '../ui/SearchDropdown';
import NumericInput from '../ui/NumericInput';
import { branchApi, productApi, stockTransferApi } from '../../api';
import { hasContainer, containerLabel, unitSingular, formatStockShort } from '../../utils/unitHelpers';

export default function StockTransferForm() {
    const { t } = useTranslation('branch');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const toBranchIdParam = searchParams.get('toBranchId');

    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        toBranchId: toBranchIdParam || '',
        note: '',
        items: []
    });
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [branchesRes, productsRes] = await Promise.all([
                    branchApi.getAll(),
                    productApi.getAll({ isActive: true })
                ]);

                if (branchesRes.success) setBranches(branchesRes.data || []);
                if (productsRes.success) setProducts(productsRes.date || []);
            } catch (error) {
                console.error('Error fetching transfer data:', error);
                Alert.error(tAlert('error'), t('error_fetching_data'));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [t, tAlert]);

    const handleAddItem = (productId) => {
        if (!productId) return;

        // Find the product in our products list
        const product = products.find(p => p.id === productId);
        if (!product) return;

        // Check if product already in list
        const existingItemIndex = formData.items.findIndex(item => item.productId === productId);

        if (existingItemIndex !== -1) {
            // If already added, remove it (toggle behavior)
            handleRemoveItem(existingItemIndex);
            return;
        }

        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    productId: product.id,
                    name: product.name,
                    unitType: product.unitType,
                    maxStock: product.stock,
                    quantity: 1,
                    piecesPerBox: product.piecesPerBox || 1,
                    fullBoxes: 0,
                    openedBoxQuantity: 0
                }
            ]
        }));
    };

    const handleRemoveItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItemQuantity = (index, field, value) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index] };
        const ppb = item.piecesPerBox || 1;

        if (field === 'quantity') {
            // Top-level total input
            const val = Math.max(0, Math.min(parseInt(value) || 0, item.maxStock));
            item.quantity = val;
            if (ppb > 1) {
                item.fullBoxes = Math.floor(val / ppb);
                item.openedBoxQuantity = val % ppb;
            }
        } else if (field === 'fullBoxes') {
            // Box input — keep current pieces, recalculate total
            const boxes = Math.max(0, parseInt(value) || 0);
            const pieces = Math.max(0, item.openedBoxQuantity || 0);
            const newTotal = boxes * ppb + pieces;
            if (newTotal > item.maxStock) {
                // Clamp: reduce boxes so total fits
                const maxBoxes = Math.floor((item.maxStock - pieces) / ppb);
                item.fullBoxes = Math.max(0, maxBoxes);
            } else {
                item.fullBoxes = boxes;
            }
            item.quantity = item.fullBoxes * ppb + (item.openedBoxQuantity || 0);
        } else if (field === 'openedBoxQuantity') {
            // Piece input — independent from boxes, just changes extra pieces
            const maxPieces = ppb - 1; // max pieces in an open box
            const pieces = Math.max(0, Math.min(parseInt(value) || 0, maxPieces));
            const newTotal = (item.fullBoxes || 0) * ppb + pieces;
            if (newTotal > item.maxStock) {
                // Clamp pieces so total fits
                item.openedBoxQuantity = Math.max(0, item.maxStock - (item.fullBoxes || 0) * ppb);
            } else {
                item.openedBoxQuantity = pieces;
            }
            item.quantity = (item.fullBoxes || 0) * ppb + item.openedBoxQuantity;
        }

        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.toBranchId) {
            Alert.error(tAlert('error'), t('please_select_branch'));
            return;
        }
        if (formData.items.length === 0) {
            Alert.error(tAlert('error'), t('please_add_products'));
            return;
        }

        // Validate quantities
        const invalidItem = formData.items.find(item => item.quantity <= 0);
        if (invalidItem) {
            Alert.error(tAlert('error'), `${invalidItem.name}: ${t('invalid_quantity')}`);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                toBranchId: formData.toBranchId,
                note: formData.note,
                items: formData.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                }))
            };

            const response = await stockTransferApi.create(payload);
            if (response.success) {
                Alert.success(tAlert('success'), t('transfer_created_success'));
                navigate('/admin/branch-management');
            }
        } catch (error) {
            console.error('Error creating transfer:', error);
            Alert.error(tAlert('error'), error.response?.data?.message || t('error_creating_transfer'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-6 text-center">{t('loading')}</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <button
                onClick={() => navigate('/admin/branch-management')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                {t('back_to_branches') || 'Filiallara qayıt'}
            </button>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-700 px-6 py-8 text-white rounded-t-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Send className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{t('new_stock_transfer') || 'Yeni Stok Transferi'}</h1>
                            <p className="text-indigo-100 opacity-90">{t('transfer_desc') || 'Mərkəz anbardan filiala məhsul göndərin'}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Target Branch */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('target_branch') || 'Hədəf Filial'} *
                            </label>
                            <select
                                required
                                value={formData.toBranchId}
                                onChange={(e) => setFormData({ ...formData, toBranchId: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                <option value="">{t('select_branch') || 'Filial seçin'}</option>
                                {branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Note */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('note') || 'Qeyd'}
                            </label>
                            <input
                                type="text"
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={t('transfer_note_placeholder') || 'Transfer haqqında qeyd...'}
                            />
                        </div>
                    </div>

                    {/* Product Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Package className="w-5 h-5 text-blue-500" />
                                {t('products') || 'Məhsullar'}
                            </h3>
                            <div className="w-full max-w-md">
                                <SearchDropdown
                                    placeholder={t('search_product_to_add') || 'Məhsul axtar və əlavə et...'}
                                    options={products}
                                    value={formData.items.map(item => item.productId)}
                                    onChange={handleAddItem}
                                    searchFields={['name', 'barcode']}
                                    renderOption={(option) => {
                                        const boxes = option.piecesPerBox > 1 ? Math.floor(option.stock / option.piecesPerBox) : 0;
                                        const pieces = option.piecesPerBox > 1 ? option.stock % option.piecesPerBox : 0;
                                        const hasNoStock = option.stock <= 0;

                                        return (
                                            <div className="flex justify-between items-center w-full">
                                                <div className="flex flex-col">
                                                    <span className={`font-medium ${hasNoStock ? 'text-red-700' : 'text-gray-900'}`}>{option.name}</span>
                                                    {option.piecesPerBox > 1 && (
                                                        <span className="text-[10px] text-gray-400">1 {t('BOX') || 'Qutu'} = {option.piecesPerBox} {option.unitType === 'BOX' ? (t('PIECE') || 'Ədəd') : (t(option.unitType) || option.unitType)}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-md border ${hasNoStock
                                                        ? 'bg-red-50 text-red-700 border-red-100'
                                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                                        }`}>
                                                        {option.stock} {option.unitType === 'BOX' ? (t('PIECE') || 'Ədəd') : (t(option.unitType) || option.unitType)}
                                                    </span>
                                                    {option.piecesPerBox > 1 && (
                                                        <span className={`text-[10px] font-bold uppercase ${hasNoStock ? 'text-red-400' : 'text-gray-400'}`}>
                                                            {boxes} {t('BOX') || 'Qutu'} {pieces > 0 && `${pieces} ${t('PIECE') || 'Ədəd'}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t('product_name') || 'Məhsul'}</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t('current_stock') || 'Möv. Stok'}</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t('quantity') || 'Miqdar'}</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">{t('actions') || 'Əməliyyat'}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {formData.items.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Info className="w-8 h-8 text-gray-300" />
                                                    <p>{t('no_products_added') || 'Hələ ki heç bir məhsul əlavə edilməyib'}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        formData.items.map((item, index) => (
                                            <tr key={item.productId} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{item.name}</div>
                                                    {hasContainer(item) && (
                                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                                            1 {containerLabel(item.unitType)} = {item.piecesPerBox} {unitSingular(item.unitType)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${item.maxStock <= 0
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                            }`}>
                                                            {item.maxStock} {unitSingular(item.unitType)}
                                                        </span>
                                                        {hasContainer(item) && (
                                                            <div className={`text-[10px] font-bold uppercase px-1 ${item.maxStock <= 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                                                {formatStockShort(item.maxStock, item.unitType, item.piecesPerBox)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-2">
                                                        {hasContainer(item) ? (
                                                            <>
                                                                {/* Container + Unit inputs side by side */}
                                                                <div className="flex items-end gap-2">
                                                                    <NumericInput
                                                                        value={item.fullBoxes}
                                                                        onChange={(val) => updateItemQuantity(index, 'fullBoxes', val)}
                                                                        min={0}
                                                                        max={Math.floor(item.maxStock / item.piecesPerBox)}
                                                                        size="md"
                                                                        label={containerLabel(item.unitType)}
                                                                        className="w-28"
                                                                    />
                                                                    <span className="text-gray-300 font-bold text-lg mb-1">+</span>
                                                                    <NumericInput
                                                                        value={item.openedBoxQuantity}
                                                                        onChange={(val) => updateItemQuantity(index, 'openedBoxQuantity', val)}
                                                                        min={0}
                                                                        max={item.piecesPerBox - 1}
                                                                        size="md"
                                                                        label={unitSingular(item.unitType)}
                                                                        className="w-28"
                                                                    />
                                                                    <div className="mb-0.5 text-xs text-gray-400 leading-tight">
                                                                        <div>= <span className="font-bold text-gray-700">{item.quantity}</span></div>
                                                                        <div className="text-[10px]">{unitSingular(item.unitType)}</div>
                                                                    </div>
                                                                </div>

                                                                {/* Remaining preview */}
                                                                {(() => {
                                                                    const remaining = item.maxStock - item.quantity;
                                                                    const pct = item.maxStock > 0 ? Math.min(100, (item.quantity / item.maxStock) * 100) : 0;
                                                                    const isOver = remaining < 0;
                                                                    return (
                                                                        <div className={`rounded-lg px-3 py-2 text-xs border ${isOver ? 'bg-red-50 border-red-200' : remaining === 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                                                            <div className="flex justify-between mb-1.5">
                                                                                <span className="text-gray-500">Göndərilir:</span>
                                                                                <span className="font-bold text-indigo-700">
                                                                                    {formatStockShort(item.quantity, item.unitType, item.piecesPerBox)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                                                                                <div className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : pct >= 90 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-500">Qalacaq:</span>
                                                                                <span className={`font-bold ${isOver ? 'text-red-600' : remaining === 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                                                                                    {isOver ? 'Stok çatmaz!' : remaining === 0 ? 'Hamısı' : formatStockShort(remaining, item.unitType, item.piecesPerBox)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <NumericInput
                                                                    value={item.quantity}
                                                                    onChange={(val) => updateItemQuantity(index, 'quantity', val)}
                                                                    min={0}
                                                                    max={item.maxStock}
                                                                    suffix={unitSingular(item.unitType)}
                                                                />
                                                                {item.maxStock > 0 && (
                                                                    <div className="text-xs text-gray-400 flex justify-between px-1">
                                                                        <span>Qalacaq:</span>
                                                                        <span className={`font-bold ${item.maxStock - item.quantity < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                                            {item.maxStock - item.quantity} {unitSingular(item.unitType)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/branch-management')}
                            className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-all"
                        >
                            {t('cancel') || 'Ləğv Et'}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || formData.items.length === 0}
                            className="flex-3 flex items-center justify-center gap-3 px-12 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all disabled:opacity-50 shadow-lg hover:shadow-indigo-500/30"
                        >
                            {submitting ? (
                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    {t('create_transfer') || 'Transferi Tamamla'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
