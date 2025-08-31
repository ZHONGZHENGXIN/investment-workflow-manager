// 简化版日志记录器 - 当主日志系统失败时的备用方案
// 基于console的基础日志记录

interface LogLevel {
    ERROR: 0;
    WARN: 1;
    INFO: 2;
    HTTP: 3;
    DEBUG: 4;
}

const LOG_LEVELS: LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    HTTP: 3,
    DEBUG: 4
};

class SimpleLogger {
    private currentLevel: number;

    constructor() {
        const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
        this.currentLevel = LOG_LEVELS[envLevel as keyof LogLevel] ?? LOG_LEVELS.INFO;
    }

    private shouldLog(level: number): boolean {
        return level <= this.currentLevel;
    }

    private formatMessage(level: string, message: string, meta?: any): string {
        const timestamp = new Date().toISOString();
        let logMessage = `${timestamp} [${level}]: ${message}`;

        if (meta && Object.keys(meta).length > 0) {
            try {
                logMessage += ` ${JSON.stringify(meta)}`;
            } catch (error) {
                logMessage += ` [Meta serialization failed]`;
            }
        }

        return logMessage;
    }

    error(message: string, meta?: any): void {
        if (this.shouldLog(LOG_LEVELS.ERROR)) {
            console.error(this.formatMessage('ERROR', message, meta));
        }
    }

    warn(message: string, meta?: any): void {
        if (this.shouldLog(LOG_LEVELS.WARN)) {
            console.warn(this.formatMessage('WARN', message, meta));
        }
    }

    info(message: string, meta?: any): void {
        if (this.shouldLog(LOG_LEVELS.INFO)) {
            console.info(this.formatMessage('INFO', message, meta));
        }
    }

    http(message: string, meta?: any): void {
        if (this.shouldLog(LOG_LEVELS.HTTP)) {
            console.log(this.formatMessage('HTTP', message, meta));
        }
    }

    debug(message: string, meta?: any): void {
        if (this.shouldLog(LOG_LEVELS.DEBUG)) {
            console.debug(this.formatMessage('DEBUG', message, meta));
        }
    }
}

// 创建简化版logger实例
export const simpleLogger = new SimpleLogger();

// 简化版业务日志记录器
export const simpleBusinessLogger = {
    userAction: (userId: string, action: string, details: any = {}) => {
        simpleLogger.info('User action', {
            category: 'user_action',
            userId,
            action,
            details
        });
    },

    workflowAction: (userId: string, workflowId: string, action: string, details: any = {}) => {
        simpleLogger.info('Workflow action', {
            category: 'workflow_action',
            userId,
            workflowId,
            action,
            details
        });
    },

    executionAction: (userId: string, executionId: string, action: string, details: any = {}) => {
        simpleLogger.info('Execution action', {
            category: 'execution_action',
            userId,
            executionId,
            action,
            details
        });
    },

    fileAction: (userId: string, fileId: string, action: string, details: any = {}) => {
        simpleLogger.info('File action', {
            category: 'file_action',
            userId,
            fileId,
            action,
            details
        });
    },

    securityEvent: (userId: string | null, event: string, details: any = {}) => {
        simpleLogger.warn('Security event', {
            category: 'security_event',
            userId,
            event,
            details
        });
    },

    systemEvent: (event: string, details: any = {}) => {
        simpleLogger.info('System event', {
            category: 'system_event',
            event,
            details
        });
    }
};

// 简化版性能日志记录器
export const simplePerformanceLogger = {
    dbQuery: (query: string, duration: number, rowCount?: number) => {
        const level = duration > 1000 ? 'warn' : 'debug';
        simpleLogger[level]('Database query', {
            category: 'db_performance',
            query: query.substring(0, 200),
            duration: `${duration}ms`,
            rowCount
        });
    },

    apiResponse: (method: string, path: string, duration: number, statusCode: number) => {
        simpleLogger.http('API response', {
            category: 'api_performance',
            method,
            path,
            duration: `${duration}ms`,
            statusCode
        });
    },

    fileOperation: (operation: string, fileName: string, fileSize: number, duration: number) => {
        simpleLogger.debug('File operation', {
            category: 'file_performance',
            operation,
            fileName,
            fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
            duration: `${duration}ms`
        });
    }
};

// 简化版错误日志记录器
export const simpleErrorLogger = {
    applicationError: (error: Error, context: any = {}) => {
        simpleLogger.error('Application error', {
            category: 'application_error',
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            context
        });
    },

    databaseError: (error: Error, query?: string) => {
        simpleLogger.error('Database error', {
            category: 'database_error',
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            query: query?.substring(0, 200)
        });
    },

    externalServiceError: (service: string, error: Error, context: any = {}) => {
        simpleLogger.error('External service error', {
            category: 'external_service_error',
            service,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            context
        });
    },

    validationError: (field: string, value: any, rule: string, context: any = {}) => {
        simpleLogger.warn('Validation error', {
            category: 'validation_error',
            field,
            value,
            rule,
            context
        });
    }
};

// 简化版审计日志记录器
export const simpleAuditLogger = {
    dataChange: (userId: string, table: string, operation: string, recordId: string, oldData?: any, newData?: any) => {
        simpleLogger.info('Data change audit', {
            category: 'data_audit',
            userId,
            table,
            operation,
            recordId,
            oldData,
            newData
        });
    },

    permissionChange: (adminUserId: string, targetUserId: string, operation: string, permissions: any) => {
        simpleLogger.info('Permission change audit', {
            category: 'permission_audit',
            adminUserId,
            targetUserId,
            operation,
            permissions
        });
    },

    loginAudit: (userId: string, success: boolean, ip: string, userAgent?: string, reason?: string) => {
        simpleLogger.info('Login audit', {
            category: 'login_audit',
            userId,
            success,
            ip,
            userAgent,
            reason
        });
    }
};

export default simpleLogger;