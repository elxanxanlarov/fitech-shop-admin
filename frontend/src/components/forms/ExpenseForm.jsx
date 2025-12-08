import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import { MdAttachMoney, MdDescription, MdArrowBack, MdCategory, MdEvent } from 'react-icons/md';
import { expenseApi } from '../../api';
import { createInputChangeHandler, validateNumberInput } from '../../utils/validation';

export default function ExpenseForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const { t } = useTranslation('expense');
    const { t: tAlert } = useTranslation('alert');

    const isAdmin = location.pathname.includes('/admin');
    const expensePagePath = isAdmin ? '/admin/expenses' : '/reception/expenses';
    const isEditMode = !!id;
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        note: ''
    });
    
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [initialFormData, setInitialFormData] = useState(null);

    // Expense categories
    const expenseCategories = [
        { value: 'yemek', label: t('category_food') || 'Yemək' },
        { value: 'nagliyyat', label: t('category_transport') || 'Nəqliyyat' },
        { value: 'kommunal', label: t('category_utilities') || 'Kommunal' },
        { value: 'ofis', label: t('category_office') || 'Ofis' },
        { value: 'reklam', label: t('category_advertising') || 'Reklam' },
        { value: 'digər', label: t('category_other') || 'Digər' },
    ];

    // Fetch expense data (if edit mode)
    useEffect(() => {
        const fetchExpense = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const response = await expenseApi.getById(id);
                    if (response.success && response.date) {
                        const expense = response.date;
                        const initialData = {
                            title: expense.title || '',
                            description: expense.description || '',
                            amount: expense.amount?.toString() || '',
                            category: expense.category || '',
                            date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                            note: expense.note || ''
                        };
                        setFormData(initialData);
                        setInitialFormData(initialData);
                    }
                } catch (error) {
                    console.error('Error fetching expense:', error);
                    Alert.error(t('error_fetching') || 'Xəta!', t('error_fetching_text') || 'Xərc məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchExpense();
    }, [id, isEditMode, t]);

    const validateForm = () => {
        const newErrors = {};
    
        // Başlıq
        if (!formData.title.trim()) {
            newErrors.title = t('title_required') || 'Başlıq tələb olunur';
        }
    
        // Məbləğ
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            newErrors.amount = t('amount_required') || 'Məbləğ tələb olunur və 0-dan böyük olmalıdır';
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
            title: formData.title.trim(),
            description: formData.description?.trim() || '',
            amount: formData.amount?.toString() || '',
            category: formData.category || '',
            date: formData.date,
            note: formData.note?.trim() || ''
        };
        
        const initial = {
            title: initialFormData.title.trim(),
            description: initialFormData.description?.trim() || '',
            amount: initialFormData.amount?.toString() || '',
            category: initialFormData.category || '',
            date: initialFormData.date,
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
                title: formData.title.trim(),
                description: formData.description?.trim() || null,
                amount: parseFloat(formData.amount),
                category: formData.category || null,
                date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
                note: formData.note?.trim() || null
            };

            if (isEditMode) {
                await expenseApi.update(id.toString(), payload);
                Alert.success(t('update_success') || 'Uğurlu!', t('update_success_text') || 'Xərc məlumatları uğurla yeniləndi');
            } else {
                await expenseApi.create(payload);
                Alert.success(t('add_success') || 'Uğurlu!', t('add_success_text') || 'Xərc uğurla əlavə edildi');
            }
            
            setTimeout(() => {
                navigate(expensePagePath);
            }, 1500);
            
        } catch (error) {
            console.error('Expense operation error:', error);
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
                    onClick={() => navigate(expensePagePath)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={t('back') || 'Geri'}
                >
                    <MdArrowBack className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? (t('edit_expense') || 'Xərc Redaktə Et') : (t('add_expense') || 'Yeni Xərc')}
                    </h1>
                    <p className="text-gray-600">
                        {isEditMode ? (t('edit_expense_description') || 'Xərc məlumatlarını yeniləyin') : (t('add_expense_description') || 'Yeni xərc əlavə edin')}
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
                        <div className="md:col-span-2">
                            <Input
                                label={t('title') || 'Başlıq'}
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                error={errors.title}
                                placeholder={t('title_placeholder') || 'Xərc başlığını daxil edin (məsələn: Yemək)'}
                                icon={<MdAttachMoney />}
                                required
                            />
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
                                {t('category') || 'Kateqoriya'}
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => handleInputChange('category', e.target.value)}
                                disabled={isLoading}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    errors.category ? 'border-red-500' : 'border-gray-300'
                                }`}
                            >
                                <option value="">{t('select_category') || 'Kateqoriya seçin'}</option>
                                {expenseCategories.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                            {errors.category && (
                                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                            )}
                        </div>

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
                        
                        <div className="md:col-span-2">
                            <Input
                                label={t('description') || 'Təsvir'}
                                type="text"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                error={errors.description}
                                placeholder={t('description_placeholder') || 'Xərc təsvirini daxil edin (istəyə bağlı)'}
                                icon={<MdDescription />}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('note') || 'Qeyd'}
                            </label>
                            <textarea
                                value={formData.note}
                                onChange={(e) => handleInputChange('note', e.target.value)}
                                disabled={isLoading}
                                rows={3}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    errors.note ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder={t('note_placeholder') || 'Qeyd daxil edin (istəyə bağlı)'}
                            />
                            {errors.note && (
                                <p className="mt-1 text-sm text-red-600">{errors.note}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(expensePagePath)}
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

