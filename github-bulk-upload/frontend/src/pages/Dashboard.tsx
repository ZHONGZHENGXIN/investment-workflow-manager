import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveLayout } from '../components/layout/ResponsiveLayout';
import { ResponsiveGrid, ResponsiveGridItem } from '../components/common/ResponsiveGrid';
import { ResponsiveCard } from '../components/common/ResponsiveCard';
import { TouchFriendlyButton } from '../components/common/TouchFriendlyButton';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      id: 'workflows',
      name: '管理流程',
      description: '创建、编辑和管理您的投资决策流程',
      path: '/workflows',
      icon: (
        <svg className="w-8 h-8 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'text-blue-600'
    },
    {
      id: 'executions',
      name: '执行流程',
      description: '按照流程进行投资决策并记录',
      path: '/executions',
      icon: (
        <svg className="w-8 h-8 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'text-green-600'
    },
    {
      id: 'history',
      name: '执行历史',
      description: '查看和管理历史执行记录',
      path: '/history',
      icon: (
        <svg className="w-8 h-8 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-purple-600'
    },
    {
      id: 'reviews',
      name: '投资复盘',
      description: '分析投资决策，总结经验教训',
      path: '/reviews',
      icon: (
        <svg className="w-8 h-8 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'text-orange-600'
    },
    {
      id: 'attachments',
      name: '附件管理',
      description: '管理您上传的所有文件和附件',
      path: '/attachments',
      icon: (
        <svg className="w-8 h-8 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      ),
      color: 'text-indigo-600'
    }
  ];

  return (
    <ResponsiveLayout
      title="欢迎使用投资流程管理系统"
      subtitle="在这里您可以创建、管理和执行您的投资决策流程"
    >
      <div className="space-y-8">
        {/* 快速开始 */}
        <ResponsiveCard>
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                开始您的投资之旅
              </h2>
              <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto">
                通过结构化的流程管理，让您的投资决策更加科学和系统化
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <TouchFriendlyButton
                variant="primary"
                size="lg"
                onClick={() => navigate('/workflows')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              >
                创建新流程
              </TouchFriendlyButton>
              
              <TouchFriendlyButton
                variant="outline"
                size="lg"
                onClick={() => navigate('/executions')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
              >
                开始执行
              </TouchFriendlyButton>
            </div>
          </div>
        </ResponsiveCard>

        {/* 功能模块 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">功能模块</h3>
          <ResponsiveGrid
            cols={{ default: 1, sm: 2, lg: 3, xl: 5 }}
            gap={4}
          >
            {features.map((feature) => (
              <ResponsiveGridItem key={feature.id}>
                <ResponsiveCard
                  hover
                  clickable
                  onClick={() => navigate(feature.path)}
                  className="h-full"
                >
                  <div className="text-center p-2 sm:p-4">
                    <div className={`${feature.color} mb-3 sm:mb-4 flex justify-center`}>
                      {feature.icon}
                    </div>
                    <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                      {feature.name}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </ResponsiveCard>
              </ResponsiveGridItem>
            ))}
          </ResponsiveGrid>
        </div>

        {/* 使用提示 */}
        <ResponsiveCard className="bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">使用提示</h4>
              <p className="text-sm text-blue-800">
                建议先创建投资流程模板，然后执行流程并记录决策过程，最后通过复盘功能总结经验。
                系统会自动保存您的操作历史，方便后续查看和分析。
              </p>
            </div>
          </div>
        </ResponsiveCard>
      </div>
    </ResponsiveLayout>
  );
};

export default Dashboard;