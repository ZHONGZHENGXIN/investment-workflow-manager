import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// 支持的文件类型
export const SUPPORTED_FILE_TYPES = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  documents: ['.pdf', '.doc', '.docx', '.txt'],
  all: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt']
};

// 文件大小限制
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  document: 20 * 1024 * 1024, // 20MB
};

// 确保上传目录存在
export const ensureUploadDir = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 获取文件类型
export const getFileType = (filename: string): 'image' | 'document' | 'text' => {
  const ext = path.extname(filename).toLowerCase();
  
  if (SUPPORTED_FILE_TYPES.images.includes(ext)) {
    return 'image';
  } else if (['.pdf', '.doc', '.docx'].includes(ext)) {
    return 'document';
  } else if (ext === '.txt') {
    return 'text';
  }
  
  return 'document'; // 默认为文档类型
};

// 验证文件类型
export const validateFileType = (filename: string): boolean => {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_FILE_TYPES.all.includes(ext);
};

// 验证文件大小
export const validateFileSize = (size: number, fileType: 'image' | 'document' | 'text'): boolean => {
  if (fileType === 'image') {
    return size <= FILE_SIZE_LIMITS.image;
  } else {
    return size <= FILE_SIZE_LIMITS.document;
  }
};

// 生成安全的文件名
export const generateSafeFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const uuid = uuidv4();
  const timestamp = Date.now();
  return `${timestamp}_${uuid}${ext}`;
};

// 创建缩略图（仅适用于图片）
export const createThumbnail = async (
  inputPath: string,
  outputPath: string,
  width: number = 300,
  height: number = 300
): Promise<void> => {
  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
  } catch (error) {
    console.error('创建缩略图失败:', error);
    throw new Error('创建缩略图失败');
  }
};

// Multer配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    const dateDir = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fullPath = path.join(uploadDir, dateDir);
    
    ensureUploadDir(fullPath);
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const safeFilename = generateSafeFilename(file.originalname);
    cb(null, safeFilename);
  }
});

// 文件过滤器
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 验证文件类型
  if (!validateFileType(file.originalname)) {
    return cb(new Error('不支持的文件类型'));
  }
  
  cb(null, true);
};

// Multer实例
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.document, // 使用最大限制
    files: 10, // 最多10个文件
  }
});

// 单文件上传中间件
export const uploadSingle = upload.single('file');

// 多文件上传中间件
export const uploadMultiple = upload.array('files', 10);

// 删除文件
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// 获取文件信息
export const getFileInfo = (filePath: string): Promise<fs.Stats> => {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats);
      }
    });
  });
};