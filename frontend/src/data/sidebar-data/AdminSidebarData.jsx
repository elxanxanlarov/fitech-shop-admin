import { MdPeople, MdBarChart, MdAccessTime, MdSettings, MdShoppingCart, MdPointOfSale, MdAttachMoney, MdAccountBalanceWallet, MdDescription, MdLocalShipping, MdBusiness, MdSync, MdTransform, MdDeleteForever, MdSwapHoriz, MdWarehouse, MdDeleteSweep, MdCalculate, MdQrCode } from 'react-icons/md'
export const AdminSidebarData = [
  {
    title: 'staff_management',
    path: '/admin/staff',
    icon: <MdPeople />,
  },
  {
    title: 'final_delivery',
    path: '/admin/final-delivery',
    icon: <MdLocalShipping />,
  },
  {
    title: 'expense_management',
    path: '/admin/expenses',
    icon: <MdAttachMoney />,
  },
  {
    title: 'cash_handover_management',
    path: '/admin/cash-handover',
    icon: <MdAccountBalanceWallet />,
  },
  {
    title: 'product_management',
    path: '/admin/products',
    icon: <MdShoppingCart />,
  },
  {
    title: 'central_barcode_generator',
    path: '/admin/central-barcode-generator',
    icon: <MdQrCode />,
  },
  {
    title: 'product_branch_transfer',
    path: '/admin/product-branch-transfer',
    icon: <MdSwapHoriz />,
  },
  {
    title: 'product_branch_inventory',
    path: '/admin/central-warehouse',
    icon: <MdWarehouse />,
    requiredRole: 'SUPERADMIN',
  },
  {
    title: 'invoice_name_mapping',
    path: '/admin/invoice-name-mapping',
    icon: <MdDescription />,
  },
  {
    title: 'sale_management',
    path: '/admin/sales',
    icon: <MdPointOfSale />,
  },
  {
    title: 'activity_log',
    path: '/admin/activity-log',
    icon: <MdAccessTime />,
  },
  {
    title: 'statistics',
    path: '/admin/statistics',
    icon: <MdBarChart />,
  },
  {
    title: 'convert_center',
    path: '/admin/convert-center',
    icon: <MdTransform />,
    requiredRole: 'SUPERADMIN',
  },
  {
    title: 'deleted_elements',
    path: '/admin/deleted-elements',
    icon: <MdDeleteForever />,
    requiredRole: 'SUPERADMIN',
  },
  {
    title: 'branch_deleted_products',
    path: '/admin/branch-deleted-products',
    icon: <MdDeleteSweep />,
    requiredRole: 'SUPERADMIN',
  },
  {
    title: 'sync_center',
    path: '/sync-center',
    icon: <MdSync />,
    requiredRole: 'SUPERADMIN',
  },
  {
    title: 'sales_ledger',
    path: '/admin/sales-ledger',
    icon: <MdCalculate />,
    requiredRole: 'SUPERADMIN',
  },
  {
    title: 'settings',
    path: '/admin/settings',
    icon: <MdSettings />,
  },

]