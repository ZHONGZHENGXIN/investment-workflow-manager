import { Router } from 'express';
import { WorkflowController } from '../controllers/workflowController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const workflowController = new WorkflowController();

// 所有工作流路由都需要认证
router.use(authenticateToken);

// 搜索工作流
router.get('/search', workflowController.searchWorkflows.bind(workflowController));

// 获取工作流模板
router.get('/templates', workflowController.getTemplates.bind(workflowController));

// 获取分类列表
router.get('/categories', workflowController.getCategories.bind(workflowController));

// 获取标签列表
router.get('/tags', workflowController.getTags.bind(workflowController));

// 获取工作流统计信息
router.get('/stats', workflowController.getWorkflowStats.bind(workflowController));

/**
 * @swagger
 * /api/workflows:
 *   get:
 *     summary: 获取工作流列表（支持分页和过滤）
 *     tags: [Workflows]
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
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, ACTIVE, ARCHIVED]
 *       - in: query
 *         name: isTemplate
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *           description: 逗号分隔的标签列表
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未认证
 */
router.get('/', workflowController.getWorkflows.bind(workflowController));

/**
 * @swagger
 * /api/workflows:
 *   post:
 *     summary: 创建新工作流
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - steps
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     order:
 *                       type: number
 *                     isRequired:
 *                       type: boolean
 *                     stepType:
 *                       type: string
 *                       enum: [CHECKLIST, INPUT, DECISION]
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 创建失败
 */
router.post('/', workflowController.createWorkflow.bind(workflowController));

/**
 * @swagger
 * /api/workflows/{id}:
 *   get:
 *     summary: 根据ID获取工作流
 *     tags: [Workflows]
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
 *       404:
 *         description: 工作流不存在
 */
router.get('/:id', workflowController.getWorkflowById.bind(workflowController));

/**
 * @swagger
 * /api/workflows/{id}:
 *   put:
 *     summary: 更新工作流
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               steps:
 *                 type: array
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 工作流不存在
 */
router.put('/:id', workflowController.updateWorkflow.bind(workflowController));

/**
 * @swagger
 * /api/workflows/{id}:
 *   delete:
 *     summary: 删除工作流
 *     tags: [Workflows]
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
 *         description: 工作流不存在
 */
router.delete('/:id', workflowController.deleteWorkflow.bind(workflowController));

/**
 * @swagger
 * /api/workflows/{id}/duplicate:
 *   post:
 *     summary: 复制工作流
 *     tags: [Workflows]
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
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: 复制成功
 *       404:
 *         description: 工作流不存在
 */
router.post('/:id/duplicate', workflowController.duplicateWorkflow.bind(workflowController));

// 工作流步骤管理路由

// 重新排序工作流步骤（必须在 /:workflowId/steps/:stepId 之前）
router.put('/:workflowId/steps/reorder', workflowController.reorderWorkflowSteps.bind(workflowController));

// 获取工作流步骤
router.get('/:workflowId/steps', workflowController.getWorkflowSteps.bind(workflowController));

// 创建工作流步骤
router.post('/:workflowId/steps', workflowController.createWorkflowStep.bind(workflowController));

// 更新工作流步骤
router.put('/:workflowId/steps/:stepId', workflowController.updateWorkflowStep.bind(workflowController));

// 删除工作流步骤
router.delete('/:workflowId/steps/:stepId', workflowController.deleteWorkflowStep.bind(workflowController));

export default router;