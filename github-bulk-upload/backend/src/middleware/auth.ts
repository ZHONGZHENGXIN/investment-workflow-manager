import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { analyticsSystem } from '../utils/analytics';
import { logger } from '../utils/logger';

// 扩展Request接口以包含用户信息和会话ID
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
      requestId?: string;
      sessionID?: string;
    }
  }
}

const authService = new AuthService();

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      auditLogger.loginAudit('unknown', false, req.ip || 'unknown', req.get('User-Agent') || 'unknown', 'No token provided');
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: '访问令牌缺失'
        }
      });
      return;
    }

    // 验证令牌
    const decoded = authService.verifyToken(token);
    
    // 验证用户是否存在
    const user = await authService.getUserById(decoded.userId);
    if (!user) {
      auditLogger.loginAudit(decoded.userId, false, req.ip || 'unknown', req.get('User-Agent') || 'unknown', 'User not found');
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: '用户不存在'
        }
      });
      return;
    }

    // 将用户信息添加到请求对象
    req.user = { 
      userId: decoded.userId,
      email: (decoded as any).email || '',
      role: (decoded as any).role || 'USER'
    };

    // 生成或获取会话ID
    const sessionId = req.headers['x-session-id'] as string || 
                     `session_${decoded.userId}_${Date.now()}`;
    req.sessionID = sessionId;

    // 开始用户会话跟踪
    if (!analyticsSystem.getActiveSessions().find(s => s.sessionId === sessionId)) {
      analyticsSystem.startSession(
        sessionId,
        decoded.userId,
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown'
      );
    }

    // 记录用户操作
    analyticsSystem.recordAction(
      sessionId,
      decoded.userId,
      'authenticate',
      req.path,
      req.method,
      {
        userAgent: req.get('User-Agent'),
        ip: req.ip || 'unknown'
      }
    );

    auditLogger.loginAudit(decoded.userId, true, req.ip || 'unknown', req.get('User-Agent') || 'unknown');
    
    next();
  } catch (error) {
    auditLogger.loginAudit('unknown', false, req.ip || 'unknown', req.get('User-Agent') || 'unknown', 'Invalid token');
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: '无效的访问令牌'
      }
    });
  }
};

// 可选的认证中间件（用于某些不强制要求登录的接口）
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = authService.verifyToken(token);
      const user = await authService.getUserById(decoded.userId);
      
      if (user) {
        req.user = { 
          userId: decoded.userId,
          email: user.email || '',
          role: (user as any).role || 'USER'
        };
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败时不返回错误，继续执行
    next();
  }
};