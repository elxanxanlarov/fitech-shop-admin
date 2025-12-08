import { MdPeople, MdPersonAdd, MdBarChart , MdShoppingCart, MdAttachMoney, MdAccountBalanceWallet} from 'react-icons/md'
export const ReceptionSidebarData = [
  {
    title: 'sale_management',
    path: '/reception/sales',
    icon: <MdShoppingCart />,
  },
  {
    title: 'expense_management',
    path: '/reception/expenses',
    icon: <MdAttachMoney />,
  },
  {
    title: 'cash_handover_management',
    path: '/reception/cash-handover',
    icon: <MdAccountBalanceWallet />,
  },
  {
    title: 'statistics',
    path: '/reception/statistics',
    icon: <MdBarChart />,
  },
]

