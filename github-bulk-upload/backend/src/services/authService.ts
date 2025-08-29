import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { CreateUserDto, LoginDto, UserResponse } from '../types/user';

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

  async register(userData: CreateUserDto): Promise<{ user: UserResponse; token: string }> {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new Error('用户已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`,
        password: hashedPassword,
        role: 'USER'
      }
    });

    // 生成JWT令牌
    const token = this.generateToken(user.id);

    // 返回用户信息（不包含密码）
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      firstName: user.name.split(' ')[0] || '',
      lastName: user.name.split(' ').slice(1).join(' ') || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return { user: userResponse, token };
  }

  async login(loginData: LoginDto): Promise<{ user: UserResponse; token: string }> {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: loginData.email }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    if (!isPasswordValid) {
      throw new Error('密码错误');
    }

    // 生成JWT令牌
    const token = this.generateToken(user.id);

    // 返回用户信息（不包含密码）
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      firstName: user.name.split(' ')[0] || '',
      lastName: user.name.split(' ').slice(1).join(' ') || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return { user: userResponse, token };
  }

  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.name.split(' ')[0] || '',
      lastName: user.name.split(' ').slice(1).join(' ') || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  private generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }

  verifyToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string };
      return decoded;
    } catch (error) {
      throw new Error('无效的令牌');
    }
  }
}