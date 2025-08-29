import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import workflowReducer from './workflowSlice';
import executionReducer from './executionSlice';
import reviewReducer from './reviewSlice';
import historyReducer from './historySlice';
import offlineReducer from './offlineSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workflow: workflowReducer,
    execution: executionReducer,
    review: reviewReducer,
    history: historyReducer,
    offline: offlineReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;