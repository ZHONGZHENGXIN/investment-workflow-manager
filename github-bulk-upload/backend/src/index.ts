import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testDatabaseConnection } from './config/database';

// Import monitoring utilities
import { logger } from './utils/logger';
import { performanceMonitoring, errorMonitoring, userBehaviorTracking, systemResourceMonitoring } from './middleware/monitoring';
import { analyticsSystem } from './utils/analytics';

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  // 不退出进程，让应用继续运行
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection', { reason, promise });
  // 不退出进程，让应用继续运行
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  logger.info('Server shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  logger.info('Server shutting down gracefully');
  process.exit(0);
});

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
    // 尝试连接数据库，但不阻塞服务器启动
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.warn('⚠️ 数据库连接失败，服务器将在降级模式下运行');
      logger.warn('Database connection failed, server running in degraded mode');
    }
    
    // 启动系统资源监控（如果可用）
    try {
      systemResourceMonitoring();
    } catch (error) {
      console.warn('⚠️ 系统资源监控启动失败:', error);
      logger.warn('System resource monitoring failed to start', { error });
    }
    
    app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        pid: process.pid,
        databaseConnected: dbConnected
      });
      
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📊 API文档: http://localhost:${PORT}/api`);
      console.log(`🔐 认证接口: http://localhost:${PORT}/api/auth`);
      console.log(`📈 监控接口: http://localhost:${PORT}/monitoring`);
      console.log(`🔍 健康检查: http://localhost:${PORT}/monitoring/health`);
      console.log(`📊 指标数据: http://localhost:${PORT}/monitoring/metrics`);
      
      if (!dbConnected) {
        console.log(`⚠️ 注意: 数据库未连接，某些功能可能不可用`);
      }
    });
  } catch (error) {
    logger.error('Server startup failed', { error });
    console.error('❌ 服务器启动失败:', error);
    
    // 即使启动失败，也尝试启动一个基础服务器
    try {
      const basicApp = express();
      basicApp.use(express.json());
      basicApp.get('/health', (req, res) => {
        res.status(503).json({ 
          status: 'ERROR', 
          message: 'Server in emergency mode',
          timestamp: new Date().toISOString() 
        });
      });
      
      basicApp.listen(PORT, () => {
        console.log(`🆘 紧急模式服务器运行在端口 ${PORT}`);
      });
    } catch (emergencyError) {
      console.error('❌ 紧急模式启动也失败:', emergencyError);
      process.exit(1);
    }
  }
};

startServer();

export default app;