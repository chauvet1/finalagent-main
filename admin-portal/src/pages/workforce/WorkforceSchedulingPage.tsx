import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Avatar,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  SwapHoriz as SwapIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'on_leave';
  skills: string[];
  certifications: string[];
  availability: {
    [key: string]: {
      available: boolean;
      preferredShifts: string[];
      maxHours: number;
    };
  };
}

interface Shift {
  id: string;
  siteId: string;
  siteName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  agentId?: string;
  agentName?: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  requirements: string[];
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRecurring: boolean;
  recurringPattern?: {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
}

interface ScheduleConflict {
  id: string;
  type: 'overlap' | 'overtime' | 'unavailable' | 'skill_mismatch';
  agentId: string;
  agentName: string;
  shiftIds: string[];
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface ScheduleStats {
  totalShifts: number;
  scheduledShifts: number;
  unassignedShifts: number;
  conflicts: number;
  coverageRate: number;
  totalHours: number;
  overtimeHours: number;
}

// Initialize empty data - will be loaded from API

const WorkforceSchedulingPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [stats, setStats] = useState<ScheduleStats>({
    totalShifts: 0,
    scheduledShifts: 0,
    unassignedShifts: 0,
    conflicts: 0,
    coverageRate: 0,
    totalHours: 0,
    overtimeHours: 0,
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [tabValue, setTabValue] = useState(0);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [autoScheduleDialogOpen, setAutoScheduleDialogOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Data fetching functions
  const fetchScheduleData = async () => {
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
      console.debug(`Loading schedule data with ${tokenInfo.type} token`);

      // Fetch schedule data, agents, and conflicts using centralized API
      const [scheduleResponse, agentsResponse, conflictsResponse] = await Promise.all([
        adminAPI.getScheduleData({
          date: format(selectedDate, 'yyyy-MM-dd'),
          viewMode,
          filterAgent: filterAgent !== 'all' ? filterAgent : undefined,
          filterStatus: filterStatus !== 'all' ? filterStatus : undefined,
        }),
        adminAPI.getAgents({ status: 'active' }),
        adminAPI.getScheduleOptimization({ checkConflicts: true })
      ]);

      // Process schedule data
      const scheduleData = scheduleResponse.data.data || {};
      setShifts(scheduleData.shifts || []);
      setStats(scheduleData.stats || {
        totalShifts: 0,
        scheduledShifts: 0,
        unassignedShifts: 0,
        conflicts: 0,
        coverageRate: 0,
        totalHours: 0,
        overtimeHours: 0,
      });

      // Process agents data
      setAgents(agentsResponse.data.data || []);

      // Process conflicts data
      setConflicts(conflictsResponse.data.data?.conflicts || []);

      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Failed to fetch schedule data:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else {
        setError(`Failed to load schedule data: ${err.message}`);
      }

      // Initialize empty data structures
      setShifts([]);
      setAgents([]);
      setConflicts([]);
      setStats({
        totalShifts: 0,
        scheduledShifts: 0,
        unassignedShifts: 0,
        conflicts: 0,
        coverageRate: 0,
        totalHours: 0,
        overtimeHours: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchScheduleData();
  };

  const handleCreateShift = () => {
    setSelectedShift(null);
    setShiftDialogOpen(true);
  };

  const handleEditShift = (shift: Shift) => {
    setSelectedShift(shift);
    setShiftDialogOpen(true);
  };

  const handleDeleteShift = async (shiftId: string) => {
    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    try {
      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Deleting shift with ${tokenInfo.type} token`);

      // Delete shift using centralized API
      await adminAPI.deleteSchedule(shiftId);
      
      // Update local state
      setShifts(shifts.filter(shift => shift.id !== shiftId));

    } catch (err: any) {
      console.error('Failed to delete shift:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else {
        setError('Failed to delete shift. Please try again.');
      }
    }
  };

  const handleAssignAgent = async (shiftId: string, agentId: string) => {
    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    try {
      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Assigning agent to shift with ${tokenInfo.type} token`);

      const agent = agents.find(a => a.id === agentId);
      
      // Update shift assignment using centralized API
      await adminAPI.updateSchedule(shiftId, {
        agentId,
        agentName: agent?.name,
        status: 'scheduled'
      });
      
      // Update local state
      setShifts(shifts.map(shift => 
        shift.id === shiftId 
          ? { ...shift, agentId, agentName: agent?.name, status: 'scheduled' as const }
          : shift
      ));

    } catch (err: any) {
      console.error('Failed to assign agent:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else {
        setError('Failed to assign agent. Please try again.');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'confirmed': return 'success';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'no_show': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getConflictSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const filteredShifts = shifts.filter(shift => {
    if (filterAgent !== 'all' && shift.agentId !== filterAgent) return false;
    if (filterStatus !== 'all' && shift.status !== filterStatus) return false;
    return true;
  });

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Effects
  useEffect(() => {
    fetchScheduleData();
  }, [selectedDate, viewMode, filterAgent, filterStatus]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Workforce Scheduling
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage agent schedules, assignments, and coverage
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<AssignmentIcon />}
            onClick={() => setAutoScheduleDialogOpen(true)}
          >
            Auto Schedule
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateShift}
          >
            Create Shift
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Shifts
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalShifts}
                  </Typography>
                </Box>
                <ScheduleIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Coverage Rate
                  </Typography>
                  <Typography variant="h4">
                    {stats.coverageRate}%
                  </Typography>
                </Box>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Unassigned
                  </Typography>
                  <Typography variant="h4">
                    {stats.unassignedShifts}
                  </Typography>
                </Box>
                <WarningIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Conflicts
                  </Typography>
                  <Typography variant="h4">
                    {stats.conflicts}
                  </Typography>
                </Box>
                <CancelIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>View</InputLabel>
                <Select
                  value={viewMode}
                  label="View"
                  onChange={(e) => setViewMode(e.target.value as 'week' | 'month')}
                >
                  <MenuItem value="week">Week View</MenuItem>
                  <MenuItem value="month">Month View</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Agent</InputLabel>
                <Select
                  value={filterAgent}
                  label="Agent"
                  onChange={(e) => setFilterAgent(e.target.value)}
                >
                  <MenuItem value="all">All Agents</MenuItem>
                  {agents.map((agent) => (
                    <MenuItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Selected Date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Schedule View" />
            <Tab label="Shift List" />
            <Tab label="Conflicts" />
            <Tab label="Agent Availability" />
          </Tabs>
        </Box>

        {/* Schedule View Tab */}
        {tabValue === 0 && (
          <CardContent>
            {viewMode === 'week' ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Week of {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        {weekDays.map((day) => (
                          <TableCell key={day.toISOString()} align="center">
                            <Box>
                              <Typography variant="subtitle2">
                                {format(day, 'EEE')}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {format(day, 'MMM dd')}
                              </Typography>
                            </Box>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {['08:00', '16:00', '00:00'].map((time) => (
                        <TableRow key={time}>
                          <TableCell>{time}</TableCell>
                          {weekDays.map((day) => {
                            const dayShifts = filteredShifts.filter(shift => 
                              isSameDay(parseISO(shift.date), day) && shift.startTime === time
                            );
                            return (
                              <TableCell key={day.toISOString()} align="center">
                                {dayShifts.map((shift) => (
                                  <Chip
                                    key={shift.id}
                                    label={shift.agentName || 'Unassigned'}
                                    color={getStatusColor(shift.status) as any}
                                    size="small"
                                    onClick={() => handleEditShift(shift)}
                                    sx={{ mb: 0.5, cursor: 'pointer' }}
                                  />
                                ))}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <Typography>Month view coming soon...</Typography>
            )}
          </CardContent>
        )}

        {/* Shift List Tab */}
        {tabValue === 1 && (
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Site</TableCell>
                    <TableCell>Agent</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredShifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>
                        {format(parseISO(shift.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {shift.startTime} - {shift.endTime}
                      </TableCell>
                      <TableCell>{shift.siteName}</TableCell>
                      <TableCell>
                        {shift.agentName ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24 }}>
                              {shift.agentName.charAt(0)}
                            </Avatar>
                            {shift.agentName}
                          </Box>
                        ) : (
                          <Chip label="Unassigned" color="warning" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={shift.status.replace('_', ' ')}
                          color={getStatusColor(shift.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={shift.priority}
                          color={getPriorityColor(shift.priority) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{shift.duration}h</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleEditShift(shift)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteShift(shift.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                          {!shift.agentId && (
                            <Tooltip title="Assign Agent">
                              <IconButton size="small">
                                <SwapIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Conflicts Tab */}
        {tabValue === 2 && (
          <CardContent>
            <List>
              {conflicts.map((conflict) => (
                <React.Fragment key={conflict.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {conflict.agentName}
                          </Typography>
                          <Chip
                            label={conflict.type.replace('_', ' ')}
                            color={getConflictSeverityColor(conflict.severity) as any}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={conflict.description}
                    />
                    <ListItemSecondaryAction>
                      <Button size="small" variant="outlined">
                        Resolve
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        )}

        {/* Agent Availability Tab */}
        {tabValue === 3 && (
          <CardContent>
            <Grid container spacing={2}>
              {agents.map((agent) => (
                <Grid item xs={12} md={6} key={agent.id}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar>{agent.name.charAt(0)}</Avatar>
                      <Box>
                        <Typography variant="h6">{agent.name}</Typography>
                        <Chip
                          label={agent.status}
                          color={agent.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Weekly Availability
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {Object.entries(agent.availability).map(([day, avail]) => (
                        <Box key={day} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {day}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {avail.available ? (
                              <>
                                <Chip label={`${avail.maxHours}h`} size="small" />
                                <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                              </>
                            ) : (
                              <CancelIcon color="error" sx={{ fontSize: 16 }} />
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        )}
      </Card>

      {/* Shift Dialog */}
      <Dialog
        open={shiftDialogOpen}
        onClose={() => setShiftDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedShift ? 'Edit Shift' : 'Create New Shift'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Site"
                defaultValue={selectedShift?.siteName || ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                defaultValue={selectedShift?.date || format(new Date(), 'yyyy-MM-dd')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="time"
                label="Start Time"
                defaultValue={selectedShift?.startTime || '08:00'}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="time"
                label="End Time"
                defaultValue={selectedShift?.endTime || '16:00'}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Agent</InputLabel>
                <Select
                  defaultValue={selectedShift?.agentId || ''}
                  label="Agent"
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {agents.map((agent) => (
                    <MenuItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  defaultValue={selectedShift?.priority || 'medium'}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                defaultValue={selectedShift?.notes || ''}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShiftDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setShiftDialogOpen(false)}>
            {selectedShift ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Auto Schedule Dialog */}
      <Dialog
        open={autoScheduleDialogOpen}
        onClose={() => setAutoScheduleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Auto Schedule</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Automatically assign agents to unassigned shifts based on availability, skills, and preferences.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                defaultValue={format(new Date(), 'yyyy-MM-dd')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                defaultValue={format(addDays(new Date(), 7), 'yyyy-MM-dd')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutoScheduleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setAutoScheduleDialogOpen(false)}>
            Generate Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkforceSchedulingPage;