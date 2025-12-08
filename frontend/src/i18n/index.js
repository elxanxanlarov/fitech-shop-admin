import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import azTranslation from "./locales/az/translation.json";
import enTranslation from "./locales/en/translation.json";
import azAdminPanel from "./locales/az/admin-panel.json";
import enAdminPanel from "./locales/en/admin-panel.json";
import azStaff from "./locales/az/staff.json";
import enStaff from "./locales/en/staff.json";
import azAuth from "./locales/az/auth.json";
import enAuth from "./locales/en/auth.json";
import azSidebar from "./locales/az/sidebar.json";
import enSidebar from "./locales/en/sidebar.json";
import azAlert from "./locales/az/alert.json";
import enAlert from "./locales/en/alert.json";
import azProduct from "./locales/az/product.json";
import enProduct from "./locales/en/product.json";
import azSale from "./locales/az/sale.json";
import enSale from "./locales/en/sale.json";
import azStatistics from "./locales/az/statistics.json";
import enStatistics from "./locales/en/statistics.json";
import azActivityLog from "./locales/az/activityLog.json";
import enActivityLog from "./locales/en/activityLog.json";
import azSettings from "./locales/az/settings.json";
import enSettings from "./locales/en/settings.json";
import azRole from "./locales/az/role.json";
import enRole from "./locales/en/role.json";
import azCategory from "./locales/az/category.json";
import enCategory from "./locales/en/category.json";
import azExpense from "./locales/az/expense.json";
import enExpense from "./locales/en/expense.json";
import azCashHandover from "./locales/az/cashHandover.json";
import enCashHandover from "./locales/en/cashHandover.json";

const resources = {
  az: {
    translation: azTranslation,
    "admin-panel": azAdminPanel,
    staff: azStaff,
    auth: azAuth,
    sidebar: azSidebar,
    alert: azAlert,
    product: azProduct,
    sale: azSale,
    statistics: azStatistics,
    activityLog: azActivityLog,
    settings: azSettings,
    role: azRole,
    category: azCategory,
    expense: azExpense,
    cashHandover: azCashHandover,
  },
  en: {
    translation: enTranslation,
    "admin-panel": enAdminPanel,
    staff: enStaff,
    auth: enAuth,
    sidebar: enSidebar,
    alert: enAlert,
    product: enProduct,
    sale: enSale,
    statistics: enStatistics,
    activityLog: enActivityLog,
    settings: enSettings,
    role: enRole,
    category: enCategory,
    expense: enExpense,
    cashHandover: enCashHandover,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ["az", "en"],
    fallbackLng: "az",
    defaultNS: "translation",
    ns: ["translation", "admin-panel", "staff", "auth", "sidebar", "alert", "product", "sale", "statistics", "activityLog", "settings", "role", "category", "expense", "cashHandover"],
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
