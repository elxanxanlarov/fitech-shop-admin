import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './ui/LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const token = sessionStorage.getItem('token');

  // Yüklənirsə spinner göstər
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Yüklənir..." />
      </div>
    );
  }

  // Token və ya user yoxdursa login səhifəsinə yönləndir
  if (!token || !user) {
    return <Navigate to="/dashboard/login" replace />;
  }

  const roleName = user.role?.name?.toUpperCase();

  // Xüsusi rol tələbi varsa yoxla
  if (requiredRole && roleName !== requiredRole.toUpperCase()) {
    // Əgər tələb olunan rolu yoxdursa, geri (və ya başqa yerə) at
    let redirectPath = "/admin/statistics";
    if (roleName === 'RECEPTION') {
      redirectPath = "/reception/sales";
    } else if (roleName === 'SELLER') {
      redirectPath = "/seller/pos";
    } else if (user.store === 'ISMAYILLI') {
      redirectPath = "/admin/ismayilli-products";
    }
    return <Navigate to={redirectPath} replace />;
  }

  const isAdminPath = location.pathname.startsWith('/admin');
  const isReceptionPath = location.pathname.startsWith('/reception');
  const isSellerPath = location.pathname.startsWith('/seller');

  // Rola görə giriş icazəsi yoxlaması (Middleware)
  if (isAdminPath && !(roleName === 'ADMIN' || roleName === 'SUPERADMIN' || roleName === 'ISMAYILLIADMIN' || roleName === 'ISMAYILLISELLER')) {
    // Əgər admin yolundadırsa amma admin deyilsə, uyğun panelə at
    if (roleName === 'SELLER') return <Navigate to="/seller/pos" replace />;
    return <Navigate to="/reception/sales" replace />;
  }

  if (isReceptionPath && roleName !== 'RECEPTION' && roleName !== 'ADMIN' && roleName !== 'SUPERADMIN') {
    // Əgər reception yolundadırsa və uyğun rolu yoxdursa
    if (roleName === 'SELLER') return <Navigate to="/seller/pos" replace />;
    return <Navigate to="/dashboard/login" replace />;
  }

  if (isSellerPath && !(roleName === 'SELLER' || roleName === 'ADMIN' || roleName === 'SUPERADMIN')) {
    // Seller yolundadırsa amma uyğun rolu yoxdursa
    if (roleName === 'RECEPTION') return <Navigate to="/reception/sales" replace />;
    return <Navigate to="/dashboard/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
