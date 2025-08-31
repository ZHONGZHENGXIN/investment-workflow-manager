import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// 所有管理员路由都需要管理员权限
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

// 获取用户列表
router.get('/users', 
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('role').optional().isIn(['ADMIN', 'USER', 'VIEWER']),
    query('status').optional().isIn(['active', 'inactive'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const status = req.query.status as string;
      
      const skip = (page - 1) * limit;
      
      // 构建查询条件
      const where: any = {};
      
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (role) {
        where.role = role;
      }
      
      if (status) {
        where.isActive = status === 'active';
      }
      
      // 获取用户列表
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            _count: {
              select: {
                workflows: true,
                executions: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);
      
      logger.info(`Admin ${req.user.id} fetched users list`, {
        page,
        limit,
        total,
        filters: { search, role, status }
      });
      
      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Failed to fetch users:', error);
      res.status(500).json({ message: '获取用户列表失败' });
    }
  }
);

// 获取单个用户详情
router.get('/users/:id',
  [param('id').isUUID()],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          workflows: {
            select: {
              id: true,
              name: true,
              createdAt: true
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          executions: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              workflow: {
                select: { name: true }
              }
            },
            take: 5,
            orderBy: { startedAt: 'desc' }
          },
          _count: {
            select: {
              workflows: true,
              executions: true,
              reviews: true
            }
          }
        }
      });
      
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }
      
      logger.info(`Admin ${req.user.id} fetched user details`, { userId: id });
      
      res.json({ user });
    } catch (error) {
      logger.error('Failed to fetch user details:', error);
      res.status(500).json({ message: '获取用户详情失败' });
    }
  }
);

// 创建用户
router.post('/users',
  [
    body('firstName').notEmpty().withMessage('姓不能为空'),
    body('lastName').notEmpty().withMessage('名不能为空'),
    body('email').isEmail().withMessage('邮箱格式不正确'),
    body('password').isLength({ min: 8 }).withMessage('密码至少8位'),
    body('role').isIn(['ADMIN', 'USER', 'VIEWER']).withMessage('角色无效')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { firstName, lastName, email, password, role } = req.body;
      
      // 检查邮箱是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return res.status(400).json({ message: '邮箱已被注册' });
      }
      
      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // 创建用户
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          role,
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });
      
      logger.info(`Admin ${req.user.id} created user`, { 
        newUserId: user.id,
        email: user.email,
        role: user.role
      });
      
      res.status(201).json({ 
        message: '用户创建成功',
        user 
      });
    } catch (error) {
      logger.error('Failed to create user:', error);
      res.status(500).json({ message: '创建用户失败' });
    }
  }
);

// 更新用户
router.put('/users/:id',
  [
    param('id').isUUID(),
    body('firstName').optional().notEmpty().withMessage('姓不能为空'),
    body('lastName').optional().notEmpty().withMessage('名不能为空'),
    body('email').optional().isEmail().withMessage('邮箱格式不正确'),
    body('role').optional().isIn(['ADMIN', 'USER', 'VIEWER']).withMessage('角色无效')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, role } = req.body;
      
      // 检查用户是否存在
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!existingUser) {
        return res.status(404).json({ message: '用户不存在' });
      }
      
      // 如果更新邮箱，检查是否已被其他用户使用
      if (email && email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email }
        });
        
        if (emailExists) {
          return res.status(400).json({ message: '邮箱已被其他用户使用' });
        }
      }
      
      // 防止管理员降级自己
      if (id === req.user.id && role && role !== 'ADMIN') {
        return res.status(400).json({ message: '不能降级自己的管理员权限' });
      }
      
      // 更新用户
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email && { email }),
          ...(role && { role })
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      logger.info(`Admin ${req.user.id} updated user`, { 
        updatedUserId: id,
        changes: { firstName, lastName, email, role }
      });
      
      res.json({ 
        message: '用户更新成功',
        user: updatedUser 
      });
    } catch (error) {
      logger.error('Failed to update user:', error);
      res.status(500).json({ message: '更新用户失败' });
    }
  }
);

// 更新用户状态（启用/禁用）
router.patch('/users/:id/status',
  [
    param('id').isUUID(),
    body('isActive').isBoolean().withMessage('状态值必须是布尔类型')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      // 防止管理员禁用自己
      if (id === req.user.id && !isActive) {
        return res.status(400).json({ message: '不能禁用自己的账户' });
      }
      
      const user = await prisma.user.update({
        where: { id },
        data: { isActive },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true
        }
      });
      
      logger.info(`Admin ${req.user.id} ${isActive ? 'enabled' : 'disabled'} user`, { 
        targetUserId: id 
      });
      
      res.json({ 
        message: `用户已${isActive ? '启用' : '禁用'}`,
        user 
      });
    } catch (error) {
      logger.error('Failed to update user status:', error);
      res.status(500).json({ message: '更新用户状态失败' });
    }
  }
);

// 重置用户密码
router.post('/users/:id/reset-password',
  [
    param('id').isUUID(),
    body('newPassword').isLength({ min: 8 }).withMessage('新密码至少8位')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword }
      });
      
      logger.info(`Admin ${req.user.id} reset password for user`, { targetUserId: id });
      
      res.json({ message: '密码重置成功' });
    } catch (error) {
      logger.error('Failed to reset password:', error);
      res.status(500).json({ message: '重置密码失败' });
    }
  }
);

// 删除用户
router.delete('/users/:id',
  [param('id').isUUID()],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // 防止管理员删除自己
      if (id === req.user.id) {
        return res.status(400).json({ message: '不能删除自己的账户' });
      }
      
      // 检查用户是否存在
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              workflows: true,
              executions: true
            }
          }
        }
      });
      
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }
      
      // 如果用户有关联数据，提示是否强制删除
      if (user._count.workflows > 0 || user._count.executions > 0) {
        const forceDelete = req.query.force === 'true';
        
        if (!forceDelete) {
          return res.status(400).json({ 
            message: '用户有关联数据，请确认是否强制删除',
            data: {
              workflows: user._count.workflows,
              executions: user._count.executions
            },
            hint: '添加 ?force=true 参数强制删除'
          });
        }
      }
      
      // 删除用户（级联删除关联数据）
      await prisma.user.delete({
        where: { id }
      });
      
      logger.info(`Admin ${req.user.id} deleted user`, { 
        deletedUserId: id,
        deletedUserEmail: user.email
      });
      
      res.json({ message: '用户删除成功' });
    } catch (error) {
      logger.error('Failed to delete user:', error);
      res.status(500).json({ message: '删除用户失败' });
    }
  }
);

// 获取用户统计信息
router.get('/stats/users', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      newUsersThisMonth,
      usersByRole
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      })
    ]);
    
    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {} as Record<string, number>);
    
    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      adminUsers,
      newUsersThisMonth,
      usersByRole: roleStats
    });
  } catch (error) {
    logger.error('Failed to fetch user stats:', error);
    res.status(500).json({ message: '获取用户统计失败' });
  }
});

export default router;