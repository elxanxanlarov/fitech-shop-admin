import { useState, useEffect, useMemo } from 'react';
import { ismayilliApi } from '../../api';
import Alert from '../ui/Alert';
import { Plus, Edit, Trash2, Tag, ShoppingCart, Barcode, DollarSign, Layers, Upload, FileSpreadsheet, QrCode, History, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import IsmayilliStockHistoryModal from './IsmayilliStockHistoryModal';

export default function IsmayilliProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState('adjustment');
  const [editingProduct, setEditingProduct] = useState(null);

  // Excel upload states
  const [excelFile, setExcelFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Bulk selection states
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Forms
  const [productForm, setProductForm] = useState({
    name: '',
    barcode: '',
    quantity: '0',
    unitPricePurchase: '0',
    unitPriceSale: '0',
    categoryId: ''
  });
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const prodRes = await ismayilliApi.getAllProducts();
      const catRes = await ismayilliApi.getAllCategories();
      if (prodRes.success) setProducts(prodRes.data);
      if (catRes.success) setCategories(catRes.data);
    } catch (error) {
      console.error('Fetch data error:', error);
      Alert.error('Xəta', 'Məlumatlar yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      barcode: '',
      quantity: '0',
      unitPricePurchase: '0',
      unitPriceSale: '0',
      categoryId: categories[0]?.id || '',
      excelId: ''
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      barcode: prod.barcode || '',
      quantity: prod.quantity?.toString() || '0',
      unitPricePurchase: prod.unitPricePurchase?.toString() || '0',
      unitPriceSale: prod.unitPriceSale?.toString() || '0',
      categoryId: prod.categoryId
    });
    setIsProductModalOpen(true);
  };

  const handleGenerateAndPrint = async (prod) => {
    // If product has barcode, directly navigate
    if (prod.barcode) {
      navigate('/admin/ismayilli-barcode-generator', { state: { selectedBarcode: prod.barcode } });
      return;
    }

    // Generate barcode if not exists
    try {
      Alert.loading('Barkod yaradılır...');
      const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const newBarcode = `2000006${randomPart}`;

      const payload = { ...prod, barcode: newBarcode };

      const res = await ismayilliApi.updateProduct(prod.id, payload);

      if (res.success) {
        Alert.success('Uğurlu', 'Barkod yaradıldı, Çap səhifəsinə yönləndirilir...');
        fetchData(); // background refresh
        setTimeout(() => {
          navigate('/admin/ismayilli-barcode-generator', { state: { selectedBarcode: newBarcode } });
        }, 1000);
      }
    } catch (err) {
      Alert.error('Xəta', 'Barkod yaradılarkən xəta baş verdi');
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.categoryId) {
      Alert.error('Xəta', 'Ad və Kateqoriya sahələri məcburidir');
      return;
    }

    try {
      Alert.loading('Saxlanılır...');
      let res;
      if (editingProduct) {
        res = await ismayilliApi.updateProduct(editingProduct.id, productForm);
      } else {
        res = await ismayilliApi.createProduct(productForm);
      }

      if (res.success) {
        Alert.success('Uğurlu', editingProduct ? 'Məhsul yeniləndi' : 'Məhsul yaradıldı');
        setIsProductModalOpen(false);
        fetchData();
      }
    } catch (error) {
      Alert.close();
      Alert.error('Xəta', error.response?.data?.message || 'Əməliyyat zamanı xəta baş verdi');
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      Alert.loading('Yaradılır...');
      const res = await ismayilliApi.createCategory({ name: categoryName });
      if (res.success) {
        Alert.success('Uğurlu', 'Kateqoriya yaradıldı');
        setCategoryName('');
        setIsCategoryModalOpen(false);
        fetchData();
      }
    } catch (error) {
      Alert.close();
      Alert.error('Xəta', error.response?.data?.message || 'Əməliyyat zamanı xəta baş verdi');
    }
  };

  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      Alert.error('Xəta', 'Zəhmət olmasa bir Excel faylı seçin');
      return;
    }

    const formData = new FormData();
    formData.append('file', excelFile);

    setUploading(true);
    try {
      Alert.loading('Məlumatlar emal olunur, zəhmət olmasa gözləyin...');
      const res = await ismayilliApi.importExcel(formData);
      if (res.success) {
        Alert.success('Uğurlu', res.message || 'Məhsullar uğurla idxal edildi!');
        setIsExcelModalOpen(false);
        setExcelFile(null);
        fetchData();
      }
    } catch (error) {
      console.error('Excel upload error:', error);
      Alert.close();
      Alert.error('Xəta', error.response?.data?.message || 'Fayl oxunarkən xəta baş verdi. Formatı yoxlayın.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    const confirm = await Alert.confirm('Silməyə əminsiniz?', 'Bu məhsul tamamilə silinəcəkdir.');
    if (!confirm.isConfirmed) return;

    try {
      Alert.loading('Silinir...');
      const res = await ismayilliApi.deleteProduct(id);
      if (res.success) {
        Alert.success('Uğurlu', 'Məhsul silindi');
        setSelectedProductIds(prev => prev.filter(x => x !== id));
        fetchData();
      }
    } catch (error) {
      Alert.close();
      Alert.error('Xəta', 'Silinmə zamanı xəta baş verdi');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const visibleIds = filteredProducts.map(p => p.id);
      setSelectedProductIds(visibleIds);
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedProductIds(prev => [...prev, id]);
    } else {
      setSelectedProductIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    const confirm = await Alert.confirm(
      'Seçilənləri silmək istəyirsiniz?',
      `Seçilmiş ${selectedProductIds.length} məhsul tamamilə silinəcəkdir.`
    );
    if (!confirm.isConfirmed) return;

    try {
      Alert.loading('Silinir...');
      const res = await ismayilliApi.bulkDeleteProducts(selectedProductIds);
      if (res.success) {
        Alert.success('Uğurlu', res.message || 'Seçilmiş məhsullar silindi');
        setSelectedProductIds([]);
        fetchData();
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      Alert.close();
      Alert.error('Xəta', 'Silinmə zamanı xəta baş verdi');
    }
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const query = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );
  }, [products, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="text-purple-600 w-7 h-7" /> Məhsullar (İsmayıllı)
          </h1>
          <p className="text-slate-500 text-sm mt-1">İsmayıllı mağazasının məhsul bazasının idarə edilməsi</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold"
          >
            <Tag className="w-4 h-4 text-purple-600" /> Yeni Kateqoriya
          </button>
          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all font-semibold shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel Yüklə
          </button>
          <button
            onClick={handleOpenAddProduct}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold shadow-md shadow-purple-100"
          >
            <Plus className="w-4 h-4" /> Yeni Məhsul
          </button>
        </div>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Məhsul adı və ya barkoduna görə axtar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
        />
        {selectedProductIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold shadow-md shadow-red-100"
          >
            <Trash2 className="w-4 h-4" /> Seçilənləri Sil ({selectedProductIds.length})
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Məlumatlar yüklənir...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Heç bir məhsul tapılmadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Məhsul</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Barkod</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kateqoriya</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stok Miqdarı</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Alış Qiyməti</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Satış Qiyməti</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm w-12">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={(e) => handleSelectOne(p.id, e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-900">{p.name}</td>
                    <td className="p-4 text-sm text-slate-500 font-mono">{p.barcode || '-'}</td>
                    <td className="p-4 text-sm">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                        {p.category?.name || '-'}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-800">{parseFloat(p.quantity)}</td>
                    <td className="p-4 text-sm font-medium text-emerald-600">{parseFloat(p.unitPricePurchase).toFixed(2)} AZN</td>
                    <td className="p-4 text-sm font-bold text-blue-600">{parseFloat(p.unitPriceSale).toFixed(2)} AZN</td>
                    <td className="p-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGenerateAndPrint(p)}
                          className="p-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-all"
                          title="Ştrixkod Çap Et"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all"
                          title="Redaktə et"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition-all"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Component */}
        {!loading && filteredProducts.length > 0 && (
          <div className="bg-white px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-slate-500 font-medium">
              Cəmi <span className="font-bold text-slate-800">{filteredProducts.length}</span> məhsuldan <span className="font-bold text-slate-800">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredProducts.length)}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> aralığı göstərilir
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent font-medium text-sm transition-all"
              >
                Əvvəlki
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = currentPage;
                if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                if (pageNum < 1 || pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 rounded-lg font-bold text-sm transition-all ${currentPage === pageNum ? 'bg-purple-600 text-white shadow-md shadow-purple-100' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent font-medium text-sm transition-all"
              >
                Növbəti
              </button>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="ml-2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              >
                <option value={20}>20 / səhifə</option>
                <option value={50}>50 / səhifə</option>
                <option value={100}>100 / səhifə</option>
                <option value={200}>200 / səhifə</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <ShoppingCart className="text-purple-600" /> {editingProduct ? 'Məhsulu Redaktə Et' : 'Yeni Məhsul Əlavə Et'}
                </h3>
                <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
              </div>
              
              {editingProduct && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryTab('adjustment');
                      setIsHistoryModalOpen(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm font-semibold bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Package className="w-4 h-4" /> Stok Tənzimləməsi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryTab('movements');
                      setIsHistoryModalOpen(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm font-semibold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <History className="w-4 h-4" /> Stok Tarixçəsi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryTab('sales');
                      setIsHistoryModalOpen(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm font-semibold bg-amber-50 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4" /> Satış Tarixçəsi
                  </button>
                </div>
              )}
            </div>
            <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Barkod</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Barcode className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={productForm.barcode}
                        onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Ştrixkod daxil edin və ya yaradın"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                        setProductForm(prev => ({ ...prev, barcode: `2000006${randomPart}` }));
                      }}
                      className="px-4 py-2 bg-purple-100 text-purple-700 font-bold text-sm rounded-lg hover:bg-purple-200 transition-colors whitespace-nowrap"
                    >
                      Avtomat Yarat
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Məhsulun Adı <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Məs. Köynək M ölçü"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Stok Miqdarı</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.quantity}
                    onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Alış Qiyməti</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.unitPricePurchase}
                    onChange={(e) => setProductForm({ ...productForm, unitPricePurchase: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Satış Qiyməti</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.unitPriceSale}
                    onChange={(e) => setProductForm({ ...productForm, unitPriceSale: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Kateqoriya <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Layers className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Ləğv Et
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold shadow-md shadow-purple-100"
                >
                  Yadda Saxla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Tag className="text-purple-600" /> Yeni Kateqoriya
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Kateqoriya Adı <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Məs. GEYİM"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Ləğv Et
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold shadow-md shadow-purple-100"
                >
                  Yarat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" /> Excel İdxalı (İsmayıllı)
              </h3>
              <button onClick={() => setIsExcelModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleExcelUpload} className="p-6 space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-400 transition-all bg-slate-50/50 flex flex-col items-center justify-center space-y-3">
                <Upload className="w-10 h-10 text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Excel faylını seçin</p>
                  <p className="text-xs text-slate-400 mt-1">Dəstəklənən formatlar: .xlsx, .xls</p>
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  required
                  onChange={(e) => setExcelFile(e.target.files[0])}
                  className="hidden"
                  id="excelFileInput"
                />
                <label
                  htmlFor="excelFileInput"
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
                >
                  Fayl Seçin
                </label>
                {excelFile && (
                  <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-2 max-w-full">
                    <span className="truncate">{excelFile.name}</span>
                    <button type="button" onClick={() => setExcelFile(null)} className="text-slate-400 hover:text-red-500 font-bold">✕</button>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 space-y-1">
                <p className="font-bold">⚠️ Vacib qeyd:</p>
                <p>• Excel faylındakı sütun başlıqları avtomatik tanınır.</p>
                <p>• Kateqoriya adları (məsələn, <b>Geyim, Ətir, Xırdavat</b>) qalın başlıqlı sətirlərdən və ya Kateqoriya sütunundan oxunaraq avtomatik yaradılacaqdır.</p>
                <p>• Eyni ştrihkoda malik məhsullar təkrar yükləndikdə qiymət və stok miqdarı yenilənəcəkdir.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExcelModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                  disabled={uploading}
                >
                  Ləğv Et
                </button>
                <button
                  type="submit"
                  disabled={uploading || !excelFile}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold shadow-md shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Yüklənir...' : 'İdxal Et'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History & Management Modal */}
      <IsmayilliStockHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => {
            setIsHistoryModalOpen(false);
            fetchData(); // Refresh data to get latest stock if adjusted
        }} 
        productId={editingProduct?.id} 
        product={editingProduct} 
        initialTab={historyTab} 
      />
    </div>
  );
}
