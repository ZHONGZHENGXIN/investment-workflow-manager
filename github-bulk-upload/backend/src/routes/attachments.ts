import { Router } from 'express';
import { AttachmentController } from '../controllers/attachmentController';
import { authenticateToken } from '../middleware/auth';
import { uploadSingle, uploadMultiple } from '../utils/fileUpload';

const router = Router();
const attachmentController = new AttachmentController();

// 所有附件路由都需要认证
router.use(authenticateToken);

/**
 * @swagger
 * /api/attachments/execution-records/{executionRecordId}/upload:
 *   post:
 *     summary: 上传单个文件到执行记录
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionRecordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: 文件上传成功
 *       400:
 *         description: 上传失败
 */
router.post('/execution-records/:executionRecordId/upload', (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message
        }
      });
    }
    attachmentController.uploadSingle(req, res);
  });
});

/**
 * @swagger
 * /api/attachments/execution-records/{executionRecordId}/upload-multiple:
 *   post:
 *     summary: 上传多个文件到执行记录
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionRecordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: 文件上传成功
 *       400:
 *         description: 上传失败
 */
router.post('/execution-records/:executionRecordId/upload-multiple', (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message
        }
      });
    }
    attachmentController.uploadMultiple(req, res);
  });
});

/**
 * @swagger
 * /api/attachments/execution-records/{executionRecordId}:
 *   get:
 *     summary: 获取执行记录的附件列表
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionRecordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 执行记录不存在
 */
router.get('/execution-records/:executionRecordId', attachmentController.getAttachments.bind(attachmentController));

/**
 * @swagger
 * /api/attachments/{attachmentId}/download:
 *   get:
 *     summary: 下载附件
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 文件下载
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 附件不存在
 */
router.get('/:attachmentId/download', attachmentController.downloadFile.bind(attachmentController));

/**
 * @swagger
 * /api/attachments/{attachmentId}/thumbnail:
 *   get:
 *     summary: 获取图片缩略图
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 缩略图
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 缩略图不存在
 */
router.get('/:attachmentId/thumbnail', attachmentController.getThumbnail.bind(attachmentController));

/**
 * @swagger
 * /api/attachments/{attachmentId}:
 *   delete:
 *     summary: 删除附件
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 附件不存在
 */
router.delete('/:attachmentId', attachmentController.deleteAttachment.bind(attachmentController));

/**
 * @swagger
 * /api/attachments/batch-delete:
 *   post:
 *     summary: 批量删除附件
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attachmentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 批量删除成功
 *       400:
 *         description: 请求参数错误
 */
router.post('/batch-delete', attachmentController.batchDeleteAttachments.bind(attachmentController));

/**
 * @swagger
 * /api/attachments/stats:
 *   get:
 *     summary: 获取用户附件统计信息
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/stats', attachmentController.getUserStats.bind(attachmentController));

export default router;