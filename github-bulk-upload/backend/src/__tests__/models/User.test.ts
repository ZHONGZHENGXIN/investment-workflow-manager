import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import UserModel from '../../models/User';
import { CreateUserInput, UpdateUserInput } from '../../types/models';

const prisma = new PrismaClient();

describe('UserModel', () => {
  beforeAll(async () => {
    // 连接到测试数据库
    await prisma.$connect();
  });

  afterAll(async () => {
    // 清理测试数据并断开连接
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const userData: CreateUserInput = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await UserModel.create(userData);

      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.password).not.toBe(userData.password); // 密码应该被哈希
      expect(user.role).toBe('USER'); // 默认角色
      expect(user.isActive).toBe(true); // 默认激活
    });

    it('should create user settings automatically', async () => {
      const userData: CreateUserInput = {
        email: 'test2@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await UserModel.create(userData);
      const userWithSettings = await UserModel.findById(user.id, true);

      expect(userWithSettings?.userSettings).toBeDefined();
      expect(userWithSettings?.userSettings?.theme).toBe('light');
      expect(userWithSettings?.userSettings?.language).toBe('zh-CN');
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const userData: CreateUserInput = {
        email: 'test3@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const createdUser = await UserModel.create(userData);
      const foundUser = await UserModel.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await UserModel.findById('non-existent-id');
      expect(foundUser).toBeNull();
    });

    it('should include relations when requested', async () => {
      const userData: CreateUserInput = {
        email: 'test4@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const createdUser = await UserModel.create(userData);
      const userWithRelations = await UserModel.findById(createdUser.id, true);

      expect(userWithRelations?.userSettings).toBeDefined();
      expect(userWithRelations?._count).toBeDefined();
      expect(userWithRelations?._count?.workflows).toBe(0);
      expect(userWithRelations?._count?.executions).toBe(0);
      expect(userWithRelations?._count?.reviews).toBe(0);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const userData: CreateUserInput = {
        email: 'test5@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      await UserModel.create(userData);
      const foundUser = await UserModel.findByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await UserModel.findByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const userData: CreateUserInput = {
        email: 'test6@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await UserModel.create(userData);
      const isValid = await UserModel.validatePassword(user, 'password123');

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const userData: CreateUserInput = {
        email: 'test7@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await UserModel.create(userData);
      const isValid = await UserModel.validatePassword(user, 'wrongpassword');

      expect(isValid).toBe(false);
    });
  });

  describe('update', () => {
    it('should update user data', async () => {
      const userData: CreateUserInput = {
        email: 'test8@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await UserModel.create(userData);
      
      const updateData: UpdateUserInput = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const updatedUser = await UserModel.update(user.id, updateData);

      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name');
      expect(updatedUser.email).toBe(userData.email); // 未更新的字段保持不变
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const userData: CreateUserInput = {
        email: 'test9@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await UserModel.create(userData);
      const originalPassword = user.password;

      await UserModel.updatePassword(user.id, 'newpassword123');
      const updatedUser = await UserModel.findById(user.id);

      expect(updatedUser?.password).not.toBe(originalPassword);
      
      // 验证新密码
      const isValidNew = await UserModel.validatePassword(updatedUser!, 'newpassword123');
      const isValidOld = await UserModel.validatePassword(updatedUser!, 'password123');
      
      expect(isValidNew).toBe(true);
      expect(isValidOld).toBe(false);
    });
  });

  describe('softDelete', () => {
    it('should soft delete user by setting isActive to false', async () => {
      const userData: CreateUserInput = {
        email: 'test10@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await UserModel.create(userData);
      expect(user.isActive).toBe(true);

      const deletedUser = await UserModel.softDelete(user.id);
      expect(deletedUser.isActive).toBe(false);
    });
  });

  describe('restore', () => {
    it('should restore soft deleted user', async () => {
      const userData: CreateUserInput = {
        email: 'test11@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await UserModel.create(userData);
      await UserModel.softDelete(user.id);
      
      const restoredUser = await UserModel.restore(user.id);
      expect(restoredUser.isActive).toBe(true);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      const userData: CreateUserInput = {
        email: 'test12@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      await UserModel.create(userData);
      const exists = await UserModel.emailExists(userData.email);

      expect(exists).toBe(true);
    });

    it('should return false for non-existing email', async () => {
      const exists = await UserModel.emailExists('nonexistent@example.com');
      expect(exists).toBe(false);
    });

    it('should exclude specific user id when checking', async () => {
      const userData: CreateUserInput = {
        email: 'test13@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await UserModel.create(userData);
      const exists = await UserModel.emailExists(userData.email, user.id);

      expect(exists).toBe(false); // 应该排除自己
    });
  });

  describe('search', () => {
    it('should search users by name and email', async () => {
      const users: CreateUserInput[] = [
        {
          email: 'john.doe@test.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        },
        {
          email: 'jane.smith@test.com',
          password: 'password123',
          firstName: 'Jane',
          lastName: 'Smith',
        },
        {
          email: 'bob.johnson@test.com',
          password: 'password123',
          firstName: 'Bob',
          lastName: 'Johnson',
        },
      ];

      await Promise.all(users.map(user => UserModel.create(user)));

      // 搜索名字
      const johnResults = await UserModel.search('John');
      expect(johnResults.length).toBe(1);
      expect(johnResults[0].firstName).toBe('John');

      // 搜索邮箱
      const emailResults = await UserModel.search('jane.smith');
      expect(emailResults.length).toBe(1);
      expect(emailResults[0].email).toBe('jane.smith@test.com');

      // 搜索姓氏
      const lastNameResults = await UserModel.search('Johnson');
      expect(lastNameResults.length).toBe(1);
      expect(lastNameResults[0].lastName).toBe('Johnson');
    });
  });

  describe('findMany', () => {
    it('should return paginated users', async () => {
      const users: CreateUserInput[] = Array.from({ length: 15 }, (_, i) => ({
        email: `testuser${i}@test.com`,
        password: 'password123',
        firstName: `User${i}`,
        lastName: 'Test',
      }));

      await Promise.all(users.map(user => UserModel.create(user)));

      const result = await UserModel.findMany({}, { page: 1, limit: 10 });

      expect(result.data.length).toBe(10);
      expect(result.pagination.total).toBe(15);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should filter users by role', async () => {
      const adminUser: CreateUserInput = {
        email: 'admin@test.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      };

      const regularUser: CreateUserInput = {
        email: 'regular@test.com',
        password: 'password123',
        firstName: 'Regular',
        lastName: 'User',
        role: 'USER',
      };

      await UserModel.create(adminUser);
      await UserModel.create(regularUser);

      const adminResults = await UserModel.findMany({ role: 'ADMIN' });
      expect(adminResults.data.length).toBe(1);
      expect(adminResults.data[0].role).toBe('ADMIN');

      const userResults = await UserModel.findMany({ role: 'USER' });
      expect(userResults.data.length).toBe(1);
      expect(userResults.data[0].role).toBe('USER');
    });
  });
});