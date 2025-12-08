import { useParams } from "react-router-dom"
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
import CategoryForm from "../components/forms/CategoryForm.jsx"
import SubCategoryForm from "../components/forms/SubCategoryForm.jsx"
import Expenses from "../components/panel/Expenses.jsx"
import ExpenseForm from "../components/forms/ExpenseForm.jsx"
import CashHandover from "../components/panel/CashHandover.jsx"
import CashHandoverForm from "../components/forms/CashHandoverForm.jsx"
import Profile from "../components/panel/Profile.jsx"


export default function AdminPanel() {
    const { slug } = useParams()
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
            {slug === "expenses" && <Expenses />}
            {slug === "cash-handover" && <CashHandover />}
            {slug === "profile" && <Profile />}
        </div>
    )
}
