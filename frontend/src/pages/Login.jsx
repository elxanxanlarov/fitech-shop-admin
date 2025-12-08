import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../components/ui/Input';
import { MdEmail, MdLock, MdLogin } from 'react-icons/md';
import { authApi } from '../api';

export default function Login() {
    const navigate = useNavigate();
    const { t } = useTranslation('auth');
    
    // Əgər artıq login olubsa (token varsa), admin səhifəsinə yönləndir
    useEffect(() => {
        const token = sessionStorage.getItem('token');
        if (token) {
            navigate('/admin/staff');
        }
    }, [navigate]);
    
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.email.trim()) {
            newErrors.email = t('email_required');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = t('email_invalid');
        }
        
        if (!formData.password) {
            newErrors.password = t('password_required');
        } else if (formData.password.length < 6) {
            newErrors.password = t('password_min_length');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (validateForm()) {
            setIsLoading(true);
            try {
                // Login - cookie-də token saxlanır
                const loginResponse = await authApi.login(formData.email, formData.password);
                
                if (!loginResponse.success) {
                    setErrors({ password: loginResponse.message || t('login_error') });
                    setIsLoading(false);
                    return;
                }
                
                const meResponse = await authApi.me();
                
                if (meResponse.success && meResponse.data) {
                    // Token-u sessionStorage-a yaz (flag olaraq 'authenticated')
                    sessionStorage.setItem('token', 'authenticated');
                    
                    // Role məlumatını al
                    const roleName = meResponse.data.role?.name?.toLowerCase();
                    
                    // Superadmin və ya Admin olsa /admin/staff-ə yönləndir
                    if (roleName === 'superadmin' || roleName === 'admin') {
                        navigate('/admin/staff');
                    } else if (roleName === 'reception') {
                        navigate('/reception/staff');
                    } else {
                        navigate('/');
                    }
                } else {
                    setErrors({ password: t('login_error') });
                }
            } catch (err) {
                console.error('Login error:', err);
                const errorMessage = err.response?.data?.message || t('login_error');
                setErrors({ password: errorMessage });
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Logo/Header */}
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                        <MdLock className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        {t('login_title')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {t('login_subtitle')}
                    </p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                    <form action="#" onSubmit={(e)=>handleSubmit(e)} className="space-y-6">
                        {/* Email Input */}
                        <Input
                            label={t('email')}
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="email@example.com"
                            required
                            error={errors.email}
                            errorMessage={errors.email}
                            leftIcon={<MdEmail />}
                        />

                        {/* Password Input */}
                        <Input
                            label={t('password')}
                            type="password"
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            placeholder="••••••••"
                            required
                            error={errors.password}
                            errorMessage={errors.password}
                            leftIcon={<MdLock />}
                        />

                       

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {t('login_loading')}
                                </>
                            ) : (
                                <>
                                    <MdLogin className="w-5 h-5" />
                                    {t('login_button')}
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
