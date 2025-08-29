import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { offlineService } from '../services/offline';

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  cacheCount: number;
  syncInProgress: boolean;
  lastSyncTime?: string;
  syncErrors: Array<{
    id: string;
    message: string;
    timestamp: string;
  }>;
}

const initialState: OfflineState = {
  isOnline: navigator.onLine,
  pendingCount: 0,
  cacheCount: 0,
  syncInProgress: false,
  syncErrors: [],
};

// 异步操作
export const syncOfflineData = createAsyncThunk(
  'offline/syncData',
  async (_, { rejectWithValue }) => {
    try {
      await offlineService.syncPendingData();
      const stats = await offlineService.getOfflineStats();
      return {
        stats,
        syncTime: new Date().toISOString(),
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Sync failed');
    }
  }
);

export const updateOfflineStats = createAsyncThunk(
  'offline/updateStats',
  async () => {
    const stats = await offlineService.getOfflineStats();
    return stats;
  }
);

export const cleanExpiredCache = createAsyncThunk(
  'offline/cleanCache',
  async () => {
    await offlineService.cleanExpiredCache();
    const stats = await offlineService.getOfflineStats();
    return stats;
  }
);

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    
    setPendingCount: (state, action: PayloadAction<number>) => {
      state.pendingCount = action.payload;
    },
    
    setCacheCount: (state, action: PayloadAction<number>) => {
      state.cacheCount = action.payload;
    },
    
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncInProgress = action.payload;
    },
    
    addSyncError: (state, action: PayloadAction<{ message: string }>) => {
      state.syncErrors.push({
        id: Date.now().toString(),
        message: action.payload.message,
        timestamp: new Date().toISOString(),
      });
      
      // 只保留最近的10个错误
      if (state.syncErrors.length > 10) {
        state.syncErrors = state.syncErrors.slice(-10);
      }
    },
    
    clearSyncErrors: (state) => {
      state.syncErrors = [];
    },
    
    removeSyncError: (state, action: PayloadAction<string>) => {
      state.syncErrors = state.syncErrors.filter(error => error.id !== action.payload);
    },
  },
  
  extraReducers: (builder) => {
    builder
      // 同步离线数据
      .addCase(syncOfflineData.pending, (state) => {
        state.syncInProgress = true;
      })
      .addCase(syncOfflineData.fulfilled, (state, action) => {
        state.syncInProgress = false;
        state.pendingCount = action.payload.stats.pendingCount;
        state.cacheCount = action.payload.stats.cacheCount;
        state.lastSyncTime = action.payload.syncTime;
      })
      .addCase(syncOfflineData.rejected, (state, action) => {
        state.syncInProgress = false;
        state.syncErrors.push({
          id: Date.now().toString(),
          message: action.payload as string,
          timestamp: new Date().toISOString(),
        });
      })
      
      // 更新统计信息
      .addCase(updateOfflineStats.fulfilled, (state, action) => {
        state.pendingCount = action.payload.pendingCount;
        state.cacheCount = action.payload.cacheCount;
      })
      
      // 清理过期缓存
      .addCase(cleanExpiredCache.fulfilled, (state, action) => {
        state.cacheCount = action.payload.cacheCount;
      });
  },
});

export const {
  setOnlineStatus,
  setPendingCount,
  setCacheCount,
  setSyncInProgress,
  addSyncError,
  clearSyncErrors,
  removeSyncError,
} = offlineSlice.actions;

export default offlineSlice.reducer;