import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import Input from '../ui/Input';
import { creditTermApi } from '../../api';
import { Edit, Trash2, Plus, Save, X } from 'lucide-react';
import { MdAttachMoney, MdCalendarToday } from 'react-icons/md';

export default function CreditTermManagement() {
    const { t } = useTranslation('sale');
    const { t: tAlert } = useTranslation('alert');
    const { t: tSettings } = useTranslation('settings');
    const [creditTerms, setCreditTerms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        months: '',
        interestRate: '',
        description: '',
        isActive: true
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchCreditTerms();
    }, []);

    const fetchCreditTerms = async () => {
        try {
            setLoading(true);
            const response = await creditTermApi.getAll();
            if (response.success && response.date) {
                setCreditTerms(response.date);
            }
        } catch (error) {
            console.error('Error fetching credit terms:', error);
            Alert.error(tAlert('error') || 'Xəta!', tAlert('error_text') || 'Məlumat alınarkən xəta baş verdi');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.months || parseInt(formData.months) <= 0) {
            newErrors.months = t('months_required') || 'Müddət (ay) tələb olunur və 0-dan böyük olmalıdır';
        }
        
        if (!formData.interestRate || parseFloat(formData.interestRate) < 0) {
            newErrors.interestRate = t('interest_rate_required') || 'Faiz tələb olunur və mənfi ola bilməz';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            if (editingId) {
                await creditTermApi.update(editingId, formData);
                Alert.success(tAlert('update_success') || 'Uğurlu!', tAlert('update_success_text') || 'Kredit müddəti uğurla yeniləndi');
            } else {
                await creditTermApi.create(formData);
                Alert.success(tAlert('add_success') || 'Uğurlu!', tAlert('add_success_text') || 'Kredit müddəti uğurla əlavə edildi');
            }
            
            setShowForm(false);
            setEditingId(null);
            setFormData({ months: '', interestRate: '', description: '', isActive: true });
            fetchCreditTerms();
        } catch (error) {
            console.error('Error saving credit term:', error);
            Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || tAlert('error_text') || 'Xəta baş verdi');
        }
    };

    const handleEdit = (term) => {
        setEditingId(term.id);
        setFormData({
            months: term.months.toString(),
            interestRate: parseFloat(term.interestRate).toString(),
            description: term.description || '',
            isActive: term.isActive
        });
        setShowForm(true);
    };

    const handleDelete = async (term) => {
        const result = await Alert.confirm(
            tAlert('delete_confirm') || 'Silmək istədiyinizə əminsiniz?',
            `${tAlert('delete_confirm_text') || 'Bu kredit müddətini silmək istədiyinizə əminsiniz?'} ${term.months} ${t('months') || 'ay'} - ${parseFloat(term.interestRate).toFixed(1)}%?`,
            { confirmText: tAlert('yes') || 'Bəli', cancelText: tAlert('no') || 'Xeyr', confirmColor: '#EF4444', cancelColor: '#6B7280' }
        );
        
        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading') || 'Yüklənir...');
                await creditTermApi.delete(term.id);
                setCreditTerms(prev => prev.filter(item => item.id !== term.id));
                Alert.close();
                setTimeout(() => { Alert.success(tAlert('delete_success') || 'Uğurlu!', tAlert('delete_success_text') || 'Kredit müddəti silindi'); }, 100);
            } catch (error) {
                Alert.close();
                setTimeout(() => { Alert.error(tAlert('error') || 'Xəta!', error.response?.data?.message || tAlert('error_text') || 'Xəta baş verdi'); }, 100);
            }
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ months: '', interestRate: '', description: '', isActive: true });
        setErrors({});
    };

    const columns = [
        {
            key: 'months',
            label: t('months') || 'Müddət (ay)',
            render: (value) => (
                <div className="flex items-center">
                    <MdCalendarToday className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">{value} {t('months') || 'ay'}</span>
                </div>
            )
        },
        {
            key: 'interestRate',
            label: t('interest_rate') || 'Faiz',
            render: (value) => (
                <div className="flex items-center">
                    <MdAttachMoney className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-semibold text-purple-600">{parseFloat(value).toFixed(1)}%</span>
                </div>
            )
        },
        {
            key: 'description',
            label: t('description') || 'Təsvir',
            render: (value) => <span className="text-sm text-gray-600">{value || '-'}</span>
        },
        {
            key: 'isActive',
            label: t('status') || 'Status',
            render: (value) => (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                    {value ? (t('active') || 'Aktiv') : (t('inactive') || 'Qeyri-aktiv')}
                </span>
            )
        }
    ];

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{tSettings('credit_term_management') || 'Kredit Müddətləri İdarəetməsi'}</h1>
                    <p className="text-gray-600">{tSettings('credit_term_management_desc') || 'Kredit müddətlərini və faizləri idarə edin'}</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('add_credit_term') || 'Kredit Müddəti Əlavə Et'}
                    </button>
                )}
            </div>

            {showForm && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {editingId ? (t('edit_credit_term') || 'Kredit Müddətini Redaktə Et') : (t('add_credit_term') || 'Yeni Kredit Müddəti')}
                        </h3>
                        <button
                            onClick={handleCancel}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label={t('months') || 'Müddət (ay)'}
                                type="number"
                                min="1"
                                value={formData.months}
                                onChange={(e) => handleInputChange('months', e.target.value)}
                                error={errors.months}
                                placeholder={t('enter_months') || 'Müddət daxil edin (məs: 3)'}
                                required
                            />

                            <Input
                                label={t('interest_rate') || 'Faiz (%)'}
                                type="number"
                                step="0.1"
                                min="0"
                                value={formData.interestRate}
                                onChange={(e) => handleInputChange('interestRate', e.target.value)}
                                error={errors.interestRate}
                                placeholder={t('enter_interest_rate') || 'Faiz daxil edin (məs: 5.3)'}
                                required
                            />
                        </div>

                        <Input
                            label={t('description') || 'Təsvir'}
                            type="text"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder={t('description_placeholder') || "Təsvir (istəyə bağlı, məs: '3 ay üçün - 5,3%')"}
                        />

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isActive" className="text-sm text-gray-700">
                                {t('active') || 'Aktiv'}
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                {editingId ? (t('update') || 'Yenilə') : (t('create') || 'Yarat')}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                {t('cancel') || 'Ləğv et'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <TableTemplate
                data={creditTerms}
                columns={columns}
                title={t('credit_terms') || 'Kredit Müddətləri'}
                onEdit={handleEdit}
                onDelete={handleDelete}
                showBulkActions={false}
                showFilters={false}
                showSearch={false}
                showDateFilter={false}
                loading={loading}
                emptyState={{
                    icon: 'calendar',
                    title: t('no_credit_terms') || 'Kredit müddəti tapılmadı',
                    description: t('no_credit_terms_description') || 'Hələ heç bir kredit müddəti əlavə edilməyib',
                    actionText: t('add_first_credit_term') || 'İlk kredit müddətini əlavə et',
                    onAction: () => setShowForm(true),
                    showAction: true
                }}
            />
        </div>
    );
}

