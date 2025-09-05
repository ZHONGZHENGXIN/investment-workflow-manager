import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store/store';
import { restoreAuth } from './store/authSlice';
import { OfflineProvider } from './contexts/OfflineContext';
import {
  Dashboard,
  WorkflowManagement,
  AttachmentManagement,
  ExecutionPage,
  ReviewPage,
  HistoryPage,
  LoginForm,
  RegisterForm,
  WorkflowExecution,
  UserManagement,
  preloadCriticalRoutes,
} from './routes/LazyRoutes';
import LazyRoute from './components/common/LazyRoute';
import PerformanceMonitor from './components/common/PerformanceMonitor';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';

// 应用初始化组件
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // 应用启动时恢复认证状态
    dispatch(restoreAuth());
    
    // 预加载关键路由
    preloadCriticalRoutes();
  }, [dispatch]);

  return <>{children}</>;
};

function App() {
  return (
    <Provider store={store}>
      <OfflineProvider>
        <Router>
          <AppInitializer>
            <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* 公开路由 */}
              <Route path="/login" element={
                <LazyRoute>
                  <LoginForm />
                </LazyRoute>
              } />
              <Route path="/register" element={
                <LazyRoute>
                  <RegisterForm />
                </LazyRoute>
              } />
              
              {/* 受保护的路由 */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LazyRoute>
                        <Dashboard />
                      </LazyRoute>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workflows"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LazyRoute>
                        <WorkflowManagement />
                      </LazyRoute>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attachments"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LazyRoute>
                        <AttachmentManagement />
                      </LazyRoute>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/executions"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LazyRoute>
                        <ExecutionPage />
                      </LazyRoute>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/executions/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LazyRoute>
                        <WorkflowExecution />
                      </LazyRoute>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviews"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LazyRoute>
                        <ReviewPage />
                      </LazyRoute>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LazyRoute>
                        <HistoryPage />
                      </LazyRoute>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LazyRoute>
                        <UserManagement />
                      </LazyRoute>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              {/* 默认重定向 */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* 404页面 */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <Toaster position="top-right" />
            <PerformanceMonitor />
          </div>
        </AppInitializer>
      </Router>
      </OfflineProvider>
    </Provider>
  );
}

export default App;