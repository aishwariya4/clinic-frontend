// src/components/PrivateRoute.jsx

// Import Navigate to redirect users if they are not logged in
import { Navigate } from 'react-router-dom';

// This component is used to protect admin-only routes
function PrivateRoute({ children }) {
  // Check if an admin token is stored in localStorage (indicating login)
  const token = localStorage.getItem('adminToken');

  // If token exists, render the requested page (children)
  // If not, redirect to the admin login page
  return token ? children : <Navigate to="/admin/login" replace />;
}

// Export the component so it can be used in route protection
export default PrivateRoute;
