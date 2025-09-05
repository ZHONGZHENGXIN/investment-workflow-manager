import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 基础中间件
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API根路径
app.get('/api', (req, res) => {
  res.json({ 
    message: '投资流程管理API服务器运行中',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 基础API路由
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    message: 'Investment Workflow Manager API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 模拟认证API
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // 简单的模拟认证
  if (email && password) {
    res.json({
      success: true,
      data: {
        user: {
          id: '1',
          email: email,
          name: '测试用户',
          role: 'user'
        },
        token: 'mock-jwt-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now()
      }
    });
  } else {
    res.status(400).json({
      success: false,
      error: {
        message: '邮箱和密码不能为空'
      }
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (email && password && name) {
    res.json({
      success: true,
      data: {
        user: {
          id: '1',
          email: email,
          name: name,
          role: 'user'
        },
        token: 'mock-jwt-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now()
      }
    });
  } else {
    res.status(400).json({
      success: false,
      error: {
        message: '所有字段都是必需的'
      }
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: {
      id: '1',
      email: 'user@example.com',
      name: '测试用户',
      role: 'user'
    }
  });
});

// 模拟用户管理API
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        email: 'admin@example.com',
        name: '管理员',
        role: 'admin',
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        lastLogin: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '2',
        email: 'user@example.com',
        name: '普通用户',
        role: 'user',
        createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        lastLogin: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: '3',
        email: 'analyst@example.com',
        name: '分析师',
        role: 'analyst',
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        lastLogin: new Date(Date.now() - 1800000).toISOString()
      }
    ]
  });
});

app.post('/api/users', (req, res) => {
  const { email, name, role } = req.body;
  
  if (!email || !name || !role) {
    return res.status(400).json({
      success: false,
      error: {
        message: '邮箱、姓名和角色都是必需的'
      }
    });
  }
  
  res.json({
    success: true,
    data: {
      id: Date.now().toString(),
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
      lastLogin: null
    }
  });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { email, name, role } = req.body;
  
  res.json({
    success: true,
    data: {
      id,
      email,
      name,
      role,
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: new Date(Date.now() - 3600000).toISOString()
    }
  });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  res.json({
    success: true,
    message: `用户 ${id} 已删除`
  });
});

// 模拟业务管理API
app.get('/api/businesses', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: '腾讯控股',
        symbol: '00700.HK',
        sector: '科技',
        marketCap: 3200000000000,
        status: 'active',
        description: '中国领先的互联网增值服务提供商',
        createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: '2',
        name: '阿里巴巴',
        symbol: 'BABA',
        sector: '电商',
        marketCap: 2100000000000,
        status: 'active',
        description: '全球领先的电子商务平台',
        createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: '3',
        name: '美团',
        symbol: '03690.HK',
        sector: '生活服务',
        marketCap: 800000000000,
        status: 'active',
        description: '中国领先的生活服务电子商务平台',
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
      }
    ]
  });
});

app.post('/api/businesses', (req, res) => {
  const { name, symbol, sector, marketCap, description } = req.body;
  
  if (!name || !symbol || !sector) {
    return res.status(400).json({
      success: false,
      error: {
        message: '公司名称、股票代码和行业都是必需的'
      }
    });
  }
  
  res.json({
    success: true,
    data: {
      id: Date.now().toString(),
      name,
      symbol,
      sector,
      marketCap: marketCap || 0,
      status: 'active',
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
});

app.put('/api/businesses/:id', (req, res) => {
  const { id } = req.params;
  const { name, symbol, sector, marketCap, description, status } = req.body;
  
  res.json({
    success: true,
    data: {
      id,
      name,
      symbol,
      sector,
      marketCap,
      status,
      description,
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
});

app.delete('/api/businesses/:id', (req, res) => {
  const { id } = req.params;
  
  res.json({
    success: true,
    message: `业务 ${id} 已删除`
  });
});

// 模拟工作流API
app.get('/api/workflows', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: '股票投资流程',
        description: '完整的股票投资决策流程',
        steps: [
          { id: '1', name: '市场分析', description: '分析市场趋势' },
          { id: '2', name: '公司研究', description: '深入研究目标公司' },
          { id: '3', name: '风险评估', description: '评估投资风险' },
          { id: '4', name: '投资决策', description: '做出最终投资决策' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: '债券投资流程',
        description: '债券投资决策流程',
        steps: [
          { id: '1', name: '信用评级分析', description: '分析债券信用评级' },
          { id: '2', name: '收益率分析', description: '计算预期收益率' },
          { id: '3', name: '投资决策', description: '做出投资决策' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  });
});

app.post('/api/workflows', (req, res) => {
  const { name, description, steps } = req.body;
  
  res.json({
    success: true,
    data: {
      id: Date.now().toString(),
      name,
      description,
      steps: steps || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
});

// 模拟执行API
app.get('/api/executions', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        workflowId: '1',
        workflowName: '股票投资流程',
        status: 'IN_PROGRESS',
        progress: 50,
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        records: [
          {
            id: '1',
            stepId: '1',
            stepName: '市场分析',
            status: 'COMPLETED',
            completedAt: new Date(Date.now() - 1800000).toISOString()
          },
          {
            id: '2',
            stepId: '2',
            stepName: '公司研究',
            status: 'IN_PROGRESS',
            startedAt: new Date(Date.now() - 900000).toISOString()
          }
        ]
      }
    ]
  });
});

app.post('/api/executions', (req, res) => {
  const { workflowId } = req.body;
  
  res.json({
    success: true,
    data: {
      id: Date.now().toString(),
      workflowId,
      status: 'PENDING',
      progress: 0,
      createdAt: new Date().toISOString(),
      records: []
    }
  });
});

// 模拟历史记录API
app.get('/api/history', (req, res) => {
  res.json({
    success: true,
    data: {
      executions: [
        {
          id: '1',
          workflowName: '股票投资流程',
          status: 'COMPLETED',
          duration: 7200000,
          completedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
          workflowName: '债券投资流程',
          status: 'COMPLETED',
          duration: 3600000,
          completedAt: new Date(Date.now() - 172800000).toISOString()
        }
      ],
      stats: {
        total: 2,
        completed: 2,
        failed: 0,
        avgDuration: 5400000
      }
    }
  });
});

// 模拟复盘API
app.get('/api/reviews', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        executionId: '1',
        title: '股票投资复盘',
        content: '本次投资决策过程顺利，市场分析准确，公司研究深入。',
        insights: ['市场时机把握良好', '风险控制到位'],
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  });
});

app.post('/api/reviews', (req, res) => {
  const { executionId, title, content } = req.body;
  
  res.json({
    success: true,
    data: {
      id: Date.now().toString(),
      executionId,
      title,
      content,
      insights: [],
      createdAt: new Date().toISOString()
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// 错误处理
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 优雅关闭处理
const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`🚀 Investment Workflow API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 API status: http://localhost:${PORT}/api/status`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// 处理服务器错误
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

export default app;