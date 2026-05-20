import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ismayilliApi } from '../../api';
import Alert from '../ui/Alert';
import { ArrowLeft } from 'lucide-react';
import IsmayilliReceiptModal from './IsmayilliReceiptModal';

export default function IsmayilliCheck() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const saleId = searchParams.get('id');

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSale = async () => {
      if (!saleId) {
        Alert.error('Xəta', 'Satış ID tələb olunur');
        navigate('/admin/ismayilli-sales');
        return;
      }

      try {
        setLoading(true);
        const res = await ismayilliApi.getSaleById(saleId);
        if (res.success && res.data) {
          setSale(res.data);
        } else {
          Alert.error('Xəta', 'Satış tapılmadı');
          navigate('/admin/ismayilli-sales');
        }
      } catch (error) {
        console.error('Ismayilli check fetch error:', error);
        Alert.error('Xəta', error.response?.data?.message || 'Satış yüklənərkən xəta baş verdi');
        navigate('/admin/ismayilli-sales');
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [saleId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-slate-600">Yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button
        type="button"
        onClick={() => navigate('/admin/ismayilli-sales')}
        className="mb-4 flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Geri
      </button>

      <IsmayilliReceiptModal
        isOpen={!!sale}
        sale={sale}
        type="sale"
        onClose={() => navigate('/admin/ismayilli-sales')}
      />
    </div>
  );
}
