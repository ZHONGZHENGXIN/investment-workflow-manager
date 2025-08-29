#!/usr/bin/env node

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

interface SecurityTestResult {
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  passed: boolean;
  issues: string[];
  recommendations: string[];
}

class SecurityTestRunner {
  private results: SecurityTestResult[] = [];

  async runSecurityAudit(): Promise<SecurityTestResult> {
    console.log('\n🔒 Running npm security audit...');
    
    try {
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const auditData = JSON.parse(auditOutput);
      
      const vulnerabilities = auditData.vulnerabilities || {};
      const issues: string[] = [];
      const recommendations: string[] = [];
      
      let highestSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      
      Object.entries(vulnerabilities).forEach(([pkg, vuln]: [string, any]) => {
        if (vuln.severity === 'critical') {
          highestSeverity = 'CRITICAL';
          issues.push(`CRITICAL: ${pkg} - ${vuln.title}`);
          recommendations.push(`Update ${pkg} to version ${vuln.fixAvailable?.version || 'latest'}`);
        } else if (vuln.severity === 'high') {
          if (highestSeverity !== 'CRITICAL') highestSeverity = 'HIGH';
          issues.push(`HIGH: ${pkg} - ${vuln.title}`);
          recommendations.push(`Update ${pkg} to fix high severity vulnerability`);
        } else if (vuln.severity === 'moderate') {
          if (!['CRITICAL', 'HIGH'].includes(highestSeverity)) highestSeverity = 'MEDIUM';
          issues.push(`MODERATE: ${pkg} - ${vuln.title}`);
        }
      });
      
      const result: SecurityTestResult = {
        name: 'NPM Security Audit',
        severity: highestSeverity,
        passed: issues.length === 0,
        issues,
        recommendations
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: SecurityTestResult = {
        name: 'NPM Security Audit',
        severity: 'HIGH',
        passed: false,
        issues: ['Failed to run npm audit'],
        recommendations: ['Check npm installation and network connectivity']
      };
      
      this.results.push(result);
      return result;
    }
  }

  async runXSSTests(): Promise<SecurityTestResult> {
    console.log('\n🛡️  Running XSS security tests...');
    
    try {
      execSync('npm test -- --testPathPattern=security/xss.security.test.tsx --verbose', {
        stdio: 'inherit'
      });
      
      const result: SecurityTestResult = {
        name: 'XSS Protection Tests',
        severity: 'LOW',
        passed: true,
        issues: [],
        recommendations: ['Continue monitoring for XSS vulnerabilities']
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: SecurityTestResult = {
        name: 'XSS Protection Tests',
        severity: 'HIGH',
        passed: false,
        issues: ['XSS security tests failed'],
        recommendations: [
          'Review input sanitization',
          'Implement Content Security Policy',
          'Use dangerouslySetInnerHTML carefully'
        ]
      };
      
      this.results.push(result);
      return result;
    }
  }

  async runDependencyCheck(): Promise<SecurityTestResult> {
    console.log('\n📦 Checking for known vulnerable dependencies...');
    
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageLockPath = path.join(process.cwd(), 'package-lock.json');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      if (!fs.existsSync(packageJsonPath)) {
        issues.push('package.json not found');
      }
      
      if (!fs.existsSync(packageLockPath)) {
        issues.push('package-lock.json not found - dependency versions not locked');
        recommendations.push('Run npm install to generate package-lock.json');
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check for known vulnerable packages (simplified check)
      const knownVulnerablePackages = [
        'lodash@4.17.15',
        'moment@2.29.1',
        'axios@0.21.0'
      ];
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      Object.entries(allDeps).forEach(([pkg, version]) => {
        const pkgVersion = `${pkg}@${version}`;
        if (knownVulnerablePackages.some(vuln => pkgVersion.includes(vuln))) {
          issues.push(`Potentially vulnerable dependency: ${pkgVersion}`);
          recommendations.push(`Update ${pkg} to latest version`);
        }
      });
      
      const result: SecurityTestResult = {
        name: 'Dependency Security Check',
        severity: issues.length > 0 ? 'MEDIUM' : 'LOW',
        passed: issues.length === 0,
        issues,
        recommendations
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: SecurityTestResult = {
        name: 'Dependency Security Check',
        severity: 'MEDIUM',
        passed: false,
        issues: ['Failed to check dependencies'],
        recommendations: ['Manually review package.json for security issues']
      };
      
      this.results.push(result);
      return result;
    }
  }

  async runBuildSecurityCheck(): Promise<SecurityTestResult> {
    console.log('\n🏗️  Running build security check...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check for source maps in production build
      const buildDir = path.join(process.cwd(), 'dist');
      if (fs.existsSync(buildDir)) {
        const files = fs.readdirSync(buildDir, { recursive: true });
        const sourceMapFiles = files.filter(file => 
          typeof file === 'string' && file.endsWith('.map')
        );
        
        if (sourceMapFiles.length > 0) {
          issues.push('Source maps found in build directory');
          recommendations.push('Disable source maps in production builds');
        }
      }
      
      // Check for environment variables exposure
      const envFiles = ['.env', '.env.local', '.env.production'];
      envFiles.forEach(envFile => {
        if (fs.existsSync(envFile)) {
          const content = fs.readFileSync(envFile, 'utf8');
          if (content.includes('SECRET') || content.includes('PASSWORD')) {
            issues.push(`Potential secrets in ${envFile}`);
            recommendations.push(`Review ${envFile} for exposed secrets`);
          }
        }
      });
      
      const result: SecurityTestResult = {
        name: 'Build Security Check',
        severity: issues.length > 0 ? 'MEDIUM' : 'LOW',
        passed: issues.length === 0,
        issues,
        recommendations
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: SecurityTestResult = {
        name: 'Build Security Check',
        severity: 'LOW',
        passed: false,
        issues: ['Failed to run build security check'],
        recommendations: ['Manually review build configuration']
      };
      
      this.results.push(result);
      return result;
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🔐 Starting Frontend Security Tests\n');
    
    await this.runSecurityAudit();
    await this.runXSSTests();
    await this.runDependencyCheck();
    await this.runBuildSecurityCheck();
    
    this.generateReport();
  }

  private generateReport(): void {
    console.log('\n🔒 Security Test Report');
    console.log('=' .repeat(50));
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Security Checks: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    
    // Severity analysis
    const severityCounts = {
      CRITICAL: this.results.filter(r => r.severity === 'CRITICAL').length,
      HIGH: this.results.filter(r => r.severity === 'HIGH').length,
      MEDIUM: this.results.filter(r => r.severity === 'MEDIUM').length,
      LOW: this.results.filter(r => r.severity === 'LOW').length,
    };
    
    console.log('\nSecurity Issues by Severity:');
    console.log(`🔴 Critical: ${severityCounts.CRITICAL}`);
    console.log(`🟠 High: ${severityCounts.HIGH}`);
    console.log(`🟡 Medium: ${severityCounts.MEDIUM}`);
    console.log(`🟢 Low: ${severityCounts.LOW}`);
    
    console.log('\nDetailed Results:');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const severityIcon = {
        CRITICAL: '🔴',
        HIGH: '🟠',
        MEDIUM: '🟡',
        LOW: '🟢'
      }[result.severity];
      
      console.log(`${status} ${severityIcon} ${result.name}`);
      
      if (result.issues.length > 0) {
        console.log('   Issues:');
        result.issues.forEach(issue => console.log(`     - ${issue}`));
      }
      
      if (result.recommendations.length > 0) {
        console.log('   Recommendations:');
        result.recommendations.forEach(rec => console.log(`     - ${rec}`));
      }
    });
    
    // Security score
    const securityScore = this.calculateSecurityScore();
    console.log(`\n🎯 Security Score: ${securityScore}/100`);
    
    if (securityScore >= 90) {
      console.log('🟢 Excellent security posture');
    } else if (securityScore >= 70) {
      console.log('🟡 Good security posture with room for improvement');
    } else if (securityScore >= 50) {
      console.log('🟠 Moderate security risks identified');
    } else {
      console.log('🔴 Significant security risks - immediate action required');
    }
    
    console.log('\n💡 General Security Recommendations:');
    console.log('- Regularly update dependencies');
    console.log('- Implement Content Security Policy');
    console.log('- Use HTTPS in production');
    console.log('- Sanitize all user inputs');
    console.log('- Regular security audits');
    console.log('- Monitor for new vulnerabilities');
    
    console.log('\n' + '='.repeat(50));
    
    if (severityCounts.CRITICAL > 0 || severityCounts.HIGH > 0) {
      console.log('❌ Critical or high severity security issues found!');
      process.exit(1);
    }
  }

  private calculateSecurityScore(): number {
    let score = 100;
    
    this.results.forEach(result => {
      if (!result.passed) {
        switch (result.severity) {
          case 'CRITICAL':
            score -= 30;
            break;
          case 'HIGH':
            score -= 20;
            break;
          case 'MEDIUM':
            score -= 10;
            break;
          case 'LOW':
            score -= 5;
            break;
        }
      }
    });
    
    return Math.max(0, score);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new SecurityTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Security test runner failed:', error);
    process.exit(1);
  });
}

export default SecurityTestRunner;