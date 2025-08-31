import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  historyService, 
  HistorySearchFilters, 
  PaginationOptions, 
  HistoryStats, 
  ExecutionHistory, 
  // HistoryResponse 
} from '../services/history';

interface HistoryState {
  executions: ExecutionHistory[];
  currentExecution: ExecutionHistory | null;
  stats: HistoryStats | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  filters: HistorySearchFilters;
  selectedExecutions: string[];
  loading: {
    list: boolean;
    detail: boolean;
    stats: boolean;
    delete: boolean;
    export: boolean;
  };
  error: string | null;
}

const initialState: HistoryState = {
  executions: [],
  currentExecution: null,
  stats: null,
  pagination: null,
  filters: {},
  selectedExecutions: [],
  loading: {
    list: false,
    detail: false,
    stats: false,
    delete: false,
    export: false
  },
  error: null
};

// 异步操作
export const fetchExecutionHistory = createAsyncThunk(
  'history/fetchExecutionHistory',
  async ({ filters, pagination }: { filters?: HistorySearchFilters; pagination?: PaginationOptions }, { rejectWithValue }) => {
    try {
      return await historyService.getExecutionHistory(filters, pagination);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '获取执行历史失败');
    }
  }
);

export const advancedSearch = createAsyncThunk(
  'history/advancedSearch',
  async ({ searchOptions, pagination }: { searchOptions: any; pagination?: PaginationOptions }, { rejectWithValue }) => {
    try {
      return await historyService.advancedSearch(searchOptions, pagination);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '高级搜索失败');
    }
  }
);

export const fetchHistoryStats = createAsyncThunk(
  'history/fetchHistoryStats',
  async (_, { rejectWithValue }) => {
    try {
      return await historyService.getHistoryStats();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '获取统计数据失败');
    }
  }
);

export const fetchExecutionDetail = createAsyncThunk(
  'history/fetchExecutionDetail',
  async (id: string, { rejectWithValue }) => {
    try {
      return await historyService.getExecutionDetail(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '获取执行详情失败');
    }
  }
);

export const deleteExecution = createAsyncThunk(
  'history/deleteExecution',
  async (id: string, { rejectWithValue }) => {
    try {
      await historyService.deleteExecution(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '删除执行记录失败');
    }
  }
);

export const batchDeleteExecutions = createAsyncThunk(
  'history/batchDeleteExecutions',
  async (executionIds: string[], { rejectWithValue }) => {
    try {
      const result = await historyService.batchDeleteExecutions(executionIds);
      return { executionIds, deletedCount: result.deletedCount };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '批量删除失败');
    }
  }
);

export const exportExecutions = createAsyncThunk(
  'history/exportExecutions',
  async (
    { 
      format, 
      options 
    }: { 
      format: 'json' | 'csv' | 'excel'; 
      options?: {
        includeSteps?: boolean;
        includeReviews?: boolean;
        includeAttachments?: boolean;
        filters?: HistorySearchFilters;
      }
    }, 
    { rejectWithValue }
  ) => {
    try {
      const blob = await historyService.exportExecutions(format, options);
      const filename = historyService.generateExportFilename(format, options?.filters);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { format, filename };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || '导出失败');
    }
  }
);

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<HistorySearchFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    toggleExecutionSelection: (state, action: PayloadAction<string>) => {
      const executionId = action.payload;
      const index = state.selectedExecutions.indexOf(executionId);
      if (index > -1) {
        state.selectedExecutions.splice(index, 1);
      } else {
        state.selectedExecutions.push(executionId);
      }
    },
    selectAllExecutions: (state) => {
      state.selectedExecutions = state.executions.map(exec => exec.id);
    },
    clearSelection: (state) => {
      state.selectedExecutions = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentExecution: (state) => {
      state.currentExecution = null;
    }
  },
  extraReducers: (builder) => {
    // 获取执行历史
    builder
      .addCase(fetchExecutionHistory.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchExecutionHistory.fulfilled, (state, action) => {
        state.loading.list = false;
        state.executions = action.payload.executions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchExecutionHistory.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    // 高级搜索
    builder
      .addCase(advancedSearch.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(advancedSearch.fulfilled, (state, action) => {
        state.loading.list = false;
        state.executions = action.payload.executions;
        state.pagination = action.payload.pagination;
      })
      .addCase(advancedSearch.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    // 获取统计数据
    builder
      .addCase(fetchHistoryStats.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(fetchHistoryStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchHistoryStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.payload as string;
      });

    // 获取执行详情
    builder
      .addCase(fetchExecutionDetail.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchExecutionDetail.fulfilled, (state, action) => {
        state.loading.detail = false;
        state.currentExecution = action.payload;
      })
      .addCase(fetchExecutionDetail.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    // 删除执行记录
    builder
      .addCase(deleteExecution.pending, (state) => {
        state.loading.delete = true;
        state.error = null;
      })
      .addCase(deleteExecution.fulfilled, (state, action) => {
        state.loading.delete = false;
        state.executions = state.executions.filter(exec => exec.id !== action.payload);
        state.selectedExecutions = state.selectedExecutions.filter(id => id !== action.payload);
      })
      .addCase(deleteExecution.rejected, (state, action) => {
        state.loading.delete = false;
        state.error = action.payload as string;
      });

    // 批量删除
    builder
      .addCase(batchDeleteExecutions.pending, (state) => {
        state.loading.delete = true;
        state.error = null;
      })
      .addCase(batchDeleteExecutions.fulfilled, (state, action) => {
        state.loading.delete = false;
        const deletedIds = action.payload.executionIds;
        state.executions = state.executions.filter(exec => !deletedIds.includes(exec.id));
        state.selectedExecutions = [];
      })
      .addCase(batchDeleteExecutions.rejected, (state, action) => {
        state.loading.delete = false;
        state.error = action.payload as string;
      });

    // 导出数据
    builder
      .addCase(exportExecutions.pending, (state) => {
        state.loading.export = true;
        state.error = null;
      })
      .addCase(exportExecutions.fulfilled, (state) => {
        state.loading.export = false;
      })
      .addCase(exportExecutions.rejected, (state, action) => {
        state.loading.export = false;
        state.error = action.payload as string;
      });
  }
});

export const {
  setFilters,
  clearFilters,
  toggleExecutionSelection,
  selectAllExecutions,
  clearSelection,
  clearError,
  clearCurrentExecution
} = historySlice.actions;

// 别名导出以保持兼容性
export const fetchHistory = fetchExecutionHistory;

export default historySlice.reducer;