import React, { useEffect, useState } from 'react';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { branchApi } from '../../api';
import { BiBuildings, BiChevronDown } from 'react-icons/bi';

export default function BranchSelector() {
    const { selectedBranchId, selectedBranchName, selectBranch } = useBranch();
    const { user } = useAuth();
    const [branches, setBranches] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    const roleName = (user?.role?.name || '').toLowerCase();
    const isSuperadmin = roleName === 'superadmin';
    const isHeadAdmin = roleName === 'admin' && user?.isBoss === true;
    /** Filial dəyişdirə bilənlər */
    const canChangeBranch = isSuperadmin || isHeadAdmin;

    const showBranchInHeader = user && (canChangeBranch || !!user.branchId);

    useEffect(() => {
        if (!showBranchInHeader) return;

        const fetchBranches = async () => {
            try {
                const response = await branchApi.getAll();
                if (!response.success || !response.data) return;

                setBranches(response.data);

                if (!canChangeBranch && user.branchId) {
                    const mine = response.data.find((b) => b.id === user.branchId);
                    selectBranch(user.branchId, mine?.name || '');
                    return;
                }

                if (canChangeBranch) {
                    if (selectedBranchId === 'central') {
                        const kurdaxani = response.data.find((b) => b.name === 'Kürdəxanı');
                        if (kurdaxani) {
                            selectBranch(kurdaxani.id, kurdaxani.name);
                        } else if (response.data.length > 0) {
                            selectBranch(response.data[0].id, response.data[0].name);
                        }
                    } else {
                        const currentBranch = response.data.find((b) => b.id === selectedBranchId);
                        if (currentBranch && !localStorage.getItem('selectedBranchName')) {
                            selectBranch(currentBranch.id, currentBranch.name);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching branches:', error);
            }
        };

        fetchBranches();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedBranchId yalnız canChangeBranch üçün ilkin defaultda lazımdır
    }, [user, canChangeBranch, showBranchInHeader]);

    if (!showBranchInHeader) return null;

    // Filial admin, reception və s. — yalnız öz filialı, dəyişmək olmaz
    if (!canChangeBranch) {
        const mine = branches.find((b) => b.id === user.branchId);
        const label = mine?.name || selectedBranchName || '';

        return (
            <div
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 cursor-default select-none"
                title={label || undefined}
            >
                <BiBuildings className="text-slate-500 w-4 h-4 shrink-0" />
                <span className="max-w-[140px] truncate">{label || '—'}</span>
            </div>
        );
    }

    const selectedBranch = branches.find((b) => b.id === selectedBranchId);

    return (
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
    );
}
