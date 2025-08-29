import { 
  validateFileType, 
  validateFileSize, 
  generateUniqueFilename, 
  getFileExtension,
  sanitizeFilename,
  createUploadPath,
  deleteFile,
  getFileInfo
} from '../../utils/fileUpload';
import fs from 'fs/promises';
import path from 'path';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('File Upload Utils Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFileType', () => {
    it('应该允许支持的图片类型', () => {
      const supportedImageTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ];

      supportedImageTypes.forEach(mimeType => {
        expect(validateFileType(mimeType)).toBe(true);
      });
    });

    it('应该允许支持的文档类型', () => {
      const supportedDocTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ];

      supportedDocTypes.forEach(mimeType => {
        expect(validateFileType(mimeType)).toBe(true);
      });
    });

    it('应该拒绝不支持的文件类型', () => {
      const unsupportedTypes = [
        'application/x-executable',
        'application/x-msdownload',
        'application/x-sh',
        'text/x-script',
        'video/mp4',
        'audio/mpeg'
      ];

      unsupportedTypes.forEach(mimeType => {
        expect(validateFileType(mimeType)).toBe(false);
      });
    });

    it('应该处理空或无效的MIME类型', () => {
      expect(validateFileType('')).toBe(false);
      expect(validateFileType(null as any)).toBe(false);
      expect(validateFileType(undefined as any)).toBe(false);
      expect(validateFileType('invalid/type')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('应该允许小于限制的文件大小', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validSizes = [
        1024,           // 1KB
        1024 * 1024,    // 1MB
        5 * 1024 * 1024 // 5MB
      ];

      validSizes.forEach(size => {
        expect(validateFileSize(size, maxSize)).toBe(true);
      });
    });

    it('应该拒绝超过限制的文件大小', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const invalidSizes = [
        11 * 1024 * 1024, // 11MB
        50 * 1024 * 1024, // 50MB
        100 * 1024 * 1024 // 100MB
      ];

      invalidSizes.forEach(size => {
        expect(validateFileSize(size, maxSize)).toBe(false);
      });
    });

    it('应该处理边界情况', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      expect(validateFileSize(maxSize, maxSize)).toBe(true); // 等于限制
      expect(validateFileSize(0, maxSize)).toBe(true); // 零大小
      expect(validateFileSize(-1, maxSize)).toBe(false); // 负数大小
    });

    it('应该使用默认最大大小', () => {
      const defaultMaxSize = 50 * 1024 * 1024; // 50MB
      
      expect(validateFileSize(30 * 1024 * 1024)).toBe(true);
      expect(validateFileSize(60 * 1024 * 1024)).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('应该正确提取文件扩展名', () => {
      const testCases = [
        { filename: 'document.pdf', expected: '.pdf' },
        { filename: 'image.jpg', expected: '.jpg' },
        { filename: 'data.csv', expected: '.csv' },
        { filename: 'archive.tar.gz', expected: '.gz' },
        { filename: 'file.backup.txt', expected: '.txt' }
      ];

      testCases.forEach(({ filename, expected }) => {
        expect(getFileExtension(filename)).toBe(expected);
      });
    });

    it('应该处理没有扩展名的文件', () => {
      const testCases = [
        'README',
        'Dockerfile',
        'makefile',
        'file_without_extension'
      ];

      testCases.forEach(filename => {
        expect(getFileExtension(filename)).toBe('');
      });
    });

    it('应该处理特殊情况', () => {
      expect(getFileExtension('')).toBe('');
      expect(getFileExtension('.')).toBe('');
      expect(getFileExtension('..')).toBe('');
      expect(getFileExtension('.hidden')).toBe('');
      expect(getFileExtension('.hidden.txt')).toBe('.txt');
    });
  });

  describe('sanitizeFilename', () => {
    it('应该移除危险字符', () => {
      const testCases = [
        { input: 'file<>name.txt', expected: 'filename.txt' },
        { input: 'file|name.txt', expected: 'filename.txt' },
        { input: 'file:name.txt', expected: 'filename.txt' },
        { input: 'file*name.txt', expected: 'filename.txt' },
        { input: 'file?name.txt', expected: 'filename.txt' },
        { input: 'file"name.txt', expected: 'filename.txt' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeFilename(input)).toBe(expected);
      });
    });

    it('应该处理路径遍历攻击', () => {
      const testCases = [
        { input: '../../../etc/passwd', expected: 'etcpasswd' },
        { input: '..\\..\\windows\\system32', expected: 'windowssystem32' },
        { input: './file.txt', expected: 'file.txt' },
        { input: './../file.txt', expected: 'file.txt' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeFilename(input)).toBe(expected);
      });
    });

    it('应该限制文件名长度', () => {
      const longFilename = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFilename(longFilename);
      
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized.endsWith('.txt')).toBe(true);
    });

    it('应该处理空文件名', () => {
      expect(sanitizeFilename('')).toBe('unnamed');
      expect(sanitizeFilename('   ')).toBe('unnamed');
      expect(sanitizeFilename('...')).toBe('unnamed');
    });

    it('应该保留有效字符', () => {
      const validFilename = 'valid_file-name.123.txt';
      expect(sanitizeFilename(validFilename)).toBe(validFilename);
    });
  });

  describe('generateUniqueFilename', () => {
    it('应该生成唯一的文件名', () => {
      const originalName = 'test.txt';
      const filename1 = generateUniqueFilename(originalName);
      const filename2 = generateUniqueFilename(originalName);
      
      expect(filename1).not.toBe(filename2);
      expect(filename1.endsWith('.txt')).toBe(true);
      expect(filename2.endsWith('.txt')).toBe(true);
    });

    it('应该保持文件扩展名', () => {
      const testCases = [
        'document.pdf',
        'image.jpg',
        'data.csv',
        'archive.tar.gz'
      ];

      testCases.forEach(originalName => {
        const uniqueName = generateUniqueFilename(originalName);
        const originalExt = getFileExtension(originalName);
        const uniqueExt = getFileExtension(uniqueName);
        
        expect(uniqueExt).toBe(originalExt);
      });
    });

    it('应该处理没有扩展名的文件', () => {
      const originalName = 'README';
      const uniqueName = generateUniqueFilename(originalName);
      
      expect(uniqueName).not.toBe(originalName);
      expect(uniqueName.includes('README')).toBe(true);
    });

    it('应该包含时间戳和随机元素', () => {
      const originalName = 'test.txt';
      const uniqueName = generateUniqueFilename(originalName);
      
      // 应该包含时间戳（数字）
      expect(/\d+/.test(uniqueName)).toBe(true);
      
      // 应该包含随机字符
      expect(uniqueName.length).toBeGreaterThan(originalName.length);
    });
  });

  describe('createUploadPath', () => {
    it('应该创建基于日期的上传路径', () => {
      const filename = 'test.txt';
      const uploadPath = createUploadPath(filename);
      
      expect(uploadPath).toContain('uploads');
      expect(uploadPath).toContain(filename);
      
      // 应该包含年月日路径
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      
      expect(uploadPath).toContain(year);
      expect(uploadPath).toContain(month);
    });

    it('应该支持自定义基础路径', () => {
      const filename = 'test.txt';
      const customBasePath = 'custom/uploads';
      const uploadPath = createUploadPath(filename, customBasePath);
      
      expect(uploadPath).toContain(customBasePath);
      expect(uploadPath).toContain(filename);
    });

    it('应该创建不同类型文件的路径', () => {
      const imageFile = 'image.jpg';
      const docFile = 'document.pdf';
      
      const imagePath = createUploadPath(imageFile);
      const docPath = createUploadPath(docFile);
      
      expect(imagePath).toContain('images');
      expect(docPath).toContain('documents');
    });
  });

  describe('deleteFile', () => {
    it('应该成功删除存在的文件', async () => {
      const filePath = '/uploads/test.txt';
      mockFs.unlink.mockResolvedValue(undefined);

      const result = await deleteFile(filePath);

      expect(result).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalledWith(filePath);
    });

    it('应该处理文件不存在的情况', async () => {
      const filePath = '/uploads/nonexistent.txt';
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      mockFs.unlink.mockRejectedValue(error);

      const result = await deleteFile(filePath);

      expect(result).toBe(true); // 文件不存在也算删除成功
    });

    it('应该处理删除失败的情况', async () => {
      const filePath = '/uploads/test.txt';
      const error = new Error('Permission denied');
      mockFs.unlink.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await deleteFile(filePath);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('getFileInfo', () => {
    it('应该获取文件信息', async () => {
      const filePath = '/uploads/test.txt';
      const mockStats = {
        size: 1024,
        mtime: new Date('2023-01-01'),
        isFile: () => true,
        isDirectory: () => false
      };
      
      mockFs.stat.mockResolvedValue(mockStats as any);

      const fileInfo = await getFileInfo(filePath);

      expect(fileInfo).toEqual({
        exists: true,
        size: 1024,
        mtime: mockStats.mtime,
        isFile: true,
        isDirectory: false,
        extension: '.txt',
        basename: 'test.txt'
      });
    });

    it('应该处理文件不存在的情况', async () => {
      const filePath = '/uploads/nonexistent.txt';
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      mockFs.stat.mockRejectedValue(error);

      const fileInfo = await getFileInfo(filePath);

      expect(fileInfo).toEqual({
        exists: false,
        size: 0,
        mtime: null,
        isFile: false,
        isDirectory: false,
        extension: '.txt',
        basename: 'nonexistent.txt'
      });
    });

    it('应该处理其他错误', async () => {
      const filePath = '/uploads/test.txt';
      const error = new Error('Permission denied');
      mockFs.stat.mockRejectedValue(error);

      await expect(getFileInfo(filePath)).rejects.toThrow('Permission denied');
    });
  });

  describe('文件安全检查', () => {
    it('应该检测恶意文件名', () => {
      const maliciousNames = [
        'script.js.exe',
        'document.pdf.bat',
        'image.jpg.scr',
        'file.txt.com'
      ];

      maliciousNames.forEach(filename => {
        const sanitized = sanitizeFilename(filename);
        expect(sanitized).not.toContain('.exe');
        expect(sanitized).not.toContain('.bat');
        expect(sanitized).not.toContain('.scr');
        expect(sanitized).not.toContain('.com');
      });
    });

    it('应该检测文件炸弹模式', () => {
      const suspiciousNames = [
        'file.zip.zip.zip',
        'document.rar.rar',
        'archive.7z.7z.7z'
      ];

      suspiciousNames.forEach(filename => {
        const sanitized = sanitizeFilename(filename);
        // 应该移除重复的压缩文件扩展名
        const extensions = sanitized.match(/\.(zip|rar|7z)/g);
        expect(extensions?.length || 0).toBeLessThanOrEqual(1);
      });
    });
  });
});