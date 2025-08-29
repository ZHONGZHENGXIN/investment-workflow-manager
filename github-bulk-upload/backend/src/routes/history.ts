import { Router } from 'express';
import { HistoryController } from '../controllers/historyController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const historyController = new HistoryController();

// 所有历史记录路由都需要认证
router.use(authenticateToken);

/**
 * @swagger
 * /api/history/executions:
 *   get:
 *     summary: 获取执行历史列表
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: startedAt
 *         description: 排序字段
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 排序方向
 *       - in: query
 *         name: workflowId
 *         schema:
 *           type: string
 *         description: 工作流ID筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 状态筛选
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *       - in: query
 *         name: hasReview
 *         schema:
 *           type: boolean
 *         description: 是否有复盘
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/executions', historyController.getExecutionHistory.bind(historyController));

/**
 * @swagger
 * /api/history/search:
 *   post:
 *     summary: 高级搜索执行记录
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: startedAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: 搜索关键词
 *               workflowIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 工作流ID列表
 *               statuses:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 状态列表
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date
 *                   end:
 *                     type: string
 *                     format: date
 *               durationRange:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *               completionRateRange:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *               hasAttachments:
 *                 type: boolean
 *               hasReview:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 搜索成功
 */
router.post('/search', historyController.advancedSearch.bind(historyController));

/**
 * @swagger
 * /api/history/stats:
 *   get:
 *     summary: 获取历史统计信息
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/stats', historyController.getHistoryStats.bind(historyController));

/**
 * @swagger
 * /api/history/executions/{id}:
 *   get:
 *     summary: 获取执行详情
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 执行记录ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 执行记录不存在
 */
router.get('/executions/:id', historyController.getExecutionDetail.bind(historyController));

/**
 * @swagger
 * /api/history/executions/{id}:
 *   delete:
 *     summary: 删除执行记录
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 执行记录ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 执行记录不存在
 */
router.delete('/executions/:id', historyController.deleteExecution.bind(historyController));

/**
 * @swagger
 * /api/history/executions/batch:
 *   delete:
 *     summary: 批量删除执行记录
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - executionIds
 *             properties:
 *               executionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 要删除的执行记录ID列表
 *     responses:
 *       200:
 *         description: 删除成功
 *       400:
 *         description: 请求参数错误
 */
router.delete('/executions/batch', historyController.batchDeleteExecutions.bind(historyController));

/**
 * @swagger
 * /api/history/export:
 *   get:
 *     summary: 导出执行记录
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, excel]
 *           default: json
 *         description: 导出格式
 *       - in: query
 *         name: includeSteps
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含步骤详情
 *       - in: query
 *         name: includeReviews
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含复盘内容
 *       - in: query
 *         name: includeAttachments
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含附件信息
 *       - in: query
 *         name: workflowId
 *         schema:
 *           type: string
 *         description: 工作流ID筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 状态筛选
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *       - in: query
 *         name: hasReview
 *         schema:
 *           type: boolean
 *         description: 是否有复盘
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 导出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export', historyController.exportExecutions.bind(historyController));

/**
 * @swagger
 * /api/history/aggregate/{groupBy}:
 *   get:
 *     summary: 获取聚合数据
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupBy
 *         required: true
 *         schema:
 *           type: string
 *           enum: [workflow, status, month, week]
 *         description: 分组方式
 *       - in: query
 *         name: workflowId
 *         schema:
 *           type: string
 *         description: 工作流ID筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 状态筛选
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/aggregate/:groupBy', historyController.getAggregatedData.bind(historyController));

export default router;