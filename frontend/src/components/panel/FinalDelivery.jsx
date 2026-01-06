import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Eye, Plus } from 'lucide-react';
import { finalDeliveryApi } from '../../api';

export default function FinalDelivery() {
    const { t, i18n } = useTranslation('finalDelivery');
    const { t: tAlert } = useTranslation('alert');
    const navigate = useNavigate();
    const location = useLocation();
    const [deliveryData, setDeliveryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    });

    const columns = useMemo(() => [
        {
            key: 'title',
            label: t('date_range') || 'Tarix Aralığı',
            render: (value) => value || '-',
        },
        {
            key: 'totalProductCount',
            label: t('total_products') || 'Ümumi Məhsul Sayı',
            render: (value) => value || 0,
        },
        {
            key: 'totalStockQuantity',
            label: t('total_stock') || 'Ümumi Stok',
            render: (value) => value || 0,
        },
        {
            key: 'staff',
            label: t('created_by') || 'Yaradan',
            render: (_value, item) => {
                if (item.staff) {
                    return `${item.staff.name} ${item.staff.surName || ''}`.trim();
                }
                return '-';
            },
        },
        {
            key: 'createdAt',
            label: t('created_at') || 'Yaradılıb',
            render: (value) => {
                if (!value) return '-';
                return new Date(value).toLocaleDateString(i18n.language === 'az' ? 'az-AZ' : 'en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            },
        },
    ], [t, i18n.language]);

    const fetchDeliveries = async (page = 1) => {
        setLoading(true);
        try {
            const response = await finalDeliveryApi.getAll({ page, limit: pagination.limit });
            if (response.success && response.data) {
                // Serverdən gələn məlumatı cədvəl üçün formalaşdırırıq
                const normalized = response.data.map(delivery => {
                    const items = delivery.items || [];
                    const totalProducts = items.length;
                    const totalStock = items.reduce(
                        (sum, item) => sum + (item.remainingStock || item.stock || 0),
                        0
                    );

                    return {
                        ...delivery,
                        totalProductCount: totalProducts,
                        totalStockQuantity: totalStock,
                    };
                });

                setDeliveryData(normalized);
                if (response.pagination) {
                    setPagination(response.pagination);
                }
            } else {
                setDeliveryData([]);
            }
        } catch (error) {
            console.error('Error fetching final deliveries:', error);
            Alert.error(t('error_fetching') || 'Xəta!', t('error_fetching_text') || 'Yekun təslimatlar alınarkən xəta baş verdi');
            setDeliveryData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveries(1);
    }, []);

    const handleView = (delivery) => {
        const isAdmin = location.pathname.includes('/admin');
        const basePath = isAdmin ? '/admin' : '/reception';
        navigate(`${basePath}/final-delivery-form?id=${delivery.id}`);
    };

    const handlePageChange = (newPage) => {
        fetchDeliveries(newPage);
    };

    const handleCreateNavigate = () => {
        const isAdmin = location.pathname.includes('/admin');
        const basePath = isAdmin ? '/admin' : '/reception';
        navigate(`${basePath}/final-delivery-form`);
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('title') || 'Yekun Təslimat'}</h1>
                    <p className="text-gray-600">{t('description') || 'Yekun təslimatları idarə edin'}</p>
                </div>
                <button
                    onClick={handleCreateNavigate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    {t('create_delivery') || 'Yekun təslimat yarat'}
                </button>
            </div>

            <TableTemplate
                data={deliveryData}
                columns={columns}
                title={t('deliveries') || 'Təslimatlar'}
                onView={handleView}
                showBulkActions={false}
                showFilters={false}
                showSearch={false}
                showDateFilter={false}
                loading={loading}
                pagination={pagination}
                onPageChange={handlePageChange}
                emptyState={{
                    icon: 'package',
                    title: t('no_data') || 'Məlumat yoxdur',
                    description: t('no_deliveries') || 'Hələ heç bir yekun təslimat yoxdur',
                    showAction: false
                }}
            />
        </div>
    );
}

