import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    MdShoppingCart,
    MdHistory,
    MdReplay,
    MdLogout,
} from 'react-icons/md';
import { MdStorefront } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import LanguageSwitcher from '../../i18n/LanguageSwitcher';
import Alert from '../ui/Alert';

const TABS = [
    { key: 'pos', path: '/seller/pos', label: 'Satış', icon: <MdShoppingCart className="w-5 h-5" /> },
    { key: 'history', path: '/seller/history', label: 'Tarixçə', icon: <MdHistory className="w-5 h-5" /> },
    { key: 'return', path: '/seller/return', label: 'Qaytarma', icon: <MdReplay className="w-5 h-5" /> },
];

export default function SellerLayout({ children }) {
    const { user, logout } = useAuth();
    const { branches, selectedStore, setSelectedStore } = useBranch();
    const location = useLocation();
    const navigate = useNavigate();
    const [now, setNow] = useState(new Date());

    const isCheckScreen = location.pathname.startsWith('/seller/check');

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000 * 30);
        return () => clearInterval(id);
    }, []);

    const myBranch = useMemo(() => {
        if (!user?.branchId) return null;
        return branches.find((br) => br.id === user.branchId) || null;
    }, [user, branches]);

    const branchName = myBranch?.name || (user?.branchId ? '—' : 'Mərkəz');
    const showStoreToggle = !!myBranch?.isShowIsmayilli;

    const handleLogout = async () => {
        const result = await Alert.confirm(
            'Çıxış',
            'Sistemdən çıxmaq istədiyinizə əminsiniz?',
            { confirmText: 'Bəli', cancelText: 'Xeyr', confirmColor: '#EF4444' }
        );
        if (!result.isConfirmed) return;
        try {
            await logout();
        } catch (e) {
            console.error('logout error', e);
        }
        navigate('/dashboard/login', { replace: true });
    };

    if (isCheckScreen) {
        return <div className="min-h-screen bg-white">{children}</div>;
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-100">
            {/* Top header */}
            <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
                <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
                    {/* Left: brand + branch */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
                            <MdShoppingCart className="w-6 h-6" />
                        </div>
                        <div className="leading-tight min-w-0">
                            <h1 className="text-sm sm:text-base font-extrabold text-slate-800 truncate">Satıcı Paneli</h1>
                            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                                Filial: <span className="font-semibold text-slate-700">{branchName}</span>
                            </p>
                        </div>
                    </div>

                    {/* Center: tabs (desktop) */}
                    <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {TABS.map((tab) => (
                            <NavLink
                                key={tab.key}
                                to={tab.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                        isActive
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                    }`
                                }
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Store toggle (only if branch supports İsmayıllı) */}
                    {showStoreToggle && (
                        <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setSelectedStore('FITECH')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                                    selectedStore === 'FITECH'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                }`}
                                title="Fitech mağazası"
                            >
                                <MdStorefront className="w-4 h-4" />
                                Fitech
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedStore('ISMAYILLI')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                                    selectedStore === 'ISMAYILLI'
                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                }`}
                                title="İsmayıllı mağazası"
                            >
                                <MdStorefront className="w-4 h-4" />
                                İsmayıllı
                            </button>
                        </div>
                    )}

                    {/* Right: clock + user + logout */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="hidden lg:flex flex-col items-end leading-tight">
                            <span className="text-xs font-bold text-slate-700 tabular-nums">
                                {now.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] text-slate-500">
                                {now.toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                        <LanguageSwitcher />
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                {(user?.name?.[0] || 'S').toUpperCase()}
                            </div>
                            <div className="leading-tight">
                                <p className="text-xs font-bold text-slate-800 max-w-[120px] truncate">
                                    {user?.name || 'Satıcı'} {user?.surName || ''}
                                </p>
                                <p className="text-[10px] text-slate-500">Satıcı</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                            title="Çıxış"
                        >
                            <MdLogout className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Mobile tabs */}
                <nav className="md:hidden flex items-center justify-around px-2 pb-2">
                    {TABS.map((tab) => (
                        <NavLink
                            key={tab.key}
                            to={tab.path}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                                    isActive
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`
                            }
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Mobile store toggle */}
                {showStoreToggle && (
                    <div className="md:hidden flex items-center justify-center gap-1 px-3 pb-2">
                        <button
                            type="button"
                            onClick={() => setSelectedStore('FITECH')}
                            className={`flex-1 max-w-[160px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border ${
                                selectedStore === 'FITECH'
                                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200'
                            }`}
                        >
                            <MdStorefront className="w-4 h-4" />
                            Fitech
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedStore('ISMAYILLI')}
                            className={`flex-1 max-w-[160px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border ${
                                selectedStore === 'ISMAYILLI'
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200'
                            }`}
                        >
                            <MdStorefront className="w-4 h-4" />
                            İsmayıllı
                        </button>
                    </div>
                )}
            </header>

            <main className="flex-1 flex flex-col min-h-0">
                {children}
            </main>
        </div>
    );
}
