import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '../components/ui/Alert';

export function useProductImage(onImageUrlClear) {
    const { t } = useTranslation('product');
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // File validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            Alert.error(t('error') || 'Xəta!', t('invalid_image_type') || 'Yalnız şəkil faylları (jpeg, jpg, png, gif, webp) yüklənə bilər');
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            Alert.error(t('error') || 'Xəta!', t('image_too_large') || 'Şəkil ölçüsü 5MB-dan böyük ola bilməz');
            e.target.value = '';
            return;
        }

        // Save file for later upload
        setSelectedImageFile(file);

        // Preview - FileReader ilə şəkil preview-i yarat
        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.result) {
                setImagePreview(reader.result);
                console.log('Preview set for new file');
            }
        };
        reader.onerror = () => {
            console.error('FileReader error');
            Alert.error(t('error') || 'Xəta!', t('image_preview_error') || 'Şəkil preview-i yaradıla bilmədi');
        };
        reader.readAsDataURL(file);

        // Clear URL input if file is selected
        if (onImageUrlClear) {
            onImageUrlClear('imageUrl', '');
        }
    };

    const resetImage = () => {
        setSelectedImageFile(null);
        setImagePreview(null);
    };

    return {
        selectedImageFile,
        imagePreview,
        handleImageSelect,
        resetImage,
        setSelectedImageFile,
        setImagePreview
    };
}
