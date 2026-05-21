import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MdSearch,
    MdAdd,
    MdRemove,
    MdDelete,
    MdQrCodeScanner,
    MdAttachMoney,
    MdCreditCard,
    MdShoppingCart,
    MdInventory2,
    MdCheckCircle,
    MdStorefront,
} from 'react-icons/md';
import { productApi, saleApi, ismayilliApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { playPosBeep } from '../../hooks/useBarcodeScanner';
import Alert from '../ui/Alert';

const formatPrice = (n) => `${parseFloat(n || 0).toFixed(2)} ₼`;

// Hər iki store-un məhsullarını eyni shape-ə salır.
const normalizeFitech = (p) => ({
    raw: p,
    id: p.id,
    name: p.name,
    barcode: (p.barcode || '').toString(),
    stock: Number(p.stock ?? 0),
    price: parseFloat(
        p.hasDiscount && p.discountPrice ? p.discountPrice : p.salePrice ?? 0
    ),
    purchasePrice: parseFloat(p.purchasePrice ?? 0),
    isActive: p.isActive !== false && p.deleteType === 'NONE',
    hasDiscount: !!p.hasDiscount,
    store: 'FITECH',
});

const normalizeIsmayilli = (p) => ({
    raw: p,
    id: p.id,
    name: p.name,
    barcode: (p.barcode || '').toString(),
    stock: Number(p.quantity ?? 0),
    price: parseFloat(p.unitPriceSale ?? 0),
    purchasePrice: parseFloat(p.unitPricePurchase ?? 0),
    isActive: p.deleteType === 'NONE',
    hasDiscount: false,
    store: 'ISMAYILLI',
});

export default function SellerPOS() {
    const { user } = useAuth();
    const { selectedStore, setSelectedStore } = useBranch();
    const navigate = useNavigate();

    const [fitechProducts, setFitechProducts] = useState([]);
    const [ismayilliProducts, setIsmayilliProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [search, setSearch] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [cart, setCart] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [customer, setCustomer] = useState({ name: '', phone: '' });
    const [paymentType, setPaymentType] = useState('cash');

    const branchId = user?.branchId || null;
    const isIsmayilli = selectedStore === 'ISMAYILLI';

    // ===== Hidden barcode input (default focus) =====
    const barcodeInputRef = useRef(null);
    const searchInputRef = useRef(null);

    const refocusBarcode = useCallback(() => {
        const active = document.activeElement;
        const tag = active?.tagName;
        const isInputLike =
            active && (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable);
        if (!isInputLike) {
            barcodeInputRef.current?.focus();
        }
    }, []);

    useEffect(() => {
        barcodeInputRef.current?.focus();
        const onPointerDown = () => setTimeout(refocusBarcode, 0);
        const onVisibilityChange = () => {
            if (!document.hidden) refocusBarcode();
        };
        const onFocusOut = () => setTimeout(refocusBarcode, 50);
        window.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('focusout', onFocusOut);
        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('focusout', onFocusOut);
        };
    }, [refocusBarcode]);

    // ===== Load products (both stores in parallel) =====
    const fetchProducts = useCallback(async () => {
        setLoadingProducts(true);
        try {
            const tasks = [];
            tasks.push(
                productApi.getAll(branchId ? { branchId } : {}).catch((e) => {
                    console.error('fitech products error', e);
                    return null;
                })
            );
            tasks.push(
                ismayilliApi.getAllProducts().catch((e) => {
                    console.error('ismayilli products error', e);
                    return null;
                })
            );
            const [fitechRes, ismayilliRes] = await Promise.all(tasks);

            const fitechList = (fitechRes?.date || fitechRes?.data || []).map(normalizeFitech);
            const ismayilliList = (ismayilliRes?.data || []).map(normalizeIsmayilli);

            setFitechProducts(fitechList);
            setIsmayilliProducts(ismayilliList);
        } catch (e) {
            console.error('Error loading products:', e);
            Alert.error('Xəta!', 'Məhsullar yüklənərkən xəta baş verdi');
        } finally {
            setLoadingProducts(false);
        }
    }, [branchId]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Active məhsul siyahısı (UI search üçün)
    const currentProducts = isIsmayilli ? ismayilliProducts : fitechProducts;

    // Cart-da yalnız eyni store-un məhsulları ola bilər. Store dəyişdikdə səbəti
    // təmizləməyə icazə alırıq əvvəldən.
    const ensureCartStoreMatches = useCallback(
        async (nextStore) => {
            if (cart.length === 0 || cart[0].store === nextStore) return true;
            const confirm = await Alert.confirm(
                'Səbət təmizlənəcək',
                `Mağaza dəyişir (${cart[0].store === 'FITECH' ? 'Fitech' : 'İsmayıllı'} → ${nextStore === 'FITECH' ? 'Fitech' : 'İsmayıllı'}). Səbətdəki bütün məhsullar silinəcək. Davam edirsiniz?`,
                { confirmText: 'Bəli', cancelText: 'Xeyr', confirmColor: '#F59E0B' }
            );
            if (!confirm.isConfirmed) return false;
            setCart([]);
            return true;
        },
        [cart]
    );

    // Header toggle ilə store dəyişəndə fərqli store-dan olan səbəti təmizlə.
    useEffect(() => {
        if (cart.length === 0) return;
        if (cart[0].store !== selectedStore) {
            setCart([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStore]);

    // ===== Cart ops =====
    const addToCart = useCallback(
        (norm, qty = 1) => {
            if (!norm) return;
            setCart((prev) => {
                // Fərqli store-dan məhsul gəlirsə (barkod skanla), heç vaxt qarışdırma.
                if (prev.length > 0 && prev[0].store !== norm.store) {
                    return prev; // əvvəlcədən ensureCartStoreMatches çağrılmalıdır
                }
                const idx = prev.findIndex((p) => p.productId === norm.id);
                if (idx >= 0) {
                    const next = [...prev];
                    const newQty = next[idx].quantity + qty;
                    if (norm.stock > 0 && newQty > norm.stock) {
                        Alert.warning('Stok bitib', `Mövcud stok: ${norm.stock}`);
                        return prev;
                    }
                    next[idx] = { ...next[idx], quantity: newQty };
                    return next;
                }
                if (norm.stock <= 0) {
                    Alert.warning('Stok yoxdur', `${norm.name} üçün stok bitib`);
                    return prev;
                }
                return [
                    ...prev,
                    {
                        productId: norm.id,
                        name: norm.name,
                        barcode: norm.barcode,
                        price: norm.price,
                        purchasePrice: norm.purchasePrice,
                        quantity: qty,
                        maxStock: norm.stock,
                        store: norm.store,
                    },
                ];
            });
        },
        []
    );

    const updateQty = (productId, delta) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.productId !== productId) return item;
                    const newQty = item.quantity + delta;
                    if (newQty <= 0) return null;
                    if (item.maxStock > 0 && newQty > item.maxStock) {
                        Alert.warning('Stok bitib', `Mövcud stok: ${item.maxStock}`);
                        return item;
                    }
                    return { ...item, quantity: newQty };
                })
                .filter(Boolean)
        );
    };

    const setQtyExact = (productId, value) => {
        const n = parseInt(value, 10);
        if (Number.isNaN(n) || n < 1) return;
        setCart((prev) =>
            prev.map((item) => {
                if (item.productId !== productId) return item;
                if (item.maxStock > 0 && n > item.maxStock) {
                    Alert.warning('Stok bitib', `Mövcud stok: ${item.maxStock}`);
                    return { ...item, quantity: item.maxStock };
                }
                return { ...item, quantity: n };
            })
        );
    };

    const removeFromCart = (productId) => {
        setCart((prev) => prev.filter((p) => p.productId !== productId));
    };

    const clearCart = () => setCart([]);

    // ===== Barcode scan handler =====
    const handleBarcodeScan = useCallback(
        async (raw) => {
            const barcode = (raw || '').trim();
            if (!barcode) return;

            // Hər iki katalog-da axtar
            const fitechHit = fitechProducts.find((p) => p.barcode === barcode);
            const ismayilliHit = ismayilliProducts.find((p) => p.barcode === barcode);
            const product = fitechHit || ismayilliHit;
            if (!product) {
                Alert.error('Tapılmadı', `Barkod "${barcode}" üçün məhsul tapılmadı`);
                return;
            }

            // Lazımdırsa store-u dəyiş
            if (selectedStore !== product.store) {
                const ok = await ensureCartStoreMatches(product.store);
                if (!ok) return;
                setSelectedStore(product.store);
            }

            playPosBeep();
            addToCart(product, 1);
        },
        [
            fitechProducts,
            ismayilliProducts,
            selectedStore,
            setSelectedStore,
            ensureCartStoreMatches,
            addToCart,
        ]
    );

    // ===== Search dropdown =====
    const filteredResults = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return [];
        return currentProducts
            .filter((p) => p.isActive)
            .filter((p) => {
                const name = p.name.toLowerCase();
                return name.includes(q) || p.barcode.toLowerCase().includes(q);
            })
            .slice(0, 8);
    }, [currentProducts, search]);

    const handlePickFromSearch = (product) => {
        addToCart(product, 1);
        setSearch('');
        setSearchOpen(false);
        searchInputRef.current?.blur();
        setTimeout(refocusBarcode, 0);
    };

    // ===== Totals =====
    const totals = useMemo(() => {
        const subtotal = cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const itemsCount = cart.reduce((sum, it) => sum + it.quantity, 0);
        return { subtotal, itemsCount };
    }, [cart]);

    // ===== Submit =====
    const submitSale = async () => {
        if (cart.length === 0) {
            Alert.warning('Boş səbət', 'Ən azı bir məhsul əlavə edin');
            return;
        }
        setSubmitting(true);
        try {
            const cartStore = cart[0].store;
            let res;
            let newSaleId = null;

            if (cartStore === 'ISMAYILLI') {
                const payload = {
                    items: cart.map((c) => ({
                        productId: c.productId,
                        quantity: c.quantity,
                    })),
                    paidAmount: totals.subtotal,
                    note:
                        [customer.name?.trim(), customer.phone?.trim()]
                            .filter(Boolean)
                            .join(' · ') || null,
                };
                res = await ismayilliApi.createSale(payload);
                newSaleId = res?.data?.id || null;
            } else {
                const payload = {
                    customerName: customer.name?.trim() || null,
                    customerPhone: customer.phone?.trim() || null,
                    paymentType,
                    items: cart.map((c) => ({
                        productId: c.productId,
                        quantity: c.quantity,
                        pricePerItem: c.price,
                    })),
                    branchId: branchId || 'central',
                };
                res = await saleApi.create(payload);
                const newSale = res?.date || res?.data;
                newSaleId = newSale?.id || null;
            }

            if (res?.success) {
                playPosBeep();
                clearCart();
                setCustomer({ name: '', phone: '' });
                setPaymentType('cash');
                await fetchProducts();
                const confirm = await Alert.confirm(
                    'Satış uğurla tamamlandı',
                    'Çek çap edilsin?',
                    { confirmText: 'Çek aç', cancelText: 'Bağla', confirmColor: '#4F46E5' }
                );
                if (confirm.isConfirmed && newSaleId) {
                    navigate(`/seller/check?id=${newSaleId}&store=${cartStore}`);
                }
            } else {
                Alert.error('Xəta', res?.message || 'Satış yaradıla bilmədi');
            }
        } catch (e) {
            console.error('submitSale error', e);
            Alert.error('Xəta', e?.response?.data?.message || 'Satış yaradılarkən xəta baş verdi');
        } finally {
            setSubmitting(false);
            setTimeout(refocusBarcode, 0);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-3 sm:p-4 min-h-0">
            {/* Hidden barcode capture input */}
            <input
                ref={barcodeInputRef}
                type="text"
                aria-label="Barkod skaner"
                autoComplete="off"
                tabIndex={-1}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.currentTarget.value;
                        e.currentTarget.value = '';
                        handleBarcodeScan(val);
                    }
                }}
                onBlur={() => setTimeout(refocusBarcode, 0)}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: 'none',
                    border: 'none',
                    outline: 'none',
                    padding: 0,
                    margin: 0,
                    zIndex: -1,
                }}
            />

            <div className="max-w-5xl w-full mx-auto flex flex-col flex-1 min-h-0">
                {/* Store mode indicator chip (read-only here, toggle is in header) */}
                <div className="mb-2 flex items-center justify-between">
                    <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold border ${
                            isIsmayilli
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                    >
                        <MdStorefront className="w-4 h-4" />
                        Aktiv mağaza:{' '}
                        <span className="uppercase">{isIsmayilli ? 'İsmayıllı' : 'Fitech'}</span>
                    </div>
                    {cart.length > 0 && cart[0].store !== selectedStore && (
                        <div className="text-xs text-orange-600 font-bold">
                            Səbət fərqli mağazadandır
                        </div>
                    )}
                </div>

                {/* Search bar */}
                <div className="relative mb-3">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setSearchOpen(true);
                                }}
                                onFocus={() => search && setSearchOpen(true)}
                                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                                placeholder={`${
                                    isIsmayilli ? 'İsmayıllı' : 'Fitech'
                                } üzrə məhsul axtar (ad və ya barkod)...`}
                                className="w-full pl-10 pr-4 h-12 rounded-xl border-2 border-slate-200 bg-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 h-12 rounded-xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 text-xs font-bold shrink-0">
                            <span className="relative flex w-2 h-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                            </span>
                            <MdQrCodeScanner className="w-4 h-4" />
                            <span className="hidden sm:inline">Skaner hazır</span>
                        </div>
                    </div>

                    {/* Search dropdown */}
                    {searchOpen && search.trim() && (
                        <div
                            className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-80 overflow-y-auto"
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            {loadingProducts ? (
                                <div className="p-4 text-center text-sm text-slate-400">Yüklənir...</div>
                            ) : filteredResults.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-400">
                                    Məhsul tapılmadı
                                </div>
                            ) : (
                                filteredResults.map((p) => {
                                    const out = p.stock <= 0;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            disabled={out}
                                            onClick={() => handlePickFromSearch(p)}
                                            className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 border-b border-slate-100 last:border-b-0 transition-colors ${
                                                out
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : 'hover:bg-indigo-50'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-slate-800 truncate">
                                                    {p.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {p.barcode && (
                                                        <span className="text-[10px] font-mono text-slate-400">
                                                            {p.barcode}
                                                        </span>
                                                    )}
                                                    <span
                                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                            out
                                                                ? 'bg-red-100 text-red-700'
                                                                : 'bg-emerald-100 text-emerald-700'
                                                        }`}
                                                    >
                                                        {out ? 'Stok yox' : `${p.stock} ədəd`}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-sm font-extrabold text-indigo-600 shrink-0">
                                                {formatPrice(p.price)}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* MAIN: Cart */}
                <section className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-0">
                    <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                                <MdShoppingCart className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 leading-tight">
                                    Səbət
                                </h2>
                                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                    <MdInventory2 className="w-3.5 h-3.5" />
                                    <span>
                                        <span className="font-bold text-slate-700">
                                            {cart.length}
                                        </span>{' '}
                                        məhsul ·{' '}
                                        <span className="font-bold text-slate-700">
                                            {totals.itemsCount}
                                        </span>{' '}
                                        ədəd
                                    </span>
                                </p>
                            </div>
                        </div>
                        {cart.length > 0 && (
                            <button
                                type="button"
                                onClick={clearCart}
                                className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 hover:border-red-300 transition-colors inline-flex items-center gap-1.5"
                            >
                                <MdDelete className="w-4 h-4" />
                                Səbəti təmizlə
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {cart.length === 0 ? (
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-300">
                                <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                    <MdShoppingCart className="w-12 h-12 text-slate-300" />
                                </div>
                                <p className="text-base font-bold text-slate-400">Səbət boşdur</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    Barkodu skan edin və ya yuxarıda axtarış edin
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cart.map((item, idx) => (
                                    <div
                                        key={item.productId}
                                        className="p-3 rounded-xl border-2 border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm transition-all"
                                    >
                                        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                {idx + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-800 truncate">
                                                        {item.name}
                                                    </p>
                                                    {item.store === 'ISMAYILLI' && (
                                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                                                            İSM
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    {formatPrice(item.price)} / ədəd
                                                    {item.barcode && (
                                                        <span className="ml-2 font-mono text-slate-400">
                                                            {item.barcode}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQty(item.productId, -1)}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-lg"
                                                >
                                                    <MdRemove className="w-4 h-4" />
                                                </button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(e) =>
                                                        setQtyExact(item.productId, e.target.value)
                                                    }
                                                    className="w-12 h-8 text-center text-sm font-extrabold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => updateQty(item.productId, +1)}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-lg"
                                                >
                                                    <MdAdd className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="text-right shrink-0 min-w-[90px]">
                                                <p className="text-base font-extrabold text-indigo-600 tabular-nums">
                                                    {formatPrice(item.price * item.quantity)}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.productId)}
                                                className="w-8 h-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
                                                title="Sil"
                                            >
                                                <MdDelete className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t-2 border-slate-100 bg-slate-50 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                                type="text"
                                value={customer.name}
                                onChange={(e) =>
                                    setCustomer((c) => ({ ...c, name: e.target.value }))
                                }
                                placeholder="Müştəri adı (istəyə bağlı)"
                                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                                type="tel"
                                value={customer.phone}
                                onChange={(e) =>
                                    setCustomer((c) => ({ ...c, phone: e.target.value }))
                                }
                                placeholder="Telefon (istəyə bağlı)"
                                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {!isIsmayilli && (
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setPaymentType('cash')}
                                    className={`h-14 rounded-xl text-base font-extrabold flex items-center justify-center gap-2 border-2 transition-all ${
                                        paymentType === 'cash'
                                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300'
                                            : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
                                    }`}
                                >
                                    <MdAttachMoney className="w-6 h-6 shrink-0" />
                                    <span className="whitespace-nowrap">Nağd</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentType('card')}
                                    className={`h-14 rounded-xl text-base font-extrabold flex items-center justify-center gap-2 border-2 transition-all ${
                                        paymentType === 'card'
                                            ? 'bg-blue-600 text-white border-blue-700 shadow-lg shadow-blue-600/40 ring-2 ring-blue-300'
                                            : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                                    }`}
                                >
                                    <MdCreditCard className="w-6 h-6 shrink-0" />
                                    <span className="whitespace-nowrap">Kart</span>
                                </button>
                            </div>
                        )}
                        {isIsmayilli && (
                            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 text-center font-semibold">
                                İsmayıllı mağaza üçün ödəniş növü tələb olunmur — birbaşa satış qeydə alınır.
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-white rounded-xl border-2 border-indigo-200 shadow-sm">
                            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                                Ümumi məbləğ
                            </span>
                            <span className="text-3xl font-black text-indigo-600 tabular-nums leading-none">
                                {formatPrice(totals.subtotal)}
                            </span>
                        </div>

                        <button
                            type="button"
                            disabled={submitting || cart.length === 0}
                            onClick={submitSale}
                            className="w-full h-16 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white text-lg font-black tracking-wide shadow-xl shadow-indigo-600/40 hover:shadow-2xl hover:shadow-indigo-600/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 inline-flex items-center justify-center gap-3"
                        >
                            <MdCheckCircle className="w-6 h-6 shrink-0" />
                            {submitting ? 'GÖNDƏRİLİR...' : 'SATIŞI TAMAMLA'}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
