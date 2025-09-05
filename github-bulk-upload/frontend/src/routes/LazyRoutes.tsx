import { lazy } from 'react';

// 页面组件懒加载
export const Dashboard = lazy(() => import('../pages/Dashboard'));
export const WorkflowManagement = lazy(() => import('../pages/WorkflowManagement'));
export const AttachmentManagement = lazy(() => import('../pages/AttachmentManagement'));
export const ExecutionPage = lazy(() => import('../pages/ExecutionPage'));
export const ReviewPage = lazy(() => import('../pages/ReviewPage'));
export const HistoryPage = lazy(() => import('../pages/HistoryPage'));
export const WorkflowExecution = lazy(() => import('../pages/WorkflowExecution'));
export const UserManagement = lazy(() => import('../pages/UserManagement'));

// 认证组件懒加载
export const LoginForm = lazy(() => import('../components/auth/LoginForm'));
export const RegisterForm = lazy(() => import('../components/auth/RegisterForm'));

// 预加载关键路由
export const preloadCriticalRoutes = () => {
  // 预加载仪表板和工作流管理页面
  import('../pages/Dashboard');
  import('../pages/WorkflowManagement');
};