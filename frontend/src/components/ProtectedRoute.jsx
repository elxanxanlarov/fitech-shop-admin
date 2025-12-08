import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('token');
  
  // Token yoxdursa login səhifəsinə yönləndir
  if (!token) {
    return <Navigate to="/dashboard/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;

