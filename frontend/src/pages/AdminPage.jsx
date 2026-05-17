import { useParams, Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { isFilialAdmin, FILIAL_ADMIN_BLOCKED_SETTINGS_SLUGS } from "../utils/accessHelpers"
import Staff from "../components/panel/Staff.jsx"
import StaffForm from "../components/forms/StaffForm.jsx"
import Products from "../components/panel/Product.jsx"
import ProductForm from "../components/forms/ProductForm.jsx"
import Sales from "../components/panel/Sales.jsx"
import SaleForm from "../components/forms/SaleForm.jsx"
import Check from "../components/panel/Check.jsx"
import Statistics from "../components/panel/Statistics.jsx"
import ActivityLog from "../components/panel/ActivityLog.jsx"
import ActivityLogDetail from "../components/panel/ActivityLogDetail.jsx"
import Settings from "../components/panel/Settings.jsx"
import RolesManagement from "../components/panel/RolesManagement.jsx"
import RoleForm from "../components/forms/RoleForm.jsx"
import CategoryManagement from "../components/panel/CategoryManagement.jsx"
import SubCategoryManagement from "../components/panel/SubCategoryManagement.jsx"
import CategoryForm from "../components/forms/CategoryForm.jsx"
import SubCategoryForm from "../components/forms/SubCategoryForm.jsx"
import Expenses from "../components/panel/Expenses.jsx"
import ExpenseForm from "../components/forms/ExpenseForm.jsx"
import CashHandover from "../components/panel/CashHandover.jsx"
import CashHandoverForm from "../components/forms/CashHandoverForm.jsx"
import Profile from "../components/panel/Profile.jsx"
import CreditPayments from "../components/panel/CreditPayments.jsx"
import CreditTermManagement from "../components/panel/CreditTermManagement.jsx"
import InvoiceNameMapping from "../components/panel/InvoiceNameMapping.jsx"
import FinalDelivery from "../components/panel/FinalDelivery.jsx"
import FinalDeliveryForm from "../components/forms/FinalDeliveryForm.jsx"
import BranchManagement from "../components/panel/BranchManagement.jsx"
import BranchForm from "../components/forms/BranchForm.jsx"
import StockTransferForm from "../components/forms/StockTransferForm.jsx"
import BranchDetail from "../components/panel/BranchDetail.jsx"
import CentralWarehouse from "../components/panel/CentralWarehouse.jsx"
import ConvertCenter from "../components/panel/ConvertCenter.jsx"
import DeletedElements from "../components/panel/DeletedElements.jsx"
import ProductBranchTransfer from "../components/panel/ProductBranchTransfer.jsx"
import BranchDeletedProducts from "../components/panel/BranchDeletedProducts.jsx"
import SalesLedger from "../components/panel/SalesLedger.jsx"
import CentralBarcodeGenerator from "../components/panel/CentralBarcodeGenerator.jsx"
import IsmayilliProducts from "../components/ismayilli/IsmayilliProducts.jsx"
import IsmayilliSales from "../components/ismayilli/IsmayilliSales.jsx"
import IsmayilliStatistics from "../components/ismayilli/IsmayilliStatistics.jsx"
import IsmayilliStaff from "../components/ismayilli/IsmayilliStaff.jsx"
import IsmayilliBarcodeGenerator from "../components/ismayilli/IsmayilliBarcodeGenerator.jsx"


export default function AdminPanel() {
    const { slug } = useParams()
    const { user } = useAuth()

    if (slug && isFilialAdmin(user) && FILIAL_ADMIN_BLOCKED_SETTINGS_SLUGS.has(slug)) {
        return <Navigate to="/admin/settings" replace />
    }

    return (
        <div>
            {/* Forms */}
            {slug === "staff-form" && <StaffForm />}
            {slug === "product-form" && <ProductForm />}
            {slug === "sale-form" && <SaleForm />}
            {slug === "role-form" && <RoleForm />}
            {slug === "subcategory-form" && <SubCategoryForm />}
            {slug === "category-form" && <CategoryForm />}
            {slug === "expense-form" && <ExpenseForm />}
            {slug === "cash-handover-form" && <CashHandoverForm />}
            {slug === "final-delivery-form" && <FinalDeliveryForm />}
            {slug === "branch-form" && <BranchForm />}
            {slug === "stock-transfer-form" && <StockTransferForm />}


            {/* Panels */}
            {slug === "staff" && <Staff />}
            {slug === "products" && <Products />}
            {slug === "sales" && <Sales />}
            {slug === "check" && <Check />}
            {slug === "statistics" && <Statistics />}
            {slug === "activity-log" && <ActivityLog />}
            {slug === "activity-log-detail" && <ActivityLogDetail />}
            {slug === "settings" && <Settings />}
            {slug === "roles-management" && <RolesManagement />}
            {slug === "category-management" && <CategoryManagement />}
            {slug === "credit-term-management" && <CreditTermManagement />}
            {slug === "expenses" && <Expenses />}
            {slug === "cash-handover" && <CashHandover />}
            {slug === "credit-payments" && <CreditPayments />}
            {slug === "invoice-name-mapping" && <InvoiceNameMapping />}
            {slug === "final-delivery" && <FinalDelivery />}
            {slug === "branch-management" && <BranchManagement />}
            {slug === "branch-detail" && <BranchDetail />}
            {slug === "central-warehouse" && <CentralWarehouse />}
            {slug === "convert-center" && <ConvertCenter />}
            {slug === "deleted-elements" && <DeletedElements />}
            {slug === "product-branch-transfer" && <ProductBranchTransfer />}
            {slug === "subcategory-management" && <SubCategoryManagement />}
            {slug === "profile" && <Profile />}
            {slug === "branch-deleted-products" && <BranchDeletedProducts />}
            {slug === "sales-ledger" && <SalesLedger />}
            {slug === "central-barcode-generator" && <CentralBarcodeGenerator />}
            
            {/* Ismayilli Panels */}
            {slug === "ismayilli-products" && <IsmayilliProducts />}
            {slug === "ismayilli-sales" && <IsmayilliSales />}
            {slug === "ismayilli-statistics" && <IsmayilliStatistics />}
            {slug === "ismayilli-staff" && <IsmayilliStaff />}
            {slug === "ismayilli-barcode-generator" && <IsmayilliBarcodeGenerator />}
        </div>
    )
}
