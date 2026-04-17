import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Save, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Alert from '../ui/Alert';
import { branchApi } from '../../api';

export default function BranchForm() {
    const { t } = useTranslation('branch');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const branchId = searchParams.get('id');
    const isEdit = !!branchId;

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        isActive: true
    });
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isEdit) {
            const fetchBranch = async () => {
                setLoading(true);
                try {
                    const response = await branchApi.getById(branchId);
                    if (response.success) {
                        setFormData({
                            name: response.data.name || '',
                            address: response.data.address || '',
                            phone: response.data.phone || '',
                            isActive: response.data.isActive
                        });
                    }
                } catch (error) {
                    console.error('Error fetching branch:', error);
                    Alert.error(tAlert('error'), t('error_fetching_branch'));
                    navigate('/admin/branch-management');
                } finally {
                    setLoading(false);
                }
            };
            fetchBranch();
        }
    }, [isEdit, branchId, t, tAlert, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let response;
            if (isEdit) {
                response = await branchApi.update(branchId, formData);
            } else {
                response = await branchApi.create(formData);
            }

            if (response.success) {
                Alert.success(
                    tAlert('success'),
                    isEdit ? t('branch_updated_success') : t('branch_created_success')
                );
                navigate('/admin/branch-management');
            }
        } catch (error) {
            console.error('Error saving branch:', error);
            Alert.error(
                tAlert('error'),
                error.response?.data?.message || t('error_saving_branch')
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-center">{t('loading')}</div>;
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <button
                onClick={() => navigate('/admin/branch-management')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                {t('back_to_list') || 'Siyahıya qayıt'}
            </button>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">
                                {isEdit ? t('edit_branch') || 'Filialı Redaktə Et' : t('add_branch') || 'Yeni Filial Əlavə Et'}
                            </h1>
                            <p className="text-blue-100 opacity-90">
                                {isEdit ? t('edit_branch_desc') : t('add_branch_desc') || 'Filial məlumatlarını doldurun'}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        {/* Branch Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('branch_name') || 'Filial Adı'} *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                placeholder={t('enter_branch_name') || 'Filialın adını daxil edin'}
                            />
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('address') || 'Ünvan'}
                            </label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                placeholder={t('enter_address') || 'Filialın ünvanını daxil edin'}
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('phone') || 'Telefon'}
                            </label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                placeholder={t('enter_phone') || 'Telefon nömrəsini daxil edin'}
                            />
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                                {t('branch_is_active') || 'Filial aktivdir'}
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/branch-management')}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all"
                        >
                            {t('cancel') || 'Ləğv Et'}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
                        >
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    {isEdit ? t('update') || 'Yenilə' : t('save') || 'Yadda Saxla'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
