import { User, UserRole, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { 
  CreateUserInput, 
  UpdateUserInput, 
  UserWithRelations, 
  UserFilter,
  PaginationParams,
  PaginatedResult 
} from '../types/models';
import { DatabaseUtils } from '../utils/database';

export class UserModel {
  // 创建用户
  static async create(data: CreateUserInput): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        userSettings: {
          create: {
            theme: 'light',
            language: 'zh-CN',
            timezone: 'Asia/Shanghai',
          }
        }
      },
      include: {
        userSettings: true,
      }
    });

    return user;
  }

  // 根据ID查找用户
  static async findById(id: string, includeRelations = false): Promise<UserWithRelations | null> {
    const include = includeRelations ? {
      workflows: {
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' as const },
        take: 10,
      },
      executions: {
        orderBy: { createdAt: 'desc' as const },
        take: 10,
        include: {
          workflow: {
            select: { name: true }
          }
        }
      },
      reviews: {
        orderBy: { createdAt: 'desc' as const },
        take: 10,
      },
      userSettings: true,
      _count: {
        select: {
          workflows: true,
          executions: true,
          reviews: true,
        }
      }
    } : undefined;

    return prisma.user.findUnique({
      where: { id },
      include,
    });
  }

  // 根据邮箱查找用户
  static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  // 验证用户密码
  static async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  // 更新用户
  static async update(id: string, data: UpdateUserInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  // 更新用户密码
  static async updatePassword(id: string, newPassword: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    return prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  // 更新最后登录时间
  static async updateLastLogin(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  // 软删除用户（设置为非活跃）
  static async softDelete(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // 恢复用户
  static async restore(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  // 获取用户列表（分页）
  static async findMany(
    filter: UserFilter = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<UserWithRelations>> {
    const { search, ...otherFilters } = filter;
    
    let where: Prisma.UserWhereInput = { ...otherFilters };

    // 添加搜索条件
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    return DatabaseUtils.getPaginatedData(prisma.user, {
      ...pagination,
      where,
      include: {
        userSettings: true,
        _count: {
          select: {
            workflows: true,
            executions: true,
            reviews: true,
          }
        }
      }
    });
  }

  // 获取用户统计信息
  static async getStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [
      totalUsers,
      activeUsers,
      totalWorkflows,
      totalExecutions,
      totalReviews,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.workflow.count(userId ? { where } : {}),
      prisma.execution.count(userId ? { where } : {}),
      prisma.review.count(userId ? { where } : {}),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalWorkflows,
      totalExecutions,
      totalReviews,
    };
  }

  // 获取用户活动统计
  static async getActivityStats(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [workflows, executions, reviews] = await Promise.all([
      prisma.workflow.count({
        where: {
          userId,
          createdAt: { gte: startDate }
        }
      }),
      prisma.execution.count({
        where: {
          userId,
          createdAt: { gte: startDate }
        }
      }),
      prisma.review.count({
        where: {
          userId,
          createdAt: { gte: startDate }
        }
      }),
    ]);

    return {
      workflows,
      executions,
      reviews,
      period: `${days} days`,
    };
  }

  // 批量创建用户
  static async createMany(users: CreateUserInput[]): Promise<{ count: number }> {
    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10),
      }))
    );

    return prisma.user.createMany({
      data: hashedUsers,
      skipDuplicates: true,
    });
  }

  // 检查邮箱是否已存在
  static async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.UserWhereInput = { email };
    
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const count = await prisma.user.count({ where });
    return count > 0;
  }

  // 获取用户角色分布
  static async getRoleDistribution() {
    const roles = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });

    return roles.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {} as Record<UserRole, number>);
  }

  // 搜索用户
  static async search(query: string, limit = 10): Promise<UserWithRelations[]> {
    return prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      take: limit,
      include: {
        _count: {
          select: {
            workflows: true,
            executions: true,
            reviews: true,
          }
        }
      }
    });
  }

  // 获取最近注册的用户
  static async getRecentUsers(limit = 10): Promise<UserWithRelations[]> {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: {
            workflows: true,
            executions: true,
            reviews: true,
          }
        }
      }
    });
  }

  // 获取最活跃的用户
  static async getMostActiveUsers(limit = 10): Promise<UserWithRelations[]> {
    return prisma.user.findMany({
      where: { isActive: true },
      orderBy: { lastLogin: 'desc' },
      take: limit,
      include: {
        _count: {
          select: {
            workflows: true,
            executions: true,
            reviews: true,
          }
        }
      }
    });
  }
}

export default UserModel;