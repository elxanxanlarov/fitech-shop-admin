import { FiHome, FiLogOut, FiChevronsLeft, FiChevronsRight } from "react-icons/fi"
import { Link, NavLink } from "react-router-dom"
import { useClickOutside } from "../../hooks"
import { useTranslation } from "react-i18next"
import { authApi } from "../../api"
import { useNavigate } from "react-router-dom"
import Alert from "./Alert"
const Sidebar = ({ sidebarData, onItemClick, collapsed, onToggleCollapse, isMobileOpen, onMobileClose, profilePath }) => {
  const sidebarRef = useClickOutside(isMobileOpen, onMobileClose);
  const { t } = useTranslation('sidebar');
  const { t: tAuth } = useTranslation('auth');
  const navigate = useNavigate();
  const handleLogout = async () => {
    const result = await Alert.confirm(tAuth('logout_confirm'), tAuth('logout_confirm_text'), {
      confirmText: tAuth('yes'),
      cancelText: tAuth('no'),
      confirmColor: '#EF4444',
      cancelColor: '#6B7280'
    });  
    if (result.isConfirmed) {
      try {
        await authApi.logout();
        navigate('/dashboard/login');
      } catch (error) {
        console.error('Logout error:', error);
        sessionStorage.removeItem('token');
        navigate('/dashboard/login');
      }
    }
  }
  return (
    <div 
      ref={sidebarRef}
      className="h-screen sticky top-0 flex flex-col bg-white border-r border-gray-200 shadow-lg w-full transition-all duration-300 ease-in-out"
    >
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FiHome className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-black">{t('dashboard')}</span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border-2 border-black text-black hover:bg-gray-50 transition-all duration-200 font-bold"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <FiChevronsRight className="w-4 h-4" /> : <FiChevronsLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {sidebarData.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            onClick={onItemClick}
            title={item.title}
            className={({ isActive }) =>
              `group flex items-center h-13 ${
                collapsed ? 'justify-center px-3' : 'justify-start px-3'
              } py-3 rounded-lg cursor-pointer transition-all duration-200 relative ${
                isActive
                  ? 'text-red-600 bg-red-50 border-r-4 border-red-600'
                  : 'text-black hover:bg-gray-50 hover:text-gray-700'
              }`
            }
          >
            <span className={`text-xl ${collapsed ? '' : 'mr-3'} text-current`}>
              {item.icon}
            </span>
            <span className={`font-medium transition-opacity duration-200 ${
              collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}>
              {t(item.title)}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="space-y-2">
          <Link
            to={`${profilePath}/profile`}
            className={`group flex items-center ${
              collapsed ? 'justify-center px-3' : 'justify-start px-4'
            } py-3 w-full rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200`}
          >
            <div className={`w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center ${collapsed ? '' : 'mr-3'}`}>
              <span className="text-white font-bold text-sm">EX</span>
            </div>
            <span className={`font-medium transition-opacity duration-200 ${
              collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}>
              {t('profile')}
            </span>
          </Link>

          <button
            className={`group flex items-center ${
              collapsed ? 'justify-center px-3' : 'justify-start px-4'
            } py-3 w-full rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200`}
            onClick={handleLogout}
          >
            <FiLogOut className={`text-xl ${collapsed ? '' : 'mr-3'}`} />
            <span className={`font-medium transition-opacity duration-200 ${
              collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}>
              {t('logout')}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar