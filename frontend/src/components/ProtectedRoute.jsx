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
    return <Navigate to={roleName === 'RECEPTION' ? "/reception/sales" : "/admin/statistics"} replace />;
  }

  const isAdminPath = location.pathname.startsWith('/admin');
  const isReceptionPath = location.pathname.startsWith('/reception');

  // Rola görə giriş icazəsi yoxlaması (Middleware)
  if (isAdminPath && !(roleName === 'ADMIN' || roleName === 'SUPERADMIN')) {
    // Əgər admin yolundadırsa amma admin deyilsə, reception-a at
    return <Navigate to="/reception/sales" replace />;
  }

  if (isReceptionPath && roleName !== 'RECEPTION' && roleName !== 'ADMIN' && roleName !== 'SUPERADMIN') {
    // Əgər reception yolundadırsa və uyğun rolu yoxdursa
    return <Navigate to="/dashboard/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
