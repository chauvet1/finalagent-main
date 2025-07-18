import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Paper,
  Tab,
  Tabs,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  ReportProblem as IncidentIcon,
  Assignment as AssignIcon,
  Update as UpdateIcon,
  ArrowUpward as EscalateIcon,
  CheckCircle as ResolveIcon,
  Close as CloseIcon,
  AttachFile as AttachIcon,
  Send as SendIcon,
  Phone as PhoneIcon,
  Message as MessageIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,

} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`incident-tabpanel-${index}`}
      aria-labelledby={`incident-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface Incident {
  id: string;
  title: string;
  description?: string;
  type: 'SECURITY_BREACH' | 'THEFT' | 'VANDALISM' | 'MEDICAL_EMERGENCY' | 'FIRE' | 'NATURAL_DISASTER' | 'EQUIPMENT_FAILURE' | 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_ACTIVITY' | 'SAFETY_VIOLATION' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
  status: 'OPEN' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
  location?: string;
  latitude?: number;
  longitude?: number;
  reportedBy?: string;
  assignedTo?: string;
  siteId?: string;
  clientId?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  site?: {
    id: string;
    name: string;
    address: any;
  };
  client?: {
    id: string;
    companyName: string;
  };
  updates?: IncidentUpdate[];
  attachments?: IncidentAttachment[];
}

interface IncidentUpdate {
  id: string;
  incidentId: string;
  userId?: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface IncidentAttachment {
  id: string;
  incidentId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  createdAt: string;
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface IncidentStats {
  totalIncidents: number;
  openIncidents: number;
  criticalIncidents: number;
  resolvedToday: number;
  averageResponseTime: number;
  escalatedIncidents: number;
}

const IncidentResponsePage: React.FC = () => {
  const { user } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Form states
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    type: 'OTHER' as const,
    priority: 'MEDIUM' as const,
    severity: 'MODERATE' as const,
    location: '',
    siteId: '',
    clientId: '',
  });

  const [newUpdate, setNewUpdate] = useState({
    message: '',
    isInternal: false,
  });

  const [assignmentData, setAssignmentData] = useState({
    assignedTo: '',
    notes: '',
  });

  const [escalationData, setEscalationData] = useState({
    toUserId: '',
    reason: '',
  });

  // Data fetching functions
  const fetchIncidents = useCallback(async () => {
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
      console.debug(`Loading incidents with ${tokenInfo.type} token`);

      // Note: Since there's no specific incidents API in the enhanced service,
      // we'll initialize with empty data to avoid errors
      // In a real implementation, you'd add specific incident endpoints to the API service

      setIncidents([]);
      setStats({
        totalIncidents: 0,
        openIncidents: 0,
        criticalIncidents: 0,
        resolvedToday: 0,
        averageResponseTime: 0,
        escalatedIncidents: 0,
      });
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Failed to fetch incidents:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication failed. Please check your credentials.');
      } else {
        setError(`Failed to load incident data: ${err.message}`);
      }

      setIncidents([]);
      setStats({
        totalIncidents: 0,
        openIncidents: 0,
        criticalIncidents: 0,
        resolvedToday: 0,
        averageResponseTime: 0,
        escalatedIncidents: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const createIncident = async () => {
    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    try {
      setError(null);

      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Creating incident with ${tokenInfo.type} token`);

      const incidentData = {
        ...newIncident,
        reportedBy: user?.id,
      };

      await adminAPI.createIncident(incidentData);

      setCreateDialogOpen(false);
      setNewIncident({
        title: '',
        description: '',
        type: 'OTHER',
        priority: 'MEDIUM',
        severity: 'MODERATE',
        location: '',
        siteId: '',
        clientId: '',
      });
      fetchIncidents();

    } catch (err: any) {
      console.error('Failed to create incident:', err);
      setError('Failed to create incident. Please try again.');
    }
  };

  const updateIncident = async () => {
    if (!selectedIncident) return;

    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication required to update incident');
      return;
    }

    try {
      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Updating incident with ${tokenInfo.type} token`);

      // Note: Since there's no specific incidents API in the enhanced service,
      // we'll simulate the update for now
      // In a real implementation, you'd add specific incident endpoints to the API service

      setUpdateDialogOpen(false);
      setNewUpdate({
        message: '',
        isInternal: false,
      });
      fetchIncidents();

    } catch (err: any) {
      console.error('Failed to update incident:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication failed. Please check your credentials.');
      } else {
        setError(`Failed to update incident: ${err.message}`);
      }
    }
  };

  const assignIncident = async () => {
    if (!selectedIncident) return;

    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication required to assign incident');
      return;
    }

    try {
      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Assigning incident with ${tokenInfo.type} token`);

      // Note: Since there's no specific incidents API in the enhanced service,
      // we'll simulate the assignment for now
      // In a real implementation, you'd add specific incident endpoints to the API service

      setAssignDialogOpen(false);
      setAssignmentData({
        assignedTo: '',
        notes: '',
      });
      fetchIncidents();

    } catch (err: any) {
      console.error('Failed to assign incident:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication failed. Please check your credentials.');
      } else {
        setError(`Failed to assign incident: ${err.message}`);
      }
    }
  };

  const escalateIncident = async () => {
    if (!selectedIncident) return;

    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication required to escalate incident');
      return;
    }

    try {
      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Escalating incident with ${tokenInfo.type} token`);

      // Note: Since there's no specific incidents API in the enhanced service,
      // we'll simulate the escalation for now
      // In a real implementation, you'd add specific incident endpoints to the API service

      setEscalateDialogOpen(false);
      setEscalationData({
        toUserId: '',
        reason: '',
      });
      fetchIncidents();

    } catch (err: any) {
      console.error('Failed to escalate incident:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication failed. Please check your credentials.');
      } else {
        setError(`Failed to escalate incident: ${err.message}`);
      }
    }
  };

  // Utility functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY':
        return 'error';
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'error';
      case 'IN_PROGRESS':
        return 'warning';
      case 'PENDING_REVIEW':
        return 'info';
      case 'RESOLVED':
        return 'success';
      case 'CLOSED':
        return 'default';
      case 'CANCELLED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <IncidentIcon color="error" />;
      case 'MAJOR':
        return <IncidentIcon color="warning" />;
      case 'MODERATE':
        return <IncidentIcon color="info" />;
      case 'MINOR':
        return <IncidentIcon color="action" />;
      default:
        return <IncidentIcon />;
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    if (filterStatus !== 'all' && incident.status !== filterStatus) return false;
    if (filterPriority !== 'all' && incident.priority !== filterPriority) return false;
    if (filterType !== 'all' && incident.type !== filterType) return false;
    if (searchQuery && !incident.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !incident.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Effects
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    const interval = setInterval(fetchIncidents, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  // Loading state
  if (loading && incidents.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Incident Data...
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
            Incident Response Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time incident monitoring, response coordination, and escalation management
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
            onClick={fetchIncidents}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={() => setCreateDialogOpen(true)}
            startIcon={<AddIcon />}
          >
            Create Incident
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <IncidentIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{stats.totalIncidents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Incidents
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Badge badgeContent={stats.openIncidents} color="error">
                    <IncidentIcon color="error" />
                  </Badge>
                  <Box>
                    <Typography variant="h6">{stats.openIncidents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Open Incidents
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <IncidentIcon color="error" />
                  <Box>
                    <Typography variant="h6">{stats.criticalIncidents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Critical
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <ResolveIcon color="success" />
                  <Box>
                    <Typography variant="h6">{stats.resolvedToday}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Resolved Today
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <ScheduleIcon color="warning" />
                  <Box>
                    <Typography variant="h6">{stats.averageResponseTime}m</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Response
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <EscalateIcon color="warning" />
                  <Box>
                    <Typography variant="h6">{stats.escalatedIncidents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Escalated
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Incidents" />
          <Tab label="Active Response" />
          <Tab label="Escalations" />
          <Tab label="Analytics" />
        </Tabs>

        {/* Tab Content - All Incidents */}
        <TabPanel value={activeTab} index={0}>
          <Box display="flex" gap={2} mb={3} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="OPEN">Open</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="PENDING_REVIEW">Pending Review</MenuItem>
                <MenuItem value="RESOLVED">Resolved</MenuItem>
                <MenuItem value="CLOSED">Closed</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filterPriority}
                label="Priority"
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <MenuItem value="all">All Priority</MenuItem>
                <MenuItem value="EMERGENCY">Emergency</MenuItem>
                <MenuItem value="CRITICAL">Critical</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
              sx={{ minWidth: 200 }}
            />
          </Box>

          <Typography variant="h6" gutterBottom>
            Incidents ({filteredIncidents.length})
          </Typography>

          <List>
            {filteredIncidents.map((incident, index) => (
              <React.Fragment key={incident.id}>
                <ListItem
                  button
                  onClick={() => setSelectedIncident(incident)}
                  selected={selectedIncident?.id === incident.id}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getPriorityColor(incident.priority) + '.main' }}>
                      {getSeverityIcon(incident.severity)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {incident.title}
                        </Typography>
                        <Box display="flex" gap={1}>
                          <Chip
                            label={incident.status.replace('_', ' ')}
                            color={getStatusColor(incident.status) as any}
                            size="small"
                          />
                          <Chip
                            label={incident.priority}
                            color={getPriorityColor(incident.priority) as any}
                            size="small"
                          />
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {incident.description}
                        </Typography>
                        <Box display="flex" gap={2} mt={1}>
                          {incident.site && (
                            <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                              <BusinessIcon fontSize="small" />
                              {incident.site.name}
                            </Typography>
                          )}
                          {incident.assignee && (
                            <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                              <PersonIcon fontSize="small" />
                              {incident.assignee.firstName} {incident.assignee.lastName}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Created: {new Date(incident.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {index < filteredIncidents.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </TabPanel>

        {/* Placeholder for other tabs */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6">Active Response - Coming Soon</Typography>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6">Escalations - Coming Soon</Typography>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6">Analytics - Coming Soon</Typography>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default IncidentResponsePage;