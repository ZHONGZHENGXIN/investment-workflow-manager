import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDatabase } from './utils/database';

// Import monitoring utilities
import { logger } from './utils/logger';
import { performanceMonitoring, errorMonitoring, userBehaviorTracking, systemResourceMonitoring } from './middleware/monitoring';
import { analyticsSystem } from './utils/analytics';

// Import routes
import authRoutes from './routes/auth';
import monitoringRoutes from './routes/monitoring';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 监控中间件（在其他中间件之前）
app.use(performanceMonitoring);
app.use(userBehaviorTracking);

// 基础中间件
app.use(helmet());
app.use(cors());

// 自定义morgan格式，集成到我们的日志系统
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.http(message.trim());
    }
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 基础路由
app.get('/api', (req, res) => {
  res.json({ message: '投资流程管理API服务器运行中' });
});

// 监控路由（无需认证）
app.use('/monitoring', monitoringRoutes);

// API路由
app.use('/api/auth', authRoutes);

// 其他路由
import workflowRoutes from './routes/workflows';
app.use('/api/workflows', workflowRoutes);

import attachmentRoutes from './routes/attachments';
app.use('/api/attachments', attachmentRoutes);

import executionRoutes from './routes/executions';
app.use('/api/executions', executionRoutes);

import reviewRoutes from './routes/reviews';
app.use('/api/reviews', reviewRoutes);

import historyRoutes from './routes/history';
app.use('/api/history', historyRoutes);

import adminRoutes from './routes/admin';
app.use('/api/admin', adminRoutes);

// 错误处理中间件
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
app.use(notFoundHandler);
app.use(errorMonitoring); // 错误监控中间件
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDatabase();
    
    // 启动系统资源监控
    systemResourceMonitoring();
    
    app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        pid: process.pid
      });
      
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📊 API文档: http://localhost:${PORT}/api`);
      console.log(`🔐 认证接口: http://localhost:${PORT}/api/auth`);
      console.log(`📈 监控接口: http://localhost:${PORT}/monitoring`);
      console.log(`🔍 健康检查: http://localhost:${PORT}/monitoring/health`);
      console.log(`📊 指标数据: http://localhost:${PORT}/monitoring/metrics`);
    });
  } catch (error) {
    logger.error('Server startup failed', { error });
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();

export default app;