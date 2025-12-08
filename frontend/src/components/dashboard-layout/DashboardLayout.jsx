// DashboardLayout()
import Sidebar from "./Sidebar"
import LanguageSwitcher from "../../i18n/LanguageSwitcher"
import { useState } from "react"
import { FiMenu } from "react-icons/fi"

export default function DashboardLayout({ children, sidebarData , title, profilePath}) {
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
  return (
    <div className="min-h-screen bg-slate-50">
      {isOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={handleMobileClose} />}
      <aside className={`fixed z-40 top-0 left-0 h-screen bg-white border-r border-slate-200 overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:translate-x-0'
      } ${
        collapsed ? 'md:w-20' : 'md:w-64'
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
      <div className={`${collapsed ? 'md:pl-20' : 'md:pl-64'} transition-[padding] duration-300 ease-in-out`}>
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border-2 border-black text-black shadow-md hover:shadow-lg hover:bg-gray-50 transition-all duration-200 font-bold" 
              onClick={() => setIsOpen(true)}
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <span className="text-lg font-semibold text-slate-800">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="">
          {children}
        </main>
      </div>
    </div>
  )
}
