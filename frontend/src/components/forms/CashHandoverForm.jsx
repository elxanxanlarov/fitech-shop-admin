import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import { MdAttachMoney, MdDescription, MdArrowBack, MdEvent, MdPerson } from 'react-icons/md';
import { cashHandoverApi, staffApi } from '../../api';
import { createInputChangeHandler, validateNumberInput } from '../../utils/validation';

export default function CashHandoverForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const { t } = useTranslation('cashHandover');
    const { t: tAlert } = useTranslation('alert');

    const isAdmin = location.pathname.includes('/admin');
    const cashHandoverPagePath = isAdmin ? '/admin/cash-handover' : '/reception/cash-handover';
    const isEditMode = !!id;
    
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        handedOverToId: '',
        handedOverById: '',
        note: ''
    });
    
    const [staffList, setStaffList] = useState([]);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [initialFormData, setInitialFormData] = useState(null);

    // Fetch staff list
    useEffect(() => {
        const fetchStaff = async () => {
            setLoadingStaff(true);
            try {
                const response = await staffApi.getAll();
                if (response.success && response.date) {
                    setStaffList(response.date.filter(staff => staff.isActive));
                }
            } catch (error) {
                console.error('Error fetching staff:', error);
            } finally {
                setLoadingStaff(false);
            }
        };
        fetchStaff();
    }, []);

    // Fetch cash handover data (if edit mode)
    useEffect(() => {
        const fetchCashHandover = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const response = await cashHandoverApi.getById(id);
                    if (response.success && response.date) {
                        const cashHandover = response.date;
                        const initialData = {
                            date: cashHandover.date ? new Date(cashHandover.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                            amount: cashHandover.amount?.toString() || '',
                            handedOverToId: cashHandover.handedOverToId || '',
                            handedOverById: cashHandover.handedOverById || '',
                            note: cashHandover.note || ''
                        };
                        setFormData(initialData);
                        setInitialFormData(initialData);
                    }
                } catch (error) {
                    console.error('Error fetching cash handover:', error);
                    Alert.error(t('error_fetching') || 'Xəta!', t('error_fetching_text') || 'Məbləğ təslimi məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchCashHandover();
    }, [id, isEditMode, t]);

    const validateForm = () => {
        const newErrors = {};
    
        // Məbləğ
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            newErrors.amount = t('amount_required') || 'Məbləğ tələb olunur və 0-dan böyük olmalıdır';
        }
    
        // Kimə təslim edildi
        if (!formData.handedOverToId) {
            newErrors.handedOverToId = t('handed_over_to_required') || 'Kimə təslim edildiyi seçilməlidir';
        }
    
        // Kim təslim etdi
        if (!formData.handedOverById) {
            newErrors.handedOverById = t('handed_over_by_required') || 'Kim təslim etdiyi seçilməlidir';
        }
    
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Number fields
    const numberFields = ['amount'];
    
    const handleInputChange = createInputChangeHandler(
        setFormData,
        setErrors,
        errors,
        numberFields,
        t
    );

    // Check if form has changed (only in edit mode)
    const hasFormChanged = () => {
        if (!isEditMode || !initialFormData) return true; // Always allow submit in create mode
        
        // Compare form data with initial data
        const currentData = {
            date: formData.date,
            amount: formData.amount?.toString() || '',
            handedOverToId: formData.handedOverToId || '',
            handedOverById: formData.handedOverById || '',
            note: formData.note?.trim() || ''
        };
        
        const initial = {
            date: initialFormData.date,
            amount: initialFormData.amount?.toString() || '',
            handedOverToId: initialFormData.handedOverToId || '',
            handedOverById: initialFormData.handedOverById || '',
            note: initialFormData.note?.trim() || ''
        };
        
        // Check if any field has changed
        const hasChanged = JSON.stringify(currentData) !== JSON.stringify(initial);
        return hasChanged;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        // In edit mode, check if form has changed
        if (isEditMode && !hasFormChanged()) {
            Alert.info(t('no_changes') || 'Xəbərdarlıq', t('no_changes_text') || 'Formda heç bir dəyişiklik edilməyib');
            return;
        }
        
        setIsLoading(true);
        
        try {
            const payload = {
                date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
                amount: parseFloat(formData.amount),
                handedOverToId: formData.handedOverToId,
                handedOverById: formData.handedOverById,
                note: formData.note?.trim() || null
            };

            if (isEditMode) {
                await cashHandoverApi.update(id.toString(), payload);
                Alert.success(t('update_success') || 'Uğurlu!', t('update_success_text') || 'Məbləğ təslimi məlumatları uğurla yeniləndi');
            } else {
                await cashHandoverApi.create(payload);
                Alert.success(t('add_success') || 'Uğurlu!', t('add_success_text') || 'Məbləğ təslimi uğurla əlavə edildi');
            }
            
            setTimeout(() => {
                navigate(cashHandoverPagePath);
            }, 1500);
            
        } catch (error) {
            console.error('Cash handover operation error:', error);
            Alert.error(
                tAlert('error') || 'Xəta!',
                error.response?.data?.message || tAlert('error_text') || 'Əməliyyat zamanı xəta baş verdi'
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && isEditMode) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('loading') || 'Yüklənir...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate(cashHandoverPagePath)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={t('back') || 'Geri'}
                >
                    <MdArrowBack className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? (t('edit_cash_handover') || 'Məbləğ Təslimi Redaktə Et') : (t('add_cash_handover') || 'Yeni Məbləğ Təslimi')}
                    </h1>
                    <p className="text-gray-600">
                        {isEditMode ? (t('edit_cash_handover_description') || 'Məbləğ təslimi məlumatlarını yeniləyin') : (t('add_cash_handover_description') || 'Yeni məbləğ təslimi əlavə edin')}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdAttachMoney className="inline w-5 h-5 mr-2" />
                        {t('basic_info') || 'Əsas Məlumatlar'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('date') || 'Tarix'} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <MdEvent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => handleInputChange('date', e.target.value)}
                                    disabled={isLoading}
                                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        errors.date ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    required
                                />
                            </div>
                            {errors.date && (
                                <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                            )}
                        </div>

                        <div>
                            <Input
                                label={t('amount') || 'Məbləğ'}
                                type="text"
                                value={formData.amount}
                                onChange={(e) => handleInputChange('amount', e.target.value)}
                                error={errors.amount}
                                placeholder="0.00"
                                icon={<MdAttachMoney />}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('handed_over_to') || 'Kimə təslim edildi'} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <MdPerson className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <select
                                    value={formData.handedOverToId}
                                    onChange={(e) => handleInputChange('handedOverToId', e.target.value)}
                                    disabled={isLoading || loadingStaff}
                                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        errors.handedOverToId ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    required
                                >
                                    <option value="">{t('select_staff') || 'İşçi seçin'}</option>
                                    {staffList.map(staff => (
                                        <option key={staff.id} value={staff.id}>
                                            {staff.name} {staff.surName || ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.handedOverToId && (
                                <p className="mt-1 text-sm text-red-600">{errors.handedOverToId}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('handed_over_by') || 'Kim təslim etdi'} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <MdPerson className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <select
                                    value={formData.handedOverById}
                                    onChange={(e) => handleInputChange('handedOverById', e.target.value)}
                                    disabled={isLoading || loadingStaff}
                                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        errors.handedOverById ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    required
                                >
                                    <option value="">{t('select_staff') || 'İşçi seçin'}</option>
                                    {staffList.map(staff => (
                                        <option key={staff.id} value={staff.id}>
                                            {staff.name} {staff.surName || ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.handedOverById && (
                                <p className="mt-1 text-sm text-red-600">{errors.handedOverById}</p>
                            )}
                        </div>
                        
                        <div className="md:col-span-2">
                            <Input
                                label={t('note') || 'Qeyd'}
                                type="text"
                                value={formData.note}
                                onChange={(e) => handleInputChange('note', e.target.value)}
                                error={errors.note}
                                placeholder={t('note_placeholder') || 'Qeyd daxil edin (istəyə bağlı)'}
                                icon={<MdDescription />}
                            />
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(cashHandoverPagePath)}
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('cancel') || 'Ləğv et'}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || (isEditMode && !hasFormChanged())}
                        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white mr-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isEditMode ? (t('updating') || 'Yenilənir...') : (t('adding') || 'Əlavə edilir...')}
                            </>
                        ) : (
                            isEditMode ? (t('update') || 'Yenilə') : (t('create') || 'Yarat')
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

