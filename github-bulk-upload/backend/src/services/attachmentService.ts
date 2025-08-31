import path from 'path';
import prisma from '../config/database';
import { 
  getFileType, 
  validateFileType, 
  validateFileSize, 
  createThumbnail, 
  deleteFile,
  getFileInfo 
} from '../utils/fileUpload';
import { Attachment, FileType } from '../types/execution';

export class AttachmentService {
  // 创建附件记录
  async createAttachment(
    executionRecordId: string,
    file: Express.Multer.File,
    userId: string
  ): Promise<Attachment> {
    // 验证执行记录是否属于用户
    const executionRecord = await prisma.executionRecord.findFirst({
      where: {
        id: executionRecordId,
        execution: {
          userId
        }
      }
    });

    if (!executionRecord) {
      throw new Error('执行记录不存在或无权限访问');
    }

    // 验证文件
    if (!validateFileType(file.originalname)) {
      throw new Error('不支持的文件类型');
    }

    const fileType = getFileType(file.originalname);
    if (!validateFileSize(file.size, fileType)) {
      throw new Error('文件大小超出限制');
    }

    // 创建附件记录
    const attachment = await prisma.attachment.create({
      data: {
        executionRecordId,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: fileType.toUpperCase() as FileType,
        fileSize: file.size,
        filePath: file.path
      }
    });

    // 如果是图片，创建缩略图
    if (fileType === 'image') {
      try {
        const thumbnailPath = file.path.replace(
          path.extname(file.path),
          '_thumb.jpg'
        );
        await createThumbnail(file.path, thumbnailPath);
      } catch (error) {
        console.error('创建缩略图失败:', error);
        // 不影响主流程，继续执行
      }
    }

    return attachment;
  }

  // 获取附件列表
  async getAttachmentsByExecutionRecord(
    executionRecordId: string,
    userId: string
  ): Promise<Attachment[]> {
    // 验证权限
    const executionRecord = await prisma.executionRecord.findFirst({
      where: {
        id: executionRecordId,
        execution: {
          userId
        }
      }
    });

    if (!executionRecord) {
      throw new Error('执行记录不存在或无权限访问');
    }

    const attachments = await prisma.attachment.findMany({
      where: { executionRecordId },
      orderBy: { uploadedAt: 'desc' }
    });

    return attachments;
  }

  // 获取单个附件
  async getAttachmentById(attachmentId: string, userId: string): Promise<Attachment | null> {
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        executionRecord: {
          execution: {
            userId
          }
        }
      }
    });

    return attachment;
  }

  // 删除附件
  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await this.getAttachmentById(attachmentId, userId);
    
    if (!attachment) {
      throw new Error('附件不存在或无权限访问');
    }

    // 删除文件
    try {
      await deleteFile(attachment.filePath);
      
      // 删除缩略图（如果存在）
      if (attachment.fileType === 'IMAGE') {
        const thumbnailPath = attachment.filePath.replace(
          path.extname(attachment.filePath),
          '_thumb.jpg'
        );
        await deleteFile(thumbnailPath);
      }
    } catch (error) {
      console.error('删除文件失败:', error);
      // 继续删除数据库记录
    }

    // 删除数据库记录
    await prisma.attachment.delete({
      where: { id: attachmentId }
    });
  }

  // 获取附件文件路径
  async getAttachmentFilePath(attachmentId: string, userId: string): Promise<string> {
    const attachment = await this.getAttachmentById(attachmentId, userId);
    
    if (!attachment) {
      throw new Error('附件不存在或无权限访问');
    }

    return attachment.filePath;
  }

  // 获取缩略图路径
  async getThumbnailPath(attachmentId: string, userId: string): Promise<string | null> {
    const attachment = await this.getAttachmentById(attachmentId, userId);
    
    if (!attachment || attachment.fileType !== 'IMAGE') {
      return null;
    }

    const thumbnailPath = attachment.filePath.replace(
      path.extname(attachment.filePath),
      '_thumb.jpg'
    );

    try {
      await getFileInfo(thumbnailPath);
      return thumbnailPath;
    } catch (error) {
      return null; // 缩略图不存在
    }
  }

  // 批量删除多个附件
  async batchDeleteAttachments(attachmentIds: string[], userId: string): Promise<void> {
    const attachments = await prisma.attachment.findMany({
      where: {
        id: {
          in: attachmentIds
        },
        executionRecord: {
          execution: {
            userId
          }
        }
      }
    });

    if (attachments.length !== attachmentIds.length) {
      throw new Error('部分附件不存在或无权限访问');
    }

    // 删除所有文件
    for (const attachment of attachments) {
      try {
        await deleteFile(attachment.filePath);
        
        // 删除缩略图
        if (attachment.fileType === 'IMAGE') {
          const thumbnailPath = attachment.filePath.replace(
            path.extname(attachment.filePath),
            '_thumb.jpg'
          );
          await deleteFile(thumbnailPath);
        }
      } catch (error) {
        console.error(`删除文件失败: ${attachment.filePath}`, error);
      }
    }

    // 删除数据库记录
    await prisma.attachment.deleteMany({
      where: {
        id: {
          in: attachmentIds
        }
      }
    });
  }

  // 获取用户的所有附件统计
  async getUserAttachmentStats(userId: string) {
    const stats = await prisma.attachment.groupBy({
      by: ['fileType'],
      where: {
        executionRecord: {
          execution: {
            userId
          }
        }
      },
      _count: {
        fileType: true
      },
      _sum: {
        fileSize: true
      }
    });

    const totalCount = await prisma.attachment.count({
      where: {
        executionRecord: {
          execution: {
            userId
          }
        }
      }
    });

    const totalSize = await prisma.attachment.aggregate({
      where: {
        executionRecord: {
          execution: {
            userId
          }
        }
      },
      _sum: {
        fileSize: true
      }
    });

    return {
      totalCount,
      totalSize: totalSize._sum.fileSize || 0,
      byType: stats.reduce((acc, stat) => {
        acc[stat.fileType] = {
          count: stat._count.fileType,
          size: stat._sum.fileSize || 0
        };
        return acc;
      }, {} as Record<string, { count: number; size: number }>)
    };
  }

  // 批量删除附件
  async deleteAttachmentsByExecutionRecord(
    executionRecordId: string,
    userId: string
  ): Promise<void> {
    const attachments = await this.getAttachmentsByExecutionRecord(executionRecordId, userId);
    
    // 删除所有文件
    for (const attachment of attachments) {
      try {
        await deleteFile(attachment.filePath);
        
        // 删除缩略图
        if (attachment.fileType === 'IMAGE') {
          const thumbnailPath = attachment.filePath.replace(
            path.extname(attachment.filePath),
            '_thumb.jpg'
          );
          await deleteFile(thumbnailPath);
        }
      } catch (error) {
        console.error(`删除文件失败: ${attachment.filePath}`, error);
      }
    }

    // 删除数据库记录
    await prisma.attachment.deleteMany({
      where: { executionRecordId }
    });
  }
}