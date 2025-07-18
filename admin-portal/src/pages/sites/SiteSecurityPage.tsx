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
  Switch,
  FormControlLabel,
  Alert,
  Tabs,
  CircularProgress,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Videocam as CameraIcon,
  Sensors as SensorIcon,
  Lock as AccessIcon,
  Alarm as AlarmIcon,
  Shield as ShieldIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface SecurityDevice {
  id: string;
  name: string;
  type: 'camera' | 'sensor' | 'access_control' | 'alarm';
  location: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  lastUpdate: Date;
  batteryLevel?: number;
  settings: Record<string, any>;
}

interface SecurityAlert {
  id: string;
  deviceId: string;
  deviceName: string;
  type: 'intrusion' | 'malfunction' | 'low_battery' | 'offline' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

interface Site {
  id: string;
  name: string;
  address: string;
  securityLevel: 'low' | 'medium' | 'high' | 'maximum';
  devices: SecurityDevice[];
  alerts: SecurityAlert[];
}

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
      id={`security-tabpanel-${index}`}
      aria-labelledby={`security-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SiteSecurityPage: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [openDeviceDialog, setOpenDeviceDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState<SecurityDevice | null>(null);
  const [deviceFormData, setDeviceFormData] = useState<{
    name: string;
    type: 'camera' | 'sensor' | 'access_control' | 'alarm';
    location: string;
    settings: Record<string, any>;
  }>({
    name: '',
    type: 'camera',
    location: '',
    settings: {},
  });

  useEffect(() => {
    const loadSiteSecurityData = async () => {
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
        console.debug(`Loading site security data with ${tokenInfo.type} token`);

        // Use the enhanced API service (token automatically injected)
        const sitesResponse = await adminAPI.getSitesWithSecurity?.() || 
                             await adminAPI.getSites();
        
        const sitesData = sitesResponse.data.data || [];
        setSites(sitesData);
        
        if (sitesData.length > 0) {
          setSelectedSite(sitesData[0].id);
        }
      } catch (error: any) {
        console.error('Failed to load site security data:', error);
        setError(error.response?.data?.message || 'Failed to load site security data');
        
        // Initialize with empty data on error
        setSites([]);
        setSelectedSite('');
      } finally {
        setLoading(false);
      }
    };

    loadSiteSecurityData();
  }, []);

  const currentSite = sites.find(site => site.id === selectedSite);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      case 'maintenance': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'camera': return <CameraIcon />;
      case 'sensor': return <SensorIcon />;
      case 'access_control': return <AccessIcon />;
      case 'alarm': return <AlarmIcon />;
      default: return <SecurityIcon />;
    }
  };

  const handleOpenDeviceDialog = (device?: SecurityDevice) => {
    if (device) {
      setEditingDevice(device);
      setDeviceFormData({
        name: device.name,
        type: device.type,
        location: device.location,
        settings: device.settings,
      });
    } else {
      setEditingDevice(null);
      setDeviceFormData({
        name: '',
        type: 'camera',
        location: '',
        settings: {},
      });
    }
    setOpenDeviceDialog(true);
  };

  const handleCloseDeviceDialog = () => {
    setOpenDeviceDialog(false);
    setEditingDevice(null);
  };

  const handleSaveDevice = () => {
    // Implementation for saving device
    handleCloseDeviceDialog();
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setSites(sites.map(site => ({
      ...site,
      alerts: site.alerts.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ),
    })));
  };

  const unacknowledgedAlerts = currentSite?.alerts.filter(alert => !alert.acknowledged) || [];
  const acknowledgedAlerts = currentSite?.alerts.filter(alert => alert.acknowledged) || [];

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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldIcon color="primary" />
          Site Security Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDeviceDialog()}
        >
          Add Security Device
        </Button>
      </Box>

      {/* Site Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Select Site</InputLabel>
                <Select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                >
                  {sites.map((site) => (
                    <MenuItem key={site.id} value={site.id}>
                      {site.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {currentSite && (
              <>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Security Level
                  </Typography>
                  <Chip
                    label={currentSite.securityLevel.toUpperCase()}
                    color={currentSite.securityLevel === 'high' || currentSite.securityLevel === 'maximum' ? 'error' : 'warning'}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Active Alerts
                  </Typography>
                  <Typography variant="h6" color={unacknowledgedAlerts.length > 0 ? 'error.main' : 'success.main'}>
                    {unacknowledgedAlerts.length}
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {currentSite && (
        <>
          {/* Alert Banner */}
          {unacknowledgedAlerts.length > 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="h6">Active Security Alerts</Typography>
              <Typography>
                {unacknowledgedAlerts.length} unacknowledged alert(s) require attention.
              </Typography>
            </Alert>
          )}

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Security Devices" />
              <Tab label="Active Alerts" />
              <Tab label="Alert History" />
              <Tab label="Security Settings" />
            </Tabs>
          </Box>

          {/* Security Devices Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {currentSite.devices.map((device) => (
                <Grid item xs={12} md={6} lg={4} key={device.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getDeviceIcon(device.type)}
                          <Typography variant="h6">
                            {device.name}
                          </Typography>
                        </Box>
                        <Chip
                          label={device.status}
                          color={getStatusColor(device.status) as any}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Location: {device.location}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Type: {device.type.replace('_', ' ').toUpperCase()}
                      </Typography>
                      
                      {device.batteryLevel && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Battery: {device.batteryLevel}%
                        </Typography>
                      )}
                      
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Last Update: {device.lastUpdate.toLocaleString()}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDeviceDialog(device)}
                        >
                          <SettingsIcon />
                        </IconButton>
                        <IconButton size="small">
                          <VisibilityIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Active Alerts Tab */}
          <TabPanel value={tabValue} index={1}>
            <List>
              {unacknowledgedAlerts.map((alert) => (
                <ListItem key={alert.id} divider>
                  <ListItemIcon>
                    <WarningIcon color={getSeverityColor(alert.severity) as any} />
                  </ListItemIcon>
                  <ListItemText
                    primary={alert.message}
                    secondary={`${alert.deviceName} • ${alert.timestamp.toLocaleString()}`}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={alert.severity.toUpperCase()}
                      color={getSeverityColor(alert.severity) as any}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Button
                      size="small"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {unacknowledgedAlerts.length === 0 && (
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="No active alerts" />
                </ListItem>
              )}
            </List>
          </TabPanel>

          {/* Alert History Tab */}
          <TabPanel value={tabValue} index={2}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Device</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentSite.alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>{alert.deviceName}</TableCell>
                      <TableCell>{alert.type.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Chip
                          label={alert.severity}
                          color={getSeverityColor(alert.severity) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{alert.message}</TableCell>
                      <TableCell>{alert.timestamp.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={alert.acknowledged ? 'Acknowledged' : 'Active'}
                          color={alert.acknowledged ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Security Settings Tab */}
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      General Settings
                    </Typography>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Auto-acknowledge low severity alerts"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Send email notifications"
                    />
                    <FormControlLabel
                      control={<Switch />}
                      label="SMS notifications for critical alerts"
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Security Level Settings
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Security Level</InputLabel>
                      <Select value={currentSite.securityLevel}>
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="maximum">Maximum</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="Alert Escalation Time (minutes)"
                      type="number"
                      defaultValue={15}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Emergency Contact"
                      defaultValue="+1 (555) 123-4567"
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </>
      )}

      {/* Add/Edit Device Dialog */}
      <Dialog open={openDeviceDialog} onClose={handleCloseDeviceDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingDevice ? 'Edit Security Device' : 'Add Security Device'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Device Name"
                value={deviceFormData.name}
                onChange={(e) => setDeviceFormData({ ...deviceFormData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Device Type</InputLabel>
                <Select
                  value={deviceFormData.type}
                  onChange={(e) => setDeviceFormData({ ...deviceFormData, type: e.target.value as any })}
                >
                  <MenuItem value="camera">Camera</MenuItem>
                  <MenuItem value="sensor">Sensor</MenuItem>
                  <MenuItem value="access_control">Access Control</MenuItem>
                  <MenuItem value="alarm">Alarm System</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                value={deviceFormData.location}
                onChange={(e) => setDeviceFormData({ ...deviceFormData, location: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeviceDialog}>Cancel</Button>
          <Button
            onClick={handleSaveDevice}
            variant="contained"
            disabled={!deviceFormData.name || !deviceFormData.location}
          >
            {editingDevice ? 'Update' : 'Add'} Device
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SiteSecurityPage;