import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { validateUser, validateLogin } from '../utils/validation';
import { CreateUserDto, LoginDto } from '../types/user';

const authService = new AuthService();

export class AuthController {
  // 用户注册
  async register(req: Request, res: Response): Promise<void> {
    try {
      // 验证请求数据
      const validation = validateUser(req.body);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.errors?.join(', ') || '数据验证失败'
          }
        });
        return;
      }
      const validatedData = validation.data as CreateUserDto;

      // 注册用户
      const result = await authService.register(validatedData);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          token: result.token
        },
        message: '注册成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '注册失败';
      
      res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 用户登录
  async login(req: Request, res: Response): Promise<void> {
    try {
      // 验证请求数据
      const validation = validateLogin(req.body);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.errors?.join(', ') || '数据验证失败'
          }
        });
        return;
      }
      const validatedData = validation.data as LoginDto;

      // 用户登录
      const result = await authService.login(validatedData);

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          token: result.token
        },
        message: '登录成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登录失败';
      
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 获取当前用户信息
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const user = await authService.getUserById(req.user.userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND_ERROR',
            message: '用户不存在'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user },
        message: '获取用户信息成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取用户信息失败'
        }
      });
    }
  }

  // 用户登出（客户端处理，服务端可以记录日志）
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // 这里可以添加登出日志记录
      res.status(200).json({
        success: true,
        message: '登出成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '登出失败'
        }
      });
    }
  }
}