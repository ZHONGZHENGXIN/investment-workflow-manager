import { Request, Response, NextFunction } from 'express';
import { logger, errorLogger } from '../utils/logger';

// 404处理中间件
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// 全局错误处理中间件
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  // 记录错误
  errorLogger.applicationError(error, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.body,
    query: req.query,
    params: req.params
  });

  res.status(statusCode);

  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    res.json({
      message: error.message,
      stack: error.stack,
      statusCode
    });
  } else {
    // 生产环境返回简化错误信息
    res.json({
      message: statusCode === 500 ? 'Internal Server Error' : error.message,
      statusCode
    });
  }
};

// 异步错误处理包装器
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};