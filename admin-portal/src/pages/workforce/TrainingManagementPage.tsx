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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  LinearProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  School as TrainingIcon,
  WorkspacePremium as CertificateIcon,
  Assignment as AssignmentIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
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
      id={`training-tabpanel-${index}`}
      aria-labelledby={`training-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface Training {
  id: string;
  title: string;
  description?: string;
  type: 'ORIENTATION' | 'SAFETY' | 'TECHNICAL' | 'COMPLIANCE' | 'SOFT_SKILLS' | 'CERTIFICATION_PREP' | 'REFRESHER' | 'SPECIALIZED' | 'MANDATORY';
  category: string;
  duration: number;
  isRequired?: boolean;
  validityPeriod?: number;
  materials?: any[];
  prerequisites?: string[];
  createdBy?: string;
  isActive?: boolean;
  status?: string;
  instructor?: string;
  maxParticipants?: number;
  currentEnrollments?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  enrollments?: TrainingEnrollment[];
  completions?: TrainingCompletion[];
  assessments?: TrainingAssessment[];
}

interface TrainingEnrollment {
  id: string;
  trainingId: string;
  agentId: string;
  agentName: string;
  trainingTitle: string;
  enrolledBy?: string;
  status: 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  enrolledAt: string;
  enrollmentDate: string;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  progress: number;
  notes?: string;
  agent?: {
    id: string;
    employeeId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface TrainingCompletion {
  id: string;
  trainingId: string;
  agentId: string;
  score?: number;
  passed: boolean;
  completedAt: string;
  expiresAt?: string;
  certificateUrl?: string;
  notes?: string;
  agent: {
    id: string;
    employeeId: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

interface Certification {
  id: string;
  name: string;
  description?: string;
  issuingBody?: string;
  issuer: string;
  type: 'SECURITY_LICENSE' | 'FIRST_AID' | 'CPR' | 'FIRE_SAFETY' | 'TECHNICAL' | 'PROFESSIONAL' | 'REGULATORY' | 'INTERNAL';
  validityPeriod: number;
  requirements: any[];
  isActive?: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  agentCertifications?: AgentCertification[];
}

interface AgentCertification {
  id: string;
  agentId: string;
  certificationId: string;
  obtainedAt: string;
  expiresAt?: string;
  certificateNumber?: string;
  certificateUrl?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | 'PENDING_RENEWAL';
  notes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  agent: {
    id: string;
    employeeId: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  certification: {
    id: string;
    name: string;
    type: string;
  };
}

interface TrainingAssessment {
  id: string;
  title: string;
  score?: number;
  date?: string;
  // Ajoutez d'autres champs selon les besoins du projet
}

interface TrainingStats {
  overview: {
    totalTrainings: number;
    activeTrainings?: number;
    totalEnrollments: number;
    completionRate: number;
    averageScore: number;
    expiringSoon?: number;
    totalCertifications?: number;
    activeCertifications?: number;
  };
  metrics?: any;
  recentActivity?: any;
}

const TrainingManagementPage: React.FC = () => {
  const { user } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [agentCertifications, setAgentCertifications] = useState<AgentCertification[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [createTrainingDialogOpen, setCreateTrainingDialogOpen] = useState(false);
  const [editTrainingDialogOpen, setEditTrainingDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [createCertificationDialogOpen, setCreateCertificationDialogOpen] = useState(false);
  const [enrollmentActionDialogOpen, setEnrollmentActionDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<TrainingEnrollment | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Form states
  const [newTraining, setNewTraining] = useState({
    title: '',
    description: '',
    type: 'TECHNICAL' as const,
    category: '',
    duration: 1,
    isRequired: false,
    validityPeriod: 12,
    prerequisites: [] as string[],
    maxParticipants: 20,
    instructor: '',
  });

  const [editTraining, setEditTraining] = useState({
    id: '',
    title: '',
    description: '',
    type: 'TECHNICAL' as 'ORIENTATION' | 'SAFETY' | 'TECHNICAL' | 'COMPLIANCE' | 'SOFT_SKILLS' | 'CERTIFICATION_PREP' | 'REFRESHER' | 'SPECIALIZED' | 'MANDATORY',
    category: '',
    duration: 1,
    isRequired: false,
    validityPeriod: 12,
    prerequisites: [] as string[],
    maxParticipants: 20,
    instructor: '',
  });

  const [newCertification, setNewCertification] = useState({
    name: '',
    description: '',
    issuingBody: '',
    type: 'INTERNAL' as const,
    validityPeriod: 12,
    requirements: [] as string[],
  });

  const [enrollmentData, setEnrollmentData] = useState({
    agentIds: [] as string[],
    dueDate: '',
    notes: '',
  });

  // Data fetching functions
  const fetchTrainingData = useCallback(async () => {
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
      console.debug(`Loading training data with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      const [trainingsResponse, enrollmentsResponse, certificationsResponse, agentCertificationsResponse, statsResponse] = await Promise.all([
        (adminAPI as any).getTrainingPrograms?.() || adminAPI.getTrainingRecords(),
        adminAPI.getTrainingRecords(),
        (adminAPI as any).getTrainingCertifications?.() || adminAPI.getTrainingRecords(),
        (adminAPI as any).getTrainingCertifications?.() || adminAPI.getTrainingRecords(),
        adminAPI.getAnalytics({ type: 'training-stats' })
      ]);

      setTrainings((trainingsResponse.data as any) || []);
      setEnrollments((enrollmentsResponse.data as any) || []);
      setCertifications((certificationsResponse.data as any) || []);
      setAgentCertifications((agentCertificationsResponse.data as any) || []);
      setStats((statsResponse.data as any) || {
        overview: {
          totalTrainings: 0,
          activeTrainings: 0,
          totalEnrollments: 0,
          completionRate: 0,
          averageScore: 0,
          expiringSoon: 0,
          totalCertifications: 0,
          activeCertifications: 0,
        }
      });
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Failed to fetch training data:', err);
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view training data.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error occurred. Please try again.');
      } else {
        setError('Failed to load training data. Please check your connection and try again.');
      }
      setTrainings([]);
      setEnrollments([]);
      setCertifications([]);
      setAgentCertifications([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTraining = async () => {
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
      console.debug(`Creating training with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      await adminAPI.createTrainingProgram({
        ...newTraining,
        createdBy: user?.id,
      });

      setCreateTrainingDialogOpen(false);
      setNewTraining({
        title: '',
        description: '',
        type: 'TECHNICAL',
        category: '',
        duration: 1,
        isRequired: false,
        validityPeriod: 12,
        prerequisites: [],
        maxParticipants: 20,
        instructor: '',
      });
      fetchTrainingData();

    } catch (err: any) {
      console.error('Failed to create training:', err);
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to create trainings.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error occurred. Please try again.');
      } else {
        setError('Failed to create training. Please try again.');
      }
    }
  };

  const editTrainingProgram = (training: Training) => {
    setEditTraining({
      id: training.id,
      title: training.title,
      description: training.description || '',
      type: training.type,
      category: training.category,
      duration: training.duration,
      isRequired: training.isRequired || false,
      validityPeriod: training.validityPeriod || 12,
      prerequisites: training.prerequisites || [],
      maxParticipants: training.maxParticipants || 20,
      instructor: training.instructor || '',
    });
    setEditTrainingDialogOpen(true);
  };

  const updateTraining = async () => {
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
      console.debug(`Updating training with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      await adminAPI.updateTrainingProgram(editTraining.id, {
        ...editTraining,
        updatedBy: user?.id,
      });

      setEditTrainingDialogOpen(false);
      fetchTrainingData();

    } catch (err: any) {
      console.error('Failed to update training:', err);
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to update trainings.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error occurred. Please try again.');
      } else {
        setError('Failed to update training. Please try again.');
      }
    }
  };

  const enrollAgents = async () => {
    if (!selectedTraining) return;

    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    try {
      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Enrolling agents with ${tokenInfo.type} token`);

      // Use centralized API for bulk enrollment
      for (const agentId of enrollmentData.agentIds) {
        await adminAPI.assignTrainingToAgent(agentId, selectedTraining.id);
      }

      setEnrollDialogOpen(false);
      setEnrollmentData({
        agentIds: [],
        dueDate: '',
        notes: '',
      });
      fetchTrainingData();

    } catch (err: any) {
      console.error('Failed to enroll agents:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else {
        setError('Failed to enroll agents. Please try again.');
      }
    }
  };

  const handleEnrollmentAction = (enrollment: TrainingEnrollment) => {
    setSelectedEnrollment(enrollment);
    setEnrollmentActionDialogOpen(true);
  };

  const updateEnrollmentStatus = async (status: string) => {
    if (!selectedEnrollment) return;

    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    try {
      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Updating enrollment status with ${tokenInfo.type} token`);

      // Note: Training enrollment update endpoint would need to be added to adminAPI
      // For now, we'll simulate the update
      console.log(`Would update enrollment ${selectedEnrollment.id} to status: ${status}`);

      setEnrollmentActionDialogOpen(false);
      setSelectedEnrollment(null);
      fetchTrainingData();

    } catch (err: any) {
      console.error('Failed to update enrollment status:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else {
        setError('Failed to update enrollment status. Please try again.');
      }
    }
  };

  const deleteEnrollment = async () => {
    if (!selectedEnrollment) return;

    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    try {
      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Deleting enrollment with ${tokenInfo.type} token`);

      // Note: Training enrollment delete endpoint would need to be added to adminAPI
      // For now, we'll simulate the deletion
      console.log(`Would delete enrollment ${selectedEnrollment.id}`);

      setEnrollmentActionDialogOpen(false);
      setSelectedEnrollment(null);
      fetchTrainingData();

    } catch (err: any) {
      console.error('Failed to delete enrollment:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else {
        setError('Failed to delete enrollment. Please try again.');
      }
    }
  };

  // Utility functions
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ORIENTATION':
        return 'primary';
      case 'SAFETY':
        return 'error';
      case 'TECHNICAL':
        return 'info';
      case 'COMPLIANCE':
        return 'warning';
      case 'CERTIFICATION_PREP':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'ENROLLED':
        return 'default';
      case 'FAILED':
        return 'error';
      case 'EXPIRED':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getCertificationStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRED':
        return 'error';
      case 'PENDING_RENEWAL':
        return 'warning';
      case 'SUSPENDED':
        return 'warning';
      case 'REVOKED':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredTrainings = trainings.filter(training => {
    if (filterType !== 'all' && training.type !== filterType) return false;
    if (searchQuery && !training.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !training.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredEnrollments = enrollments.filter(enrollment => {
    if (filterStatus !== 'all' && enrollment.status !== filterStatus) return false;
    if (searchQuery &&
      !enrollment.agentName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(enrollment.agent?.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || false) &&
      !(enrollment.agent?.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) || false) &&
      !(enrollment.agent?.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) || false)) return false;
    return true;
  });

  // Effects
  useEffect(() => {
    fetchTrainingData();
  }, [fetchTrainingData]);

  // Loading state
  if (loading && trainings.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Training Data...
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
            Training & Certification Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Course management, certification tracking, and skill development
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
            onClick={fetchTrainingData}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={() => setCreateTrainingDialogOpen(true)}
            startIcon={<AddIcon />}
          >
            Create Training
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
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <TrainingIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{stats.overview.totalTrainings}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Trainings
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <AssignmentIcon color="info" />
                  <Box>
                    <Typography variant="h6">{stats.overview.totalEnrollments}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Enrollments
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <CompleteIcon color="success" />
                  <Box>
                    <Typography variant="h6">{stats.overview.completionRate}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completion Rate
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <CertificateIcon color="warning" />
                  <Box>
                    <Typography variant="h6">{stats.overview.activeCertifications || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Certifications
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
          <Tab label="Training Programs" />
          <Tab label="Enrollments" />
          <Tab label="Certifications" />
          <Tab label="Analytics" />
        </Tabs>

        {/* Training Programs Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box display="flex" gap={2} mb={3} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="ORIENTATION">Orientation</MenuItem>
                <MenuItem value="SAFETY">Safety</MenuItem>
                <MenuItem value="TECHNICAL">Technical</MenuItem>
                <MenuItem value="COMPLIANCE">Compliance</MenuItem>
                <MenuItem value="CERTIFICATION_PREP">Certification Prep</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="Search trainings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
              sx={{ minWidth: 200 }}
            />
          </Box>

          <Typography variant="h6" gutterBottom>
            Training Programs ({filteredTrainings.length})
          </Typography>

          <Grid container spacing={3}>
            {filteredTrainings.map((training) => (
              <Grid item xs={12} md={6} lg={4} key={training.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" gutterBottom>
                        {training.title}
                      </Typography>
                      <Chip
                        label={training.type.replace('_', ' ')}
                        color={getTypeColor(training.type) as any}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {training.description}
                    </Typography>
                    <Box display="flex" gap={1} mb={2}>
                      <Chip label={`${training.duration}h`} size="small" variant="outlined" />
                      {training.isRequired && (
                        <Chip label="Required" color="error" size="small" />
                      )}
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {training.enrollments?.length || 0} enrolled
                      </Typography>
                      <Box>
                        <Tooltip title="Enroll Agents">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedTraining(training);
                              setEnrollDialogOpen(true);
                            }}
                          >
                            <GroupIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Training">
                          <IconButton
                            size="small"
                            onClick={() => editTrainingProgram(training)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Enrollments Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Training Enrollments
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Manage agent enrollments and track progress
            </Typography>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Agent</TableCell>
                  <TableCell>Training</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Enrolled Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {enrollment.agentName.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Typography variant="body2">
                          {enrollment.agentName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{enrollment.trainingTitle}</TableCell>
                    <TableCell>
                      <Chip
                        label={enrollment.status}
                        color={
                          enrollment.status === 'COMPLETED' ? 'success' :
                            enrollment.status === 'IN_PROGRESS' ? 'primary' :
                              enrollment.status === 'ENROLLED' ? 'info' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={enrollment.progress}
                          sx={{ width: 100 }}
                        />
                        <Typography variant="caption">
                          {enrollment.progress}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Manage Enrollment">
                          <IconButton
                            size="small"
                            onClick={() => handleEnrollmentAction(enrollment)}
                          >
                            <SettingsIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Certifications Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Certifications Management
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Manage available certifications and requirements
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {certifications.map((certification) => (
              <Grid item xs={12} md={6} lg={4} key={certification.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {certification.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {certification.description}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Issuer: {certification.issuer}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Valid for: {certification.validityPeriod} days
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Requirements: {certification.requirements.length} items
                      </Typography>
                    </Box>
                    <Chip
                      label={certification.status}
                      color={certification.status === 'ACTIVE' ? 'success' : 'default'}
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Training Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Training performance metrics and insights
            </Typography>
          </Box>

          {stats && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {stats.overview.totalTrainings}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Trainings
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="success.main">
                      {stats.overview.totalEnrollments}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Enrollments
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="info.main">
                      {stats.overview.completionRate}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completion Rate
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="warning.main">
                      {stats.overview.averageScore}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average Score
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>
      </Paper>

      {/* Create Training Dialog */}
      <Dialog
        open={createTrainingDialogOpen}
        onClose={() => setCreateTrainingDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Training</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Training Title"
                  value={newTraining.title}
                  onChange={(e) => setNewTraining({ ...newTraining, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={newTraining.description}
                  onChange={(e) => setNewTraining({ ...newTraining, description: e.target.value })}
                  multiline
                  rows={3}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newTraining.type}
                    onChange={(e) => setNewTraining({ ...newTraining, type: e.target.value as any })}
                    label="Type"
                  >
                    <MenuItem value="TECHNICAL">Technical</MenuItem>
                    <MenuItem value="SAFETY">Safety</MenuItem>
                    <MenuItem value="COMPLIANCE">Compliance</MenuItem>
                    <MenuItem value="SOFT_SKILLS">Soft Skills</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Category"
                  value={newTraining.category}
                  onChange={(e) => setNewTraining({ ...newTraining, category: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={newTraining.duration}
                  onChange={(e) => setNewTraining({ ...newTraining, duration: parseInt(e.target.value) || 0 })}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max Participants"
                  type="number"
                  value={newTraining.maxParticipants}
                  onChange={(e) => setNewTraining({ ...newTraining, maxParticipants: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Instructor"
                  value={newTraining.instructor}
                  onChange={(e) => setNewTraining({ ...newTraining, instructor: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTrainingDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={createTraining}
            variant="contained"
            disabled={!newTraining.title || !newTraining.description}
          >
            Create Training
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Training Dialog */}
      <Dialog
        open={editTrainingDialogOpen}
        onClose={() => setEditTrainingDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Training</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Training Title"
                  value={editTraining.title}
                  onChange={(e) => setEditTraining({ ...editTraining, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={editTraining.description}
                  onChange={(e) => setEditTraining({ ...editTraining, description: e.target.value })}
                  multiline
                  rows={3}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={editTraining.type}
                    onChange={(e) => setEditTraining({ ...editTraining, type: e.target.value as any })}
                    label="Type"
                  >
                    <MenuItem value="TECHNICAL">Technical</MenuItem>
                    <MenuItem value="SAFETY">Safety</MenuItem>
                    <MenuItem value="COMPLIANCE">Compliance</MenuItem>
                    <MenuItem value="SOFT_SKILLS">Soft Skills</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Category"
                  value={editTraining.category}
                  onChange={(e) => setEditTraining({ ...editTraining, category: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={editTraining.duration}
                  onChange={(e) => setEditTraining({ ...editTraining, duration: parseInt(e.target.value) || 0 })}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max Participants"
                  type="number"
                  value={editTraining.maxParticipants}
                  onChange={(e) => setEditTraining({ ...editTraining, maxParticipants: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Instructor"
                  value={editTraining.instructor}
                  onChange={(e) => setEditTraining({ ...editTraining, instructor: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTrainingDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={updateTraining}
            variant="contained"
            disabled={!editTraining.title || !editTraining.description}
          >
            Update Training
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enrollment Action Dialog */}
      <Dialog
        open={enrollmentActionDialogOpen}
        onClose={() => setEnrollmentActionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manage Enrollment</DialogTitle>
        <DialogContent>
          {selectedEnrollment && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedEnrollment.agentName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Training: {selectedEnrollment.trainingTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Status: {selectedEnrollment.status}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Progress: {selectedEnrollment.progress}%
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Update Status:
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => updateEnrollmentStatus('ENROLLED')}
                    disabled={selectedEnrollment.status === 'ENROLLED'}
                  >
                    Enrolled
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => updateEnrollmentStatus('IN_PROGRESS')}
                    disabled={selectedEnrollment.status === 'IN_PROGRESS'}
                  >
                    In Progress
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => updateEnrollmentStatus('COMPLETED')}
                    disabled={selectedEnrollment.status === 'COMPLETED'}
                  >
                    Completed
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => updateEnrollmentStatus('FAILED')}
                    disabled={selectedEnrollment.status === 'FAILED'}
                  >
                    Failed
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollmentActionDialogOpen(false)}>
            Close
          </Button>
          <Button
            onClick={deleteEnrollment}
            color="error"
            variant="outlined"
          >
            Delete Enrollment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrainingManagementPage;
