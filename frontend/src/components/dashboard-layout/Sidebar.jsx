import { FiHome, FiLogOut, FiChevronsLeft, FiChevronsRight } from "react-icons/fi"
import { Link, NavLink } from "react-router-dom"
import { useClickOutside } from "../../hooks"
import { useTranslation } from "react-i18next"
import { authApi } from "../../api"
import { useNavigate } from "react-router-dom"
import Alert from "../ui/Alert"
import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"

const Sidebar = ({ sidebarData, onItemClick, collapsed, onToggleCollapse, isMobileOpen, onMobileClose, profilePath }) => {
  const sidebarRef = useClickOutside(isMobileOpen, onMobileClose);
  const { t } = useTranslation('sidebar');
  const { t: tAuth } = useTranslation('auth');
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { logout: authLogout } = useAuth();
  const [transferCount, setTransferCount] = useState(0);

  useEffect(() => {
    const fetchTransferCount = async () => {
      if (!currentUser?.branchId) return;
      try {
        const { stockTransferApi } = await import("../../api");
        const res = await stockTransferApi.getAll({ 
          toBranchId: currentUser.branchId, 
          status: 'PENDING' 
        });
        if (res.success) {
          setTransferCount(res.data?.length || 0);
        }
      } catch (error) {
        console.error("Sidebar count error", error);
      }
    };

    fetchTransferCount();
    const interval = setInterval(fetchTransferCount, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.branchId]);

  const handleLogout = async () => {
    const result = await Alert.confirm(tAuth('logout_confirm'), tAuth('logout_confirm_text'), {
      confirmText: tAuth('yes'),
      cancelText: tAuth('no'),
      confirmColor: '#EF4444',
      cancelColor: '#6B7280'
    });
    if (result.isConfirmed) {
      await authLogout();
      navigate('/dashboard/login');
    }
  }
  return (
    <div
      ref={sidebarRef}
      className="h-screen flex flex-col bg-white border-r border-slate-200 w-full transition-all duration-300 ease-in-out"
    >
      <div className="p-6 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3 animate-in fade-in duration-500">
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                <FiHome className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900 leading-none">Dashboard</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Admin Panel</span>
              </div>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all duration-200"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <FiChevronsRight className="w-4 h-4" /> : <FiChevronsLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {sidebarData.filter(item => {
          if (!item.requiredRole) return true;
          const userRole = currentUser?.role?.name?.toUpperCase();
          return userRole === item.requiredRole.toUpperCase();
        }).map((item, index) => {
          const hasBadge = item.title === 'product_branch_transfer' && transferCount > 0;
          
          return (
            <NavLink
              key={index}
              to={item.path}
              onClick={onItemClick}
              title={t(item.title)}
              className={({ isActive }) =>
                `group flex items-center ${collapsed ? 'justify-center px-0 h-12 w-12 mx-auto' : 'justify-start px-4 h-12'
                } rounded-xl cursor-pointer transition-all duration-200 relative ${isActive
                  ? 'text-white bg-slate-900 shadow-xl shadow-slate-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <span className={`text-xl ${collapsed ? '' : 'mr-3'} transition-transform duration-200 group-hover:scale-110`}>
                {item.icon}
              </span>
              <span className={`font-semibold text-sm transition-all duration-200 ${collapsed ? 'hidden' : 'block'}`}>
                {t(item.title)}
              </span>
              
              {hasBadge && (
                <span className={`absolute ${collapsed ? 'top-0 right-0 translate-x-1/3 -translate-y-1/3' : 'right-3'} flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold ring-2 ring-white animate-bounce shadow-lg shadow-red-200`}>
                  {transferCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-100">
        <div className="space-y-1">
          <Link
            to={`${profilePath}/profile`}
            className={`group flex items-center ${collapsed ? 'justify-center p-2' : 'justify-start p-3'
              } w-full rounded-xl text-slate-600 hover:bg-slate-50 transition-all duration-200`}
          >
            <div className={`w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm ${collapsed ? '' : 'mr-3'} transition-transform group-hover:scale-105`}>
              <span className="text-blue-600 font-bold text-sm">
                {currentUser
                  ? `${(currentUser.name || '').charAt(0).toUpperCase()}${(currentUser.surName || '').charAt(0).toUpperCase()}`.trim() || 'U'
                  : 'U'
                }
              </span>
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-slate-800 truncate">
                  {currentUser
                    ? `${currentUser.name || ''} ${currentUser.surName || ''}`.trim() || t('profile')
                    : t('profile')
                  }
                </span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{t('profile')}</span>
              </div>
            )}
          </Link>

          <button
            className={`group flex items-center ${collapsed ? 'justify-center p-2' : 'justify-start p-3'
              } w-full rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200`}
            onClick={handleLogout}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${collapsed ? '' : 'mr-3'} transition-transform group-hover:scale-110`}>
                <FiLogOut className="text-xl" />
            </div>
            {!collapsed && (
              <span className="font-bold text-sm">
                {t('logout')}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar