#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import prisma from '../config/database';

/**
 * 测试运行器
 * 负责设置测试环境、运行测试并清理资源
 */
class TestRunner {
  private testSuites = [
    {
      name: '单元测试 - 数据模型',
      pattern: 'src/__tests__/models/*.test.ts',
      timeout: 30000
    },
    {
      name: '单元测试 - 控制器',
      pattern: 'src/__tests__/controllers/*.test.ts',
      timeout: 20000
    },
    {
      name: '单元测试 - 服务层',
      pattern: 'src/__tests__/services/*.test.ts',
      timeout: 20000
    },
    {
      name: '单元测试 - 工具函数',
      pattern: 'src/__tests__/utils/*.test.ts',
      timeout: 15000
    },
    {
      name: '单元测试 - 中间件',
      pattern: 'src/__tests__/middleware/*.test.ts',
      timeout: 10000
    },
    {
      name: '集成测试 - API端点',
      pattern: 'src/__tests__/*.test.ts',
      timeout: 60000
    },
    {
      name: '集成测试 - 完整流程',
      pattern: 'src/__tests__/integration/*.test.ts',
      timeout: 120000
    }
  ];

  async setupEnvironment(): Promise<void> {
    console.log('🔧 设置测试环境...');
    
    // 设置测试环境变量
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
    
    // 连接测试数据库
    try {
      await prisma.$connect();
      console.log('✅ 测试数据库连接成功');
    } catch (error) {
      console.error('❌ 测试数据库连接失败:', error);
      throw error;
    }
  }

  async cleanupEnvironment(): Promise<void> {
    console.log('🧹 清理测试环境...');
    
    try {
      await prisma.$disconnect();
      console.log('✅ 测试数据库断开连接成功');
    } catch (error) {
      console.error('❌ 清理测试环境失败:', error);
    }
  }

  async runTestSuite(suite: typeof this.testSuites[0]): Promise<{ success: boolean; output: string }> {
    console.log(`\n🧪 运行 ${suite.name}...`);
    
    try {
      const command = `npx jest ${suite.pattern} --verbose --timeout=${suite.timeout}`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: suite.timeout + 10000 // 给Jest额外的时间
      });
      
      console.log(`✅ ${suite.name} 通过`);
      return { success: true, output };
    } catch (error: any) {
      console.log(`❌ ${suite.name} 失败`);
      return { success: false, output: error.stdout || error.message };
    }
  }

  async runAllTests(): Promise<void> {
    const results: Array<{ name: string; success: boolean; output: string }> = [];
    
    console.log('🚀 开始运行所有测试...\n');
    
    for (const suite of this.testSuites) {
      const result = await this.runTestSuite(suite);
      results.push({
        name: suite.name,
        success: result.success,
        output: result.output
      });
    }
    
    // 生成测试报告
    this.generateReport(results);
  }

  async runSpecificTests(pattern: string): Promise<void> {
    console.log(`🧪 运行特定测试: ${pattern}`);
    
    try {
      const command = `npx jest ${pattern} --verbose`;
      execSync(command, { 
        encoding: 'utf8',
        stdio: 'inherit'
      });
      
      console.log('✅ 测试完成');
    } catch (error) {
      console.log('❌ 测试失败');
      process.exit(1);
    }
  }

  async runCoverageReport(): Promise<void> {
    console.log('📊 生成测试覆盖率报告...');
    
    try {
      const command = 'npx jest --coverage --coverageReporters=text --coverageReporters=html';
      execSync(command, { 
        encoding: 'utf8',
        stdio: 'inherit'
      });
      
      console.log('✅ 覆盖率报告生成完成');
      console.log('📁 HTML报告位置: coverage/index.html');
    } catch (error) {
      console.log('❌ 生成覆盖率报告失败');
    }
  }

  private generateReport(results: Array<{ name: string; success: boolean; output: string }>): void {
    console.log('\n📋 测试报告');
    console.log('='.repeat(50));
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => r.success === false).length;
    const total = results.length;
    
    console.log(`总计: ${total} 个测试套件`);
    console.log(`通过: ${passed} 个`);
    console.log(`失败: ${failed} 个`);
    console.log(`成功率: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ 失败的测试套件:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`  - ${result.name}`);
        if (result.output) {
          console.log(`    错误信息: ${result.output.split('\n')[0]}`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (failed === 0) {
      console.log('🎉 所有测试都通过了！');
    } else {
      console.log('⚠️  有测试失败，请检查上述错误信息');
      process.exit(1);
    }
  }
}

// 主函数
async function main(): Promise<void> {
  const runner = new TestRunner();
  const args = process.argv.slice(2);
  
  try {
    await runner.setupEnvironment();
    
    if (args.length === 0) {
      // 运行所有测试
      await runner.runAllTests();
    } else if (args[0] === '--coverage') {
      // 运行覆盖率测试
      await runner.runCoverageReport();
    } else if (args[0] === '--pattern') {
      // 运行特定模式的测试
      if (args[1]) {
        await runner.runSpecificTests(args[1]);
      } else {
        console.error('❌ 请提供测试模式');
        process.exit(1);
      }
    } else {
      // 运行指定的测试文件
      await runner.runSpecificTests(args[0]);
    }
  } catch (error) {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  } finally {
    await runner.cleanupEnvironment();
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main();
}

export default TestRunner;