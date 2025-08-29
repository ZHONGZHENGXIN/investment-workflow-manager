import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { RootState, AppDispatch } from '../../store/store';
import { restoreAuth, fetchUserProfile } from '../../store/authSlice';
import { authService } from '../../services/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const { user, token, isLoading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // 如果没有用户信息但有token，尝试从本地存储恢复
    if (!user && !token) {
      dispatch(restoreAuth());
    }
    
    // 如果有token但没有用户信息，获取用户信息
    if (token && !user) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, user, token]);

  // 正在加载用户信息
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 检查是否已认证
  const isAuthenticated = authService.isAuthenticated() && user;

  if (!isAuthenticated) {
    // 重定向到登录页面，并保存当前路径
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;