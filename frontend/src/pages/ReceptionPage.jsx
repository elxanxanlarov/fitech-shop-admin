import Sales from "../components/panel/Sales"
import Expenses from "../components/panel/Expenses"
import CashHandover from "../components/panel/CashHandover"
import Statistics from "../components/panel/Statistics"
import Profile from "../components/panel/Profile"
import { useParams } from "react-router-dom"
import SaleForm from "../components/forms/SaleForm"
import ExpenseForm from "../components/forms/ExpenseForm"
import CashHandoverForm from "../components/forms/CashHandoverForm"
import CreditPayments from "../components/panel/CreditPayments"
import Check from "../components/panel/Check"

export default function ReceptionPage() {
    const { slug } = useParams()
    return (
        <div>
            {/* Forms */}
            {slug === "sale-form" && <SaleForm />}
            {slug === "expense-form" && <ExpenseForm />}
            {slug === "cash-handover-form" && <CashHandoverForm />}

            {/* Panels */}
            {slug === "sales" && <Sales />}
            {slug === "expenses" && <Expenses />}
            {slug === "cash-handover" && <CashHandover />}
            {slug === "credit-payments" && <CreditPayments />}
            {slug === "statistics" && <Statistics />}
            {slug === "profile" && <Profile />}
            {slug === "check" && <Check />}
        </div>
    )
}
