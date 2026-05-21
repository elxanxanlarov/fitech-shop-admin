// DashboardLayout()
import Sidebar from "./Sidebar"
import LanguageSwitcher from "../../i18n/LanguageSwitcher"
import NotificationBell from "../ui/NotificationBell"
import DeletedProductsBell from "../ui/DeletedProductsBell"
import BranchSelector from "../ui/BranchSelector"
import { useState } from "react"
import { FiMenu } from "react-icons/fi"
import { useBranch } from "../../context/BranchContext"

export default function DashboardLayout({ children, sidebarData, title, profilePath }) {
  const { selectedStore } = useBranch()
  const [isOpen, setIsOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const handleToggleCollapse = () => {
    setCollapsed((v) => !v)
    if (isOpen) {
      setIsOpen(false)
    }
  }
  const handleMobileClose = () => {
    setIsOpen(false)
  }
  
  // Görünüş tamamilə selectedStore-a tabedir. Hər rol header toggle-i ilə
  // Fitech / İsmayıllı görünüşü arasında keçə bilər.
  const isIsmayilli = selectedStore === 'ISMAYILLI';

  return (
    <div className="min-h-screen bg-slate-50">
      {isOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={handleMobileClose} />}
      <aside className={`fixed z-40 top-0 left-0 h-screen bg-white border-r border-slate-200 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:translate-x-0'
        } ${collapsed ? 'md:w-20' : 'md:w-64'
        }`}>
        <Sidebar
          sidebarData={sidebarData}
          profilePath={profilePath}
          onItemClick={handleMobileClose}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
          isMobileOpen={isOpen}
          onMobileClose={handleMobileClose}
        />
      </aside>
      <div className={`${collapsed ? 'md:pl-20' : 'md:pl-64'} transition-[padding] duration-300 ease-in-out min-h-screen flex flex-col`}>
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4 shadow-sm backdrop-blur-md bg-white/80">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className="md:hidden inline-flex items-center justify-center min-w-[40px] h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all duration-200"
              onClick={() => setIsOpen(true)}
              aria-label="Open menu"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 truncate">
              {title}
            </h1>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <div className="hidden sm:block">
               <BranchSelector />
            </div>
            {!isIsmayilli && (
              <div className="flex items-center gap-1 sm:gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <DeletedProductsBell />
                <NotificationBell />
              </div>
            )}
            <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 p-0 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
