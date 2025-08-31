import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reviewService, ReviewAnalytics, ReviewInsight, ReviewReport } from '../services/review';

interface ReviewState {
  analytics: ReviewAnalytics | null;
  insights: ReviewInsight[];
  template: string[];
  report: ReviewReport | null;
  summary: string | null;
  trends: {
    executionTrends: Array<{ period: string; count: number; avgDuration: number }>;
    performanceTrends: Array<{ period: string; completionRate: number; efficiency: number }>;
    reviewQualityTrends: Array<{ period: string; avgLength: number; insightCount: number }>;
  } | null;
  loading: {
    analytics: boolean;
    insights: boolean;
    template: boolean;
    report: boolean;
    summary: boolean;
    trends: boolean;
  };
  error: string | null;
}

const initialState: ReviewState = {
  analytics: null,
  insights: [],
  template: [],
  report: null,
  summary: null,
  trends: null,
  loading: {
    analytics: false,
    insights: false,
    template: false,
    report: false,
    summary: false,
    trends: false
  },
  error: null
};

// 异步操作
export const generateSummary = createAsyncThunk(
  'review/generateSummary',
  async (executionId: string | undefined, { rejectWithValue }) => {
    try {
      return await reviewService.generateSummary(executionId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '生成摘要失败');
    }
  }
);

export const fetchTrends = createAsyncThunk(
  'review/fetchTrends',
  async (_, { rejectWithValue }) => {
    try {
      return await reviewService.getTrends();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '获取趋势失败');
    }
  }
);

export const fetchAnalytics = createAsyncThunk(
  'review/fetchAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      return await reviewService.getUserAnalytics();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '获取分析数据失败');
    }
  }
);

export const fetchInsights = createAsyncThunk(
  'review/fetchInsights',
  async (limit: number | undefined, { rejectWithValue }) => {
    try {
      return await reviewService.getReviewInsights(limit);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '获取洞察失败');
    }
  }
);

export const fetchTemplate = createAsyncThunk(
  'review/fetchTemplate',
  async (workflowType: string | undefined, { rejectWithValue }) => {
    try {
      return await reviewService.getReviewTemplate(workflowType);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '获取模板失败');
    }
  }
);

export const generateReport = createAsyncThunk(
  'review/generateReport',
  async ({ startDate, endDate }: { startDate: string; endDate: string }, { rejectWithValue }) => {
    try {
      return await reviewService.generateReport(startDate, endDate);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '生成报告失败');
    }
  }
);

const reviewSlice = createSlice({
  name: 'review',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearReport: (state) => {
      state.report = null;
    },
    clearSummary: (state) => {
      state.summary = null;
    }
  },
  extraReducers: (builder) => {
    // 摘要生成
    builder
      .addCase(generateSummary.pending, (state) => {
        state.loading.summary = true;
        state.error = null;
      })
      .addCase(generateSummary.fulfilled, (state, action) => {
        state.loading.summary = false;
        state.summary = action.payload;
      })
      .addCase(generateSummary.rejected, (state, action) => {
        state.loading.summary = false;
        state.error = action.payload as string;
      });

    // 趋势数据
    builder
      .addCase(fetchTrends.pending, (state) => {
        state.loading.trends = true;
        state.error = null;
      })
      .addCase(fetchTrends.fulfilled, (state, action) => {
        state.loading.trends = false;
        state.trends = action.payload;
      })
      .addCase(fetchTrends.rejected, (state, action) => {
        state.loading.trends = false;
        state.error = action.payload as string;
      });

    // 分析数据
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.loading.analytics = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.loading.analytics = false;
        state.analytics = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading.analytics = false;
        state.error = action.payload as string;
      });

    // 洞察数据
    builder
      .addCase(fetchInsights.pending, (state) => {
        state.loading.insights = true;
        state.error = null;
      })
      .addCase(fetchInsights.fulfilled, (state, action) => {
        state.loading.insights = false;
        state.insights = action.payload;
      })
      .addCase(fetchInsights.rejected, (state, action) => {
        state.loading.insights = false;
        state.error = action.payload as string;
      });

    // 模板数据
    builder
      .addCase(fetchTemplate.pending, (state) => {
        state.loading.template = true;
        state.error = null;
      })
      .addCase(fetchTemplate.fulfilled, (state, action) => {
        state.loading.template = false;
        state.template = action.payload;
      })
      .addCase(fetchTemplate.rejected, (state, action) => {
        state.loading.template = false;
        state.error = action.payload as string;
      });

    // 报告生成
    builder
      .addCase(generateReport.pending, (state) => {
        state.loading.report = true;
        state.error = null;
      })
      .addCase(generateReport.fulfilled, (state, action) => {
        state.loading.report = false;
        state.report = action.payload;
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.loading.report = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearError, clearReport, clearSummary } = reviewSlice.actions;
export default reviewSlice.reducer;