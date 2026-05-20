import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSearchParams } from 'react-router-dom';
import { branchApi } from '../api';

const BranchContext = createContext(null);

export const BranchProvider = ({ children }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    
    // URL-dən filial məlumatlarını götür
    const urlBranchId = searchParams.get('branchId');
    const urlBranchName = searchParams.get('branchName');

    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(() => {
        return urlBranchId || localStorage.getItem('selectedBranchId') || 'central';
    });
    const [selectedBranchName, setSelectedBranchName] = useState(() => {
        return urlBranchName || localStorage.getItem('selectedBranchName') || '';
    });

    const [selectedStore, setSelectedStore] = useState(() => {
        return localStorage.getItem('selectedStore') || 'FITECH';
    });

    // Fetch all active branches and keep in context
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await branchApi.getAll();
                if (response.success && response.data) {
                    setBranches(response.data);
                }
            } catch (error) {
                console.error('Error fetching branches in BranchProvider:', error);
            }
        };
        fetchBranches();
    }, []);

    // Find the full branch object
    const selectedBranch = branches.find(b => b.id === selectedBranchId) || null;

    // Auto-reset store to FITECH if the branch doesn't allow Ismayilli
    useEffect(() => {
        if (selectedBranchId === 'central') {
            if (selectedStore === 'ISMAYILLI') {
                setSelectedStore('FITECH');
            }
        } else if (selectedBranch && !selectedBranch.isShowIsmayilli) {
            if (selectedStore === 'ISMAYILLI') {
                setSelectedStore('FITECH');
            }
        }
    }, [selectedBranchId, selectedBranch, selectedStore]);

    // URL dəyişəndə state-i yenilə
    useEffect(() => {
        if (urlBranchId && urlBranchId !== selectedBranchId) {
            setSelectedBranchId(urlBranchId);
        }
        if (urlBranchName && urlBranchName !== selectedBranchName) {
            setSelectedBranchName(urlBranchName);
        }
    }, [urlBranchId, urlBranchName, selectedBranchId, selectedBranchName]);

    useEffect(() => {
        if (!user?.branchId) return;
        const r = user.role?.name?.toLowerCase() || '';
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

    useEffect(() => {
        localStorage.setItem('selectedStore', selectedStore);
    }, [selectedStore]);

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
        <BranchContext.Provider value={{ 
            branches,
            selectedBranchId, 
            selectedBranchName, 
            selectedBranch,
            selectedStore, 
            setSelectedStore,
            selectBranch 
        }}>
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
