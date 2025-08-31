import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/auth';
import { AuthState, LoginCredentials, RegisterData } from '../types/user';
import toast from 'react-hot-toast';

// 异步thunk - 用户登录
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      authService.saveAuthData(response.data.user, response.data.token);
      toast.success('登录成功！');
      return (response as any).data;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '登录失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 用户注册
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      authService.saveAuthData(response.data.user, response.data.token);
      toast.success('注册成功！');
      return (response as any).data;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '注册失败';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 异步thunk - 获取用户信息
export const fetchUserProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_) => {
    try {
      const response = await authService.getProfile();
      return (response as any).data.user;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '获取用户信息失败';
      throw new Error(message);
    }
  }
);

// 异步thunk - 用户登出
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_) => {
    try {
      await authService.logout();
      authService.clearAuthData();
      toast.success('已安全登出');
    } catch (error: any) {
      // 即使服务器返回错误，也要清除本地数据
      authService.clearAuthData();
      toast.success('已登出');
    }
  }
);

// 初始状态
const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

// 认证slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
    // 从本地存储恢复认证状态
    restoreAuth: (state) => {
      const { user, token } = authService.getAuthData();
      if (user && token) {
        state.user = user;
        state.token = token;
      }
    },
    // 清除认证状态
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      authService.clearAuthData();
    },
  },
  extraReducers: (builder) => {
    // 登录
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 注册
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 获取用户信息
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // 登出
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.error = null;
      });
  },
});

export const { clearError, restoreAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;