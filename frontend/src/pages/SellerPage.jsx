import { Navigate, useParams } from 'react-router-dom';
import SellerPOS from '../components/seller/SellerPOS.jsx';
import SellerSalesHistory from '../components/seller/SellerSalesHistory.jsx';
import SellerReturn from '../components/seller/SellerReturn.jsx';
import SellerReceipt from '../components/seller/SellerReceipt.jsx';

export default function SellerPage() {
    const { slug } = useParams();

    switch (slug) {
        case 'pos':
            return <SellerPOS />;
        case 'history':
            return <SellerSalesHistory />;
        case 'return':
            return <SellerReturn />;
        case 'check':
            return <SellerReceipt />;
        default:
            return <Navigate to="/seller/pos" replace />;
    }
}
