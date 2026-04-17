import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../components/ui/Input';
import { MdEmail, MdLock, MdLogin } from 'react-icons/md';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../i18n/LanguageSwitcher';
import logo from '/favicon.ico';
export default function Login() {
    const navigate = useNavigate();
    const { t } = useTranslation('auth');
    const auth = useAuth();

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
                    // AuthContext-də login funksiyasını çağır
                    auth.login(meResponse.data);

                    // Role məlumatını al
                    const roleName = meResponse.data.role?.name?.toLowerCase();

                    // Superadmin və ya Admin olsa /admin/staff-ə yönləndir
                    if (roleName === 'superadmin' || roleName === 'admin') {
                        navigate('/admin/staff');
                    } else if (roleName === 'reception') {
                        navigate('/reception/sales');
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
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8fafc]">
            {/* Left Side - Visual Branding (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-blue-600 items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-indigo-900 opacity-90"></div>
                <div className="absolute inset-0">
                    <svg className="h-full w-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#grid)" />
                    </svg>
                </div>

                <div className="relative z-10 text-center px-12">
                    <div className="mb-8 inline-block p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                        <img src={logo} alt="Logo" className="w-20 h-20" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4">Fitech Shop Admin</h1>
                    <p className="text-blue-100 text-lg max-w-md">
                        Müasir dükan və mərkəz idarəetmə sistemi. Mağazanızın və kafenizin tam nəzarəti burada.
                    </p>
                </div>

                {/* Decorative circles */}
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl"></div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">
                <div className="w-full max-w-md">
                    {/* Header for mobile */}
                    <div className="lg:hidden text-center mb-10">
                        <img src={logo} alt="Logo" className="w-16 h-16 mx-auto mb-4" />
                        <h2 className="text-3xl font-extrabold text-gray-900">
                            Fitech Shop
                        </h2>
                    </div>

                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{t('login_title')}</h2>
                            <p className="text-gray-500 mt-1">{t('login_subtitle')}</p>
                        </div>
                        <LanguageSwitcher />
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/5 border border-gray-100 p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Input
                                label={t('email')}
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="email@example.com"
                                required
                                error={errors.email}
                                errorMessage={errors.email}
                                leftIcon={<MdEmail className="text-gray-400" />}
                            />

                            <Input
                                label={t('password')}
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                placeholder="••••••••"
                                required
                                error={errors.password}
                                errorMessage={errors.password}
                                leftIcon={<MdLock className="text-gray-400" />}
                            />

                            <div className="flex items-center justify-between">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="text-sm text-gray-600">Məni xatırla</span>
                                </label>
                                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors">
                                    Şifrəni unutmusunuz?
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full relative group overflow-hidden bg-blue-600 text-white py-3.5 px-6 rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="relative flex items-center justify-center gap-2">
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
                                </span>
                            </button>
                        </form>
                    </div>

                    <p className="mt-8 text-center text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} Fitech Shop Admin. Bütün hüquqlar qorunur.
                    </p>
                </div>
            </div>
        </div>
    );
}

