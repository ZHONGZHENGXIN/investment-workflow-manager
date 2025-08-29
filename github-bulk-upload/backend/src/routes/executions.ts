import { Router } from 'express';
import { ExecutionController } from '../controllers/executionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const executionController = new ExecutionController();

// 所有执行路由都需要认证
router.use(authenticateToken);

/**
 * @swagger
 * /api/executions:
 *   post:
 *     summary: 创建执行记录
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workflowId
 *             properties:
 *               workflowId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 请求参数错误
 *       403:
 *         description: 无权限访问该工作流
 */
router.post('/', executionController.createExecution.bind(executionController));

/**
 * @swagger
 * /api/executions:
 *   get:
 *     summary: 获取执行记录列表（支持分页和过滤）
 *     tags: [Executions]
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
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: workflowId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, PAUSED, CANCELLED, FAILED]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: 逗号分隔的标签列表
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未认证
 */
router.get('/', executionController.getExecutions.bind(executionController));

/**
 * @swagger
 * /api/executions/stats:
 *   get:
 *     summary: 获取执行统计信息
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workflowId
 *         schema:
 *           type: string
 *         description: 特定工作流的统计信息
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/stats', executionController.getExecutionStats.bind(executionController));

/**
 * @swagger
 * /api/executions/recent:
 *   get:
 *     summary: 获取最近的执行记录
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/recent', executionController.getRecentExecutions.bind(executionController));

/**
 * @swagger
 * /api/executions/in-progress:
 *   get:
 *     summary: 获取进行中的执行记录
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/in-progress', executionController.getInProgressExecutions.bind(executionController));

/**
 * @swagger
 * /api/executions/upcoming:
 *   get:
 *     summary: 获取即将到期的执行记录
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: 未来多少天内到期
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/upcoming', executionController.getUpcomingExecutions.bind(executionController));

/**
 * @swagger
 * /api/executions/{id}:
 *   get:
 *     summary: 获取执行详情
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 获取成功
 *       403:
 *         description: 无权限访问
 *       404:
 *         description: 执行记录不存在
 */
router.get('/:id', executionController.getExecutionById.bind(executionController));

/**
 * @swagger
 * /api/executions/{id}:
 *   put:
 *     summary: 更新执行记录
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 数据验证失败
 *       403:
 *         description: 无权限修改
 *       404:
 *         description: 执行记录不存在
 */
router.put('/:id', executionController.updateExecution.bind(executionController));

/**
 * @swagger
 * /api/executions/{id}/pause:
 *   post:
 *     summary: 暂停执行
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 暂停成功
 *       400:
 *         description: 执行状态不允许暂停
 *       403:
 *         description: 无权限操作
 *       404:
 *         description: 执行记录不存在
 */
router.post('/:id/pause', executionController.pauseExecution.bind(executionController));

/**
 * @swagger
 * /api/executions/{id}/resume:
 *   post:
 *     summary: 恢复执行
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 恢复成功
 *       400:
 *         description: 执行状态不允许恢复
 *       403:
 *         description: 无权限操作
 *       404:
 *         description: 执行记录不存在
 */
router.post('/:id/resume', executionController.resumeExecution.bind(executionController));

/**
 * @swagger
 * /api/executions/{id}/complete:
 *   post:
 *     summary: 完成执行
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 完成成功
 *       400:
 *         description: 执行状态不允许完成
 *       403:
 *         description: 无权限操作
 *       404:
 *         description: 执行记录不存在
 */
router.post('/:id/complete', executionController.completeExecution.bind(executionController));

/**
 * @swagger
 * /api/executions/{id}/cancel:
 *   post:
 *     summary: 取消执行
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 取消成功
 *       400:
 *         description: 执行状态不允许取消
 *       403:
 *         description: 无权限操作
 *       404:
 *         description: 执行记录不存在
 */
router.post('/:id/cancel', executionController.cancelExecution.bind(executionController));

/**
 * @swagger
 * /api/executions/{id}/records:
 *   get:
 *     summary: 获取执行步骤记录
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 获取成功
 *       403:
 *         description: 无权限访问
 *       404:
 *         description: 执行记录不存在
 */
router.get('/:id/records', executionController.getExecutionRecords.bind(executionController));

/**
 * @swagger
 * /api/executions/{id}/next-step:
 *   get:
 *     summary: 获取下一个待执行的步骤
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 获取成功
 *       403:
 *         description: 无权限访问
 *       404:
 *         description: 执行记录不存在
 */
router.get('/:id/next-step', executionController.getNextPendingStep.bind(executionController));

/**
 * @swagger
 * /api/executions/{id}/progress:
 *   put:
 *     summary: 更新执行进度
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 进度更新成功
 *       403:
 *         description: 无权限操作
 *       404:
 *         description: 执行记录不存在
 */
router.put('/:id/progress', executionController.updateProgress.bind(executionController));

/**
 * @swagger
 * /api/executions/{executionId}/records/{recordId}/start:
 *   post:
 *     summary: 开始执行步骤
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 开始成功
 *       400:
 *         description: 步骤依赖未满足
 *       403:
 *         description: 无权限操作
 *       404:
 *         description: 执行记录不存在
 */
router.post('/:executionId/records/:recordId/start', executionController.startStep.bind(executionController));

/**
 * @swagger
 * /api/executions/{executionId}/records/{recordId}/complete:
 *   post:
 *     summary: 完成执行步骤
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *               result:
 *                 type: object
 *     responses:
 *       200:
 *         description: 完成成功
 *       403:
 *         description: 无权限操作
 *       404:
 *         description: 执行记录不存在
 */
router.post('/:executionId/records/:recordId/complete', executionController.completeStep.bind(executionController));

/**
 * @swagger
 * /api/executions/{executionId}/records/{recordId}/skip:
 *   post:
 *     summary: 跳过执行步骤
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: 跳过成功
 *       403:
 *         description: 无权限操作
 *       404:
 *         description: 执行记录不存在
 */
router.post('/:executionId/records/:recordId/skip', executionController.skipStep.bind(executionController));

/**
 * @swagger
 * /api/executions/{executionId}/records/{recordId}/fail:
 *   post:
 *     summary: 标记步骤失败
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: 标记成功
 *       403:
 *         description: 无权限操作
 *       404:
 *         description: 执行记录不存在
 */
router.post('/:executionId/records/:recordId/fail', executionController.failStep.bind(executionController));

/**
 * @swagger
 * /api/executions/{executionId}/records/{recordId}:
 *   put:
 *     summary: 更新执行步骤记录
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *               result:
 *                 type: object
 *               actualDuration:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 更新成功
 *       403:
 *         description: 无权限操作
 *       404:
 *         description: 执行记录不存在
 */
router.put('/:executionId/records/:recordId', executionController.updateExecutionRecord.bind(executionController));

/**
 * @swagger
 * /api/executions/{id}:
 *   delete:
 *     summary: 删除执行记录
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 执行记录不存在
 */
router.delete('/:id', executionController.deleteExecution.bind(executionController));

export default router;