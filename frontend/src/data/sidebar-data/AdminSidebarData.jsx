import { MdPeople, MdBarChart, MdAccessTime, MdSettings, MdShoppingCart, MdPointOfSale, MdAttachMoney, MdAccountBalanceWallet, MdDescription, MdLocalShipping, MdBusiness, MdSync, MdTransform, MdDeleteForever, MdSwapHoriz } from 'react-icons/md'
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
    title: 'product_branch_transfer',
    path: '/admin/product-branch-transfer',
    icon: <MdSwapHoriz />,
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
    title: 'sync_center',
    path: '/sync-center',
    icon: <MdSync />,
    requiredRole: 'SUPERADMIN',
  },
  {
    title: 'settings',
    path: '/admin/settings',
    icon: <MdSettings />,
  },

]