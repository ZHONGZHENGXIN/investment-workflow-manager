import { Request, Response } from 'express';
import { ReviewService } from '../services/reviewService';

const reviewService = new ReviewService();

export class ReviewController {
  // 生成复盘摘要
  async generateSummary(req: Request, res: Response): Promise<void> {
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

      const { executionId } = req.query;
      const summary = await reviewService.generateReviewSummary(
        req.user.userId,
        executionId as string
      );

      res.status(200).json({
        success: true,
        data: { summary },
        message: '生成复盘摘要成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SUMMARY_ERROR',
          message: '生成复盘摘要失败'
        }
      });
    }
  }

  // 获取趋势分析
  async getTrends(req: Request, res: Response): Promise<void> {
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

      const trends = await reviewService.identifyTrends(req.user.userId);

      res.status(200).json({
        success: true,
        data: { trends },
        message: '获取趋势分析成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'TRENDS_ERROR',
          message: '获取趋势分析失败'
        }
      });
    }
  }

  // 获取用户复盘分析
  async getUserAnalytics(req: Request, res: Response): Promise<void> {
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

      const analytics = await reviewService.getUserReviewAnalytics(req.user.userId);

      res.status(200).json({
        success: true,
        data: { analytics },
        message: '获取复盘分析成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: '获取复盘分析失败'
        }
      });
    }
  }

  // 获取复盘洞察
  async getReviewInsights(req: Request, res: Response): Promise<void> {
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

      const { limit } = req.query;
      const insights = await reviewService.getReviewInsights(
        req.user.userId,
        limit ? parseInt(limit as string) : 10
      );

      res.status(200).json({
        success: true,
        data: { insights },
        message: '获取复盘洞察成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INSIGHTS_ERROR',
          message: '获取复盘洞察失败'
        }
      });
    }
  }

  // 获取复盘模板
  async getReviewTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { workflowType } = req.query;
      const template = await reviewService.getReviewTemplate(workflowType as string);

      res.status(200).json({
        success: true,
        data: { template },
        message: '获取复盘模板成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_ERROR',
          message: '获取复盘模板失败'
        }
      });
    }
  }

  // 生成复盘报告
  async generateReport(req: Request, res: Response): Promise<void> {
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

      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '开始日期和结束日期是必填项'
          }
        });
        return;
      }

      const report = await reviewService.generateReviewReport(
        req.user.userId,
        {
          start: new Date(startDate),
          end: new Date(endDate)
        }
      );

      res.status(200).json({
        success: true,
        data: { report },
        message: '生成复盘报告成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成复盘报告失败';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORT_ERROR',
          message: errorMessage
        }
      });
    }
  }
}