import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './ui/LoadingSpinner';

const ProtectedRoute = ({ children }) => {
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

  const roleName = user.role?.name?.toLowerCase();
  const isAdminPath = location.pathname.startsWith('/admin');
  const isReceptionPath = location.pathname.startsWith('/reception');

  // Rola görə giriş icazəsi yoxlaması (Middleware)
  if (isAdminPath && !(roleName === 'admin' || roleName === 'superadmin')) {
    // Əgər admin yolundadırsa amma admin deyilsə, reception-a at
    return <Navigate to="/reception/sales" replace />;
  }

  if (isReceptionPath && roleName !== 'reception' && roleName !== 'admin' && roleName !== 'superadmin') {
    // Əgər reception yolundadırsa və uyğun rolu yoxdursa
    return <Navigate to="/dashboard/login" replace />;
  }

  // Admin və superadmin hər yerə girə bilər, amma reception yalnız öz yerinə
  if (isReceptionPath && (roleName === 'admin' || roleName === 'superadmin')) {
    // Admin reception səhifələrinə də baxa bilər
    return children;
  }

  return children;
};

export default ProtectedRoute;
