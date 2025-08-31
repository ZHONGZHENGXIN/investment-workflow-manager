import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { executionService, Execution, ExecutionRecord, CreateExecutionData, ExecutionFilter, ExecutionStats } from '../services/execution';
import toast from 'react-hot-toast';

// 执行状态接口
export interface ExecutionState {
  executions: Execution[];
  currentExecution: Execution | null;
  executionRecords: ExecutionRecord[];
  stats: ExecutionStats | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
}

// 异步thunk - 创建执行记录
export const createExecution = createAsyncThunk(
  'execution/createExecution',
  async (data: CreateExecutionData, { rejectWithValue }) => {
    try {
      const execution = await executionService.createExecution(data);
      toast.success('执行记录创建成功！');
      return execution;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '创建执行记录失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 获取执行列表
export const fetchExecutions = createAsyncThunk(
  'execution/fetchExecutions',
  async (filter: ExecutionFilter | undefined, { rejectWithValue }) => {
    try {
      const result = await executionService.getExecutions(filter);
      return result;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '获取执行列表失败';
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 获取执行详情
export const fetchExecutionById = createAsyncThunk(
  'execution/fetchExecutionById',
  async (id: string, { rejectWithValue }) => {
    try {
      const execution = await executionService.getExecutionById(id);
      return execution;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '获取执行详情失败';
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 获取执行步骤记录
export const fetchExecutionRecords = createAsyncThunk(
  'execution/fetchExecutionRecords',
  async (executionId: string, { rejectWithValue }) => {
    try {
      const records = await executionService.getExecutionRecords(executionId);
      return records;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '获取执行步骤记录失败';
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 开始执行步骤
export const startStep = createAsyncThunk(
  'execution/startStep',
  async ({ executionId, recordId }: { executionId: string; recordId: string }, { rejectWithValue }) => {
    try {
      const record = await executionService.startStep(executionId, recordId);
      toast.success('步骤开始执行');
      return record;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '开始执行步骤失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 完成执行步骤
export const completeStep = createAsyncThunk(
  'execution/completeStep',
  async ({ executionId, recordId, data }: { executionId: string; recordId: string; data: { notes?: string; result?: any } }, { rejectWithValue }) => {
    try {
      const record = await executionService.completeStep(executionId, recordId, data);
      toast.success('步骤完成成功！');
      return record;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '完成执行步骤失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 跳过执行步骤
export const skipStep = createAsyncThunk(
  'execution/skipStep',
  async ({ executionId, recordId, reason }: { executionId: string; recordId: string; reason?: string }, { rejectWithValue }) => {
    try {
      const record = await executionService.skipStep(executionId, recordId, reason);
      toast.success('步骤已跳过');
      return record;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '跳过执行步骤失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 标记步骤失败
export const failStep = createAsyncThunk(
  'execution/failStep',
  async ({ executionId, recordId, reason }: { executionId: string; recordId: string; reason?: string }, { rejectWithValue }) => {
    try {
      const record = await executionService.failStep(executionId, recordId, reason);
      toast.error('步骤已标记为失败');
      return record;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '标记步骤失败失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 暂停执行
export const pauseExecution = createAsyncThunk(
  'execution/pauseExecution',
  async (id: string, { rejectWithValue }) => {
    try {
      const execution = await executionService.pauseExecution(id);
      toast.success('执行已暂停');
      return execution;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '暂停执行失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 恢复执行
export const resumeExecution = createAsyncThunk(
  'execution/resumeExecution',
  async (id: string, { rejectWithValue }) => {
    try {
      const execution = await executionService.resumeExecution(id);
      toast.success('执行已恢复');
      return execution;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '恢复执行失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 完成执行
export const completeExecution = createAsyncThunk(
  'execution/completeExecution',
  async (id: string, { rejectWithValue }) => {
    try {
      const execution = await executionService.completeExecution(id);
      toast.success('执行已完成！');
      return execution;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '完成执行失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 取消执行
export const cancelExecution = createAsyncThunk(
  'execution/cancelExecution',
  async (id: string, { rejectWithValue }) => {
    try {
      const execution = await executionService.cancelExecution(id);
      toast.success('执行已取消');
      return execution;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '取消执行失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 更新执行进度
export const updateProgress = createAsyncThunk(
  'execution/updateProgress',
  async (id: string, { rejectWithValue }) => {
    try {
      const result = await executionService.updateProgress(id);
      return { executionId: id, progress: result.progress };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '更新进度失败';
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 获取执行统计
export const fetchExecutionStats = createAsyncThunk(
  'execution/fetchExecutionStats',
  async (workflowId: string | undefined, { rejectWithValue }) => {
    try {
      const stats = await executionService.getExecutionStats(workflowId);
      return stats;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '获取执行统计失败';
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 删除执行
export const deleteExecution = createAsyncThunk(
  'execution/deleteExecution',
  async (id: string, { rejectWithValue }) => {
    try {
      await executionService.deleteExecution(id);
      toast.success('执行记录已删除');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '删除执行记录失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 初始状态
const initialState: ExecutionState = {
  executions: [],
  currentExecution: null,
  executionRecords: [],
  stats: null,
  isLoading: false,
  error: null,
  pagination: null,
};

// 执行slice
const executionSlice = createSlice({
  name: 'execution',
  initialState,
  reducers: {
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
    // 设置当前执行
    setCurrentExecution: (state, action: PayloadAction<Execution | null>) => {
      state.currentExecution = action.payload;
    },
    // 清除当前执行
    clearCurrentExecution: (state) => {
      state.currentExecution = null;
    },
  },
  extraReducers: (builder) => {
    // 创建执行记录
    builder
      .addCase(createExecution.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createExecution.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executions.unshift(action.payload);
        state.currentExecution = action.payload;
        state.error = null;
      })
      .addCase(createExecution.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 获取执行列表
    builder
      .addCase(fetchExecutions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExecutions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executions = action.payload.data;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchExecutions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 获取执行详情
    builder
      .addCase(fetchExecutionById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExecutionById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentExecution = action.payload;
        state.error = null;
      })
      .addCase(fetchExecutionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 获取执行步骤记录
    builder
      .addCase(fetchExecutionRecords.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExecutionRecords.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executionRecords = action.payload;
        state.error = null;
      })
      .addCase(fetchExecutionRecords.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 步骤操作的通用处理函数
    const updateExecutionRecord = (state: ExecutionState, record: ExecutionRecord) => {
      // 更新执行记录列表
      const recordIndex = state.executionRecords.findIndex(r => r.id === record.id);
      if (recordIndex >= 0) {
        state.executionRecords[recordIndex] = record;
      }
      
      // 更新当前执行中的记录
      if (state.currentExecution?.records) {
        const currentRecordIndex = state.currentExecution.records.findIndex(r => r.id === record.id);
        if (currentRecordIndex >= 0) {
          state.currentExecution.records[currentRecordIndex] = record;
        }
      }
    };

    // 开始执行步骤
    builder.addCase(startStep.fulfilled, (state, action) => {
      updateExecutionRecord(state, action.payload);
    });

    // 完成执行步骤
    builder.addCase(completeStep.fulfilled, (state, action) => {
      updateExecutionRecord(state, action.payload);
    });

    // 跳过执行步骤
    builder.addCase(skipStep.fulfilled, (state, action) => {
      updateExecutionRecord(state, action.payload);
    });

    // 标记步骤失败
    builder.addCase(failStep.fulfilled, (state, action) => {
      updateExecutionRecord(state, action.payload);
    });

    // 执行状态操作的通用处理函数
    const updateExecutionStatus = (state: ExecutionState, updatedExecution: Execution) => {
      // 更新当前执行
      if (state.currentExecution?.id === updatedExecution.id) {
        state.currentExecution = updatedExecution;
      }
      
      // 更新执行列表
      const index = state.executions.findIndex(exec => exec.id === updatedExecution.id);
      if (index >= 0) {
        state.executions[index] = updatedExecution;
      }
    };

    // 暂停执行
    builder.addCase(pauseExecution.fulfilled, (state, action) => {
      updateExecutionStatus(state, action.payload);
    });

    // 恢复执行
    builder.addCase(resumeExecution.fulfilled, (state, action) => {
      updateExecutionStatus(state, action.payload);
    });

    // 完成执行
    builder.addCase(completeExecution.fulfilled, (state, action) => {
      updateExecutionStatus(state, action.payload);
    });

    // 取消执行
    builder.addCase(cancelExecution.fulfilled, (state, action) => {
      updateExecutionStatus(state, action.payload);
    });

    // 更新执行进度
    builder.addCase(updateProgress.fulfilled, (state, action) => {
      const { executionId, progress } = action.payload;
      
      // 更新当前执行进度
      if (state.currentExecution?.id === executionId) {
        state.currentExecution.progress = progress;
      }
      
      // 更新执行列表中的进度
      const index = state.executions.findIndex(exec => exec.id === executionId);
      if (index >= 0) {
        state.executions[index].progress = progress;
      }
    });

    // 获取执行统计
    builder
      .addCase(fetchExecutionStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });

    // 删除执行
    builder
      .addCase(deleteExecution.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.executions = state.executions.filter(exec => exec.id !== deletedId);
        
        if (state.currentExecution?.id === deletedId) {
          state.currentExecution = null;
        }
      });
  },
});

export const { clearError, setCurrentExecution, clearCurrentExecution } = executionSlice.actions;

// 别名导出以保持兼容性
export const fetchExecution = fetchExecutionById;
export const fetchUserExecutions = fetchExecutions;
export const startExecution = createExecution;

// 添加缺失的步骤操作导出
export const updateExecutionStep = completeStep;

export default executionSlice.reducer;