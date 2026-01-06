import React from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../../ui/Input';
import SearchDropdown from '../../ui/SearchDropdown';
import { MdInventory, MdDescription, MdQrCode, MdCloudUpload } from 'react-icons/md';

export default function ProductBasicInfo({
    formData,
    errors,
    isLoading,
    loadingCategories,
    categories,
    subCategories,
    imagePreview,
    isEditMode,
    onInputChange,
    onCategoryChange,
    onImageSelect
}) {
    const { t } = useTranslation('product');

    // Get image URL for preview
    const getImageUrl = () => {
        const url = String(formData.imageUrl || '').trim();
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const baseUrl = apiUrl.replace('/api', '');
        return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                <MdInventory className="inline w-5 h-5 mr-2" />
                {t('basic_info') || 'Əsas Məlumatlar'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                    label={t('name')}
                    type="text"
                    value={formData.name}
                    onChange={(e) => onInputChange('name', e.target.value)}
                    error={errors.name}
                    placeholder={t('name_placeholder') || 'Məhsul adını daxil edin'}
                    icon={<MdInventory />}
                    required
                />

                <Input
                    label={t('barcode')}
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => onInputChange('barcode', e.target.value)}
                    error={errors.barcode}
                    placeholder={t('barcode_placeholder') || 'Barcode daxil edin'}
                    icon={<MdQrCode />}
                />

                <div className="md:col-span-2">
                    <Input
                        label={t('description')}
                        type="text"
                        value={formData.description}
                        onChange={(e) => onInputChange('description', e.target.value)}
                        error={errors.description}
                        placeholder={t('description_placeholder') || 'Məhsul təsviri daxil edin'}
                        icon={<MdDescription />}
                    />
                </div>

                <div>
                    <SearchDropdown
                        label={t('category') || 'Kateqoriya'}
                        options={categories}
                        value={formData.categoryId}
                        onChange={onCategoryChange}
                        placeholder={t('select_category') || 'Kateqoriya seçin'}
                        disabled={isLoading || loadingCategories}
                        error={!!errors.categoryId}
                        searchFields={['name']}
                        className="w-full"
                    />
                    {errors.categoryId && (
                        <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
                    )}
                </div>

                <div>
                    <SearchDropdown
                        label={t('subcategory') || 'Alt Kateqoriya'}
                        options={subCategories}
                        value={formData.subCategoryId}
                        onChange={(value) => onInputChange('subCategoryId', value)}
                        placeholder={t('select_subcategory') || 'Alt kateqoriya seçin'}
                        disabled={isLoading || !formData.categoryId || loadingCategories}
                        error={!!errors.subCategoryId}
                        searchFields={['name']}
                        className="w-full"
                    />
                    {errors.subCategoryId && (
                        <p className="mt-1 text-sm text-red-600">{errors.subCategoryId}</p>
                    )}
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('image') || 'Şəkil'}
                    </label>

                    {/* Image Preview */}
                    {(imagePreview || formData.imageUrl) && (
                        <div className="mb-3">
                            <div className="relative inline-block">
                                <img
                                    src={imagePreview || getImageUrl()}
                                    alt={formData.name || 'Product image'}
                                    className="h-48 w-48 object-cover rounded-lg border border-gray-300 shadow-sm"
                                    style={{ display: 'block' }}
                                    onError={(e) => {
                                        console.error('Image load error');
                                        e.target.style.display = 'none';
                                    }}
                                    onLoad={() => {
                                        console.log('Image loaded successfully');
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* File Upload */}
                    <div>
                        <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-fit">
                            <MdCloudUpload className="w-5 h-5" />
                            <span className="text-sm font-medium">
                                {t('select_image') || 'Şəkil Seç'}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={onImageSelect}
                                disabled={isLoading}
                            />
                        </label>
                        {errors.imageUrl && (
                            <p className="mt-1 text-sm text-red-600">{errors.imageUrl}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

