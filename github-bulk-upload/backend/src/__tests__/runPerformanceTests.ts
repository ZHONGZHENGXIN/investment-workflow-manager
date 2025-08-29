#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { connectDatabase, disconnectDatabase } from '../utils/database';
import fs from 'fs';
import path from 'path';

/**
 * 性能测试运行器
 * 专门用于运行性能测试并生成详细报告
 */
class PerformanceTestRunner {
  private testResults: Array<{
    testName: string;
    duration: number;
    success: boolean;
    metrics: any;
    errors?: string[];
  }> = [];

  async setupEnvironment(): Promise<void> {
    console.log('🔧 设置性能测试环境...');
    
    // 设置性能测试环境变量
    process.env.NODE_ENV = 'test';
    process.env.PERFORMANCE_TEST = 'true';
    process.env.JWT_SECRET = 'performance-test-jwt-secret';
    process.env.DATABASE_URL = process.env.PERFORMANCE_TEST_DATABASE_URL || 
      'postgresql://test:test@localhost:5432/performance_test_db';
    
    // 启用垃圾回收监控
    if (global.gc) {
      console.log('✅ 垃圾回收监控已启用');
    } else {
      console.log('⚠️  垃圾回收监控未启用，建议使用 --expose-gc 参数');
    }

    // 连接测试数据库
    try {
      await connectDatabase();
      console.log('✅ 性能测试数据库连接成功');
    } catch (error) {
      console.error('❌ 性能测试数据库连接失败:', error);
      throw error;
    }
  }

  async cleanupEnvironment(): Promise<void> {
    console.log('🧹 清理性能测试环境...');
    
    try {
      await disconnectDatabase();
      console.log('✅ 性能测试数据库断开连接成功');
    } catch (error) {
      console.error('❌ 清理性能测试环境失败:', error);
    }
  }

  async runPerformanceTest(testFile: string): Promise<void> {
    console.log(`\n🚀 运行性能测试: ${testFile}`);
    
    const startTime = Date.now();
    const initialMemory = process.memoryUsage();
    
    try {
      const command = `npx jest ${testFile} --verbose --detectOpenHandles --forceExit`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 300000, // 5分钟超时
        env: {
          ...process.env,
          NODE_OPTIONS: '--max-old-space-size=4096'
        }
      });
      
      const endTime = Date.now();
      const finalMemory = process.memoryUsage();
      const duration = endTime - startTime;
      
      const metrics = {
        duration,
        memoryUsage: {
          initial: initialMemory,
          final: finalMemory,
          increase: {
            rss: finalMemory.rss - initialMemory.rss,
            heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
            heapTotal: finalMemory.heapTotal - initialMemory.heapTotal
          }
        }
      };

      this.testResults.push({
        testName: testFile,
        duration,
        success: true,
        metrics,
      });

      console.log(`✅ ${testFile} 完成 (${duration}ms)`);
      console.log(`   内存使用: ${(metrics.memoryUsage.increase.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.testResults.push({
        testName: testFile,
        duration,
        success: false,
        metrics: {},
        errors: [error.message]
      });

      console.log(`❌ ${testFile} 失败 (${duration}ms)`);
      console.log(`   错误: ${error.message}`);
    }
  }

  async runAllPerformanceTests(): Promise<void> {
    const performanceTests = [
      'src/__tests__/performance/load.test.ts'
    ];

    console.log('🚀 开始运行所有性能测试...\n');
    
    for (const testFile of performanceTests) {
      await this.runPerformanceTest(testFile);
      
      // 在测试之间强制垃圾回收
      if (global.gc) {
        global.gc();
      }
      
      // 等待一段时间让系统稳定
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    this.generatePerformanceReport();
  }

  private generatePerformanceReport(): void {
    console.log('\n📊 性能测试报告');
    console.log('='.repeat(60));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`总计: ${totalTests} 个性能测试`);
    console.log(`通过: ${passedTests} 个`);
    console.log(`失败: ${failedTests} 个`);
    
    if (passedTests > 0) {
      const avgDuration = this.testResults
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.duration, 0) / passedTests;
      
      console.log(`平均执行时间: ${avgDuration.toFixed(2)}ms`);
    }

    console.log('\n📈 详细性能指标:');
    this.testResults.forEach(result => {
      console.log(`\n${result.success ? '✅' : '❌'} ${result.testName}`);
      console.log(`   执行时间: ${result.duration}ms`);
      
      if (result.success && result.metrics.memoryUsage) {
        const memIncrease = result.metrics.memoryUsage.increase.heapUsed / 1024 / 1024;
        console.log(`   内存增长: ${memIncrease.toFixed(2)}MB`);
        
        if (memIncrease > 100) {
          console.log(`   ⚠️  内存使用较高，建议检查内存泄漏`);
        }
      }
      
      if (!result.success && result.errors) {
        console.log(`   错误信息: ${result.errors.join(', ')}`);
      }
    });

    // 生成JSON报告文件
    this.generateJSONReport();
    
    console.log('\n' + '='.repeat(60));
    
    if (failedTests === 0) {
      console.log('🎉 所有性能测试都通过了！');
    } else {
      console.log('⚠️  有性能测试失败，请检查上述错误信息');
      process.exit(1);
    }
  }

  private generateJSONReport(): void {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.success).length,
        failed: this.testResults.filter(r => !r.success).length,
        averageDuration: this.testResults
          .filter(r => r.success)
          .reduce((sum, r) => sum + r.duration, 0) / 
          this.testResults.filter(r => r.success).length || 0
      },
      results: this.testResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryLimit: process.env.NODE_OPTIONS
      }
    };

    const reportPath = path.join(__dirname, '../../../reports/performance-report.json');
    
    // 确保报告目录存在
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 JSON报告已生成: ${reportPath}`);
  }

  async runBenchmark(): Promise<void> {
    console.log('🏃‍♂️ 运行性能基准测试...');
    
    const benchmarkTests = [
      {
        name: 'API响应时间基准',
        target: 2000, // 2秒
        test: 'api-response-time'
      },
      {
        name: '数据库查询基准',
        target: 1000, // 1秒
        test: 'database-query-time'
      },
      {
        name: '并发处理基准',
        target: 10000, // 10秒内处理50个并发请求
        test: 'concurrent-processing'
      }
    ];

    for (const benchmark of benchmarkTests) {
      console.log(`\n📊 ${benchmark.name}`);
      console.log(`   目标: < ${benchmark.target}ms`);
      
      // 这里可以添加具体的基准测试逻辑
      // 目前作为示例，实际实现需要根据具体测试内容
    }
  }
}

// 主函数
async function main(): Promise<void> {
  const runner = new PerformanceTestRunner();
  const args = process.argv.slice(2);
  
  try {
    await runner.setupEnvironment();
    
    if (args.includes('--benchmark')) {
      await runner.runBenchmark();
    } else {
      await runner.runAllPerformanceTests();
    }
  } catch (error) {
    console.error('❌ 性能测试运行失败:', error);
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

export default PerformanceTestRunner;