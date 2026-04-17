import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import { MdAttachMoney, MdDescription, MdArrowBack, MdEvent, MdAccessTime, MdSave, MdAdd } from 'react-icons/md';
import { cashHandoverApi, staffApi, branchApi, authApi } from '../../api';
import { createInputChangeHandler } from '../../utils/validation';
import { useBranch } from '../../hooks';
import SearchDropdown from '../ui/SearchDropdown';
import { BiBuildings } from 'react-icons/bi';

/** Superadmin və baş admin (admin + isBoss) filial seçə bilər — ExpenseForm / BranchSelector ilə eyni */
function canPickCashHandoverBranch(user) {
    if (!user?.role?.name) return false;
    const r = user.role.name.toLowerCase();
    return r === 'superadmin' || (r === 'admin' && user.isBoss === true);
}

export default function CashHandoverForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const { t } = useTranslation('cashHandover');
    const { t: tAlert } = useTranslation('alert');
    const { selectedBranchId } = useBranch();

    const isAdmin = location.pathname.includes('/admin');
    const cashHandoverPagePath = isAdmin ? '/admin/cash-handover' : '/reception/cash-handover';
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        date: (() => {
            const today = new Date();
            return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        })(),
        amount: '',
        handedOverToId: '',
        handedOverById: '',
        note: '',
        branchId: ''
    });

    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const [staffList, setStaffList] = useState([]);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [initialFormData, setInitialFormData] = useState(null);
    const [availableRevenue, setAvailableRevenue] = useState(null);
    const [loadingRevenue, setLoadingRevenue] = useState(false);
    const [totalPendingRevenue, setTotalPendingRevenue] = useState(0);
    const [loadingTotalPending, setLoadingTotalPending] = useState(false);
    const [totalBreakdown, setTotalBreakdown] = useState(null);

    // İstifadəçi və filiallar
    useEffect(() => {
        const fetchData = async () => {
            setLoadingBranches(true);
            try {
                const [userResp, branchesResp] = await Promise.all([
                    authApi.me(),
                    branchApi.getAll()
                ]);
                if (userResp.success) {
                    setCurrentUser(userResp.data);
                }
                if (branchesResp.success && branchesResp.data) {
                    setBranches(branchesResp.data);
                }
            } catch (error) {
                console.error('Error fetching branches/user:', error);
            } finally {
                setLoadingBranches(false);
            }
        };
        fetchData();
    }, []);

    // Yaratma: filiala bağlı admin/reception — yalnız öz filialı; superadmin/baş admin — header və ya Kürdəxanı/ilk filial
    useEffect(() => {
        if (isEditMode || !currentUser || branches.length === 0) return;

        let next = '';
        if (canPickCashHandoverBranch(currentUser)) {
            next =
                selectedBranchId && selectedBranchId !== 'central' ? selectedBranchId : '';
            if (!next) {
                const k = branches.find((b) => b.name === 'Kürdəxanı');
                next = k ? k.id : branches[0]?.id || '';
            }
        } else {
            next = currentUser.branchId || '';
            if (!next && selectedBranchId && selectedBranchId !== 'central') {
                next = selectedBranchId;
            }
        }

        setFormData((prev) =>
            prev.branchId === next ? prev : { ...prev, branchId: next }
        );
    }, [isEditMode, currentUser, selectedBranchId, branches]);

    const branchOptionsForForm = useMemo(() => {
        if (!currentUser || canPickCashHandoverBranch(currentUser)) return branches;
        const bid = currentUser.branchId;
        if (!bid) return branches;
        const mine = branches.filter((b) => b.id === bid);
        return mine.length ? mine : branches;
    }, [branches, currentUser]);

    // Fetch staff list
    useEffect(() => {
        const fetchStaff = async () => {
            setLoadingStaff(true);
            try {
                // Filiala uyğun işçiləri gətir (Center üçün 'null' göndər)
                const branchQuery = formData.branchId === 'central' ? 'null' : (formData.branchId || null);
                const response = await staffApi.getAll({ branchId: branchQuery });

                if (response.success && response.date) {
                    setStaffList(response.date.filter(staff => staff.isActive));
                }
            } catch (error) {
                console.error('Error fetching staff:', error);
            } finally {
                setLoadingStaff(false);
            }
        };
        fetchStaff();
    }, [formData.branchId]);

    // Fetch total pending revenue across all dates
    useEffect(() => {
        const fetchTotalPending = async () => {
            if (isEditMode) return;
            setLoadingTotalPending(true);
            try {
                const response = await cashHandoverApi.getPendingDates(formData.branchId);
                if (response.success) {
                    setTotalPendingRevenue(response.totalAvailable || 0);
                    setTotalBreakdown(response.breakdown || null);
                }
            } catch (error) {
                console.error('Error fetching total pending revenue:', error);
            } finally {
                setLoadingTotalPending(false);
            }
        };
        fetchTotalPending();
    }, [isEditMode, formData.branchId]);

    // Fetch cash handover data (if edit mode)
    useEffect(() => {
        const fetchCashHandover = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const response = await cashHandoverApi.getById(id);
                    if (response.success && response.date) {
                        const cashHandover = response.date;
                        const initialData = {
                            date: cashHandover.date ? new Date(cashHandover.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                            amount: cashHandover.amount?.toString() || '',
                            handedOverToId: cashHandover.handedOverToId || '',
                            handedOverById: cashHandover.handedOverById || '',
                            note: cashHandover.note || '',
                            branchId: cashHandover.branchId || 'central'
                        };
                        setFormData(initialData);
                        setInitialFormData(initialData);
                    }
                } catch (error) {
                    console.error('Error fetching cash handover:', error);
                    Alert.error(t('error_fetching') || 'Xəta!', t('error_fetching_text') || 'Məbləğ təslimi məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchCashHandover();
    }, [id, isEditMode, t]);

    // Fetch available revenue when date or branch changes
    useEffect(() => {
        const fetchAvailableRevenue = async () => {
            if (!formData.date) return;
            setLoadingRevenue(true);
            try {
                const response = await cashHandoverApi.getAvailableRevenueByDate(
                    formData.date,
                    isEditMode ? id : null,
                    formData.branchId
                );
                if (response.success && response.data) {
                    setAvailableRevenue(response.data);
                }
            } catch (error) {
                console.error('Error fetching available revenue:', error);
                setAvailableRevenue(null);
            } finally {
                setLoadingRevenue(false);
            }
        };
        fetchAvailableRevenue();
    }, [formData.date, id, isEditMode, formData.branchId]);

    const handleUseTotalPending = () => {
        setFormData(prev => ({ ...prev, amount: totalPendingRevenue.toFixed(2) }));
    };

    const validateForm = () => {
        const newErrors = {};
        const amount = parseFloat(formData.amount);

        if (!formData.amount || amount <= 0) {
            newErrors.amount = t('amount_required') || 'Məbləğ tələb olunur və 0-dan böyük olmalıdır';
        } else {
            const maxAllowed = isEditMode
                ? (availableRevenue?.availableRevenue || 0) + 0.01
                : Math.max(availableRevenue?.availableRevenue || 0, totalPendingRevenue) + 0.01;

            if (amount > maxAllowed) {
                if (isEditMode) {
                    newErrors.amount = t('max_allowed_today', { amount: availableRevenue.availableRevenue.toFixed(2) });
                } else {
                    newErrors.amount = t('max_allowed_total', { amount: totalPendingRevenue.toFixed(2) });
                }
            }
        }

        if (!formData.handedOverToId) {
            newErrors.handedOverToId = t('handed_over_to_required') || 'Kimə təslim edildiyi seçilməlidir';
        }
        if (!formData.handedOverById) {
            newErrors.handedOverById = t('handed_over_by_required') || 'Kim təslim etdiyi seçilməlidir';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = createInputChangeHandler(
        setFormData,
        setErrors,
        errors,
        ['amount'],
        t
    );

    const hasFormChanged = () => {
        if (!isEditMode || !initialFormData) return true;
        const currentData = {
            date: formData.date,
            amount: formData.amount?.toString() || '',
            handedOverToId: formData.handedOverToId || '',
            handedOverById: formData.handedOverById || '',
            note: formData.note?.trim() || '',
            branchId: formData.branchId || 'central'
        };
        const initial = {
            date: initialFormData.date,
            amount: initialFormData.amount?.toString() || '',
            handedOverToId: initialFormData.handedOverToId || '',
            handedOverById: initialFormData.handedOverById || '',
            note: initialFormData.note?.trim() || '',
            branchId: initialFormData.branchId || 'central'
        };
        return JSON.stringify(currentData) !== JSON.stringify(initial);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (isEditMode && !hasFormChanged()) {
            Alert.info(t('no_changes') || 'Xəbərdarlıq', t('no_changes_text') || 'Formda heç bir dəyişiklik edilməyib');
            return;
        }
        setIsLoading(true);
        try {
            const payload = {
                date: formData.date,
                amount: parseFloat(formData.amount),
                handedOverToId: formData.handedOverToId,
                handedOverById: formData.handedOverById,
                note: formData.note?.trim() || null,
                branchId: formData.branchId
            };
            if (isEditMode) {
                await cashHandoverApi.update(id.toString(), payload);
                Alert.success(t('update_success'), t('update_success_text'));
            } else {
                await cashHandoverApi.create(payload);
                Alert.success(t('add_success'), t('add_success_text'));
            }
            setTimeout(() => navigate(cashHandoverPagePath), 1500);
        } catch (error) {
            console.error('Cash handover error:', error);
            Alert.error('Xəta!', error.response?.data?.message || 'Əməliyyat zamanı xəta baş verdi');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && isEditMode) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('loading') || 'Yüklənir...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-white min-h-screen">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                            <MdAttachMoney className="text-white w-7 h-7" />
                        </div>
                        {t(isEditMode ? 'edit_title' : 'add_title')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 font-medium">
                        {t(isEditMode ? 'edit_description' : 'add_description')}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-5xl bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl shadow-gray-100 p-8 lg:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-50"></div>

                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Left Column */}
                    <div className="space-y-8">
                        <div>
                            <SearchDropdown
                                label={t('branch') || 'Filial'}
                                options={branchOptionsForForm}
                                value={formData.branchId}
                                onChange={(value) => handleInputChange('branchId', value)}
                                disabled={
                                    isLoading ||
                                    loadingBranches ||
                                    isEditMode ||
                                    !canPickCashHandoverBranch(currentUser)
                                }
                                error={!!errors.branchId}
                                placeholder={t('select_branch') || 'Filial seçin'}
                                getOptionLabel={(branch) => branch.name}
                                getOptionValue={(branch) => branch.id}
                                searchFields={['name']}
                                icon={<BiBuildings className="text-blue-500" />}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <Input
                                label={t('date') || 'Tarix'}
                                type="date"
                                value={formData.date}
                                onChange={(e) => handleInputChange('date', e.target.value)}
                                error={errors.date}
                                icon={<MdEvent className="text-blue-500" />}
                                required
                                disabled={isEditMode}
                            />

                            {availableRevenue && (
                                <div className="mt-6 p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100/50 rounded-3xl relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <MdAttachMoney className="w-16 h-16 text-blue-600" />
                                    </div>
                                    <div className="relative">
                                        <p className="text-[11px] uppercase font-black text-blue-600 tracking-widest mb-2 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                            {t('available_for_date') || 'Seçilən tarixdə gəlir'}
                                        </p>
                                        <p className="text-3xl font-black text-blue-900 leading-none tabular-nums">
                                            {loadingRevenue ? '...' : availableRevenue.availableRevenue.toFixed(2)}
                                            <span className="text-sm font-bold text-blue-400 ml-1.5 uppercase">AZN</span>
                                        </p>
                                        {availableRevenue.lastHandoverTime && (
                                            <p className="text-[10px] text-blue-400 mt-4 flex items-center gap-1.5 font-bold bg-white/50 w-fit px-3 py-1 rounded-full border border-blue-100">
                                                {t('last_handover')}: {new Date(availableRevenue.lastHandoverTime).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {availableRevenue && !loadingRevenue && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">{t('total_revenue') || 'Ümumi'}</p>
                                    <p className="text-lg font-black text-gray-700">{availableRevenue.totalRevenue.toFixed(2)}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">{t('net_cash') || 'Net Kassa'}</p>
                                    <p className="text-lg font-black text-indigo-600">{availableRevenue.netRevenue.toFixed(2)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">
                        {!isEditMode && totalBreakdown && (
                            <div className="overflow-hidden bg-white border border-indigo-100 rounded-[2rem] shadow-xl shadow-indigo-50/50 group transition-all hover:border-indigo-200">
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-8 py-5 flex justify-between items-center">
                                    <div>
                                        <h4 className="text-xs font-black text-white/90 uppercase tracking-[0.2em] mb-1">{t('revenue_calculation')}</h4>
                                        <p className="text-[10px] text-white/50 font-medium font-italic">{t('all_time_balance')}</p>
                                    </div>
                                    <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                                        <MdAttachMoney className="text-white w-5 h-5" />
                                    </div>
                                </div>

                                <div className="p-8 space-y-5">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span className="text-xs font-bold uppercase tracking-wider">{t('sales')} (+)</span>
                                            <span className="text-base font-black text-emerald-600">+{totalBreakdown.sales.toFixed(2)} <span className="text-[10px]">AZN</span></span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">{t('profit')}</span>
                                            <span className="text-base font-black text-amber-600">{totalBreakdown.profit.toFixed(2)} <span className="text-[10px]">AZN</span></span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span className="text-xs font-bold uppercase tracking-wider">{t('returns')} (-)</span>
                                            <span className="text-base font-black text-red-500">-{totalBreakdown.returns.toFixed(2)} <span className="text-[10px]">AZN</span></span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span className="text-xs font-bold uppercase tracking-wider">{t('expenses')} (-)</span>
                                            <span className="text-base font-black text-orange-400">-{totalBreakdown.expenses.toFixed(2)} <span className="text-[10px]">AZN</span></span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-50 text-indigo-600">
                                            <span className="text-xs font-black uppercase tracking-wider">{t('net_profit')}</span>
                                            <span className="text-lg font-black">{(totalBreakdown.profit - totalBreakdown.expenses).toFixed(2)} <span className="text-[10px]">AZN</span></span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-400 opacity-60">
                                            <span className="text-xs font-bold uppercase tracking-wider">{t('previous_handovers')} (-)</span>
                                            <span className="text-base font-black">-{totalBreakdown.handovers.toFixed(2)} <span className="text-[10px]">AZN</span></span>
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 w-full border-t border-dashed border-gray-200"></div>

                                    <div className="flex justify-between items-end bg-indigo-50/50 p-6 rounded-2xl border border-indigo-50">
                                        <div>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.1em] mb-2 leading-none">{t('net_balance')}</p>
                                            <p className="text-3xl font-black text-indigo-600 leading-none tabular-nums">
                                                {totalPendingRevenue.toFixed(2)}
                                                <span className="text-sm font-bold text-indigo-300 ml-1.5 uppercase">AZN</span>
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleUseTotalPending}
                                            className="px-5 py-3 bg-indigo-600 text-white text-[11px] font-black rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100 uppercase tracking-widest"
                                        >
                                            {t('use_all')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Input
                            label={t('amount')}
                            type="text"
                            value={formData.amount}
                            onChange={(e) => handleInputChange('amount', e.target.value)}
                            error={errors.amount}
                            placeholder="0.00"
                            icon={<MdAttachMoney className="text-indigo-500" />}
                            required
                            className="text-xl font-bold"
                        />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-gray-50">
                        <div>
                            <SearchDropdown
                                label={t('handed_over_to') || 'Kimə təslim edildi'}
                                options={staffList}
                                value={formData.handedOverToId}
                                onChange={(value) => handleInputChange('handedOverToId', value)}
                                disabled={isLoading || loadingStaff}
                                error={!!errors.handedOverToId}
                                placeholder={t('select_staff') || 'İşçi seçin'}
                                getOptionLabel={(staff) => `${staff.name} ${staff.surName || ''}`}
                                getOptionValue={(staff) => staff.id}
                                searchFields={['name', 'surName']}
                                className="w-full"
                            />
                            {errors.handedOverToId && (
                                <p className="mt-2 text-xs font-bold text-red-500 pl-1">{errors.handedOverToId}</p>
                            )}
                        </div>

                        <div>
                            <SearchDropdown
                                label={t('handed_over_by') || 'Kim təslim etdi'}
                                options={staffList}
                                value={formData.handedOverById}
                                onChange={(value) => handleInputChange('handedOverById', value)}
                                disabled={isLoading || loadingStaff}
                                error={!!errors.handedOverById}
                                placeholder={t('select_staff') || 'İşçi seçin'}
                                getOptionLabel={(staff) => `${staff.name} ${staff.surName || ''}`}
                                getOptionValue={(staff) => staff.id}
                                searchFields={['name', 'surName']}
                                className="w-full"
                            />
                            {errors.handedOverById && (
                                <p className="mt-2 text-xs font-bold text-red-500 pl-1">{errors.handedOverById}</p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <Input
                                label={t('note')}
                                type="text"
                                value={formData.note}
                                onChange={(e) => handleInputChange('note', e.target.value)}
                                error={errors.note}
                                placeholder={t('note_placeholder')}
                                icon={<MdDescription className="text-gray-400" />}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-12 mt-10 border-t border-gray-50">
                    <button
                        type="button"
                        onClick={() => navigate(cashHandoverPagePath)}
                        disabled={isLoading}
                        className="px-8 py-4 text-sm font-black text-gray-400 bg-white border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all uppercase tracking-widest"
                    >
                        {t('cancel') || 'Ləğv et'}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || (isEditMode && !hasFormChanged())}
                        className="px-10 py-4 text-sm font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>{isEditMode ? (t('updating') || 'Yenilənir...') : (t('adding') || 'Yaradılır...')}</span>
                            </>
                        ) : (
                            <>
                                {isEditMode ? <MdSave className="w-5 h-5" /> : <MdAdd className="w-5 h-5" />}
                                <span>{isEditMode ? (t('update') || 'Yadda Saxla') : (t('create') || 'Təsdiqlə')}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
