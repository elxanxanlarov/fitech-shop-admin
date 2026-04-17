import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Building2, AlertTriangle, CheckCircle2, ArrowLeft, Database, Search } from 'lucide-react';
import { branchApi } from '../api';
import Alert from '../components/ui/Alert';

export default function SyncCenter() {
    const { t } = useTranslation('sync');
    const { t: tCommon } = useTranslation('common');
    const navigate = useNavigate();

    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [syncResult, setSyncResult] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await branchApi.getAll();
                if (response.success) {
                    setBranches(response.data);
                }
            } catch (error) {
                console.error('Error fetching branches:', error);
                Alert.error('Xəta!', 'Filiallar yüklənərkən xəta baş verdi');
            } finally {
                setPageLoading(false);
            }
        };
        fetchBranches();
    }, []);

    const handleSync = async () => {
        if (!selectedBranch) {
            Alert.warning('Diqqət!', 'Zəhmət olmasa sinxronizasiya üçün filial seçin');
            return;
        }

        const branch = branches.find(b => b.id === selectedBranch);

        Alert.confirm(
            'Sinxronizasiya Təsdiqi',
            `"${branch.name}" filialının stok məlumatları mərkəz bazasındakı məlumatlarla əvəz ediləcək. Bu əməliyyat geri qaytarıla bilməz. Davam edilsin?`,
            async () => {
                setLoading(true);
                setSyncResult(null);
                try {
                    const response = await branchApi.syncWithCentral(selectedBranch);
                    if (response.success) {
                        setSyncResult({
                            success: true,
                            message: response.message || 'Sinxronizasiya uğurla tamamlandı',
                            count: response.syncedCount
                        });
                        Alert.success('Uğurlu!', response.message);
                    } else {
                        setSyncResult({
                            success: false,
                            message: response.message || 'Sinxronizasiya zamanı xəta baş verdi'
                        });
                        Alert.error('Xəta!', response.message);
                    }
                } catch (error) {
                    console.error('Sync error:', error);
                    setSyncResult({
                        success: false,
                        message: 'Sinxronizasiya zamanı gözlənilməz xəta baş verdi'
                    });
                    Alert.error('Xəta!', 'Sinxronizasiya zamanı xəta baş verdi');
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const filteredBranches = branches.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (pageLoading) {
        return (
            <div className="p-6 flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <button
                    onClick={() => navigate('/admin/settings')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Tənzimləmələrə qayıt
                </button>
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-inner">
                        <RefreshCw className={`w-8 h-8 ${loading ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">Mərkəzi Sinxronizasiya</h1>
                        <p className="text-gray-500">Mərkəzi bazadakı bütün məhsul və stok məlumatlarını seçilmiş filiala köçürün.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Sol tərəf: Seçim Paneli */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-500" />
                                Filial Seçimi
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Filial axtar..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredBranches.map((branch) => (
                                    <div
                                        key={branch.id}
                                        onClick={() => setSelectedBranch(branch.id)}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${selectedBranch === branch.id
                                            ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-200'
                                            : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${selectedBranch === branch.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${selectedBranch === branch.id ? 'text-blue-900' : 'text-gray-900'}`}>{branch.name}</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">İD: ...{branch.id.slice(-8)}</p>
                                        </div>
                                        {selectedBranch === branch.id && (
                                            <CheckCircle2 className="w-5 h-5 text-blue-600 ml-auto" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-50 rounded-3xl p-6 border border-yellow-100 flex items-start gap-4">
                        <div className="p-2 bg-yellow-100 text-yellow-600 rounded-xl">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-yellow-900 mb-1">Vacib Qeyd!</h3>
                            <p className="text-sm text-yellow-800 leading-relaxed">
                                Bu əməliyyat seçilmiş filialdakı mövcud stok məlumatlarını tamamilə silir və mərkəz anbardakı dəyərlərlə (miqdar, qutu sayı və s.) əvəz edir. Əməliyyat təxminən 5-10 saniyə çəkə bilər.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sağ tərəf: İdarəetmə və Nəticə */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-6 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <Database className="w-10 h-10 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Sinxronizasiya</h3>
                        <p className="text-sm text-gray-500 mb-8">
                            Seçilmiş filiala bütün məlumatları bir kliklə kopyalayın.
                        </p>

                        <button
                            onClick={handleSync}
                            disabled={loading || !selectedBranch}
                            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${loading || !selectedBranch
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-blue-200'
                                }`}
                        >
                            {loading ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-5 h-5" />
                            )}
                            {loading ? 'İşlənilir...' : 'İndi Başlat'}
                        </button>
                    </div>

                    {syncResult && (
                        <div className={`rounded-3xl p-6 shadow-lg transform transition-all animate-in fade-in slide-in-from-bottom-5 border ${syncResult.success
                            ? 'bg-green-50 border-green-100 text-green-900'
                            : 'bg-red-50 border-red-100 text-red-900'
                            }`}>
                            <div className="flex items-center gap-3 mb-3">
                                {syncResult.success ? (
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                ) : (
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                )}
                                <h4 className="font-bold">{syncResult.success ? 'Uğurlu Nəticə' : 'Xəta Baş Verdi'}</h4>
                            </div>
                            <p className="text-sm opacity-90 leading-relaxed mb-4">
                                {syncResult.message}
                            </p>
                            {syncResult.count && (
                                <div className="bg-green-100/50 p-3 rounded-xl border border-green-200">
                                    <span className="text-xs font-bold uppercase tracking-wider text-green-700 block mb-1">Yenilənən Məhsul</span>
                                    <span className="text-2xl font-black text-green-800">{syncResult.count}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
