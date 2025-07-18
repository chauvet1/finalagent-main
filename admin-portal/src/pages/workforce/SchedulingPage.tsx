import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';

import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI, sitesAPI, shiftsAPI } from '../../services/api';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,

} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, startOfWeek } from 'date-fns';

interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  skills: string[];
  availability: string[];
}

interface Site {
  id: string;
  name: string;
  address: string;
  requiredAgents: number;
}

interface Shift {
  id: string;
  agentId: string;
  agentName: string;
  siteId: string;
  siteName: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

const SchedulingPage: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [openDialog, setOpenDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    agentId: '',
    siteId: '',
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    notes: '',
  });

  useEffect(() => {
    // Load data from API
    const loadData = async () => {
      // Check authentication availability first
      const authAvailable = await isAuthenticationAvailable();
      if (!authAvailable) {
        setError('Authentication not available. Please log in.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get current token info for debugging
        const tokenInfo = await getCurrentTokenInfo();
        console.debug(`Loading scheduling data with ${tokenInfo.type} token`);

        // Use the enhanced API service (token automatically injected)
        const [agentsResponse, sitesResponse, shiftsResponse] = await Promise.all([
          adminAPI.getAgents(),
          sitesAPI.getAll(),
          shiftsAPI.getAll()
        ]);

        const agentsData = agentsResponse.data.data || [];
        const sitesData = sitesResponse.data.data || [];
        const shiftsData = shiftsResponse.data.data || [];

        setAgents(agentsData);
        setSites(sitesData);
        setShifts(shiftsData);
      } catch (error: any) {
        console.error('Failed to load scheduling data:', error);
        setError(error.response?.data?.message || 'Failed to load scheduling data');

        // Initialize with empty arrays on error
        setAgents([]);
        setSites([]);
        setShifts([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleOpenDialog = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        agentId: shift.agentId,
        siteId: shift.siteId,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        notes: shift.notes || '',
      });
    } else {
      setEditingShift(null);
      setFormData({
        agentId: '',
        siteId: '',
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingShift(null);
  };

  const handleSaveShift = () => {
    const agent = agents.find(a => a.id === formData.agentId);
    const site = sites.find(s => s.id === formData.siteId);

    if (!agent || !site) return;

    const shiftData: Shift = {
      id: editingShift?.id || Date.now().toString(),
      agentId: formData.agentId,
      agentName: agent.name,
      siteId: formData.siteId,
      siteName: site.name,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      status: 'scheduled',
      notes: formData.notes,
    };

    if (editingShift) {
      setShifts(shifts.map(s => s.id === editingShift.id ? shiftData : s));
    } else {
      setShifts([...shifts, shiftData]);
    }

    handleCloseDialog();
  };

  const handleDeleteShift = (shiftId: string) => {
    setShifts(shifts.filter(s => s.id !== shiftId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'warning';
      case 'confirmed': return 'success';
      case 'completed': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const weekStart = startOfWeek(selectedWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon color="primary" />
            Shift Scheduling
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Schedule New Shift
          </Button>
        </Box>

        {/* Week Navigation */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
              >
                Previous Week
              </Button>
              <Typography variant="h6">
                Week of {format(weekStart, 'MMM dd, yyyy')}
              </Typography>
              <Button
                onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
              >
                Next Week
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Weekly Schedule Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {weekDays.map((day, index) => {
            const dayShifts = shifts.filter(shift =>
              format(shift.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
            );

            return (
              <Grid item xs={12} md={1.7} key={index}>
                <Card sx={{ minHeight: 200 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {format(day, 'EEE')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {format(day, 'MMM dd')}
                    </Typography>

                    {dayShifts.map((shift) => (
                      <Box
                        key={shift.id}
                        sx={{
                          p: 1,
                          mb: 1,
                          backgroundColor: 'primary.light',
                          borderRadius: 1,
                          cursor: 'pointer',
                        }}
                        onClick={() => handleOpenDialog(shift)}
                      >
                        <Typography variant="caption" display="block">
                          {shift.agentName}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {format(shift.startTime, 'HH:mm')} - {format(shift.endTime, 'HH:mm')}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {shift.siteName}
                        </Typography>
                        <Chip
                          label={shift.status}
                          size="small"
                          color={getStatusColor(shift.status) as any}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Shifts Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              All Scheduled Shifts
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Agent</TableCell>
                    <TableCell>Site</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {shift.agentName.charAt(0)}
                          </Avatar>
                          {shift.agentName}
                        </Box>
                      </TableCell>
                      <TableCell>{shift.siteName}</TableCell>
                      <TableCell>{format(shift.date, 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {format(shift.startTime, 'HH:mm')} - {format(shift.endTime, 'HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={shift.status}
                          color={getStatusColor(shift.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(shift)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteShift(shift.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Add/Edit Shift Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingShift ? 'Edit Shift' : 'Schedule New Shift'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Agent</InputLabel>
                  <Select
                    value={formData.agentId}
                    onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                  >
                    {agents.map((agent) => (
                      <MenuItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Site</InputLabel>
                  <Select
                    value={formData.siteId}
                    onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                  >
                    {sites.map((site) => (
                      <MenuItem key={site.id} value={site.id}>
                        {site.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={(date) => setFormData({ ...formData, date: date || new Date() })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TimePicker
                  label="Start Time"
                  value={formData.startTime}
                  onChange={(time) => setFormData({ ...formData, startTime: time || new Date() })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TimePicker
                  label="End Time"
                  value={formData.endTime}
                  onChange={(time) => setFormData({ ...formData, endTime: time || new Date() })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleSaveShift}
              variant="contained"
              disabled={!formData.agentId || !formData.siteId}
            >
              {editingShift ? 'Update' : 'Schedule'} Shift
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default SchedulingPage;