import { Request, Response, NextFunction } from 'express';
// UserRole类型定义
type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

// 扩展Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

// 检查用户角色权限
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: '用户未认证'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: '权限不足'
        }
      });
    }

    next();
  };
};

// 检查是否为管理员
export const requireAdmin = requireRole(['ADMIN', 'SUPER_ADMIN']);

// 检查是否为超级管理员
export const requireSuperAdmin = requireRole(['SUPER_ADMIN']);

// 检查资源所有权或管理员权限
export const requireOwnershipOrAdmin = (getResourceUserId: (req: Request) => Promise<string | null>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: '用户未认证'
        }
      });
    }

    // 管理员可以访问所有资源
    if (['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return next();
    }

    try {
      const resourceUserId = await getResourceUserId(req);
      
      if (!resourceUserId) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND_ERROR',
            message: '资源不存在'
          }
        });
      }

      if (resourceUserId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权限访问该资源'
          }
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '权限检查失败'
        }
      });
    }
  };
};

// 速率限制中间件
export const rateLimit = (windowMs: number, maxRequests: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requests.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // 重置或初始化客户端数据
      requests.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试'
        }
      });
    }
    
    clientData.count++;
    next();
  };
};

// 验证请求体大小
export const validateBodySize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return res.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: '请求体过大'
        }
      });
    }
    
    next();
  };
};

// 验证内容类型
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('content-type');
    
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: '不支持的内容类型'
        }
      });
    }
    
    next();
  };
};

// 日志记录中间件
export const logRequest = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      userId: req.user?.userId,
      timestamp: new Date().toISOString()
    };
    
    console.log('API Request:', JSON.stringify(logData));
  });
  
  next();
};

// 错误处理中间件
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', error);
  
  // Prisma错误处理
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ERROR',
        message: '数据已存在'
      }
    });
  }
  
  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND_ERROR',
        message: '记录不存在'
      }
    });
  }
  
  // 验证错误
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message
      }
    });
  }
  
  // JWT错误
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: '无效的访问令牌'
      }
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: '访问令牌已过期'
      }
    });
  }
  
  // 默认错误响应
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : error.message
    }
  });
};

export default {
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireOwnershipOrAdmin,
  rateLimit,
  validateBodySize,
  validateContentType,
  logRequest,
  errorHandler
};