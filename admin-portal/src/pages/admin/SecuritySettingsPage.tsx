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
  Slider,
  FormGroup,
  Checkbox,
  RadioGroup,
  Radio,
  FormLabel,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Shield as ShieldIcon,
  Lock as LockIcon,
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  VpnKey as VpnKeyIcon,
  Fingerprint as FingerprintIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  RestoreFromTrash as RestoreIcon,
  Info as InfoIcon,
  AdminPanelSettings as AdminIcon,
  Group as GroupIcon,
  Computer as ComputerIcon,
  NetworkCheck as NetworkIcon,
  Https as HttpsIcon,
  Password as PasswordIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  category: 'authentication' | 'authorization' | 'data_protection' | 'network' | 'audit';
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastModified: string;
  modifiedBy: string;
  settings: Record<string, any>;
}

interface SecurityRule {
  id: string;
  name: string;
  description: string;
  type: 'firewall' | 'access_control' | 'data_encryption' | 'session_management';
  enabled: boolean;
  priority: number;
  conditions: string[];
  actions: string[];
  lastTriggered?: string;
  triggerCount: number;
}

interface SecurityAlert {
  id: string;
  type: 'policy_violation' | 'unauthorized_access' | 'suspicious_activity' | 'configuration_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  status: 'active' | 'investigating' | 'resolved';
  affectedResource: string;
  recommendedAction: string;
}

interface AuthenticationSettings {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    passwordExpiry: number; // days
    preventReuse: number; // last N passwords
  };
  mfaSettings: {
    enabled: boolean;
    required: boolean;
    methods: string[];
    backupCodes: boolean;
  };
  sessionSettings: {
    timeout: number; // minutes
    maxConcurrentSessions: number;
    rememberMe: boolean;
    secureOnly: boolean;
  };
  lockoutPolicy: {
    enabled: boolean;
    maxAttempts: number;
    lockoutDuration: number; // minutes
    resetAfter: number; // hours
  };
}

interface EncryptionSettings {
  dataAtRest: {
    enabled: boolean;
    algorithm: string;
    keyRotation: number; // days
  };
  dataInTransit: {
    tlsVersion: string;
    cipherSuites: string[];
    hsts: boolean;
  };
  backupEncryption: {
    enabled: boolean;
    algorithm: string;
    keyManagement: string;
  };
}

// Security policies will be loaded from API

// Security rules will be loaded from API

// Security alerts will be loaded from API

const defaultAuthSettings: AuthenticationSettings = {
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordExpiry: 90,
    preventReuse: 5,
  },
  mfaSettings: {
    enabled: true,
    required: true,
    methods: ['totp', 'sms'],
    backupCodes: true,
  },
  sessionSettings: {
    timeout: 30,
    maxConcurrentSessions: 3,
    rememberMe: false,
    secureOnly: true,
  },
  lockoutPolicy: {
    enabled: true,
    maxAttempts: 5,
    lockoutDuration: 15,
    resetAfter: 24,
  },
};

const defaultEncryptionSettings: EncryptionSettings = {
  dataAtRest: {
    enabled: true,
    algorithm: 'AES-256',
    keyRotation: 90,
  },
  dataInTransit: {
    tlsVersion: 'TLS 1.3',
    cipherSuites: ['TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256'],
    hsts: true,
  },
  backupEncryption: {
    enabled: true,
    algorithm: 'AES-256',
    keyManagement: 'AWS KMS',
  },
};

const SecuritySettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [rules, setRules] = useState<SecurityRule[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [authSettings, setAuthSettings] = useState<AuthenticationSettings>(defaultAuthSettings);
  const [encryptionSettings, setEncryptionSettings] = useState<EncryptionSettings>(defaultEncryptionSettings);
  const [tabValue, setTabValue] = useState(0);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<SecurityPolicy | null>(null);
  const [selectedRule, setSelectedRule] = useState<SecurityRule | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const loadSecurityData = async () => {
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
        console.debug(`Loading security data with ${tokenInfo.type} token`);

        // Use the enhanced API service to load security settings
        const response = await adminAPI.getSystemSettings();
        const securityData = response.data.data;

        // Set security policies, rules, and alerts from API response
        setPolicies(securityData?.securityPolicies || []);
        setRules(securityData?.securityRules || []);
        setAlerts(securityData?.securityAlerts || []);
        
        // Set authentication and encryption settings if available
        if (securityData?.authSettings) {
          setAuthSettings(securityData.authSettings);
        }
        if (securityData?.encryptionSettings) {
          setEncryptionSettings(securityData.encryptionSettings);
        }

      } catch (err: any) {
        console.error('Failed to load security data:', err);
        setError('Failed to load security data. Please check your connection and try again.');
        // Initialize with empty arrays on error
        setPolicies([]);
        setRules([]);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    loadSecurityData();
  }, []);

  const handleSaveSettings = async () => {
    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    setLoading(true);
    try {
      setError(null);
      setSuccess(null);

      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Saving security settings with ${tokenInfo.type} token`);

      // Prepare the security settings data
      const securitySettingsData = {
        authSettings,
        encryptionSettings,
        securityPolicies: policies,
        securityRules: rules,
        securityAlerts: alerts,
      };

      // Use the enhanced API service to save security settings
      await adminAPI.updateSystemSettings(securitySettingsData);

      setSuccess('Security settings saved successfully');
    } catch (err: any) {
      console.error('Failed to save security settings:', err);
      setError('Failed to save security settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePolicyToggle = (policyId: string) => {
    setPolicies(policies.map(policy => 
      policy.id === policyId 
        ? { ...policy, enabled: !policy.enabled }
        : policy
    ));
  };

  const handleRuleToggle = (ruleId: string) => {
    setRules(rules.map(rule => 
      rule.id === ruleId 
        ? { ...rule, enabled: !rule.enabled }
        : rule
    ));
  };

  const handleAlertAction = (alertId: string, action: 'investigate' | 'resolve') => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: action === 'investigate' ? 'investigating' : 'resolved' }
        : alert
    ));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'error';
      case 'investigating': return 'warning';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  const activeAlerts = alerts.filter(alert => alert.status === 'active').length;
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;
  const enabledPolicies = policies.filter(policy => policy.enabled).length;
  const enabledRules = rules.filter(rule => rule.enabled).length;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Security Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure and manage system security policies and settings
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
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
            disabled={loading}
          >
            Save Changes
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
                    Active Policies
                  </Typography>
                  <Typography variant="h4">
                    {enabledPolicies}/{policies.length}
                  </Typography>
                </Box>
                <ShieldIcon color="primary" sx={{ fontSize: 40 }} />
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
                    Security Rules
                  </Typography>
                  <Typography variant="h4">
                    {enabledRules}/{rules.length}
                  </Typography>
                </Box>
                <SecurityIcon color="success" sx={{ fontSize: 40 }} />
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
                    Active Alerts
                  </Typography>
                  <Typography variant="h4">
                    {activeAlerts}
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
                    Critical Issues
                  </Typography>
                  <Typography variant="h4">
                    {criticalAlerts}
                  </Typography>
                </Box>
                <CancelIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Authentication" />
            <Tab label="Encryption" />
            <Tab label="Security Policies" />
            <Tab label="Security Rules" />
            <Tab label="Security Alerts" />
          </Tabs>
        </Box>

        {/* Authentication Tab */}
        {tabValue === 0 && (
          <CardContent>
            <Grid container spacing={3}>
              {/* Password Policy */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PasswordIcon />
                      Password Policy
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography gutterBottom>Minimum Length: {authSettings.passwordPolicy.minLength}</Typography>
                      <Slider
                        value={authSettings.passwordPolicy.minLength}
                        onChange={(e, value) => setAuthSettings({
                          ...authSettings,
                          passwordPolicy: { ...authSettings.passwordPolicy, minLength: value as number }
                        })}
                        min={8}
                        max={32}
                        marks
                        valueLabelDisplay="auto"
                      />
                    </Box>

                    <FormGroup sx={{ mt: 2 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={authSettings.passwordPolicy.requireUppercase}
                            onChange={(e) => setAuthSettings({
                              ...authSettings,
                              passwordPolicy: { ...authSettings.passwordPolicy, requireUppercase: e.target.checked }
                            })}
                          />
                        }
                        label="Require Uppercase Letters"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={authSettings.passwordPolicy.requireLowercase}
                            onChange={(e) => setAuthSettings({
                              ...authSettings,
                              passwordPolicy: { ...authSettings.passwordPolicy, requireLowercase: e.target.checked }
                            })}
                          />
                        }
                        label="Require Lowercase Letters"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={authSettings.passwordPolicy.requireNumbers}
                            onChange={(e) => setAuthSettings({
                              ...authSettings,
                              passwordPolicy: { ...authSettings.passwordPolicy, requireNumbers: e.target.checked }
                            })}
                          />
                        }
                        label="Require Numbers"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={authSettings.passwordPolicy.requireSpecialChars}
                            onChange={(e) => setAuthSettings({
                              ...authSettings,
                              passwordPolicy: { ...authSettings.passwordPolicy, requireSpecialChars: e.target.checked }
                            })}
                          />
                        }
                        label="Require Special Characters"
                      />
                    </FormGroup>

                    <Box sx={{ mt: 2 }}>
                      <TextField
                        fullWidth
                        label="Password Expiry (days)"
                        type="number"
                        value={authSettings.passwordPolicy.passwordExpiry}
                        onChange={(e) => setAuthSettings({
                          ...authSettings,
                          passwordPolicy: { ...authSettings.passwordPolicy, passwordExpiry: parseInt(e.target.value) }
                        })}
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        label="Prevent Password Reuse (last N passwords)"
                        type="number"
                        value={authSettings.passwordPolicy.preventReuse}
                        onChange={(e) => setAuthSettings({
                          ...authSettings,
                          passwordPolicy: { ...authSettings.passwordPolicy, preventReuse: parseInt(e.target.value) }
                        })}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* MFA Settings */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VpnKeyIcon />
                      Multi-Factor Authentication
                    </Typography>
                    
                    <FormGroup sx={{ mt: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.mfaSettings.enabled}
                            onChange={(e) => setAuthSettings({
                              ...authSettings,
                              mfaSettings: { ...authSettings.mfaSettings, enabled: e.target.checked }
                            })}
                          />
                        }
                        label="Enable MFA"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.mfaSettings.required}
                            onChange={(e) => setAuthSettings({
                              ...authSettings,
                              mfaSettings: { ...authSettings.mfaSettings, required: e.target.checked }
                            })}
                            disabled={!authSettings.mfaSettings.enabled}
                          />
                        }
                        label="Require MFA for All Users"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.mfaSettings.backupCodes}
                            onChange={(e) => setAuthSettings({
                              ...authSettings,
                              mfaSettings: { ...authSettings.mfaSettings, backupCodes: e.target.checked }
                            })}
                            disabled={!authSettings.mfaSettings.enabled}
                          />
                        }
                        label="Enable Backup Codes"
                      />
                    </FormGroup>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Available MFA Methods:
                      </Typography>
                      <FormGroup>
                        {['totp', 'sms', 'email', 'hardware_key'].map((method) => (
                          <FormControlLabel
                            key={method}
                            control={
                              <Checkbox
                                checked={authSettings.mfaSettings.methods.includes(method)}
                                onChange={(e) => {
                                  const methods = e.target.checked
                                    ? [...authSettings.mfaSettings.methods, method]
                                    : authSettings.mfaSettings.methods.filter(m => m !== method);
                                  setAuthSettings({
                                    ...authSettings,
                                    mfaSettings: { ...authSettings.mfaSettings, methods }
                                  });
                                }}
                                disabled={!authSettings.mfaSettings.enabled}
                              />
                            }
                            label={method.toUpperCase().replace('_', ' ')}
                          />
                        ))}
                      </FormGroup>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Session Settings */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTimeIcon />
                      Session Management
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <TextField
                        fullWidth
                        label="Session Timeout (minutes)"
                        type="number"
                        value={authSettings.sessionSettings.timeout}
                        onChange={(e) => setAuthSettings({
                          ...authSettings,
                          sessionSettings: { ...authSettings.sessionSettings, timeout: parseInt(e.target.value) }
                        })}
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        label="Max Concurrent Sessions"
                        type="number"
                        value={authSettings.sessionSettings.maxConcurrentSessions}
                        onChange={(e) => setAuthSettings({
                          ...authSettings,
                          sessionSettings: { ...authSettings.sessionSettings, maxConcurrentSessions: parseInt(e.target.value) }
                        })}
                        sx={{ mb: 2 }}
                      />
                    </Box>

                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.sessionSettings.rememberMe}
                            onChange={(e) => setAuthSettings({
                              ...authSettings,
                              sessionSettings: { ...authSettings.sessionSettings, rememberMe: e.target.checked }
                            })}
                          />
                        }
                        label="Allow Remember Me"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.sessionSettings.secureOnly}
                            onChange={(e) => setAuthSettings({
                              ...authSettings,
                              sessionSettings: { ...authSettings.sessionSettings, secureOnly: e.target.checked }
                            })}
                          />
                        }
                        label="Secure Cookies Only (HTTPS)"
                      />
                    </FormGroup>
                  </CardContent>
                </Card>
              </Grid>

              {/* Lockout Policy */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LockIcon />
                      Account Lockout Policy
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={authSettings.lockoutPolicy.enabled}
                          onChange={(e) => setAuthSettings({
                            ...authSettings,
                            lockoutPolicy: { ...authSettings.lockoutPolicy, enabled: e.target.checked }
                          })}
                        />
                      }
                      label="Enable Account Lockout"
                      sx={{ mb: 2 }}
                    />

                    <Box sx={{ mt: 2 }}>
                      <TextField
                        fullWidth
                        label="Max Failed Attempts"
                        type="number"
                        value={authSettings.lockoutPolicy.maxAttempts}
                        onChange={(e) => setAuthSettings({
                          ...authSettings,
                          lockoutPolicy: { ...authSettings.lockoutPolicy, maxAttempts: parseInt(e.target.value) }
                        })}
                        disabled={!authSettings.lockoutPolicy.enabled}
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        label="Lockout Duration (minutes)"
                        type="number"
                        value={authSettings.lockoutPolicy.lockoutDuration}
                        onChange={(e) => setAuthSettings({
                          ...authSettings,
                          lockoutPolicy: { ...authSettings.lockoutPolicy, lockoutDuration: parseInt(e.target.value) }
                        })}
                        disabled={!authSettings.lockoutPolicy.enabled}
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        label="Reset Counter After (hours)"
                        type="number"
                        value={authSettings.lockoutPolicy.resetAfter}
                        onChange={(e) => setAuthSettings({
                          ...authSettings,
                          lockoutPolicy: { ...authSettings.lockoutPolicy, resetAfter: parseInt(e.target.value) }
                        })}
                        disabled={!authSettings.lockoutPolicy.enabled}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Encryption Tab */}
        {tabValue === 1 && (
          <CardContent>
            <Grid container spacing={3}>
              {/* Data at Rest */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HttpsIcon />
                      Data at Rest Encryption
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={encryptionSettings.dataAtRest.enabled}
                          onChange={(e) => setEncryptionSettings({
                            ...encryptionSettings,
                            dataAtRest: { ...encryptionSettings.dataAtRest, enabled: e.target.checked }
                          })}
                        />
                      }
                      label="Enable Encryption at Rest"
                      sx={{ mb: 2 }}
                    />

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Encryption Algorithm</InputLabel>
                      <Select
                        value={encryptionSettings.dataAtRest.algorithm}
                        label="Encryption Algorithm"
                        onChange={(e) => setEncryptionSettings({
                          ...encryptionSettings,
                          dataAtRest: { ...encryptionSettings.dataAtRest, algorithm: e.target.value }
                        })}
                        disabled={!encryptionSettings.dataAtRest.enabled}
                      >
                        <MenuItem value="AES-256">AES-256</MenuItem>
                        <MenuItem value="AES-192">AES-192</MenuItem>
                        <MenuItem value="AES-128">AES-128</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      label="Key Rotation Period (days)"
                      type="number"
                      value={encryptionSettings.dataAtRest.keyRotation}
                      onChange={(e) => setEncryptionSettings({
                        ...encryptionSettings,
                        dataAtRest: { ...encryptionSettings.dataAtRest, keyRotation: parseInt(e.target.value) }
                      })}
                      disabled={!encryptionSettings.dataAtRest.enabled}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Data in Transit */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <NetworkIcon />
                      Data in Transit Encryption
                    </Typography>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>TLS Version</InputLabel>
                      <Select
                        value={encryptionSettings.dataInTransit.tlsVersion}
                        label="TLS Version"
                        onChange={(e) => setEncryptionSettings({
                          ...encryptionSettings,
                          dataInTransit: { ...encryptionSettings.dataInTransit, tlsVersion: e.target.value }
                        })}
                      >
                        <MenuItem value="TLS 1.3">TLS 1.3</MenuItem>
                        <MenuItem value="TLS 1.2">TLS 1.2</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={encryptionSettings.dataInTransit.hsts}
                          onChange={(e) => setEncryptionSettings({
                            ...encryptionSettings,
                            dataInTransit: { ...encryptionSettings.dataInTransit, hsts: e.target.checked }
                          })}
                        />
                      }
                      label="Enable HSTS (HTTP Strict Transport Security)"
                      sx={{ mb: 2 }}
                    />

                    <Typography variant="subtitle2" gutterBottom>
                      Cipher Suites:
                    </Typography>
                    <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                      {encryptionSettings.dataInTransit.cipherSuites.map((suite, index) => (
                        <Chip
                          key={index}
                          label={suite}
                          size="small"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Backup Encryption */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RestoreIcon />
                      Backup Encryption
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={encryptionSettings.backupEncryption.enabled}
                          onChange={(e) => setEncryptionSettings({
                            ...encryptionSettings,
                            backupEncryption: { ...encryptionSettings.backupEncryption, enabled: e.target.checked }
                          })}
                        />
                      }
                      label="Enable Backup Encryption"
                      sx={{ mb: 2 }}
                    />

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Encryption Algorithm</InputLabel>
                      <Select
                        value={encryptionSettings.backupEncryption.algorithm}
                        label="Encryption Algorithm"
                        onChange={(e) => setEncryptionSettings({
                          ...encryptionSettings,
                          backupEncryption: { ...encryptionSettings.backupEncryption, algorithm: e.target.value }
                        })}
                        disabled={!encryptionSettings.backupEncryption.enabled}
                      >
                        <MenuItem value="AES-256">AES-256</MenuItem>
                        <MenuItem value="AES-192">AES-192</MenuItem>
                        <MenuItem value="AES-128">AES-128</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Key Management</InputLabel>
                      <Select
                        value={encryptionSettings.backupEncryption.keyManagement}
                        label="Key Management"
                        onChange={(e) => setEncryptionSettings({
                          ...encryptionSettings,
                          backupEncryption: { ...encryptionSettings.backupEncryption, keyManagement: e.target.value }
                        })}
                        disabled={!encryptionSettings.backupEncryption.enabled}
                      >
                        <MenuItem value="AWS KMS">AWS KMS</MenuItem>
                        <MenuItem value="Azure Key Vault">Azure Key Vault</MenuItem>
                        <MenuItem value="Google Cloud KMS">Google Cloud KMS</MenuItem>
                        <MenuItem value="HashiCorp Vault">HashiCorp Vault</MenuItem>
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Security Policies Tab */}
        {tabValue === 2 && (
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setPolicyDialogOpen(true)}
              >
                Add Policy
              </Button>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Policy Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Modified</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {policy.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {policy.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={policy.category.replace('_', ' ')}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={policy.severity}
                          color={getSeverityColor(policy.severity) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={policy.enabled}
                              onChange={() => handlePolicyToggle(policy.id)}
                              size="small"
                            />
                          }
                          label={policy.enabled ? 'Enabled' : 'Disabled'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(parseISO(policy.lastModified), 'MMM dd, yyyy')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          by {policy.modifiedBy}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedPolicy(policy);
                                setPolicyDialogOpen(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small">
                              <DeleteIcon />
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

        {/* Security Rules Tab */}
        {tabValue === 3 && (
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setRuleDialogOpen(true)}
              >
                Add Rule
              </Button>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rule Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Trigger Count</TableCell>
                    <TableCell>Last Triggered</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {rule.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {rule.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={rule.type.replace('_', ' ')}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`Priority ${rule.priority}`}
                          color={rule.priority <= 2 ? 'error' : rule.priority <= 4 ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={rule.enabled}
                              onChange={() => handleRuleToggle(rule.id)}
                              size="small"
                            />
                          }
                          label={rule.enabled ? 'Enabled' : 'Disabled'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {rule.triggerCount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {rule.lastTriggered ? (
                          <Typography variant="body2">
                            {format(parseISO(rule.lastTriggered), 'MMM dd, HH:mm')}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Never
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedRule(rule);
                                setRuleDialogOpen(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small">
                              <DeleteIcon />
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

        {/* Security Alerts Tab */}
        {tabValue === 4 && (
          <CardContent>
            <List>
              {alerts.map((alert) => (
                <React.Fragment key={alert.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle1">
                            {alert.title}
                          </Typography>
                          <Chip
                            label={alert.severity}
                            color={getSeverityColor(alert.severity) as any}
                            size="small"
                          />
                          <Chip
                            label={alert.status}
                            color={getStatusColor(alert.status) as any}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" gutterBottom>
                            {alert.description}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Affected Resource: {alert.affectedResource}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Recommended Action: {alert.recommendedAction}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(parseISO(alert.timestamp), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {alert.status === 'active' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleAlertAction(alert.id, 'investigate')}
                          >
                            Investigate
                          </Button>
                        )}
                        {alert.status !== 'resolved' && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleAlertAction(alert.id, 'resolve')}
                          >
                            Resolve
                          </Button>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        )}
      </Card>

      {/* Policy Dialog */}
      <Dialog
        open={policyDialogOpen}
        onClose={() => setPolicyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedPolicy ? 'Edit Security Policy' : 'Add New Security Policy'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Policy Name"
                defaultValue={selectedPolicy?.name || ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                defaultValue={selectedPolicy?.description || ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  defaultValue={selectedPolicy?.category || 'authentication'}
                  label="Category"
                >
                  <MenuItem value="authentication">Authentication</MenuItem>
                  <MenuItem value="authorization">Authorization</MenuItem>
                  <MenuItem value="data_protection">Data Protection</MenuItem>
                  <MenuItem value="network">Network</MenuItem>
                  <MenuItem value="audit">Audit</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  defaultValue={selectedPolicy?.severity || 'medium'}
                  label="Severity"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setPolicyDialogOpen(false)}>
            {selectedPolicy ? 'Update' : 'Add'} Policy
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rule Dialog */}
      <Dialog
        open={ruleDialogOpen}
        onClose={() => setRuleDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRule ? 'Edit Security Rule' : 'Add New Security Rule'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rule Name"
                defaultValue={selectedRule?.name || ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                defaultValue={selectedRule?.description || ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Rule Type</InputLabel>
                <Select
                  defaultValue={selectedRule?.type || 'access_control'}
                  label="Rule Type"
                >
                  <MenuItem value="firewall">Firewall</MenuItem>
                  <MenuItem value="access_control">Access Control</MenuItem>
                  <MenuItem value="data_encryption">Data Encryption</MenuItem>
                  <MenuItem value="session_management">Session Management</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Priority"
                type="number"
                defaultValue={selectedRule?.priority || 1}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setRuleDialogOpen(false)}>
            {selectedRule ? 'Update' : 'Add'} Rule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecuritySettingsPage;