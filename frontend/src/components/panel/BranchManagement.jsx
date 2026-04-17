import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Alert from '../ui/Alert';
import { Plus, Building2, Package, MapPin, Phone, ArrowLeft, ChevronRight, Warehouse } from 'lucide-react';
import { branchApi } from '../../api';

export default function BranchManagement() {
    const { t } = useTranslation('branch');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const [branchData, setBranchData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBranches = useCallback(async () => {
        setLoading(true);
        try {
            const response = await branchApi.getAll();
            if (response.success && response.data) {
                setBranchData(response.data);
            } else {
                setBranchData([]);
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
            Alert.error(tAlert('error') || 'Xəta!', t('error_fetching') || 'Filiallar alınarkən xəta baş verdi');
            setBranchData([]);
        } finally {
            setLoading(false);
        }
    }, [t, tAlert]);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    const handleAddBranch = () => {
        navigate('/admin/branch-form');
    };

    const handleBranchClick = (branchId) => {
        navigate(`/admin/branch-detail?id=${branchId}`);
    };

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/admin/settings')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 transition-colors text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('back_to_settings') || 'Tənzimləmələrə qayıt'}
                    </button>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <Building2 className="w-10 h-10 text-blue-600" />
                        {t('branch_management') || 'Filial İdarəetməsi'}
                    </h1>
                    <p className="text-gray-500 mt-1 max-w-xl">
                        {t('manage_branches_desc') || 'Filialları yaradın, redaktə edin və onlara stok göndərin.'}
                    </p>
                </div>
                <button
                    onClick={handleAddBranch}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-bold"
                >
                    <Plus className="w-5 h-5" />
                    {t('add_branch') || 'Yeni Filial Əlavə Et'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Baza (Central Warehouse) Card */}
                <div
                    onClick={() => navigate('/admin/central-warehouse')}
                    className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-indigo-300 transition-all cursor-pointer group flex flex-col h-full border border-indigo-500"
                >

                    <div className="p-6 flex-1">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform backdrop-blur-sm">
                                <Warehouse className="w-8 h-8 text-white" />
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-sm">
                                Mərkəz
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Baza</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-indigo-100 text-sm">
                                <Package className="w-4 h-4 text-indigo-200 shrink-0" />
                                <span>Mərkəz Anbar</span>
                            </div>
                            <div className="flex items-center gap-2 text-indigo-100 text-sm">
                                <Building2 className="w-4 h-4 text-indigo-200 shrink-0" />
                                <span>Bütün filiallar üçün əsas stok</span>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-white/10 border-t border-white/20 rounded-b-2xl flex items-center justify-between backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                        <div className="flex items-center gap-2 text-white/80 text-sm font-semibold">
                            <Package className="w-4 h-4" />
                            Stok Göndər
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </div>

                {/* Branch Cards */}
                {branchData.map((branch) => (
                    <div
                        key={branch.id}
                        onClick={() => handleBranchClick(branch.id)}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group flex flex-col h-full"
                    >
                        <div className="p-6 flex-1">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl ${branch.isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'} group-hover:scale-110 transition-transform`}>
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${branch.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                    }`}>
                                    {branch.isActive ? (t('active') || 'Aktiv') : (t('inactive') || 'Passiv')}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {branch.name}
                            </h3>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                    <span className="line-clamp-1">{branch.address || '-'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                                    <span>{branch.phone || '-'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 rounded-b-2xl flex items-center justify-between group-hover:bg-blue-50/50 transition-colors">
                            <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-gray-400" />
                                <div>
                                    <span className="text-sm font-bold text-gray-900">{branch._count?.stocks || 0}</span>
                                    <span className="text-xs text-gray-500 ml-1">{t('products') || 'Məhsul'}</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
