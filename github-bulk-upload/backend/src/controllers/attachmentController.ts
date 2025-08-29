import { Request, Response } from 'express';
import path from 'path';
import { AttachmentService } from '../services/attachmentService';
import { uploadSingle, uploadMultiple } from '../utils/fileUpload';

const attachmentService = new AttachmentService();

export class AttachmentController {
  // 上传单个文件
  async uploadSingle(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { executionRecordId } = req.params;
      
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '没有上传文件'
          }
        });
        return;
      }

      const attachment = await attachmentService.createAttachment(
        executionRecordId,
        req.file,
        req.user.userId
      );

      res.status(201).json({
        success: true,
        data: { attachment },
        message: '文件上传成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '文件上传失败';
      const statusCode = errorMessage.includes('不存在') || errorMessage.includes('无权限') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 上传多个文件
  async uploadMultiple(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { executionRecordId } = req.params;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '没有上传文件'
          }
        });
        return;
      }

      const attachments = [];
      const errors = [];

      for (const file of files) {
        try {
          const attachment = await attachmentService.createAttachment(
            executionRecordId,
            file,
            req.user.userId
          );
          attachments.push(attachment);
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : '上传失败'
          });
        }
      }

      res.status(201).json({
        success: true,
        data: { 
          attachments,
          errors: errors.length > 0 ? errors : undefined
        },
        message: `成功上传 ${attachments.length} 个文件${errors.length > 0 ? `，${errors.length} 个文件失败` : ''}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '批量上传失败'
        }
      });
    }
  }

  // 获取附件列表
  async getAttachments(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { executionRecordId } = req.params;
      const attachments = await attachmentService.getAttachmentsByExecutionRecord(
        executionRecordId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        data: { attachments },
        message: '获取附件列表成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取附件列表失败';
      const statusCode = errorMessage.includes('不存在') || errorMessage.includes('无权限') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 下载文件
  async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { attachmentId } = req.params;
      const attachment = await attachmentService.getAttachmentById(attachmentId, req.user.userId);
      
      if (!attachment) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND_ERROR',
            message: '附件不存在'
          }
        });
        return;
      }

      const filePath = await attachmentService.getAttachmentFilePath(attachmentId, req.user.userId);
      
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '文件下载失败';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 获取缩略图
  async getThumbnail(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { attachmentId } = req.params;
      const thumbnailPath = await attachmentService.getThumbnailPath(attachmentId, req.user.userId);
      
      if (!thumbnailPath) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND_ERROR',
            message: '缩略图不存在'
          }
        });
        return;
      }

      res.setHeader('Content-Type', 'image/jpeg');
      res.sendFile(path.resolve(thumbnailPath));
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'THUMBNAIL_ERROR',
          message: '获取缩略图失败'
        }
      });
    }
  }

  // 删除附件
  async deleteAttachment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { attachmentId } = req.params;
      await attachmentService.deleteAttachment(attachmentId, req.user.userId);

      res.status(200).json({
        success: true,
        message: '附件删除成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除附件失败';
      const statusCode = errorMessage.includes('不存在') || errorMessage.includes('无权限') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 批量删除附件
  async batchDeleteAttachments(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { attachmentIds } = req.body;
      
      if (!Array.isArray(attachmentIds) || attachmentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请提供要删除的附件ID列表'
          }
        });
        return;
      }

      await attachmentService.batchDeleteAttachments(attachmentIds, req.user.userId);

      res.status(200).json({
        success: true,
        message: `成功删除 ${attachmentIds.length} 个附件`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量删除附件失败';
      const statusCode = errorMessage.includes('不存在') || errorMessage.includes('无权限') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'BATCH_DELETE_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 获取用户附件统计
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const stats = await attachmentService.getUserAttachmentStats(req.user.userId);

      res.status(200).json({
        success: true,
        data: { stats },
        message: '获取统计信息成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: '获取统计信息失败'
        }
      });
    }
  }
}