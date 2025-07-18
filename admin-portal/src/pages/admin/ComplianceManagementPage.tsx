import React, { useState, useEffect } from 'react';
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
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  FormGroup,
  Checkbox,
  RadioGroup,
  Radio,
  FormLabel,
  InputAdornment,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Shield as ShieldIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Notifications as NotificationsIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  AdminPanelSettings as AdminIcon,
  Group as GroupIcon,
  Computer as ComputerIcon,
  NetworkCheck as NetworkIcon,
  Https as HttpsIcon,
  Policy as PolicyIcon,
  Gavel as GavelIcon,
  VerifiedUser as VerifiedUserIcon,
  Report as ReportIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { format, parseISO, addDays, isAfter, isBefore } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI, complianceAPI } from '../../services/api';

interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'security' | 'privacy' | 'industry' | 'regulatory';
  status: 'active' | 'inactive' | 'pending';
  lastAssessment: string;
  nextAssessment: string;
  complianceScore: number;
  requirements: ComplianceRequirement[];
  certificationBody?: string;
  validUntil?: string;
}

interface ComplianceRequirement {
  id: string;
  frameworkId: string;
  code: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_assessed';
  evidence: Evidence[];
  assignedTo: string;
  dueDate: string;
  lastReview: string;
  notes: string;
}

interface Evidence {
  id: string;
  requirementId: string;
  type: 'document' | 'screenshot' | 'log' | 'certificate' | 'policy';
  title: string;
  description: string;
  fileName: string;
  uploadDate: string;
  uploadedBy: string;
  status: 'approved' | 'pending' | 'rejected';
  expiryDate?: string;
}

interface ComplianceAudit {
  id: string;
  name: string;
  type: 'internal' | 'external' | 'self_assessment';
  frameworks: string[];
  auditor: string;
  startDate: string;
  endDate: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  findings: AuditFinding[];
  overallScore: number;
  reportUrl?: string;
}

interface AuditFinding {
  id: string;
  auditId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  assignedTo: string;
  dueDate: string;
  evidence?: string[];
}

interface ComplianceReport {
  id: string;
  name: string;
  type: 'compliance_status' | 'gap_analysis' | 'audit_report' | 'certification';
  frameworks: string[];
  generatedDate: string;
  generatedBy: string;
  period: {
    start: string;
    end: string;
  };
  status: 'draft' | 'final' | 'submitted';
  fileUrl?: string;
}

// Compliance frameworks will be loaded from API

// Compliance requirements will be loaded from API

// Compliance audits will be loaded from API

// Compliance reports will be loaded from API

const ComplianceManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [audits, setAudits] = useState<ComplianceAudit[]>([]);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [frameworkDialogOpen, setFrameworkDialogOpen] = useState(false);
  const [requirementDialogOpen, setRequirementDialogOpen] = useState(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework | null>(null);
  const [selectedRequirement, setSelectedRequirement] = useState<ComplianceRequirement | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<ComplianceAudit | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFramework, setFilterFramework] = useState<string>('all');

  useEffect(() => {
    const loadComplianceData = async () => {
      // Check authentication availability first
      const authAvailable = await isAuthenticationAvailable();
      if (!authAvailable) {
        setError('Authentication not available. Please log in.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        setError(null);

        // Get current token info for debugging
        const tokenInfo = await getCurrentTokenInfo();
        console.debug(`Loading compliance data with ${tokenInfo.type} token`);

        // Use the enhanced API service (token automatically injected)
        const [frameworksResponse, requirementsResponse, auditsResponse, reportsResponse] = await Promise.all([
          adminAPI.getComplianceFrameworks?.() || Promise.resolve({ data: { data: [] } }),
          adminAPI.getComplianceRequirements?.() || Promise.resolve({ data: { data: [] } }),
          adminAPI.getComplianceAudits?.() || Promise.resolve({ data: { data: [] } }),
          complianceAPI.getComplianceReports?.() || Promise.resolve({ data: { data: [] } })
        ]);
        
        setFrameworks(frameworksResponse.data.data || []);
        setRequirements(requirementsResponse.data.data || []);
        setAudits(auditsResponse.data.data || []);
        setReports(reportsResponse.data.data || []);
      } catch (err: any) {
        console.error('Failed to load compliance data:', err);
        setError(err.response?.data?.message || 'Failed to load compliance data');
      } finally {
        setLoading(false);
      }
    };

    loadComplianceData();
  }, []);

  const handleGenerateReport = async (type: string) => {
    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    setLoading(true);
    try {
      setError(null);

      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Generating ${type} report with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      const response = await complianceAPI.generateComplianceReport?.({ type }) || 
                      await adminAPI.createReport({ type, category: 'compliance' });
      
      setSuccess(`${type} report generated successfully`);
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleFrameworkToggle = (frameworkId: string) => {
    setFrameworks(frameworks.map(framework => 
      framework.id === frameworkId 
        ? { ...framework, status: framework.status === 'active' ? 'inactive' : 'active' }
        : framework
    ));
  };

  const handleRequirementStatusUpdate = (requirementId: string, status: string) => {
    setRequirements(requirements.map(req => 
      req.id === requirementId 
        ? { ...req, status: status as any }
        : req
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'active':
      case 'completed':
      case 'approved':
        return 'success';
      case 'non_compliant':
      case 'inactive':
      case 'cancelled':
      case 'rejected':
        return 'error';
      case 'partial':
      case 'pending':
      case 'in_progress':
      case 'scheduled':
        return 'warning';
      case 'not_assessed':
      case 'draft':
        return 'default';
      default:
        return 'default';
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

  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 75) return 'warning';
    return 'error';
  };

  const activeFrameworks = frameworks.filter(f => f.status === 'active').length;
  const totalRequirements = requirements.length;
  const compliantRequirements = requirements.filter(r => r.status === 'compliant').length;
  const overallComplianceScore = totalRequirements > 0 ? Math.round((compliantRequirements / totalRequirements) * 100) : 0;
  const upcomingAudits = audits.filter(a => a.status === 'scheduled' && isAfter(parseISO(a.startDate), new Date())).length;

  const filteredRequirements = requirements.filter(req => {
    if (filterStatus !== 'all' && req.status !== filterStatus) return false;
    if (filterFramework !== 'all' && req.frameworkId !== filterFramework) return false;
    return true;
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Compliance Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and manage compliance with regulatory frameworks and standards
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<ReportIcon />}
            onClick={() => handleGenerateReport('Compliance Status')}
            disabled={loading}
          >
            Generate Report
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
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
                    Active Frameworks
                  </Typography>
                  <Typography variant="h4">
                    {activeFrameworks}
                  </Typography>
                </Box>
                <PolicyIcon color="primary" sx={{ fontSize: 40 }} />
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
                    Overall Compliance
                  </Typography>
                  <Typography variant="h4" color={getComplianceScoreColor(overallComplianceScore)}>
                    {overallComplianceScore}%
                  </Typography>
                </Box>
                <AssessmentIcon color={getComplianceScoreColor(overallComplianceScore) as any} sx={{ fontSize: 40 }} />
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
                    Compliant Requirements
                  </Typography>
                  <Typography variant="h4">
                    {compliantRequirements}/{totalRequirements}
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
                    Upcoming Audits
                  </Typography>
                  <Typography variant="h4">
                    {upcomingAudits}
                  </Typography>
                </Box>
                <ScheduleIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Frameworks" />
            <Tab label="Requirements" />
            <Tab label="Audits" />
            <Tab label="Reports" />
            <Tab label="Dashboard" />
          </Tabs>
        </Box>

        {/* Frameworks Tab */}
        {tabValue === 0 && (
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setFrameworkDialogOpen(true)}
              >
                Add Framework
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              {frameworks.map((framework) => (
                <Grid item xs={12} md={6} lg={4} key={framework.id}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {framework.name}
                          </Typography>
                          <Chip
                            label={framework.status}
                            color={getStatusColor(framework.status) as any}
                            size="small"
                          />
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedFramework(framework);
                            setFrameworkDialogOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {framework.description}
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          Compliance Score
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={framework.complianceScore}
                            color={getComplianceScoreColor(framework.complianceScore) as any}
                            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="body2" color={getComplianceScoreColor(framework.complianceScore)}>
                            {framework.complianceScore}%
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Last Assessment: {format(parseISO(framework.lastAssessment), 'MMM dd, yyyy')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Next Assessment: {format(parseISO(framework.nextAssessment), 'MMM dd, yyyy')}
                        </Typography>
                        {framework.validUntil && (
                          <Typography variant="body2" color="text.secondary">
                            Valid Until: {format(parseISO(framework.validUntil), 'MMM dd, yyyy')}
                          </Typography>
                        )}
                      </Box>
                      
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleFrameworkToggle(framework.id)}
                        >
                          {framework.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AssessmentIcon />}
                        >
                          Assess
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        )}

        {/* Requirements Tab */}
        {tabValue === 1 && (
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    label="Status"
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="compliant">Compliant</MenuItem>
                    <MenuItem value="non_compliant">Non-Compliant</MenuItem>
                    <MenuItem value="partial">Partial</MenuItem>
                    <MenuItem value="not_assessed">Not Assessed</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Framework</InputLabel>
                  <Select
                    value={filterFramework}
                    label="Framework"
                    onChange={(e) => setFilterFramework(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    {frameworks.map((framework) => (
                      <MenuItem key={framework.id} value={framework.id}>
                        {framework.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setRequirementDialogOpen(true)}
              >
                Add Requirement
              </Button>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Framework</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequirements.map((requirement) => {
                    const framework = frameworks.find(f => f.id === requirement.frameworkId);
                    return (
                      <TableRow key={requirement.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {requirement.code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2">
                              {requirement.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {requirement.category}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={framework?.name || 'Unknown'}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={requirement.priority}
                            color={getPriorityColor(requirement.priority) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={requirement.status}
                              onChange={(e) => handleRequirementStatusUpdate(requirement.id, e.target.value)}
                            >
                              <MenuItem value="compliant">Compliant</MenuItem>
                              <MenuItem value="non_compliant">Non-Compliant</MenuItem>
                              <MenuItem value="partial">Partial</MenuItem>
                              <MenuItem value="not_assessed">Not Assessed</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {requirement.assignedTo}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(parseISO(requirement.dueDate), 'MMM dd, yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedRequirement(requirement);
                                  setRequirementDialogOpen(true);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View Evidence">
                              <IconButton size="small">
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Audits Tab */}
        {tabValue === 2 && (
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAuditDialogOpen(true)}
              >
                Schedule Audit
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              {audits.map((audit) => (
                <Grid item xs={12} md={6} key={audit.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {audit.name}
                          </Typography>
                          <Chip
                            label={audit.status.replace('_', ' ')}
                            color={getStatusColor(audit.status) as any}
                            size="small"
                          />
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedAudit(audit);
                            setAuditDialogOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Type: {audit.type.replace('_', ' ')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Auditor: {audit.auditor}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Period: {format(parseISO(audit.startDate), 'MMM dd')} - {format(parseISO(audit.endDate), 'MMM dd, yyyy')}
                      </Typography>
                      
                      {audit.status === 'completed' && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            Overall Score: {audit.overallScore}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={audit.overallScore}
                            color={getComplianceScoreColor(audit.overallScore) as any}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      )}
                      
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        {audit.reportUrl && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                          >
                            Download Report
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                        >
                          View Details
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        )}

        {/* Reports Tab */}
        {tabValue === 3 && (
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Compliance Reports
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<ReportIcon />}
                  onClick={() => handleGenerateReport('Gap Analysis')}
                >
                  Generate Gap Analysis
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ReportIcon />}
                  onClick={() => handleGenerateReport('Compliance Status')}
                >
                  Generate Status Report
                </Button>
              </Box>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Report Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Frameworks</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Generated</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {report.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={report.type.replace('_', ' ')}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {report.frameworks.map((frameworkId) => {
                            const framework = frameworks.find(f => f.id === frameworkId);
                            return (
                              <Chip
                                key={frameworkId}
                                label={framework?.name || 'Unknown'}
                                size="small"
                                variant="outlined"
                              />
                            );
                          })}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(parseISO(report.period.start), 'MMM dd')} - {format(parseISO(report.period.end), 'MMM dd, yyyy')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(parseISO(report.generatedDate), 'MMM dd, yyyy')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          by {report.generatedBy}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={report.status}
                          color={getStatusColor(report.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {report.fileUrl && (
                            <Tooltip title="Download">
                              <IconButton size="small">
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="View">
                            <IconButton size="small">
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Dashboard Tab */}
        {tabValue === 4 && (
          <CardContent>
            <Grid container spacing={3}>
              {/* Compliance Overview */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Compliance Overview
                    </Typography>
                    {frameworks.map((framework) => (
                      <Box key={framework.id} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2">
                            {framework.name}
                          </Typography>
                          <Typography variant="body2" color={getComplianceScoreColor(framework.complianceScore)}>
                            {framework.complianceScore}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={framework.complianceScore}
                          color={getComplianceScoreColor(framework.complianceScore) as any}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>

              {/* Upcoming Deadlines */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Upcoming Deadlines
                    </Typography>
                    <List dense>
                      {requirements
                        .filter(req => isAfter(parseISO(req.dueDate), new Date()))
                        .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())
                        .slice(0, 5)
                        .map((requirement) => {
                          const framework = frameworks.find(f => f.id === requirement.frameworkId);
                          const isOverdue = isBefore(parseISO(requirement.dueDate), new Date());
                          return (
                            <ListItem key={requirement.id}>
                              <ListItemText
                                primary={requirement.title}
                                secondary={
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      {framework?.name} - {requirement.code}
                                    </Typography>
                                    <br />
                                    <Typography variant="caption" color={isOverdue ? 'error' : 'text.secondary'}>
                                      Due: {format(parseISO(requirement.dueDate), 'MMM dd, yyyy')}
                                    </Typography>
                                  </Box>
                                }
                              />
                              <ListItemSecondaryAction>
                                <Chip
                                  label={requirement.priority}
                                  color={getPriorityColor(requirement.priority) as any}
                                  size="small"
                                />
                              </ListItemSecondaryAction>
                            </ListItem>
                          );
                        })}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Recent Audits */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recent Audit Activity
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Audit Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Score</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {audits.slice(0, 5).map((audit) => (
                            <TableRow key={audit.id}>
                              <TableCell>{audit.name}</TableCell>
                              <TableCell>
                                <Chip
                                  label={audit.type.replace('_', ' ')}
                                  variant="outlined"
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={audit.status.replace('_', ' ')}
                                  color={getStatusColor(audit.status) as any}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                {audit.status === 'completed' ? `${audit.overallScore}%` : '-'}
                              </TableCell>
                              <TableCell>
                                {format(parseISO(audit.startDate), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell>
                                <Button size="small" variant="outlined">
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        )}
      </Card>

      {/* Framework Dialog */}
      <Dialog
        open={frameworkDialogOpen}
        onClose={() => setFrameworkDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedFramework ? 'Edit Compliance Framework' : 'Add New Compliance Framework'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Framework Name"
                defaultValue={selectedFramework?.name || ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Version"
                defaultValue={selectedFramework?.version || ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                defaultValue={selectedFramework?.description || ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  defaultValue={selectedFramework?.category || 'security'}
                  label="Category"
                >
                  <MenuItem value="security">Security</MenuItem>
                  <MenuItem value="privacy">Privacy</MenuItem>
                  <MenuItem value="industry">Industry</MenuItem>
                  <MenuItem value="regulatory">Regulatory</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Certification Body"
                defaultValue={selectedFramework?.certificationBody || ''}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFrameworkDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setFrameworkDialogOpen(false)}>
            {selectedFramework ? 'Update' : 'Add'} Framework
          </Button>
        </DialogActions>
      </Dialog>

      {/* Requirement Dialog */}
      <Dialog
        open={requirementDialogOpen}
        onClose={() => setRequirementDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRequirement ? 'Edit Compliance Requirement' : 'Add New Compliance Requirement'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Framework</InputLabel>
                <Select
                  defaultValue={selectedRequirement?.frameworkId || ''}
                  label="Framework"
                >
                  {frameworks.map((framework) => (
                    <MenuItem key={framework.id} value={framework.id}>
                      {framework.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Requirement Code"
                defaultValue={selectedRequirement?.code || ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                defaultValue={selectedRequirement?.title || ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                defaultValue={selectedRequirement?.description || ''}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Category"
                defaultValue={selectedRequirement?.category || ''}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  defaultValue={selectedRequirement?.priority || 'medium'}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Assigned To"
                defaultValue={selectedRequirement?.assignedTo || ''}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequirementDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setRequirementDialogOpen(false)}>
            {selectedRequirement ? 'Update' : 'Add'} Requirement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Audit Dialog */}
      <Dialog
        open={auditDialogOpen}
        onClose={() => setAuditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedAudit ? 'Edit Audit' : 'Schedule New Audit'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Audit Name"
                defaultValue={selectedAudit?.name || ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Audit Type</InputLabel>
                <Select
                  defaultValue={selectedAudit?.type || 'internal'}
                  label="Audit Type"
                >
                  <MenuItem value="internal">Internal</MenuItem>
                  <MenuItem value="external">External</MenuItem>
                  <MenuItem value="self_assessment">Self Assessment</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Auditor"
                defaultValue={selectedAudit?.auditor || ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                defaultValue={selectedAudit ? format(parseISO(selectedAudit.startDate), 'yyyy-MM-dd') : ''}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                defaultValue={selectedAudit ? format(parseISO(selectedAudit.endDate), 'yyyy-MM-dd') : ''}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setAuditDialogOpen(false)}>
            {selectedAudit ? 'Update' : 'Schedule'} Audit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplianceManagementPage;