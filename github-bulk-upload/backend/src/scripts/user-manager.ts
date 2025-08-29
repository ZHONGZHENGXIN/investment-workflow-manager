#!/usr/bin/env ts-node

/**
 * 用户管理CLI工具
 * 用于在服务器端直接管理用户账户
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';

const prisma = new PrismaClient();
const program = new Command();

// 颜色输出函数
const success = (text: string) => console.log(chalk.green('✓'), text);
const error = (text: string) => console.log(chalk.red('✗'), text);
const info = (text: string) => console.log(chalk.blue('ℹ'), text);
const warning = (text: string) => console.log(chalk.yellow('⚠'), text);

// 列出所有用户
async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            workflows: true,
            executions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (users.length === 0) {
      warning('没有找到用户');
      return;
    }

    const table = new Table({
      head: ['ID', '姓名', '邮箱', '角色', '状态', '工作流', '执行', '创建时间', '最后登录'],
      colWidths: [8, 15, 25, 8, 6, 6, 6, 12, 12]
    });

    users.forEach(user => {
      table.push([
        user.id.substring(0, 8),
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.role,
        user.isActive ? chalk.green('活跃') : chalk.red('禁用'),
        user._count.workflows.toString(),
        user._count.executions.toString(),
        user.createdAt.toLocaleDateString(),
        user.lastLoginAt ? user.lastLoginAt.toLocaleDateString() : '从未'
      ]);
    });

    console.log(table.toString());
    info(`总共 ${users.length} 个用户`);
  } catch (err) {
    error(`获取用户列表失败: ${err}`);
  }
}

// 创建用户
async function createUser() {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'firstName',
        message: '请输入姓:',
        validate: (input) => input.trim() !== '' || '姓不能为空'
      },
      {
        type: 'input',
        name: 'lastName',
        message: '请输入名:',
        validate: (input) => input.trim() !== '' || '名不能为空'
      },
      {
        type: 'input',
        name: 'email',
        message: '请输入邮箱:',
        validate: (input) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || '邮箱格式不正确';
        }
      },
      {
        type: 'password',
        name: 'password',
        message: '请输入密码:',
        validate: (input) => input.length >= 8 || '密码至少8位'
      },
      {
        type: 'list',
        name: 'role',
        message: '请选择角色:',
        choices: [
          { name: '普通用户', value: 'USER' },
          { name: '管理员', value: 'ADMIN' },
          { name: '只读用户', value: 'VIEWER' }
        ]
      }
    ]);

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: answers.email }
    });

    if (existingUser) {
      error('邮箱已被注册');
      return;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(answers.password, 12);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        firstName: answers.firstName,
        lastName: answers.lastName,
        email: answers.email,
        password: hashedPassword,
        role: answers.role,
        isActive: true
      }
    });

    success(`用户创建成功！`);
    info(`用户ID: ${user.id}`);
    info(`邮箱: ${user.email}`);
    info(`角色: ${user.role}`);
  } catch (err) {
    error(`创建用户失败: ${err}`);
  }
}

// 更新用户
async function updateUser(userId: string) {
  try {
    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      error('用户不存在');
      return;
    }

    info(`当前用户信息:`);
    info(`姓名: ${user.firstName} ${user.lastName}`);
    info(`邮箱: ${user.email}`);
    info(`角色: ${user.role}`);
    info(`状态: ${user.isActive ? '活跃' : '禁用'}`);

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'firstName',
        message: '姓:',
        default: user.firstName
      },
      {
        type: 'input',
        name: 'lastName',
        message: '名:',
        default: user.lastName
      },
      {
        type: 'input',
        name: 'email',
        message: '邮箱:',
        default: user.email,
        validate: (input) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || '邮箱格式不正确';
        }
      },
      {
        type: 'list',
        name: 'role',
        message: '角色:',
        default: user.role,
        choices: [
          { name: '普通用户', value: 'USER' },
          { name: '管理员', value: 'ADMIN' },
          { name: '只读用户', value: 'VIEWER' }
        ]
      },
      {
        type: 'confirm',
        name: 'isActive',
        message: '是否启用用户:',
        default: user.isActive
      },
      {
        type: 'confirm',
        name: 'resetPassword',
        message: '是否重置密码:',
        default: false
      }
    ]);

    let updateData: any = {
      firstName: answers.firstName,
      lastName: answers.lastName,
      email: answers.email,
      role: answers.role,
      isActive: answers.isActive
    };

    // 如果选择重置密码
    if (answers.resetPassword) {
      const passwordAnswer = await inquirer.prompt([
        {
          type: 'password',
          name: 'newPassword',
          message: '请输入新密码:',
          validate: (input) => input.length >= 8 || '密码至少8位'
        }
      ]);

      updateData.password = await bcrypt.hash(passwordAnswer.newPassword, 12);
    }

    // 更新用户
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    success('用户更新成功！');
    info(`用户ID: ${updatedUser.id}`);
    info(`邮箱: ${updatedUser.email}`);
    info(`角色: ${updatedUser.role}`);
    info(`状态: ${updatedUser.isActive ? '活跃' : '禁用'}`);
  } catch (err) {
    error(`更新用户失败: ${err}`);
  }
}

// 删除用户
async function deleteUser(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      error('用户不存在');
      return;
    }

    info(`用户信息:`);
    info(`姓名: ${user.firstName} ${user.lastName}`);
    info(`邮箱: ${user.email}`);
    info(`角色: ${user.role}`);
    info(`工作流数量: ${user._count.workflows}`);
    info(`执行记录数量: ${user._count.executions}`);

    if (user._count.workflows > 0 || user._count.executions > 0) {
      warning('该用户有关联数据，删除后这些数据也会被删除！');
    }

    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDelete',
        message: '确定要删除这个用户吗？此操作不可撤销！',
        default: false
      }
    ]);

    if (!confirm.confirmDelete) {
      info('取消删除操作');
      return;
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    success('用户删除成功！');
  } catch (err) {
    error(`删除用户失败: ${err}`);
  }
}

// 重置用户密码
async function resetPassword(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      error('用户不存在');
      return;
    }

    info(`重置用户密码: ${user.firstName} ${user.lastName} (${user.email})`);

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'newPassword',
        message: '请输入新密码:',
        validate: (input) => input.length >= 8 || '密码至少8位'
      },
      {
        type: 'password',
        name: 'confirmPassword',
        message: '请确认新密码:',
        validate: (input, answers) => input === answers.newPassword || '密码不匹配'
      }
    ]);

    const hashedPassword = await bcrypt.hash(answers.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    success('密码重置成功！');
  } catch (err) {
    error(`重置密码失败: ${err}`);
  }
}

// 创建管理员用户
async function createAdmin() {
  try {
    info('创建管理员账户');

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'firstName',
        message: '管理员姓:',
        validate: (input) => input.trim() !== '' || '姓不能为空'
      },
      {
        type: 'input',
        name: 'lastName',
        message: '管理员名:',
        validate: (input) => input.trim() !== '' || '名不能为空'
      },
      {
        type: 'input',
        name: 'email',
        message: '管理员邮箱:',
        validate: (input) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || '邮箱格式不正确';
        }
      },
      {
        type: 'password',
        name: 'password',
        message: '管理员密码:',
        validate: (input) => input.length >= 8 || '密码至少8位'
      }
    ]);

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: answers.email }
    });

    if (existingUser) {
      error('邮箱已被注册');
      return;
    }

    const hashedPassword = await bcrypt.hash(answers.password, 12);

    const admin = await prisma.user.create({
      data: {
        firstName: answers.firstName,
        lastName: answers.lastName,
        email: answers.email,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });

    success('管理员账户创建成功！');
    info(`管理员ID: ${admin.id}`);
    info(`邮箱: ${admin.email}`);
    warning('请妥善保管管理员账户信息');
  } catch (err) {
    error(`创建管理员失败: ${err}`);
  }
}

// 显示用户统计
async function showStats() {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      usersByRole,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 最近30天
          }
        },
        select: { id: true }
      })
    ]);

    console.log(chalk.cyan('\n📊 用户统计信息'));
    console.log('='.repeat(40));
    
    const statsTable = new Table();
    statsTable.push(
      ['总用户数', totalUsers],
      ['活跃用户', activeUsers],
      ['禁用用户', totalUsers - activeUsers],
      ['管理员数量', adminUsers],
      ['最近30天新用户', recentUsers.length]
    );
    
    console.log(statsTable.toString());

    // 角色分布
    console.log(chalk.cyan('\n👥 角色分布'));
    const roleTable = new Table();
    usersByRole.forEach(item => {
      const roleNames = {
        'ADMIN': '管理员',
        'USER': '普通用户',
        'VIEWER': '只读用户'
      };
      roleTable.push([
        roleNames[item.role as keyof typeof roleNames] || item.role,
        item._count.role
      ]);
    });
    
    console.log(roleTable.toString());
  } catch (err) {
    error(`获取统计信息失败: ${err}`);
  }
}

// 查找用户
async function findUser(query: string) {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { id: query }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    if (users.length === 0) {
      warning(`没有找到匹配 "${query}" 的用户`);
      return;
    }

    const table = new Table({
      head: ['ID', '姓名', '邮箱', '角色', '状态', '创建时间', '最后登录']
    });

    users.forEach(user => {
      table.push([
        user.id.substring(0, 8),
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.role,
        user.isActive ? chalk.green('活跃') : chalk.red('禁用'),
        user.createdAt.toLocaleDateString(),
        user.lastLoginAt ? user.lastLoginAt.toLocaleDateString() : '从未'
      ]);
    });

    console.log(table.toString());
    info(`找到 ${users.length} 个匹配的用户`);
  } catch (err) {
    error(`查找用户失败: ${err}`);
  }
}

// 设置命令行选项
program
  .name('user-manager')
  .description('投资工作流管理系统用户管理工具')
  .version('1.0.0');

program
  .command('list')
  .alias('ls')
  .description('列出所有用户')
  .action(listUsers);

program
  .command('create')
  .alias('add')
  .description('创建新用户')
  .action(createUser);

program
  .command('create-admin')
  .description('创建管理员账户')
  .action(createAdmin);

program
  .command('update <userId>')
  .alias('edit')
  .description('更新用户信息')
  .action(updateUser);

program
  .command('delete <userId>')
  .alias('rm')
  .description('删除用户')
  .action(deleteUser);

program
  .command('reset-password <userId>')
  .alias('reset')
  .description('重置用户密码')
  .action(resetPassword);

program
  .command('find <query>')
  .alias('search')
  .description('查找用户（支持邮箱、姓名、ID）')
  .action(findUser);

program
  .command('stats')
  .description('显示用户统计信息')
  .action(showStats);

// 交互式模式
program
  .command('interactive')
  .alias('i')
  .description('进入交互式模式')
  .action(async () => {
    console.log(chalk.cyan('🔧 用户管理交互式模式'));
    console.log('输入 "help" 查看可用命令，输入 "exit" 退出');

    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: '请选择操作:',
          choices: [
            { name: '📋 列出所有用户', value: 'list' },
            { name: '➕ 创建新用户', value: 'create' },
            { name: '👑 创建管理员', value: 'create-admin' },
            { name: '🔍 查找用户', value: 'find' },
            { name: '📊 用户统计', value: 'stats' },
            { name: '🚪 退出', value: 'exit' }
          ]
        }
      ]);

      switch (action) {
        case 'list':
          await listUsers();
          break;
        case 'create':
          await createUser();
          break;
        case 'create-admin':
          await createAdmin();
          break;
        case 'find':
          const { query } = await inquirer.prompt([
            {
              type: 'input',
              name: 'query',
              message: '请输入搜索关键词:'
            }
          ]);
          await findUser(query);
          break;
        case 'stats':
          await showStats();
          break;
        case 'exit':
          info('再见！');
          process.exit(0);
      }

      console.log('\n' + '='.repeat(50) + '\n');
    }
  });

// 错误处理
process.on('SIGINT', async () => {
  info('\n正在关闭数据库连接...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('unhandledRejection', async (reason, promise) => {
  error(`未处理的Promise拒绝: ${reason}`);
  await prisma.$disconnect();
  process.exit(1);
});

// 解析命令行参数
program.parse();

// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}