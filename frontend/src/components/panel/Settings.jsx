import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdSettings, MdArrowRight, MdSecurity, MdFolder, MdCreditCard, MdBusiness } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import { isFilialAdmin } from '../../utils/accessHelpers';
import { useBranch } from '../../context/BranchContext';

export default function Settings() {
    const navigate = useNavigate();
    const { t } = useTranslation('settings');
    const { user } = useAuth();
    const { selectedStore } = useBranch();
    const filialAdminOnlyCategories = isFilialAdmin(user);

    const allSettingsItems = [
        {
            id: 'roles-management',
            title: t('roles_management') || 'Rollar İdarəetməsi',
            description: t('roles_management_desc') || 'İstifadəçi rollarını və icazələrini idarə edin',
            icon: <MdSecurity className="w-6 h-6" />,
            bgColor: 'bg-blue-100',
            iconColor: 'text-blue-600',
            navigatePath: '/admin/roles-management'
        },
        {
            id: 'category-management',
            title: t('category_management') || 'Kateqoriya İdarəetməsi',
            description: t('category_management_desc') || 'Məhsul kateqoriyalarını idarə edin',
            icon: <MdFolder className="w-6 h-6" />,
            bgColor: 'bg-green-100',
            iconColor: 'text-green-600',
            navigatePath: '/admin/category-management'
        },
        {
            id: 'credit-term-management',
            title: t('credit_term_management') || 'Kredit Müddətləri İdarəetməsi',
            description: t('credit_term_management_desc') || 'Kredit müddətlərini və faizləri idarə edin',
            icon: <MdCreditCard className="w-6 h-6" />,
            bgColor: 'bg-purple-100',
            iconColor: 'text-purple-600',
            navigatePath: '/admin/credit-term-management'
        },
        {
            id: 'branch-management',
            title: t('branch_management') || 'Filial İdarəetməsi',
            description: t('branch_management_desc') || 'Filialları və onların stoklarını idarə edin',
            icon: <MdBusiness className="w-6 h-6" />,
            bgColor: 'bg-orange-100',
            iconColor: 'text-orange-600',
            navigatePath: '/admin/branch-management'
        }
    ];

    let settingsItems = filialAdminOnlyCategories
        ? allSettingsItems.filter((item) => item.id === 'category-management')
        : allSettingsItems;

    if (selectedStore === 'ISMAYILLI') {
        settingsItems = settingsItems.filter(item => item.id !== 'roles-management' && item.id !== 'branch-management');
    }

    const handleNavigate = (path) => {
        navigate(path);
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('title') || 'Tənzimləmələr'}</h1>
                <p className="text-gray-600">{t('subtitle') || 'Sistem parametrlərini idarə edin'}</p>
                {filialAdminOnlyCategories && (
                    <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {t('filial_admin_settings_hint') ||
                            'Filial admini kimi yalnız kateqoriya idarəetməsinə çıxışınız var.'}
                    </p>
                )}
            </div>

            {/* Settings Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {settingsItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleNavigate(item.navigatePath)}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:border-blue-300 group cursor-pointer text-left"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 ${item.bgColor} rounded-lg flex items-center justify-center ${item.iconColor}`}>
                                {item.icon}
                            </div>
                            <MdArrowRight className={`w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors`} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {item.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                            {item.description}
                        </p>
                    </button>
                ))}
            </div>

            {/* Empty State (if no settings items) */}
            {settingsItems.length === 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <MdSettings className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {t('no_settings') || 'Tənzimləmələr mövcud deyil'}
                    </h3>
                    <p className="text-gray-600">
                        {t('no_settings_desc') || 'Hal-hazırda heç bir tənzimləmə əlavə edilməyib.'}
                    </p>
                </div>
            )}
        </div>
    );
}