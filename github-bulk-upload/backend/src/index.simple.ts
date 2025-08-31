// 简化版服务器入口文件 - 最小化依赖，确保基础功能可用
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { simpleLogger } from './utils/logger.simple';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  simpleLogger.error('Uncaught Exception', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  simpleLogger.error('Unhandled Rejection', { reason });
});

// 基础中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    simpleLogger.http('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    mode: 'simple',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// 基础API路由
app.get('/api', (req, res) => {
  res.json({ 
    message: '投资流程管理API服务器运行中 (简化模式)',
    mode: 'simple',
    features: ['基础API', '健康检查', '错误处理'],
    timestamp: new Date().toISOString()
  });
});

// 基础认证路由（模拟）
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  simpleLogger.info('Login attempt', { username });
  
  // 简单的模拟认证
  if (username && password) {
    res.json({
      success: true,
      message: '登录成功 (简化模式)',
      token: 'simple-mode-token',
      user: {
        id: 'simple-user',
        username,
        role: 'user'
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: '用户名和密码不能为空'
    });
  }
});

// 基础工作流路由（模拟）
app.get('/api/workflows', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: '简化模式 - 数据库功能不可用',
    mode: 'simple'
  });
});

// 基础执行路由（模拟）
app.get('/api/executions', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: '简化模式 - 数据库功能不可用',
    mode: 'simple'
  });
});

// 错误处理中间件
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  simpleLogger.error('Request error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  res.status(error.status || 500).json({
    success: false,
    message: error.message || '服务器内部错误',
    mode: 'simple',
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    mode: 'simple',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
const startSimpleServer = () => {
  try {
    app.listen(PORT, () => {
      simpleLogger.info('Simple server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        pid: process.pid,
        mode: 'simple'
      });
      
      console.log(`🚀 简化模式服务器运行在端口 ${PORT}`);
      console.log(`📊 基础API: http://localhost:${PORT}/api`);
      console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
      console.log(`⚠️ 注意: 运行在简化模式，部分功能不可用`);
    });
  } catch (error) {
    simpleLogger.error('Simple server startup failed', { error });
    console.error('❌ 简化服务器启动失败:', error);
    process.exit(1);
  }
};

startSimpleServer();

export default app;