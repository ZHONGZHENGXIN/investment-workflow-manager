import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { workflowService } from '../services/workflow';
import { WorkflowState, Workflow, CreateWorkflowData, UpdateWorkflowData } from '../types/workflow';
import toast from 'react-hot-toast';

// 异步thunk - 获取用户工作流
export const fetchUserWorkflows = createAsyncThunk(
  'workflow/fetchUserWorkflows',
  async (_, { rejectWithValue }) => {
    try {
      const response = await workflowService.getUserWorkflows();
      return (response as any).data.workflows;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '获取工作流列表失败';
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 创建工作流
export const createWorkflow = createAsyncThunk(
  'workflow/createWorkflow',
  async (workflowData: CreateWorkflowData, { rejectWithValue }) => {
    try {
      const response = await workflowService.createWorkflow(workflowData);
      toast.success('工作流创建成功！');
      return (response as any).data.workflow;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '创建工作流失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 获取工作流详情
export const fetchWorkflowById = createAsyncThunk(
  'workflow/fetchWorkflowById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await workflowService.getWorkflowById(id);
      return (response as any).data.workflow;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '获取工作流详情失败';
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 更新工作流
export const updateWorkflow = createAsyncThunk(
  'workflow/updateWorkflow',
  async ({ id, updateData }: { id: string; updateData: UpdateWorkflowData }, { rejectWithValue }) => {
    try {
      const response = await workflowService.updateWorkflow(id, updateData);
      toast.success('工作流更新成功！');
      return (response as any).data.workflow;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '更新工作流失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 删除工作流
export const deleteWorkflow = createAsyncThunk(
  'workflow/deleteWorkflow',
  async (id: string, { rejectWithValue }) => {
    try {
      await workflowService.deleteWorkflow(id);
      toast.success('工作流删除成功！');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '删除工作流失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 复制工作流
export const duplicateWorkflow = createAsyncThunk(
  'workflow/duplicateWorkflow',
  async ({ id, name }: { id: string; name?: string }, { rejectWithValue }) => {
    try {
      const response = await workflowService.duplicateWorkflow(id, name);
      toast.success('工作流复制成功！');
      return (response as any).data.workflow;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '复制工作流失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 初始状态
const initialState: WorkflowState = {
  workflows: [],
  currentWorkflow: null,
  isLoading: false,
  error: null,
};

// 工作流slice
const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
    // 设置当前工作流
    setCurrentWorkflow: (state, action: PayloadAction<Workflow | null>) => {
      state.currentWorkflow = action.payload;
    },
    // 清除当前工作流
    clearCurrentWorkflow: (state) => {
      state.currentWorkflow = null;
    },
  },
  extraReducers: (builder) => {
    // 获取用户工作流
    builder
      .addCase(fetchUserWorkflows.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserWorkflows.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workflows = action.payload;
        state.error = null;
      })
      .addCase(fetchUserWorkflows.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 创建工作流
    builder
      .addCase(createWorkflow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createWorkflow.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workflows.unshift(action.payload);
        state.error = null;
      })
      .addCase(createWorkflow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 获取工作流详情
    builder
      .addCase(fetchWorkflowById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkflowById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentWorkflow = action.payload;
        state.error = null;
      })
      .addCase(fetchWorkflowById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 更新工作流
    builder
      .addCase(updateWorkflow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateWorkflow.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.workflows.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workflows[index] = action.payload;
        }
        if (state.currentWorkflow?.id === action.payload.id) {
          state.currentWorkflow = action.payload;
        }
        state.error = null;
      })
      .addCase(updateWorkflow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 删除工作流
    builder
      .addCase(deleteWorkflow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteWorkflow.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workflows = state.workflows.filter(w => w.id !== action.payload);
        if (state.currentWorkflow?.id === action.payload) {
          state.currentWorkflow = null;
        }
        state.error = null;
      })
      .addCase(deleteWorkflow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 复制工作流
    builder
      .addCase(duplicateWorkflow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(duplicateWorkflow.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workflows.unshift(action.payload);
        state.error = null;
      })
      .addCase(duplicateWorkflow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentWorkflow, clearCurrentWorkflow } = workflowSlice.actions;
export default workflowSlice.reducer;