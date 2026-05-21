import React, { useEffect, useState } from 'react';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { BiBuildings, BiChevronDown } from 'react-icons/bi';

export default function BranchSelector() {
    const { 
        branches, 
        selectedBranchId, 
        selectedBranchName, 
        selectedBranch,
        selectedStore, 
        setSelectedStore, 
        selectBranch 
    } = useBranch();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const roleName = (user?.role?.name || '').toLowerCase();
    const isSuperadmin = roleName === 'superadmin';
    const isAdmin = roleName === 'admin';
    const isHeadAdmin = isAdmin && user?.isBoss === true;
    const isSeller = roleName === 'seller';
    const isIsmayilliAdmin = roleName === 'ismayilliadmin';
    /** Filial dəyişdirə bilənlər */
    const canChangeBranch = isSuperadmin || isHeadAdmin;
    /** Fitech / İsmayıllı store toggle-i görmək haqqı: satıcı, admin, superadmin, ismayilliadmin */
    const canToggleStore = isSeller || isAdmin || isSuperadmin || isIsmayilliAdmin;

    const showBranchInHeader = user && (canChangeBranch || !!user.branchId);

    useEffect(() => {
        if (!showBranchInHeader || branches.length === 0) return;

        if (!canChangeBranch && user.branchId) {
            const mine = branches.find((b) => b.id === user.branchId);
            selectBranch(user.branchId, mine?.name || '');
            return;
        }

        if (canChangeBranch) {
            if (selectedBranchId === 'central') {
                const kurdaxani = branches.find((b) => b.name === 'Kürdəxanı');
                if (kurdaxani) {
                    selectBranch(kurdaxani.id, kurdaxani.name);
                } else if (branches.length > 0) {
                    selectBranch(branches[0].id, branches[0].name);
                }
            } else {
                const currentBranch = branches.find((b) => b.id === selectedBranchId);
                if (currentBranch && !localStorage.getItem('selectedBranchName')) {
                    selectBranch(currentBranch.id, currentBranch.name);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, canChangeBranch, showBranchInHeader, branches]);

    if (!showBranchInHeader) return null;

    // Filial admin, reception və s. — yalnız öz filialı, dəyişmək olmaz
    if (!canChangeBranch) {
        const mine = branches.find((b) => b.id === user.branchId);
        const label = mine?.name || selectedBranchName || '';

        return (
            <div className="flex items-center gap-4">
                <div
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 cursor-default select-none"
                    title={label || undefined}
                >
                    <BiBuildings className="text-slate-500 w-4 h-4 shrink-0" />
                    <span className="max-w-[140px] truncate">{label || '—'}</span>
                </div>

                {canToggleStore && mine?.isShowIsmayilli && (
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setSelectedStore('FITECH')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${selectedStore === 'FITECH' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Fitech
                        </button>
                        <button
                            onClick={() => setSelectedStore('ISMAYILLI')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${selectedStore === 'ISMAYILLI' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            İsmayıllı
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all text-sm font-medium text-slate-700"
                >
                    <BiBuildings className="text-slate-500 w-4 h-4" />
                    <span className="max-w-[120px] truncate">
                        {selectedBranch?.name || 'Filial seçin'}
                    </span>
                    <BiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in duration-200">
                            <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Filial Seçimi
                            </div>

                            <div className="my-1 border-t border-slate-100" />

                            {branches.map((branch) => (
                                <button
                                    key={branch.id}
                                    type="button"
                                    onClick={() => {
                                        selectBranch(branch.id, branch.name);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${selectedBranchId === branch.id ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-600'}`}
                                >
                                    {branch.name}
                                    {selectedBranchId === branch.id && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {canToggleStore && selectedBranch?.isShowIsmayilli && (
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setSelectedStore('FITECH')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${selectedStore === 'FITECH' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Fitech
                    </button>
                    <button
                        onClick={() => setSelectedStore('ISMAYILLI')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${selectedStore === 'ISMAYILLI' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        İsmayıllı
                    </button>
                </div>
            )}
        </div>
    );
}
