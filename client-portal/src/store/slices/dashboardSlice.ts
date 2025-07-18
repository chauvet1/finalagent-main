import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../services/api';

interface DashboardMetrics {
  activeSites: number;
  activeAgents: number;
  ongoingShifts: number;
  reportsToday: number;
  sitesTrend?: number;
  agentsTrend?: number;
  shiftsTrend?: number;
  reportsTrend?: number;
  systemHealth?: {
    status: 'operational' | 'degraded' | 'down';
    issues: string[];
  };
}

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  siteId?: string;
  siteName?: string;
  agentId?: string;
  agentName?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
}

interface Activity {
  id: string;
  type: 'shift_started' | 'shift_ended' | 'report_submitted' | 'incident_reported' | 'agent_clocked_in' | 'agent_clocked_out';
  title: string;
  description: string;
  timestamp: string;
  agentName?: string;
  siteName?: string;
  icon?: string;
}

interface SiteStatus {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'alert';
  agentsOnSite: number;
  lastUpdate: string;
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface PerformanceData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

interface DashboardState {
  metrics: DashboardMetrics | null;
  alerts: Alert[];
  recentActivity: Activity[];
  siteStatuses: SiteStatus[];
  performanceData: PerformanceData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: DashboardState = {
  metrics: null,
  alerts: [],
  recentActivity: [],
  siteStatuses: [],
  performanceData: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      // Use multiple API calls to get comprehensive dashboard data
      const [dashboardResponse, analyticsResponse, sitesResponse] = await Promise.all([
        apiClient.get('/client-portal/dashboard'),
        apiClient.get('/client-portal/analytics'),
        apiClient.get('/client-portal/sites')
      ]);

      // Sanitize data to prevent undefined values
      const sanitizeArray = (arr: any[]) => {
        if (!Array.isArray(arr)) return [];
        return arr.map(item => ({
          ...item,
          timestamp: item?.timestamp || new Date().toISOString(),
          id: item?.id || Math.random().toString(36).substr(2, 9),
          title: item?.title || 'N/A',
          message: item?.message || 'N/A',
          description: item?.description || 'N/A',
          priority: item?.priority || 'LOW',
          type: item?.type || 'info',
          status: item?.status || 'ACTIVE',
          name: item?.name || 'Unknown',
          agentsOnSite: item?.agentsOnSite || 0,
          lastUpdate: item?.lastUpdate || new Date().toISOString()
        }));
      };

      const sanitizeMetrics = (metrics: any) => ({
        activeSites: metrics?.activeSites || 0,
        activeShifts: metrics?.activeShifts || 0,
        incidentsToday: metrics?.incidentsToday || 0,
        pendingRequests: metrics?.pendingRequests || 0,
        totalReports: metrics?.totalReports || 0,
        weeklyReports: metrics?.weeklyReports || 0,
        monthlyReports: metrics?.monthlyReports || 0,
        totalIncidents: metrics?.totalIncidents || 0,
        weeklyIncidents: metrics?.weeklyIncidents || 0,
        monthlyIncidents: metrics?.monthlyIncidents || 0,
        averageResponseTime: metrics?.averageResponseTime || 0,
        complianceScore: metrics?.complianceScore || 0
      });

      // Combine the responses into a unified dashboard data structure
      return {
        metrics: sanitizeMetrics(dashboardResponse.data?.metrics || analyticsResponse.data?.metrics || {}),
        alerts: sanitizeArray(dashboardResponse.data?.alerts || []),
        recentActivity: sanitizeArray(dashboardResponse.data?.recentActivity || []),
        siteStatuses: sanitizeArray(sitesResponse.data?.sites || sitesResponse.data || []),
        performanceData: analyticsResponse.data?.performanceData || null
      };
    } catch (error: any) {
      console.error('Dashboard data fetch error:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard data');
    }
  }
);

export const acknowledgeAlert = createAsyncThunk(
  'dashboard/acknowledgeAlert',
  async (alertId: string, { rejectWithValue }) => {
    try {
      await apiClient.post(`/notifications/${alertId}/acknowledge`);
      return alertId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to acknowledge alert');
    }
  }
);

export const fetchRealtimeUpdates = createAsyncThunk(
  'dashboard/fetchRealtimeUpdates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/clients/realtime-status');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch realtime updates');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addAlert: (state, action: PayloadAction<Alert>) => {
      state.alerts.unshift(action.payload);
      // Keep only the latest 50 alerts
      if (state.alerts.length > 50) {
        state.alerts = state.alerts.slice(0, 50);
      }
    },
    removeAlert: (state, action: PayloadAction<string>) => {
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload);
    },
    addActivity: (state, action: PayloadAction<Activity>) => {
      state.recentActivity.unshift(action.payload);
      // Keep only the latest 20 activities
      if (state.recentActivity.length > 20) {
        state.recentActivity = state.recentActivity.slice(0, 20);
      }
    },
    updateSiteStatus: (state, action: PayloadAction<{ siteId: string; status: SiteStatus['status']; agentsOnSite?: number }>) => {
      const { siteId, status, agentsOnSite } = action.payload;
      const siteIndex = state.siteStatuses.findIndex(site => site.id === siteId);
      if (siteIndex >= 0) {
        state.siteStatuses[siteIndex].status = status;
        state.siteStatuses[siteIndex].lastUpdate = new Date().toISOString();
        if (agentsOnSite !== undefined) {
          state.siteStatuses[siteIndex].agentsOnSite = agentsOnSite;
        }
      }
    },
    updateMetrics: (state, action: PayloadAction<Partial<DashboardMetrics>>) => {
      if (state.metrics) {
        state.metrics = { ...state.metrics, ...action.payload };
      }
    },
    setLastUpdated: (state) => {
      state.lastUpdated = new Date().toISOString();
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboard data
      .addCase(fetchDashboardData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.metrics = action.payload.metrics;
        state.alerts = action.payload.alerts || [];
        state.recentActivity = action.payload.recentActivity || [];
        state.siteStatuses = action.payload.siteStatuses || [];
        state.performanceData = action.payload.performanceData;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Acknowledge alert
      .addCase(acknowledgeAlert.fulfilled, (state, action) => {
        const alertIndex = state.alerts.findIndex(alert => alert.id === action.payload);
        if (alertIndex >= 0) {
          state.alerts[alertIndex].acknowledged = true;
        }
      })
      // Fetch realtime updates
      .addCase(fetchRealtimeUpdates.fulfilled, (state, action) => {
        // Update metrics with realtime data
        if (action.payload.metrics) {
          state.metrics = { ...state.metrics, ...action.payload.metrics };
        }
        
        // Update site statuses
        if (action.payload.siteStatuses) {
          state.siteStatuses = action.payload.siteStatuses;
        }
        
        state.lastUpdated = new Date().toISOString();
      });
  },
});

export const {
  clearError,
  addAlert,
  removeAlert,
  addActivity,
  updateSiteStatus,
  updateMetrics,
  setLastUpdated,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
