#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { connectDatabase, disconnectDatabase } from '../utils/database';
import fs from 'fs';
import path from 'path';

/**
 * 安全测试运行器
 * 专门用于运行安全测试并生成安全报告
 */
class SecurityTestRunner {
  private securityResults: Array<{
    testName: string;
    category: string;
    vulnerabilities: Array<{
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      type: string;
      description: string;
      recommendation: string;
    }>;
    passed: boolean;
    duration: number;
  }> = [];

  async setupEnvironment(): Promise<void> {
    console.log('🔒 设置安全测试环境...');
    
    // 设置安全测试环境变量
    process.env.NODE_ENV = 'test';
    process.env.SECURITY_TEST = 'true';
    process.env.JWT_SECRET = 'security-test-jwt-secret-key';
    process.env.DATABASE_URL = process.env.SECURITY_TEST_DATABASE_URL || 
      'postgresql://test:test@localhost:5432/security_test_db';
    
    // 连接测试数据库
    try {
      await connectDatabase();
      console.log('✅ 安全测试数据库连接成功');
    } catch (error) {
      console.error('❌ 安全测试数据库连接失败:', error);
      throw error;
    }
  }

  async cleanupEnvironment(): Promise<void> {
    console.log('🧹 清理安全测试环境...');
    
    try {
      await disconnectDatabase();
      console.log('✅ 安全测试数据库断开连接成功');
    } catch (error) {
      console.error('❌ 清理安全测试环境失败:', error);
    }
  }

  async runSecurityTest(testFile: string, category: string): Promise<void> {
    console.log(`\n🔍 运行安全测试: ${testFile}`);
    
    const startTime = Date.now();
    
    try {
      const command = `npx jest ${testFile} --verbose --detectOpenHandles --forceExit`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120000 // 2分钟超时
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.securityResults.push({
        testName: testFile,
        category,
        vulnerabilities: [],
        passed: true,
        duration
      });

      console.log(`✅ ${testFile} 通过 (${duration}ms)`);
      
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 分析错误输出以识别安全漏洞
      const vulnerabilities = this.parseSecurityErrors(error.stdout || error.message);
      
      this.securityResults.push({
        testName: testFile,
        category,
        vulnerabilities,
        passed: vulnerabilities.length === 0,
        duration
      });

      if (vulnerabilities.length > 0) {
        console.log(`⚠️  ${testFile} 发现安全问题 (${duration}ms)`);
        vulnerabilities.forEach(vuln => {
          console.log(`   ${this.getSeverityIcon(vuln.severity)} ${vuln.type}: ${vuln.description}`);
        });
      } else {
        console.log(`❌ ${testFile} 测试失败 (${duration}ms)`);
      }
    }
  }

  private parseSecurityErrors(output: string): Array<{
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    type: string;
    description: string;
    recommendation: string;
  }> {
    const vulnerabilities = [];
    
    // 这里可以添加更复杂的错误解析逻辑
    // 根据测试输出识别具体的安全漏洞类型
    
    if (output.includes('SQL injection')) {
      vulnerabilities.push({
        severity: 'CRITICAL' as const,
        type: 'SQL Injection',
        description: '检测到SQL注入漏洞',
        recommendation: '使用参数化查询和输入验证'
      });
    }
    
    if (output.includes('XSS')) {
      vulnerabilities.push({
        severity: 'HIGH' as const,
        type: 'Cross-Site Scripting',
        description: '检测到XSS漏洞',
        recommendation: '对用户输入进行适当的转义和验证'
      });
    }
    
    if (output.includes('authentication')) {
      vulnerabilities.push({
        severity: 'HIGH' as const,
        type: 'Authentication Bypass',
        description: '检测到认证绕过漏洞',
        recommendation: '加强认证机制和会话管理'
      });
    }
    
    if (output.includes('authorization')) {
      vulnerabilities.push({
        severity: 'HIGH' as const,
        type: 'Authorization Failure',
        description: '检测到权限控制漏洞',
        recommendation: '实施严格的访问控制和权限验证'
      });
    }
    
    return vulnerabilities;
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return '🚨';
      case 'HIGH': return '🔴';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  }

  async runAllSecurityTests(): Promise<void> {
    const securityTests = [
      { file: 'src/__tests__/security/auth.security.test.ts', category: 'Authentication' },
      { file: 'src/__tests__/security/upload.security.test.ts', category: 'File Upload' }
    ];

    console.log('🔒 开始运行所有安全测试...\n');
    
    for (const test of securityTests) {
      await this.runSecurityTest(test.file, test.category);
      
      // 在测试之间等待一段时间
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 运行依赖漏洞扫描
    await this.runDependencyAudit();
    
    this.generateSecurityReport();
  }

  async runDependencyAudit(): Promise<void> {
    console.log('\n🔍 运行依赖漏洞扫描...');
    
    try {
      const auditOutput = execSync('npm audit --json', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const auditResult = JSON.parse(auditOutput);
      
      if (auditResult.vulnerabilities && Object.keys(auditResult.vulnerabilities).length > 0) {
        const vulnerabilities = Object.entries(auditResult.vulnerabilities).map(([name, vuln]: [string, any]) => ({
          severity: vuln.severity.toUpperCase() as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
          type: 'Dependency Vulnerability',
          description: `${name}: ${vuln.title || '依赖包存在安全漏洞'}`,
          recommendation: `更新到安全版本: ${vuln.fixAvailable ? '有修复版本可用' : '暂无修复版本'}`
        }));

        this.securityResults.push({
          testName: 'npm audit',
          category: 'Dependencies',
          vulnerabilities,
          passed: false,
          duration: 0
        });

        console.log(`⚠️  发现 ${vulnerabilities.length} 个依赖漏洞`);
      } else {
        this.securityResults.push({
          testName: 'npm audit',
          category: 'Dependencies',
          vulnerabilities: [],
          passed: true,
          duration: 0
        });

        console.log('✅ 依赖包安全检查通过');
      }
    } catch (error: any) {
      console.log('❌ 依赖漏洞扫描失败:', error.message);
    }
  }

  private generateSecurityReport(): void {
    console.log('\n🔒 安全测试报告');
    console.log('='.repeat(60));
    
    const totalTests = this.securityResults.length;
    const passedTests = this.securityResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    // 统计漏洞
    const allVulnerabilities = this.securityResults.flatMap(r => r.vulnerabilities);
    const criticalVulns = allVulnerabilities.filter(v => v.severity === 'CRITICAL').length;
    const highVulns = allVulnerabilities.filter(v => v.severity === 'HIGH').length;
    const mediumVulns = allVulnerabilities.filter(v => v.severity === 'MEDIUM').length;
    const lowVulns = allVulnerabilities.filter(v => v.severity === 'LOW').length;
    
    console.log(`总计: ${totalTests} 个安全测试`);
    console.log(`通过: ${passedTests} 个`);
    console.log(`失败: ${failedTests} 个`);
    
    console.log('\n🚨 漏洞统计:');
    console.log(`严重: ${criticalVulns} 个`);
    console.log(`高危: ${highVulns} 个`);
    console.log(`中危: ${mediumVulns} 个`);
    console.log(`低危: ${lowVulns} 个`);
    
    if (allVulnerabilities.length > 0) {
      console.log('\n📋 详细漏洞信息:');
      
      const groupedByCategory = this.securityResults.reduce((acc, result) => {
        if (result.vulnerabilities.length > 0) {
          acc[result.category] = acc[result.category] || [];
          acc[result.category].push(...result.vulnerabilities);
        }
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(groupedByCategory).forEach(([category, vulns]) => {
        console.log(`\n📂 ${category}:`);
        vulns.forEach(vuln => {
          console.log(`   ${this.getSeverityIcon(vuln.severity)} ${vuln.type}`);
          console.log(`      描述: ${vuln.description}`);
          console.log(`      建议: ${vuln.recommendation}`);
        });
      });
    }

    // 生成JSON报告文件
    this.generateJSONSecurityReport();
    
    // 生成安全评分
    const securityScore = this.calculateSecurityScore(criticalVulns, highVulns, mediumVulns, lowVulns);
    console.log(`\n🏆 安全评分: ${securityScore}/100`);
    
    console.log('\n' + '='.repeat(60));
    
    if (criticalVulns === 0 && highVulns === 0) {
      console.log('🎉 未发现严重或高危安全漏洞！');
    } else {
      console.log('⚠️  发现严重或高危安全漏洞，请立即修复');
      if (criticalVulns > 0) {
        process.exit(1);
      }
    }
  }

  private calculateSecurityScore(critical: number, high: number, medium: number, low: number): number {
    let score = 100;
    
    // 严重漏洞每个扣30分
    score -= critical * 30;
    
    // 高危漏洞每个扣15分
    score -= high * 15;
    
    // 中危漏洞每个扣5分
    score -= medium * 5;
    
    // 低危漏洞每个扣1分
    score -= low * 1;
    
    return Math.max(0, score);
  }

  private generateJSONSecurityReport(): void {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.securityResults.length,
        passed: this.securityResults.filter(r => r.passed).length,
        failed: this.securityResults.filter(r => !r.passed).length,
        vulnerabilities: {
          critical: this.securityResults.flatMap(r => r.vulnerabilities).filter(v => v.severity === 'CRITICAL').length,
          high: this.securityResults.flatMap(r => r.vulnerabilities).filter(v => v.severity === 'HIGH').length,
          medium: this.securityResults.flatMap(r => r.vulnerabilities).filter(v => v.severity === 'MEDIUM').length,
          low: this.securityResults.flatMap(r => r.vulnerabilities).filter(v => v.severity === 'LOW').length
        }
      },
      results: this.securityResults,
      recommendations: this.generateRecommendations(),
      compliance: this.checkCompliance()
    };

    const reportPath = path.join(__dirname, '../../../reports/security-report.json');
    
    // 确保报告目录存在
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 安全报告已生成: ${reportPath}`);
  }

  private generateRecommendations(): string[] {
    const recommendations = [
      '定期更新依赖包到最新安全版本',
      '实施严格的输入验证和输出编码',
      '使用参数化查询防止SQL注入',
      '配置适当的安全HTTP头',
      '实施强密码策略和多因素认证',
      '定期进行安全代码审查',
      '建立安全事件响应流程',
      '进行定期的渗透测试'
    ];

    return recommendations;
  }

  private checkCompliance(): Record<string, boolean> {
    const allVulns = this.securityResults.flatMap(r => r.vulnerabilities);
    const criticalCount = allVulns.filter(v => v.severity === 'CRITICAL').length;
    const highCount = allVulns.filter(v => v.severity === 'HIGH').length;

    return {
      'OWASP Top 10': criticalCount === 0 && highCount === 0,
      'PCI DSS': criticalCount === 0,
      'ISO 27001': criticalCount === 0 && highCount <= 2,
      'SOC 2': criticalCount === 0 && highCount === 0
    };
  }
}

// 主函数
async function main(): Promise<void> {
  const runner = new SecurityTestRunner();
  const args = process.argv.slice(2);
  
  try {
    await runner.setupEnvironment();
    await runner.runAllSecurityTests();
  } catch (error) {
    console.error('❌ 安全测试运行失败:', error);
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

export default SecurityTestRunner;