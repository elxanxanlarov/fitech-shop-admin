import { useState, useEffect } from 'react';
import { categoryApi, subCategoryApi } from '../api';

export function useProductCategories(categoryIdFromQuery = null, isEditMode = false) {
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const response = await categoryApi.getAll();
                if (response.success && response.date) {
                    setCategories(response.date);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []);

    // Fetch subcategories when category changes
    const fetchSubCategories = async (categoryId) => {
        if (!categoryId) {
            setSubCategories([]);
            return;
        }
        try {
            const response = await subCategoryApi.getAll(categoryId);
            if (response.success && response.date) {
                setSubCategories(response.date);
            } else {
                setSubCategories([]);
            }
        } catch (error) {
            console.error('Error fetching subcategories:', error);
            setSubCategories([]);
        }
    };

    return {
        categories,
        subCategories,
        loadingCategories,
        fetchSubCategories,
        setCategories,
        setSubCategories
    };
}

