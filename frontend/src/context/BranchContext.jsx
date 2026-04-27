import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSearchParams } from 'react-router-dom';

const BranchContext = createContext(null);

export const BranchProvider = ({ children }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    
    // URL-dən filial məlumatlarını götür
    const urlBranchId = searchParams.get('branchId');
    const urlBranchName = searchParams.get('branchName');

    const [selectedBranchId, setSelectedBranchId] = useState(() => {
        return urlBranchId || localStorage.getItem('selectedBranchId') || 'central';
    });
    const [selectedBranchName, setSelectedBranchName] = useState(() => {
        return urlBranchName || localStorage.getItem('selectedBranchName') || '';
    });

    // URL dəyişəndə state-i yenilə
    useEffect(() => {
        if (urlBranchId && urlBranchId !== selectedBranchId) {
            setSelectedBranchId(urlBranchId);
        }
        if (urlBranchName && urlBranchName !== selectedBranchName) {
            setSelectedBranchName(urlBranchName);
        }
    }, [urlBranchId, urlBranchName]);

    useEffect(() => {
        if (!user?.branchId) return;
        const r = user.role?.name?.toLowerCase() || '';
        const canPickBranch = r === 'superadmin' || (r === 'admin' && user.isBoss === true);
        if (!canPickBranch) {
            setSelectedBranchId(user.branchId);
            // URL-i də təmizləyə bilərik və ya öz filialını qoya bilərik
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
        
        // URL-i yenilə
        const newParams = new URLSearchParams(searchParams);
        if (id === 'central') {
            newParams.delete('branchId');
            newParams.delete('branchName');
        } else {
            newParams.set('branchId', id);
            newParams.set('branchName', name);
        }
        setSearchParams(newParams);
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
