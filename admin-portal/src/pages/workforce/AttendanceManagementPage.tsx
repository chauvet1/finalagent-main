import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  Schedule as LateIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface AttendanceRecord {
  id: string;
  agentId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  breakStart?: string;
  breakEnd?: string;
  totalHours?: number;
  overtimeHours: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_DEPARTURE' | 'SICK_LEAVE' | 'VACATION' | 'PERSONAL_LEAVE' | 'UNPAID_LEAVE' | 'HOLIDAY';
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  agent: {
    id: string;
    employeeId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface AttendanceStats {
  totalRecords: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  averageHours: number;
  overtimeHours: number;
  attendanceRate: number;
  punctualityRate: number;
}

const AttendanceManagementPage: React.FC = () => {
  // State management
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Form states
  const [editData, setEditData] = useState({
    clockIn: '',
    clockOut: '',
    breakStart: '',
    breakEnd: '',
    status: 'PRESENT' as const,
    notes: '',
  });

  // Data fetching functions
  const fetchAttendanceData = useCallback(async () => {
    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Loading attendance data with ${tokenInfo.type} token`);

      // Fetch attendance records and summary using centralized API
      const [recordsResponse, summaryResponse] = await Promise.all([
        adminAPI.getAttendanceRecords({
          page: page + 1,
          limit: rowsPerPage,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          date: filterDate || undefined,
          search: searchQuery || undefined,
        }),
        adminAPI.getAttendanceSummary()
      ]);

      setAttendanceRecords(recordsResponse.data.data || []);
      setStats(summaryResponse.data.data || {
        totalRecords: 0,
        presentToday: 0,
        absentToday: 0,
        lateToday: 0,
        averageHours: 0,
        overtimeHours: 0,
        attendanceRate: 0,
        punctualityRate: 0,
      });
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Failed to fetch attendance data:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else {
        setError(`Failed to load attendance data: ${err.message}`);
      }

      setAttendanceRecords([]);
      setStats({
        totalRecords: 0,
        presentToday: 0,
        absentToday: 0,
        lateToday: 0,
        averageHours: 0,
        overtimeHours: 0,
        attendanceRate: 0,
        punctualityRate: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterStatus, filterDate, searchQuery]);

  const updateAttendanceRecord = async () => {
    if (!selectedRecord) return;

    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    try {
      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Updating attendance record with ${tokenInfo.type} token`);

      // Update attendance record using centralized API
      await adminAPI.updateAttendanceRecord(selectedRecord.id, {
        clockIn: editData.clockIn,
        clockOut: editData.clockOut,
        breakStart: editData.breakStart,
        breakEnd: editData.breakEnd,
        status: editData.status,
        notes: editData.notes,
      });

      setEditDialogOpen(false);
      setSelectedRecord(null);
      setEditData({
        clockIn: '',
        clockOut: '',
        breakStart: '',
        breakEnd: '',
        status: 'PRESENT',
        notes: '',
      });
      fetchAttendanceData();

    } catch (err: any) {
      console.error('Failed to update attendance record:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else {
        setError(`Failed to update attendance record: ${err.message}`);
      }
    }
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'success';
      case 'ABSENT':
        return 'error';
      case 'LATE':
        return 'warning';
      case 'EARLY_DEPARTURE':
        return 'warning';
      case 'SICK_LEAVE':
        return 'info';
      case 'VACATION':
        return 'info';
      case 'PERSONAL_LEAVE':
        return 'default';
      case 'UNPAID_LEAVE':
        return 'default';
      case 'HOLIDAY':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <PresentIcon color="success" />;
      case 'ABSENT':
        return <AbsentIcon color="error" />;
      case 'LATE':
        return <LateIcon color="warning" />;
      case 'EARLY_DEPARTURE':
        return <WarningIcon color="warning" />;
      default:
        return <PersonIcon />;
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (hours?: number) => {
    if (!hours) return 'N/A';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const filteredRecords = attendanceRecords.filter(record => {
    if (filterStatus !== 'all' && record.status !== filterStatus) return false;
    if (filterDate && !record.date.includes(filterDate)) return false;
    if (searchQuery && 
        !record.agent.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !record.agent.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !record.agent.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Effects
  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  // Loading state
  if (loading && attendanceRecords.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Attendance Data...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Attendance Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track attendance, manage time records, and monitor workforce presence
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <Button
            variant="outlined"
            onClick={fetchAttendanceData}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default AttendanceManagementPage;
