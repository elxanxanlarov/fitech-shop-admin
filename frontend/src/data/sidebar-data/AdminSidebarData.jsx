import { MdPeople, MdBarChart, MdAccessTime, MdSettings, MdShoppingCart, MdPointOfSale, MdAttachMoney, MdAccountBalanceWallet, MdDescription } from 'react-icons/md'
export const AdminSidebarData = [
  {
    title: 'staff_management',
    path: '/admin/staff',
    icon: <MdPeople />,
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
    title: 'settings',
    path: '/admin/settings',
    icon: <MdSettings />,
  },
  
]