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
  Avatar,
  CardActions,
  CardHeader,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
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
  Api as ApiIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Sync as SyncIcon,
  SyncProblem as SyncProblemIcon,
  Power as PowerIcon,
  PowerOff as PowerOffIcon,
  Code as CodeIcon,
  Key as KeyIcon,
  VpnKey as VpnKeyIcon,
  Token as TokenIcon,
  Http as WebhookIcon,
  IntegrationInstructions as IntegrationIcon,
  ConnectedTv as ConnectedIcon,
  Cable as CableIcon,
  Router as RouterIcon,
  Hub as HubIcon,
  Extension as ExtensionIcon,
  Apps as AppsIcon,
  AccountTree as AccountTreeIcon,
  DataObject as DataObjectIcon,
  Transform as TransformIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { format, parseISO, addDays, isAfter, isBefore } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'communication' | 'analytics' | 'hr' | 'finance' | 'operations' | 'monitoring';
  provider: string;
  version: string;
  status: 'active' | 'inactive' | 'error' | 'pending' | 'configuring';
  lastSync: string;
  nextSync?: string;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  configuration: IntegrationConfig;
  endpoints: IntegrationEndpoint[];
  webhooks: Webhook[];
  apiUsage: ApiUsage;
  logs: IntegrationLog[];
  icon?: string;
  documentationUrl?: string;
  supportUrl?: string;
}

interface IntegrationConfig {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  authType: 'api_key' | 'oauth2' | 'basic_auth' | 'bearer_token';
  credentials: Record<string, any>;
  settings: Record<string, any>;
  mappings: FieldMapping[];
  filters: DataFilter[];
}

interface IntegrationEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  description: string;
  enabled: boolean;
  lastCalled?: string;
  responseTime?: number;
  successRate: number;
}

interface Webhook {
  id: string;
  integrationId: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
  lastTriggered?: string;
  deliveryAttempts: number;
  successfulDeliveries: number;
  failedDeliveries: number;
}

interface ApiUsage {
  requestsToday: number;
  requestsThisMonth: number;
  requestLimit: number;
  rateLimitRemaining: number;
  rateLimitReset: string;
  averageResponseTime: number;
  errorRate: number;
}

interface IntegrationLog {
  id: string;
  integrationId: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  details?: Record<string, any>;
  endpoint?: string;
  responseCode?: number;
  responseTime?: number;
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  required: boolean;
}

interface DataFilter {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
  value: string;
  enabled: boolean;
}

interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  icon: string;
  features: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedSetupTime: string;
  documentation: string;
  popular: boolean;
}

// Initialize empty data - will be loaded from API

// Integration templates will be loaded from API

// Integration logs will be loaded from API

const IntegrationsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [templates, setTemplates] = useState<IntegrationTemplate[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<IntegrationTemplate | null>(null);

  // Load data from APIs
  useEffect(() => {
    const loadIntegrationsData = async () => {
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
        console.debug(`Loading integrations data with ${tokenInfo.type} token`);

        // Use the enhanced API service (token automatically injected)
        const [integrationsResponse, templatesResponse, logsResponse] = await Promise.all([
          adminAPI.getIntegrations?.() || Promise.resolve({ data: { data: [] } }),
          adminAPI.getIntegrationTemplates?.() || Promise.resolve({ data: { data: [] } }),
          adminAPI.getIntegrationLogs?.() || Promise.resolve({ data: { data: [] } })
        ]);
        
        setIntegrations(integrationsResponse.data.data || []);
        setTemplates(templatesResponse.data.data || []);
        setLogs(logsResponse.data.data || []);
      } catch (error: any) {
        console.error('Failed to load integrations data:', error);
        setError(error.response?.data?.message || 'Failed to load integrations data');
      } finally {
        setLoading(false);
      }
    };

    loadIntegrationsData();
  }, []);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleIntegration = async (integrationId: string) => {
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
      console.debug(`Toggling integration ${integrationId} with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      const integration = integrations.find(i => i.id === integrationId);
      const newStatus = integration?.status === 'active' ? 'inactive' : 'active';
      
      await adminAPI.updateIntegrationSettings?.({ integrationId, status: newStatus }) ||
            adminAPI.updateAgent(integrationId, { status: newStatus });

      setIntegrations(integrations.map(integration => 
        integration.id === integrationId 
          ? { 
              ...integration, 
              status: newStatus as any,
              lastSync: newStatus === 'active' ? new Date().toISOString() : integration.lastSync
            }
          : integration
      ));
      setSuccess('Integration status updated successfully');
    } catch (err: any) {
      console.error('Failed to update integration status:', err);
      setError(err.response?.data?.message || 'Failed to update integration status');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncIntegration = async (integrationId: string) => {
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
      console.debug(`Syncing integration ${integrationId} with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      await adminAPI.updateAgent?.(integrationId, { lastSync: new Date().toISOString() }) ||
            adminAPI.updateAgent(integrationId, { lastSync: new Date().toISOString() });

      setIntegrations(integrations.map(integration => 
        integration.id === integrationId 
          ? { ...integration, lastSync: new Date().toISOString() }
          : integration
      ));
      setSuccess('Integration synced successfully');
    } catch (err: any) {
      console.error('Failed to sync integration:', err);
      setError(err.response?.data?.message || 'Failed to sync integration');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallTemplate = async (template: IntegrationTemplate) => {
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
      console.debug(`Installing integration template with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      const response = await adminAPI.installIntegrationTemplate?.(template) ||
                       await adminAPI.createIntegration({
                         name: template.name,
                         description: template.description,
                         category: template.category,
                         provider: template.provider,
                         version: '1.0',
                         status: 'configuring'
                       });

      const newIntegration: Integration = response.data.data || {
        id: Date.now().toString(),
        name: template.name,
        description: template.description,
        category: template.category as any,
        provider: template.provider,
        version: '1.0',
        status: 'configuring',
        lastSync: new Date().toISOString(),
        syncFrequency: 'manual',
        configuration: {
          authType: 'api_key',
          credentials: {},
          settings: {},
          mappings: [],
          filters: [],
        },
        endpoints: [],
        webhooks: [],
        apiUsage: {
          requestsToday: 0,
          requestsThisMonth: 0,
          requestLimit: 1000,
          rateLimitRemaining: 1000,
          rateLimitReset: '2024-02-01T00:00:00Z',
          averageResponseTime: 0,
          errorRate: 0,
        },
        logs: [],
        icon: template.icon,
        documentationUrl: template.documentation,
      };
      setIntegrations([...integrations, newIntegration]);
      setSuccess(`${template.name} integration installed successfully`);
    } catch (err) {
      setError('Failed to install integration');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'error': return 'error';
      case 'pending': return 'warning';
      case 'configuring': return 'info';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return <SecurityIcon />;
      case 'communication': return <NotificationsIcon />;
      case 'analytics': return <AssessmentIcon />;
      case 'hr': return <GroupIcon />;
      case 'finance': return <BusinessIcon />;
      case 'operations': return <SettingsIcon />;
      case 'monitoring': return <NetworkIcon />;
      default: return <ExtensionIcon />;
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'success';
      case 'moderate': return 'warning';
      case 'complex': return 'error';
      default: return 'default';
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    if (filterCategory !== 'all' && integration.category !== filterCategory) return false;
    if (filterStatus !== 'all' && integration.status !== filterStatus) return false;
    if (searchQuery && !integration.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredTemplates = templates.filter(template => {
    if (filterCategory !== 'all' && template.category !== filterCategory) return false;
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activeIntegrations = integrations.filter(i => i.status === 'active').length;
  const totalApiCalls = integrations.reduce((sum, i) => sum + i.apiUsage.requestsToday, 0);
  const averageResponseTime = integrations.length > 0 
    ? Math.round(integrations.reduce((sum, i) => sum + i.apiUsage.averageResponseTime, 0) / integrations.length)
    : 0;
  const errorIntegrations = integrations.filter(i => i.status === 'error').length;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Integrations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage third-party integrations and API connections
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
            startIcon={<AddIcon />}
            onClick={() => setIntegrationDialogOpen(true)}
          >
            Add Integration
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
                    Active Integrations
                  </Typography>
                  <Typography variant="h4">
                    {activeIntegrations}
                  </Typography>
                </Box>
                <ConnectedIcon color="primary" sx={{ fontSize: 40 }} />
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
                    API Calls Today
                  </Typography>
                  <Typography variant="h4">
                    {totalApiCalls.toLocaleString()}
                  </Typography>
                </Box>
                <ApiIcon color="info" sx={{ fontSize: 40 }} />
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
                    Avg Response Time
                  </Typography>
                  <Typography variant="h4">
                    {averageResponseTime}ms
                  </Typography>
                </Box>
                <TimelineIcon color="success" sx={{ fontSize: 40 }} />
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
                    Integration Errors
                  </Typography>
                  <Typography variant="h4" color={errorIntegrations > 0 ? 'error' : 'text.primary'}>
                    {errorIntegrations}
                  </Typography>
                </Box>
                <ErrorIcon color={errorIntegrations > 0 ? 'error' : 'disabled'} sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Active Integrations" />
            <Tab label="Browse Templates" />
            <Tab label="API Logs" />
            <Tab label="Webhooks" />
            <Tab label="Settings" />
          </Tabs>
        </Box>

        {/* Active Integrations Tab */}
        {tabValue === 0 && (
          <CardContent>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 250 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  label="Category"
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="security">Security</MenuItem>
                  <MenuItem value="communication">Communication</MenuItem>
                  <MenuItem value="analytics">Analytics</MenuItem>
                  <MenuItem value="hr">HR</MenuItem>
                  <MenuItem value="finance">Finance</MenuItem>
                  <MenuItem value="operations">Operations</MenuItem>
                  <MenuItem value="monitoring">Monitoring</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="configuring">Configuring</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Grid container spacing={3}>
              {filteredIntegrations.map((integration) => (
                <Grid item xs={12} md={6} lg={4} key={integration.id}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardHeader
                      avatar={
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {integration.icon || getCategoryIcon(integration.category)}
                        </Avatar>
                      }
                      title={integration.name}
                      subheader={integration.provider}
                      action={
                        <Chip
                          label={integration.status}
                          color={getStatusColor(integration.status) as any}
                          size="small"
                        />
                      }
                    />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {integration.description}
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Last Sync:</strong> {format(parseISO(integration.lastSync), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Frequency:</strong> {integration.syncFrequency}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>API Calls Today:</strong> {integration.apiUsage.requestsToday}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Response Time:</strong> {integration.apiUsage.averageResponseTime}ms
                        </Typography>
                      </Box>
                      
                      {integration.status === 'error' && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          Integration has errors. Check logs for details.
                        </Alert>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        onClick={() => handleToggleIntegration(integration.id)}
                        disabled={loading}
                      >
                        {integration.status === 'active' ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleSyncIntegration(integration.id)}
                        disabled={loading || integration.status !== 'active'}
                      >
                        Sync Now
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setConfigDialogOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        )}

        {/* Browse Templates Tab */}
        {tabValue === 1 && (
          <CardContent>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 250 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  label="Category"
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="security">Security</MenuItem>
                  <MenuItem value="communication">Communication</MenuItem>
                  <MenuItem value="analytics">Analytics</MenuItem>
                  <MenuItem value="hr">HR</MenuItem>
                  <MenuItem value="finance">Finance</MenuItem>
                  <MenuItem value="operations">Operations</MenuItem>
                  <MenuItem value="monitoring">Monitoring</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Grid container spacing={3}>
              {filteredTemplates.map((template) => (
                <Grid item xs={12} md={6} lg={4} key={template.id}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardHeader
                      avatar={
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          {template.icon}
                        </Avatar>
                      }
                      title={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {template.name}
                          {template.popular && (
                            <Chip label="Popular" color="primary" size="small" />
                          )}
                        </Box>
                      }
                      subheader={template.provider}
                    />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {template.description}
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Complexity:</strong>
                          <Chip
                            label={template.complexity}
                            color={getComplexityColor(template.complexity) as any}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Setup Time:</strong> {template.estimatedSetupTime}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Features:</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {template.features.slice(0, 3).map((feature, index) => (
                            <Chip
                              key={index}
                              label={feature}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {template.features.length > 3 && (
                            <Chip
                              label={`+${template.features.length - 3} more`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleInstallTemplate(template)}
                        disabled={loading}
                      >
                        Install
                      </Button>
                      <Button
                        size="small"
                        href={template.documentation}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Documentation
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        )}

        {/* API Logs Tab */}
        {tabValue === 2 && (
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                API Activity Logs
              </Typography>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
              >
                Refresh Logs
              </Button>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Integration</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Endpoint</TableCell>
                    <TableCell>Response</TableCell>
                    <TableCell>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => {
                    const integration = integrations.find(i => i.id === log.integrationId);
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {format(parseISO(log.timestamp), 'MMM dd, HH:mm:ss')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {integration?.name || 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.level}
                            color={
                              log.level === 'error' ? 'error' :
                              log.level === 'warning' ? 'warning' :
                              log.level === 'info' ? 'info' : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.message}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {log.endpoint || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {log.responseCode && (
                            <Chip
                              label={log.responseCode}
                              color={
                                log.responseCode >= 200 && log.responseCode < 300 ? 'success' :
                                log.responseCode >= 400 ? 'error' : 'warning'
                              }
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.responseTime ? `${log.responseTime}ms` : '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Webhooks Tab */}
        {tabValue === 3 && (
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Webhook Management
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
              >
                Add Webhook
              </Button>
            </Box>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Webhooks allow external services to notify your system of events in real-time.
            </Alert>
            
            <Typography variant="body1" color="text.secondary">
              No webhooks configured yet. Add your first webhook to start receiving real-time notifications.
            </Typography>
          </CardContent>
        )}

        {/* Settings Tab */}
        {tabValue === 4 && (
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Integration Settings
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Global Settings
                    </Typography>
                    <FormGroup>
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Enable automatic retries for failed requests"
                      />
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Log all API requests and responses"
                      />
                      <FormControlLabel
                        control={<Switch />}
                        label="Send notifications for integration errors"
                      />
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Enable rate limiting protection"
                      />
                    </FormGroup>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Security Settings
                    </Typography>
                    <FormGroup>
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Require API key rotation every 90 days"
                      />
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Enable webhook signature verification"
                      />
                      <FormControlLabel
                        control={<Switch />}
                        label="Allow integration access from any IP"
                      />
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Encrypt stored credentials"
                      />
                    </FormGroup>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        )}
      </Card>

      {/* Configuration Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Configure {selectedIntegration?.name}
        </DialogTitle>
        <DialogContent>
          {selectedIntegration && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Integration Name"
                  defaultValue={selectedIntegration.name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Sync Frequency</InputLabel>
                  <Select
                    defaultValue={selectedIntegration.syncFrequency}
                    label="Sync Frequency"
                  >
                    <MenuItem value="realtime">Real-time</MenuItem>
                    <MenuItem value="hourly">Hourly</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="manual">Manual</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Authentication Type</InputLabel>
                  <Select
                    defaultValue={selectedIntegration.configuration.authType}
                    label="Authentication Type"
                  >
                    <MenuItem value="api_key">API Key</MenuItem>
                    <MenuItem value="oauth2">OAuth 2.0</MenuItem>
                    <MenuItem value="basic_auth">Basic Auth</MenuItem>
                    <MenuItem value="bearer_token">Bearer Token</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  placeholder="Enter your API key"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Base URL"
                  placeholder="https://api.example.com"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setConfigDialogOpen(false)}>
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntegrationsPage;