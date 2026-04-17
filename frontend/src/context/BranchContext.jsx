import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const BranchContext = createContext(null);

export const BranchProvider = ({ children }) => {
    // Initial branch can be from localStorage or null (Central Warehouse)
    const [selectedBranchId, setSelectedBranchId] = useState(() => {
        return localStorage.getItem('selectedBranchId') || 'central';
    });
    const [selectedBranchName, setSelectedBranchName] = useState(() => {
        return localStorage.getItem('selectedBranchName') || '';
    });
    const { user } = useAuth();

    useEffect(() => {
        if (!user?.branchId) return;
        const r = user.role?.name?.toLowerCase() || '';
        // Yalnız superadmin və baş admin headerdə filial dəyişə bilər; qalanları öz filialına bağlanır
        const canPickBranch = r === 'superadmin' || (r === 'admin' && user.isBoss === true);
        if (!canPickBranch) {
            setSelectedBranchId(user.branchId);
        }
    }, [user]);

    useEffect(() => {
        if (selectedBranchId) {
            localStorage.setItem('selectedBranchId', selectedBranchId);
        } else {
            localStorage.removeItem('selectedBranchId');
        }
    }, [selectedBranchId]);

    useEffect(() => {
        if (selectedBranchName) {
            localStorage.setItem('selectedBranchName', selectedBranchName);
        } else {
            localStorage.removeItem('selectedBranchName');
        }
    }, [selectedBranchName]);

    const selectBranch = (id, name = '') => {
        setSelectedBranchId(id);
        setSelectedBranchName(name);
    };

    return (
        <BranchContext.Provider value={{ selectedBranchId, selectedBranchName, selectBranch }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => {
    const context = useContext(BranchContext);
    if (!context) {
        throw new Error('useBranch must be used within a BranchProvider');
    }
    return context;
};
