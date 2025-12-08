import Sales from "../components/panel/Sales"
import Expenses from "../components/panel/Expenses"
import CashHandover from "../components/panel/CashHandover"
import Statistics from "../components/panel/Statistics"
import Profile from "../components/panel/Profile"
import { useParams } from "react-router-dom"
import SaleForm from "../components/forms/SaleForm"
import ExpenseForm from "../components/forms/ExpenseForm"
import CashHandoverForm from "../components/forms/CashHandoverForm"
export default function RepeptionPage() {
    const { slug } = useParams()
    return (
        <div>
            {slug === "sale-form" && <SaleForm />}
            {slug === "expense-form" && <ExpenseForm />}
            {slug === "cash-handover-form" && <CashHandoverForm />}


            {slug === "sales" && <Sales />}
            {slug === "expenses" && <Expenses />}
            {slug === "cash-handover" && <CashHandover />}  
            {slug === "statistics" && <Statistics />}
            {slug === "profile" && <Profile />}
        </div>
    )
}