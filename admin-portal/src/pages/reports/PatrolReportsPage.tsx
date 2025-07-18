import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Avatar,
  LinearProgress,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
  Warning as IncompleteIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface PatrolCheckpoint {
  id: string;
  name: string;
  location: string;
  status: 'Completed' | 'Missed' | 'Delayed';
  timestamp?: Date;
  notes?: string;
}

interface PatrolReport {
  id: string;
  patrolId: string;
  agentName: string;
  agentId: string;
  siteName: string;
  siteId: string;
  startTime: Date;
  endTime?: Date;
  status: 'In Progress' | 'Completed' | 'Incomplete';
  checkpoints: PatrolCheckpoint[];
  totalCheckpoints: number;
  completedCheckpoints: number;
  duration?: number; // in minutes
  notes?: string;
  incidents?: string[];
}



const PatrolReportsPage: React.FC = () => {
  const [reports, setReports] = useState<PatrolReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedReport, setSelectedReport] = useState<PatrolReport | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [siteFilter, setSiteFilter] = useState<string>('All');
  const [agentFilter, setAgentFilter] = useState<string>('All');

  useEffect(() => {
    // Load patrol reports from API
    const loadPatrolReports = async () => {
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
        console.debug(`Loading patrol reports with ${tokenInfo.type} token`);

        // Use the enhanced API service (token automatically injected)
        const response = await adminAPI.getPatrolReports?.() || 
                         await adminAPI.getPatrols();
        
        const patrolsData = response.data.data || [];
        setReports(patrolsData);
      } catch (error: any) {
        console.error('Failed to load patrol reports:', error);
        setError(error.response?.data?.message || 'Failed to load patrol reports');
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadPatrolReports();
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewReport = (report: PatrolReport) => {
    setSelectedReport(report);
    setViewDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'info';
      case 'Incomplete': return 'warning';
      default: return 'default';
    }
  };

  const getCheckpointStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Delayed': return 'warning';
      case 'Missed': return 'error';
      default: return 'default';
    }
  };

  const getCompletionPercentage = (report: PatrolReport) => {
    return (report.completedCheckpoints / report.totalCheckpoints) * 100;
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.patrolId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.siteName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || report.status === statusFilter;
    const matchesSite = siteFilter === 'All' || report.siteName === siteFilter;
    const matchesAgent = agentFilter === 'All' || report.agentName === agentFilter;
    
    return matchesSearch && matchesStatus && matchesSite && matchesAgent;
  });

  const uniqueSites = Array.from(new Set(reports.map(r => r.siteName)));
  const uniqueAgents = Array.from(new Set(reports.map(r => r.agentName)));

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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Patrol Reports
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setFilterDialogOpen(true)}
          >
            Filters
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Patrols
              </Typography>
              <Typography variant="h4">
                {reports.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" color="success">
                {reports.filter(r => r.status === 'Completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                In Progress
              </Typography>
              <Typography variant="h4" color="info">
                {reports.filter(r => r.status === 'In Progress').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Incomplete
              </Typography>
              <Typography variant="h4" color="warning">
                {reports.filter(r => r.status === 'Incomplete').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search patrols by ID, agent name, or site..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Paper>

      {/* Reports Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Patrol ID</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Site</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReports
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {report.patrolId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          <PersonIcon />
                        </Avatar>
                        <Typography variant="body2">
                          {report.agentName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {report.siteName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(report.startTime, 'MMM dd, yyyy HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {report.duration ? `${report.duration} min` : 'In Progress'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ minWidth: 120 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" fontSize="0.75rem">
                            {report.completedCheckpoints}/{report.totalCheckpoints}
                          </Typography>
                          <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
                            ({Math.round(getCompletionPercentage(report))}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={getCompletionPercentage(report)}
                          color={getCompletionPercentage(report) === 100 ? 'success' : 'primary'}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.status}
                        color={getStatusColor(report.status) as any}
                        size="small"
                        icon={
                          report.status === 'Completed' ? <CompletedIcon /> :
                          report.status === 'Incomplete' ? <IncompleteIcon /> : undefined
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewReport(report)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredReports.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* View Report Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Patrol Report Details - {selectedReport?.patrolId}
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Agent
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    <PersonIcon />
                  </Avatar>
                  <Typography variant="body1">
                    {selectedReport.agentName}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Site
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocationIcon color="action" />
                  <Typography variant="body1">
                    {selectedReport.siteName}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Status
                </Typography>
                <Chip
                  label={selectedReport.status}
                  color={getStatusColor(selectedReport.status) as any}
                  sx={{ mb: 2 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Duration
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedReport.duration ? `${selectedReport.duration} minutes` : 'In Progress'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Start Time
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {format(selectedReport.startTime, 'MMM dd, yyyy HH:mm')}
                </Typography>
              </Grid>
              
              {selectedReport.endTime && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    End Time
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {format(selectedReport.endTime, 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Grid>
              )}

              {/* Progress Overview */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Progress Overview
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="body1">
                      Checkpoints: {selectedReport.completedCheckpoints}/{selectedReport.totalCheckpoints}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ({Math.round(getCompletionPercentage(selectedReport))}% complete)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getCompletionPercentage(selectedReport)}
                    color={getCompletionPercentage(selectedReport) === 100 ? 'success' : 'primary'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Grid>

              {/* Checkpoints */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Checkpoints
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Checkpoint</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedReport.checkpoints.map((checkpoint) => (
                        <TableRow key={checkpoint.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {checkpoint.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {checkpoint.location}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={checkpoint.status}
                              color={getCheckpointStatusColor(checkpoint.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {checkpoint.timestamp ? 
                                format(checkpoint.timestamp, 'HH:mm') : 
                                '-'
                              }
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {checkpoint.notes || '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Notes */}
              {selectedReport.notes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Notes
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body1">
                      {selectedReport.notes}
                    </Typography>
                  </Paper>
                </Grid>
              )}

              {/* Related Incidents */}
              {selectedReport.incidents && selectedReport.incidents.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Related Incidents
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedReport.incidents.map((incident, index) => (
                      <Chip
                        key={index}
                        label={incident}
                        color="warning"
                        variant="outlined"
                        clickable
                      />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>
            Export Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Filter Patrol Reports</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="All">All Statuses</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Incomplete">Incomplete</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Site</InputLabel>
                <Select
                  value={siteFilter}
                  label="Site"
                  onChange={(e) => setSiteFilter(e.target.value)}
                >
                  <MenuItem value="All">All Sites</MenuItem>
                  {uniqueSites.map((site) => (
                    <MenuItem key={site} value={site}>{site}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Agent</InputLabel>
                <Select
                  value={agentFilter}
                  label="Agent"
                  onChange={(e) => setAgentFilter(e.target.value)}
                >
                  <MenuItem value="All">All Agents</MenuItem>
                  {uniqueAgents.map((agent) => (
                    <MenuItem key={agent} value={agent}>{agent}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setFilterDialogOpen(false);
              setPage(0);
            }}
            variant="contained"
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatrolReportsPage;