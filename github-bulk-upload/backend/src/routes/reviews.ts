import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const reviewController = new ReviewController();

// 所有复盘路由都需要认证
router.use(authenticateToken);

/**
 * @swagger
 * /api/reviews/summary:
 *   get:
 *     summary: 生成复盘摘要
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: executionId
 *         schema:
 *           type: string
 *         description: 特定执行记录ID（可选）
 *     responses:
 *       200:
 *         description: 生成成功
 */
router.get('/summary', reviewController.generateSummary.bind(reviewController));

/**
 * @swagger
 * /api/reviews/trends:
 *   get:
 *     summary: 获取趋势分析
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/trends', reviewController.getTrends.bind(reviewController));

/**
 * @swagger
 * /api/reviews/analytics:
 *   get:
 *     summary: 获取用户复盘分析数据
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       type: object
 */
router.get('/analytics', reviewController.getUserAnalytics.bind(reviewController));

/**
 * @swagger
 * /api/reviews/insights:
 *   get:
 *     summary: 获取复盘洞察
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 返回洞察的数量限制
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/insights', reviewController.getReviewInsights.bind(reviewController));

/**
 * @swagger
 * /api/reviews/template:
 *   get:
 *     summary: 获取复盘模板
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: workflowType
 *         schema:
 *           type: string
 *         description: 工作流类型
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/template', reviewController.getReviewTemplate.bind(reviewController));

/**
 * @swagger
 * /api/reviews/report:
 *   post:
 *     summary: 生成复盘报告
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: 生成成功
 *       400:
 *         description: 请求参数错误
 */
router.post('/report', reviewController.generateReport.bind(reviewController));

export default router;