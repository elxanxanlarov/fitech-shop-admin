import { useState, useEffect, useMemo } from 'react';
import { ismayilliApi } from '../../api';
import Alert from '../ui/Alert';
import { ShoppingCart, Search, Plus, Minus, Trash2, Tag, CreditCard, DollarSign, Notebook } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function IsmayilliSales() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // POS Pagination
  const [posPage, setPosPage] = useState(1);
  const posItemsPerPage = 12;

  // History Pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(20);
  
  // POS Basket
  const [basket, setBasket] = useState([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [note, setNote] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' or 'history'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const prodRes = await ismayilliApi.getAllProducts();
      const salesRes = await ismayilliApi.getAllSales();
      if (prodRes.success) setProducts(prodRes.data);
      if (salesRes.success) setSales(salesRes.data);
    } catch (error) {
      console.error('Fetch sales data error:', error);
      Alert.error('Xəta', 'Məlumatlar yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.filter(p => parseFloat(p.quantity) > 0);
    const query = search.toLowerCase();
    return products.filter(p => 
      parseFloat(p.quantity) > 0 &&
      (p.name.toLowerCase().includes(query) || (p.barcode && p.barcode.toLowerCase().includes(query)))
    );
  }, [products, search]);

  useEffect(() => {
    setPosPage(1);
  }, [search]);

  const totalPosPages = Math.ceil(filteredProducts.length / posItemsPerPage);
  const paginatedPosProducts = useMemo(() => {
    const startIndex = (posPage - 1) * posItemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + posItemsPerPage);
  }, [filteredProducts, posPage]);

  const totalHistoryPages = Math.ceil(sales.length / historyItemsPerPage);
  const paginatedSales = useMemo(() => {
    const startIndex = (historyPage - 1) * historyItemsPerPage;
    return sales.slice(startIndex, startIndex + historyItemsPerPage);
  }, [sales, historyPage, historyItemsPerPage]);

  const addToBasket = (prod) => {
    const existingIndex = basket.findIndex(item => item.productId === prod.id);
    if (existingIndex > -1) {
      const nextQty = basket[existingIndex].quantity + 1;
      if (nextQty > parseFloat(prod.quantity)) {
        Alert.error('Xəta', `Kifayət qədər stok yoxdur. Maksimum: ${parseFloat(prod.quantity)}`);
        return;
      }
      const newBasket = [...basket];
      newBasket[existingIndex].quantity = nextQty;
      setBasket(newBasket);
    } else {
      setBasket([...basket, {
        productId: prod.id,
        name: prod.name,
        quantity: 1,
        price: parseFloat(prod.unitPriceSale),
        maxStock: parseFloat(prod.quantity)
      }]);
    }
  };

  const updateQuantity = (productId, amount) => {
    const existingIndex = basket.findIndex(item => item.productId === productId);
    if (existingIndex === -1) return;

    const nextQty = basket[existingIndex].quantity + amount;
    if (nextQty <= 0) {
      setBasket(basket.filter(item => item.productId !== productId));
      return;
    }

    if (nextQty > basket[existingIndex].maxStock) {
      Alert.error('Xəta', `Kifayət qədər stok yoxdur. Maksimum: ${basket[existingIndex].maxStock}`);
      return;
    }

    const newBasket = [...basket];
    newBasket[existingIndex].quantity = nextQty;
    setBasket(newBasket);
  };

  const removeFromBasket = (productId) => {
    setBasket(basket.filter(item => item.productId !== productId));
  };

  const totalBasketAmount = useMemo(() => {
    return basket.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }, [basket]);

  const handleCompleteSale = async () => {
    if (basket.length === 0) {
      Alert.error('Xəta', 'Səbət boşdur');
      return;
    }

    try {
      Alert.loading('Satış tamamlanır...');
      const payload = {
        items: basket.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        paidAmount: paidAmount ? parseFloat(paidAmount) : totalBasketAmount,
        note: note
      };

      const res = await ismayilliApi.createSale(payload);
      if (res.success) {
        Alert.success('Uğurlu', 'Satış uğurla tamamlandı');
        setBasket([]);
        setPaidAmount('');
        setNote('');
        fetchData();
      }
    } catch (error) {
      Alert.close();
      Alert.error('Xəta', error.response?.data?.message || 'Satış zamanı xəta baş verdi');
    }
  };

  const isHeadAdmin = useMemo(() => {
    if (!user || !user.role) return false;
    const r = user.role.name?.toLowerCase();
    return r === 'superadmin' || (r === 'admin' && user.isBoss === true);
  }, [user]);

  const handleDeleteSale = async (saleId) => {
    if (!window.confirm('Bu satışı silmək və məhsulların stokunu geri bərpa etmək istədiyinizdən əminsiniz?')) {
      return;
    }

    try {
      Alert.loading('Satış tarixçəsi silinir...');
      const res = await ismayilliApi.deleteSale(saleId);
      if (res.success) {
        Alert.success('Uğurlu', 'Satış tarixçəsi silindi və stok bərpa olundu');
        fetchData();
      } else {
        Alert.error('Xəta', res.message || 'Satış silinərkən xəta baş verdi');
      }
    } catch (error) {
      console.error('Delete sale error:', error);
      Alert.error('Xəta', 'Server ilə əlaqə saxlanılarkən xəta baş verdi');
    }
  };

  const handleClearAllSales = async () => {
    if (!window.confirm('DİQQƏT! Bütün satış tarixçəsini silmək və məhsulların stokunu geri bərpa etmək istədiyinizdən tam əminsiniz? Bu əməliyyat geri qaytarıla bilməz!')) {
      return;
    }

    try {
      Alert.loading('Bütün satış tarixçəsi silinir...');
      const res = await ismayilliApi.deleteAllSales();
      if (res.success) {
        Alert.success('Uğurlu', 'Bütün satış tarixçəsi silindi və stoklar bərpa olundu');
        fetchData();
      } else {
        Alert.error('Xəta', res.message || 'Satışlar silinərkən xəta baş verdi');
      }
    } catch (error) {
      console.error('Clear all sales error:', error);
      Alert.error('Xəta', 'Server ilə əlaqə saxlanılarkən xəta baş verdi');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="text-purple-600 w-7 h-7" /> Satış Paneli (İsmayıllı)
          </h1>
          <p className="text-slate-500 text-sm mt-1">İsmayıllı mağazasında sürətli satış və fakturalar</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {isHeadAdmin && (
            <button
              onClick={handleClearAllSales}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 border border-red-200"
              title="Bütün Satış Tarixçəsini Sıfırla"
            >
              <Trash2 className="w-4 h-4" /> Tarixçəni Sıfırla
            </button>
          )}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'pos' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Sürətli Satış (POS)
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'history' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Satış Tarixçəsi
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Search & Selection (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2">
              <Search className="text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Məhsul adı və ya barkoduna görə axtarın..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full focus:outline-none text-slate-700 bg-transparent"
              />
            </div>

            {loading ? (
              <div className="bg-white p-12 text-center text-slate-500 rounded-2xl border border-slate-100">Yüklənir...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100">Stokda heç bir məhsul tapılmadı.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginatedPosProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addToBasket(p)}
                      className="bg-white p-4 rounded-xl border border-slate-100 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer flex justify-between items-center group"
                    >
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-purple-600 transition-colors">{p.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 font-mono">{p.barcode || 'Barkodsuz'}</p>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600 mt-2">
                          Stok: {parseFloat(p.quantity)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-purple-600 text-lg block">{parseFloat(p.unitPriceSale).toFixed(2)} AZN</span>
                        <span className="text-[10px] text-emerald-600">Alış: {parseFloat(p.unitPricePurchase).toFixed(2)} AZN</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* POS Pagination */}
                {filteredProducts.length > posItemsPerPage && (
                  <div className="bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center gap-4">
                    <div className="text-xs font-semibold text-slate-500">
                      Cəmi {filteredProducts.length} məhsul ({posPage}/{totalPosPages} səhifə)
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPosPage(prev => Math.max(prev - 1, 1))}
                        disabled={posPage === 1}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 font-bold text-xs transition-all"
                      >
                        Əvvəlki
                      </button>
                      <span className="px-3 text-xs font-bold text-slate-700">{posPage} / {totalPosPages}</span>
                      <button
                        onClick={() => setPosPage(prev => Math.min(prev + 1, totalPosPages))}
                        disabled={posPage === totalPosPages}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 font-bold text-xs transition-all"
                      >
                        Növbəti
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* POS Basket Card (Right 1 col) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-[600px]">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShoppingCart className="text-purple-600 w-5 h-5" /> Səbət ({basket.length})
            </h3>

            {/* Basket Items */}
            <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1 custom-scrollbar">
              {basket.length === 0 ? (
                <div className="text-center text-slate-400 py-12">Səbət boşdur</div>
              ) : (
                basket.map((item) => (
                  <div key={item.productId} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <div className="flex-1 min-w-0 pr-2">
                      <h5 className="font-semibold text-slate-800 text-sm truncate">{item.name}</h5>
                      <span className="text-xs text-purple-600 font-medium">{item.price.toFixed(2)} AZN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="p-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold text-slate-800 w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="p-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromBasket(item.productId)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Forms */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Ümumi Məbləğ:</span>
                <span className="text-xl font-bold text-purple-600">{totalBasketAmount.toFixed(2)} AZN</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Ödənilən Məbləğ (AZN)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder={totalBasketAmount.toFixed(2)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Qeyd (İstəyə bağlı)</label>
                <div className="relative">
                  <Notebook className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Qeydlər..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                onClick={handleCompleteSale}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-100"
              >
                Satışı Tamamla
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Yüklənir...</div>
          ) : sales.length === 0 ? (
            <div className="p-12 text-center text-slate-400">Heç bir satış tarixçəsi yoxdur.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tarix</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Məhsullar</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ümumi Məbləğ</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ödənilən</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Qeyd</th>
                      {isHeadAdmin && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Əməliyyat</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-sm text-slate-600">
                          {new Date(sale.createdAt).toLocaleString('az-AZ')}
                        </td>
                        <td className="p-4 text-sm">
                          <div className="space-y-1">
                            {sale.items.map((item, idx) => (
                              <div key={idx} className="text-slate-800 text-xs font-medium">
                                • {item.product?.name || 'Silinmiş Məhsul'} ({parseFloat(item.quantity)} ədəd × {parseFloat(item.pricePerItem).toFixed(2)} AZN)
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-sm font-bold text-purple-600">
                          {parseFloat(sale.totalAmount).toFixed(2)} AZN
                        </td>
                        <td className="p-4 text-sm font-semibold text-emerald-600">
                          {parseFloat(sale.paidAmount).toFixed(2)} AZN
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                          {sale.note || '-'}
                        </td>
                        {isHeadAdmin && (
                          <td className="p-4 text-sm text-right">
                            <button
                              onClick={() => handleDeleteSale(sale.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all"
                              title="Satışı Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Sales Pagination */}
              {sales.length > 0 && (
                <div className="bg-white px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-slate-500 font-medium">
                    Cəmi <span className="font-bold text-slate-800">{sales.length}</span> satışdan <span className="font-bold text-slate-800">{Math.min((historyPage - 1) * historyItemsPerPage + 1, sales.length)}-{Math.min(historyPage * historyItemsPerPage, sales.length)}</span> aralığı göstərilir
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                      disabled={historyPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent font-medium text-sm transition-all"
                    >
                      Əvvəlki
                    </button>
                    {Array.from({ length: Math.min(5, totalHistoryPages) }, (_, i) => {
                      let pageNum = historyPage;
                      if (historyPage <= 3) {
                        pageNum = i + 1;
                      } else if (historyPage >= totalHistoryPages - 2) {
                        pageNum = totalHistoryPages - 4 + i;
                      } else {
                        pageNum = historyPage - 2 + i;
                      }
                      if (pageNum < 1 || pageNum > totalHistoryPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setHistoryPage(pageNum)}
                          className={`w-9 h-9 rounded-lg font-bold text-sm transition-all ${historyPage === pageNum ? 'bg-purple-600 text-white shadow-md shadow-purple-100' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))}
                      disabled={historyPage === totalHistoryPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent font-medium text-sm transition-all"
                    >
                      Növbəti
                    </button>
                    <select
                      value={historyItemsPerPage}
                      onChange={(e) => {
                        setHistoryItemsPerPage(Number(e.target.value));
                        setHistoryPage(1);
                      }}
                      className="ml-2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    >
                      <option value={10}>10 / səhifə</option>
                      <option value={20}>20 / səhifə</option>
                      <option value={50}>50 / səhifə</option>
                      <option value={100}>100 / səhifə</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
