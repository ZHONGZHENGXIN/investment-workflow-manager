import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 健康检查端点
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 服务健康
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: connected
 *                     redis:
 *                       type: string
 *                       example: connected
 *       503:
 *         description: 服务不健康
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'unknown',
        redis: 'unknown'
      }
    };

    // 检查数据库连接
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthCheck.services.database = 'connected';
    } catch (error) {
      healthCheck.services.database = 'disconnected';
      healthCheck.status = 'unhealthy';
    }

    // 检查Redis连接
    try {
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      await redis.ping();
      healthCheck.services.redis = 'connected';
      redis.disconnect();
    } catch (error) {
      healthCheck.services.redis = 'disconnected';
      healthCheck.status = 'unhealthy';
    }

    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: 就绪检查端点
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 服务就绪
 *       503:
 *         description: 服务未就绪
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // 检查关键服务是否就绪
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: 存活检查端点
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 服务存活
 */
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;