import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Paper,
  Tab,
  Tabs,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Payment as PaymentIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ClientProfile {
  id: string;
  companyName: string;
  contactPerson: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  serviceLevel: string;
  preferences: {
    timezone: string;
    dateFormat: string;
    currency: string;
    language: string;
    theme: 'light' | 'dark' | 'auto';
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    incidentAlerts: boolean;
    reportNotifications: boolean;
    billingReminders: boolean;
    maintenanceNotifications: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    ipWhitelist: string[];
    apiAccess: boolean;
  };
}

interface EmergencyContact {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

interface PaymentMethod {
  id: string;
  type: 'CREDIT_CARD' | 'BANK_ACCOUNT' | 'ACH';
  isDefault: boolean;
  nickname: string;
  lastFour: string;
  expiryDate?: string;
  bankName?: string;
  accountType?: 'CHECKING' | 'SAVINGS';
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  tax: number;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  description: string;
  downloadUrl?: string;
}

interface Subscription {
  id: string;
  planName: string;
  status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  nextBillingDate: string;
  amount: number;
  features: string[];
}

interface BillingSettings {
  autoPayEnabled: boolean;
  defaultPaymentMethodId?: string;
  billingNotifications: boolean;
  invoiceDelivery: 'EMAIL' | 'POSTAL' | 'BOTH';
  paymentTerms: number;
}

const SettingsPage: React.FC = () => {
  const { getToken } = useClerkAuth();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    title: '',
    phone: '',
    email: '',
    isPrimary: false,
  });
  const [newPaymentMethod, setNewPaymentMethod] = useState<{
    type: 'CREDIT_CARD' | 'BANK_ACCOUNT' | 'ACH';
    nickname: string;
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    accountType: 'CHECKING' | 'SAVINGS';
  }>({
    type: 'CREDIT_CARD',
    nickname: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountType: 'CHECKING',
  });

  // Data fetching functions
  const fetchSettings = useCallback(async () => {
    try {
      setError(null);
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const [profileResponse, contactsResponse, paymentMethodsResponse, invoicesResponse, subscriptionResponse, billingSettingsResponse] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/emergency-contacts`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/payment-methods`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/invoices`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/subscription`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/billing-settings`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (!profileResponse.ok || !contactsResponse.ok) {
        throw new Error('Failed to fetch settings data');
      }

      const profileResult = await profileResponse.json();
      const contactsResult = await contactsResponse.json();
      const paymentMethodsResult = paymentMethodsResponse.ok ? await paymentMethodsResponse.json() : { data: [] };
      const invoicesResult = invoicesResponse.ok ? await invoicesResponse.json() : { data: [] };
      const subscriptionResult = subscriptionResponse.ok ? await subscriptionResponse.json() : { data: null };
      const billingSettingsResult = billingSettingsResponse.ok ? await billingSettingsResponse.json() : { data: null };

      setProfile(profileResult.data || null);
      setEmergencyContacts(contactsResult.data || []);
      setPaymentMethods(paymentMethodsResult.data || []);
      setInvoices(invoicesResult.data || []);
      setSubscription(subscriptionResult.data || null);
      setBillingSettings(billingSettingsResult.data || {
        autoPayEnabled: false,
        billingNotifications: true,
        invoiceDelivery: 'EMAIL',
        paymentTerms: 30,
      });

    } catch (err: any) {
      console.error('Failed to fetch settings:', err);
      setError('Failed to load settings data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const saveProfile = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      setSuccess('Profile updated successfully');

    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveEmergencyContact = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const url = selectedContact 
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/emergency-contacts/${selectedContact.id}`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/emergency-contacts`;

      const method = selectedContact ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContact),
      });

      if (!response.ok) {
        throw new Error('Failed to save emergency contact');
      }

      setContactDialogOpen(false);
      setSelectedContact(null);
      setNewContact({
        name: '',
        title: '',
        phone: '',
        email: '',
        isPrimary: false,
      });
      fetchSettings();

    } catch (err: any) {
      console.error('Failed to save emergency contact:', err);
      setError('Failed to save emergency contact. Please try again.');
    }
  };

  const deleteEmergencyContact = async (contactId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/emergency-contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete emergency contact');
      }

      fetchSettings();

    } catch (err: any) {
      console.error('Failed to delete emergency contact:', err);
      setError('Failed to delete emergency contact. Please try again.');
    }
  };

  const savePaymentMethod = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const url = selectedPaymentMethod 
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/payment-methods/${selectedPaymentMethod.id}`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/payment-methods`;

      const method = selectedPaymentMethod ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPaymentMethod),
      });

      if (!response.ok) {
        throw new Error('Failed to save payment method');
      }

      setPaymentMethodDialogOpen(false);
      setSelectedPaymentMethod(null);
      setNewPaymentMethod({
        type: 'CREDIT_CARD',
        nickname: '',
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        accountType: 'CHECKING',
      });
      fetchSettings();

    } catch (err: any) {
      console.error('Failed to save payment method:', err);
      setError('Failed to save payment method. Please try again.');
    }
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }

      fetchSettings();

    } catch (err: any) {
      console.error('Failed to delete payment method:', err);
      setError('Failed to delete payment method. Please try again.');
    }
  };

  const setDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/payment-methods/${paymentMethodId}/set-default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }

      fetchSettings();
      setSuccess('Default payment method updated successfully');

    } catch (err: any) {
      console.error('Failed to set default payment method:', err);
      setError('Failed to set default payment method. Please try again.');
    }
  };

  const saveBillingSettings = async () => {
    if (!billingSettings) return;

    try {
      setSaving(true);
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/billing-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billingSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to save billing settings');
      }

      setSuccess('Billing settings updated successfully');

    } catch (err: any) {
      console.error('Failed to save billing settings:', err);
      setError('Failed to save billing settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/client/invoices/${invoiceId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err: any) {
      console.error('Failed to download invoice:', err);
      setError('Failed to download invoice. Please try again.');
    }
  };

  // Utility functions
  const updateProfile = (field: string, value: any) => {
    if (!profile) return;
    setProfile({
      ...profile,
      [field]: value,
    });
  };

  const updateNestedProfile = (section: string, field: string, value: any) => {
    if (!profile) return;
    setProfile(prevProfile => {
      if (!prevProfile) return null;
      const updatedSection = { ...(prevProfile[section as keyof ClientProfile] as any), [field]: value };
      return {
        ...prevProfile,
        [section]: updatedSection,
      } as ClientProfile;
    });
  };

  const updateBillingSettings = (field: string, value: any) => {
    if (!billingSettings) return;
    setBillingSettings({
      ...billingSettings,
      [field]: value,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'success';
      case 'OVERDUE': return 'error';
      case 'SENT': return 'warning';
      case 'DRAFT': return 'default';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'CREDIT_CARD': return <CreditCardIcon />;
      case 'BANK_ACCOUNT': case 'ACH': return <BankIcon />;
      default: return <PaymentIcon />;
    }
  };

  // Effects
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Loading state
  if (loading && !profile) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Settings...
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
            Account Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your account preferences and security settings
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="contained"
            onClick={saveProfile}
            startIcon={<SaveIcon />}
            disabled={saving || !profile}
          >
            {saving ? 'Saving...' : 'Save Changes'}
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

      {/* Settings Tabs */}
      {profile && (
        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Company Profile" icon={<BusinessIcon />} />
            <Tab label="Preferences" icon={<PersonIcon />} />
            <Tab label="Notifications" icon={<NotificationsIcon />} />
            <Tab label="Security" icon={<SecurityIcon />} />
            <Tab label="Billing & Payments" icon={<PaymentIcon />} />
            <Tab label="Emergency Contacts" icon={<PhoneIcon />} />
          </Tabs>

          {/* Company Profile Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={profile.companyName}
                  onChange={(e) => updateProfile('companyName', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Contact Person Name"
                  value={profile.contactPerson.name}
                  onChange={(e) => updateNestedProfile('contactPerson', 'name', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Contact Person Title"
                  value={profile.contactPerson.title}
                  onChange={(e) => updateNestedProfile('contactPerson', 'title', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Contact Email"
                  value={profile.contactPerson.email}
                  onChange={(e) => updateNestedProfile('contactPerson', 'email', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={profile.contactPerson.phone}
                  onChange={(e) => updateNestedProfile('contactPerson', 'phone', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Billing Address
                </Typography>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={profile.billingAddress.street}
                  onChange={(e) => updateNestedProfile('billingAddress', 'street', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="City"
                  value={profile.billingAddress.city}
                  onChange={(e) => updateNestedProfile('billingAddress', 'city', e.target.value)}
                  margin="normal"
                />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="State"
                      value={profile.billingAddress.state}
                      onChange={(e) => updateNestedProfile('billingAddress', 'state', e.target.value)}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="ZIP Code"
                      value={profile.billingAddress.zipCode}
                      onChange={(e) => updateNestedProfile('billingAddress', 'zipCode', e.target.value)}
                      margin="normal"
                    />
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  label="Country"
                  value={profile.billingAddress.country}
                  onChange={(e) => updateNestedProfile('billingAddress', 'country', e.target.value)}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Preferences Tab */}
          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={profile.preferences.timezone}
                    label="Timezone"
                    onChange={(e) => updateNestedProfile('preferences', 'timezone', e.target.value)}
                  >
                    <MenuItem value="UTC">UTC</MenuItem>
                    <MenuItem value="America/New_York">Eastern Time</MenuItem>
                    <MenuItem value="America/Chicago">Central Time</MenuItem>
                    <MenuItem value="America/Denver">Mountain Time</MenuItem>
                    <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Date Format</InputLabel>
                  <Select
                    value={profile.preferences.dateFormat}
                    label="Date Format"
                    onChange={(e) => updateNestedProfile('preferences', 'dateFormat', e.target.value)}
                  >
                    <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                    <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                    <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={profile.preferences.currency}
                    label="Currency"
                    onChange={(e) => updateNestedProfile('preferences', 'currency', e.target.value)}
                  >
                    <MenuItem value="USD">USD - US Dollar</MenuItem>
                    <MenuItem value="EUR">EUR - Euro</MenuItem>
                    <MenuItem value="GBP">GBP - British Pound</MenuItem>
                    <MenuItem value="CAD">CAD - Canadian Dollar</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={profile.preferences.theme}
                    label="Theme"
                    onChange={(e) => updateNestedProfile('preferences', 'theme', e.target.value)}
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="auto">Auto</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Notifications Tab */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Notification Preferences
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={profile.notifications.emailNotifications}
                      onChange={(e) => updateNestedProfile('notifications', 'emailNotifications', e.target.checked)}
                    />
                  }
                  label="Email Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={profile.notifications.smsNotifications}
                      onChange={(e) => updateNestedProfile('notifications', 'smsNotifications', e.target.checked)}
                    />
                  }
                  label="SMS Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={profile.notifications.pushNotifications}
                      onChange={(e) => updateNestedProfile('notifications', 'pushNotifications', e.target.checked)}
                    />
                  }
                  label="Push Notifications"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={profile.notifications.incidentAlerts}
                      onChange={(e) => updateNestedProfile('notifications', 'incidentAlerts', e.target.checked)}
                    />
                  }
                  label="Incident Alerts"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={profile.notifications.reportNotifications}
                      onChange={(e) => updateNestedProfile('notifications', 'reportNotifications', e.target.checked)}
                    />
                  }
                  label="Report Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={profile.notifications.billingReminders}
                      onChange={(e) => updateNestedProfile('notifications', 'billingReminders', e.target.checked)}
                    />
                  }
                  label="Billing Reminders"
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={profile.security.twoFactorEnabled}
                      onChange={(e) => updateNestedProfile('security', 'twoFactorEnabled', e.target.checked)}
                    />
                  }
                  label="Two-Factor Authentication"
                />
                <TextField
                  fullWidth
                  label="Session Timeout (minutes)"
                  type="number"
                  value={profile.security.sessionTimeout}
                  onChange={(e) => updateNestedProfile('security', 'sessionTimeout', parseInt(e.target.value))}
                  margin="normal"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={profile.security.apiAccess}
                      onChange={(e) => updateNestedProfile('security', 'apiAccess', e.target.checked)}
                    />
                  }
                  label="API Access Enabled"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  IP Whitelist
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Restrict access to specific IP addresses for enhanced security
                </Typography>
                <Button variant="outlined" startIcon={<AddIcon />}>
                  Add IP Address
                </Button>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Billing & Payments Tab */}
          <TabPanel value={activeTab} index={4}>
            <Grid container spacing={3}>
              {/* Subscription Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Current Subscription
                </Typography>
                {subscription ? (
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" color="primary">
                          {subscription.planName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {subscription.billingCycle.toLowerCase()} billing
                        </Typography>
                        <Typography variant="h4" sx={{ mt: 1 }}>
                          {formatCurrency(subscription.amount)}
                          <Typography component="span" variant="body2" color="text.secondary">
                            /{subscription.billingCycle.toLowerCase()}
                          </Typography>
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" gutterBottom>
                          Status: <Chip label={subscription.status} color={subscription.status === 'ACTIVE' ? 'success' : 'default'} size="small" />
                        </Typography>
                        <Typography variant="body2">
                          Next billing: {new Date(subscription.nextBillingDate).toLocaleDateString()}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Button variant="outlined" size="small">
                            Change Plan
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                ) : (
                  <Alert severity="info">No active subscription found.</Alert>
                )}
              </Grid>

              {/* Payment Methods */}
              <Grid item xs={12} md={6}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Payment Methods
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setSelectedPaymentMethod(null);
                      setNewPaymentMethod({
                        type: 'CREDIT_CARD',
                        nickname: '',
                        cardNumber: '',
                        expiryMonth: '',
                        expiryYear: '',
                        cvv: '',
                        bankName: '',
                        accountNumber: '',
                        routingNumber: '',
                        accountType: 'CHECKING',
                      });
                      setPaymentMethodDialogOpen(true);
                    }}
                  >
                    Add Payment Method
                  </Button>
                </Box>
                <List>
                  {paymentMethods.map((method, index) => (
                    <React.Fragment key={method.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              {getPaymentMethodIcon(method.type)}
                              <Typography variant="subtitle1">
                                {method.nickname}
                              </Typography>
                              {method.isDefault && (
                                <Chip label="Default" color="primary" size="small" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                {method.type === 'CREDIT_CARD' ? `•••• •••• •••• ${method.lastFour}` : `${method.bankName} ••••${method.lastFour}`}
                              </Typography>
                              {method.expiryDate && (
                                <Typography variant="body2" color="text.secondary">
                                  Expires {method.expiryDate}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          {!method.isDefault && (
                            <Button
                              size="small"
                              onClick={() => setDefaultPaymentMethod(method.id)}
                              sx={{ mr: 1 }}
                            >
                              Set Default
                            </Button>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedPaymentMethod(method);
                              setNewPaymentMethod({
                                type: method.type,
                                nickname: method.nickname,
                                cardNumber: '',
                                expiryMonth: '',
                                expiryYear: '',
                                cvv: '',
                                bankName: method.bankName || '',
                                accountNumber: '',
                                routingNumber: '',
                                accountType: method.accountType || 'CHECKING',
                              });
                              setPaymentMethodDialogOpen(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deletePaymentMethod(method.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < paymentMethods.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                  {paymentMethods.length === 0 && (
                    <ListItem>
                      <ListItemText
                        primary="No payment methods added"
                        secondary="Add a payment method to enable automatic billing"
                      />
                    </ListItem>
                  )}
                </List>
              </Grid>

              {/* Recent Invoices */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Recent Invoices
                </Typography>
                <List>
                  {invoices.slice(0, 5).map((invoice, index) => (
                    <React.Fragment key={invoice.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <ReceiptIcon fontSize="small" />
                              <Typography variant="subtitle1">
                                {invoice.invoiceNumber}
                              </Typography>
                              <Chip 
                                label={invoice.status} 
                                color={getStatusColor(invoice.status) as any} 
                                size="small" 
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                {formatCurrency(invoice.totalAmount)} • Due: {new Date(invoice.dueDate).toLocaleDateString()}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {invoice.description}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => downloadInvoice(invoice.id)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < Math.min(invoices.length, 5) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                  {invoices.length === 0 && (
                    <ListItem>
                      <ListItemText
                        primary="No invoices found"
                        secondary="Your invoices will appear here when available"
                      />
                    </ListItem>
                  )}
                </List>
                {invoices.length > 5 && (
                  <Button variant="text" fullWidth sx={{ mt: 1 }}>
                    View All Invoices
                  </Button>
                )}
              </Grid>

              {/* Billing Settings */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Billing Settings
                </Typography>
                {billingSettings && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={billingSettings.autoPayEnabled}
                            onChange={(e) => updateBillingSettings('autoPayEnabled', e.target.checked)}
                          />
                        }
                        label="Enable Automatic Payments"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={billingSettings.billingNotifications}
                            onChange={(e) => updateBillingSettings('billingNotifications', e.target.checked)}
                          />
                        }
                        label="Billing Notifications"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth margin="normal">
                        <InputLabel>Invoice Delivery</InputLabel>
                        <Select
                          value={billingSettings.invoiceDelivery}
                          label="Invoice Delivery"
                          onChange={(e) => updateBillingSettings('invoiceDelivery', e.target.value)}
                        >
                          <MenuItem value="EMAIL">Email Only</MenuItem>
                          <MenuItem value="POSTAL">Postal Mail Only</MenuItem>
                          <MenuItem value="BOTH">Email and Postal Mail</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        fullWidth
                        label="Payment Terms (days)"
                        type="number"
                        value={billingSettings.paymentTerms}
                        onChange={(e) => updateBillingSettings('paymentTerms', parseInt(e.target.value))}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        onClick={saveBillingSettings}
                        disabled={saving}
                        startIcon={<SaveIcon />}
                      >
                        {saving ? 'Saving...' : 'Save Billing Settings'}
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </TabPanel>

          {/* Emergency Contacts Tab */}
          <TabPanel value={activeTab} index={5}>
            <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Emergency Contacts
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedContact(null);
                  setNewContact({
                    name: '',
                    title: '',
                    phone: '',
                    email: '',
                    isPrimary: false,
                  });
                  setContactDialogOpen(true);
                }}
              >
                Add Contact
              </Button>
            </Box>
            <List>
              {emergencyContacts.map((contact, index) => (
                <React.Fragment key={contact.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            {contact.name}
                          </Typography>
                          {contact.isPrimary && (
                            <Chip label="Primary" color="primary" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {contact.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {contact.phone} • {contact.email}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedContact(contact);
                          setNewContact({
                            name: contact.name,
                            title: contact.title,
                            phone: contact.phone,
                            email: contact.email,
                            isPrimary: contact.isPrimary,
                          });
                          setContactDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteEmergencyContact(contact.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < emergencyContacts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </TabPanel>
        </Paper>
      )}

      {/* Emergency Contact Dialog */}
      <Dialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={newContact.name}
            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Title"
            value={newContact.title}
            onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Phone"
            value={newContact.phone}
            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Email"
            value={newContact.email}
            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
            margin="normal"
          />
          <FormControlLabel
            control={
              <Switch
                checked={newContact.isPrimary}
                onChange={(e) => setNewContact({ ...newContact, isPrimary: e.target.checked })}
              />
            }
            label="Primary Contact"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveEmergencyContact} variant="contained">
            {selectedContact ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

        {/* Payment Method Dialog */}
        <Dialog
          open={paymentMethodDialogOpen}
          onClose={() => setPaymentMethodDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {selectedPaymentMethod ? 'Edit Payment Method' : 'Add Payment Method'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method Type</InputLabel>
                  <Select
                    value={newPaymentMethod.type}
                    label="Payment Method Type"
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, type: e.target.value as 'CREDIT_CARD' | 'BANK_ACCOUNT' | 'ACH' })}
                  >
                    <MenuItem value="CREDIT_CARD">Credit Card</MenuItem>
                    <MenuItem value="BANK_ACCOUNT">Bank Account</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nickname"
                  value={newPaymentMethod.nickname}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, nickname: e.target.value })}
                  placeholder="e.g., Personal Visa, Business Checking"
                />
              </Grid>

              {newPaymentMethod.type === 'CREDIT_CARD' ? (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Card Number"
                      value={newPaymentMethod.cardNumber}
                      onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cardNumber: e.target.value })}
                      placeholder="1234 5678 9012 3456"
                      inputProps={{ maxLength: 19 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Expiry Month"
                      value={newPaymentMethod.expiryMonth}
                      onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryMonth: e.target.value })}
                      placeholder="MM"
                      inputProps={{ maxLength: 2 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Expiry Year"
                      value={newPaymentMethod.expiryYear}
                      onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryYear: e.target.value })}
                      placeholder="YYYY"
                      inputProps={{ maxLength: 4 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="CVV"
                      value={newPaymentMethod.cvv}
                      onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cvv: e.target.value })}
                      placeholder="123"
                      inputProps={{ maxLength: 4 }}
                      type="password"
                    />
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Bank Name"
                      value={newPaymentMethod.bankName}
                      onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, bankName: e.target.value })}
                      placeholder="e.g., Chase Bank"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Account Type</InputLabel>
                      <Select
                        value={newPaymentMethod.accountType}
                        label="Account Type"
                        onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, accountType: e.target.value as 'CHECKING' | 'SAVINGS' })}
                      >
                        <MenuItem value="CHECKING">Checking</MenuItem>
                        <MenuItem value="SAVINGS">Savings</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Account Number"
                      value={newPaymentMethod.accountNumber}
                      onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, accountNumber: e.target.value })}
                      placeholder="Account number"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Routing Number"
                      value={newPaymentMethod.routingNumber}
                      onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, routingNumber: e.target.value })}
                      placeholder="9-digit routing number"
                      inputProps={{ maxLength: 9 }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentMethodDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => savePaymentMethod()}
              variant="contained"
              disabled={saving || !newPaymentMethod.nickname}
            >
              {saving ? 'Saving...' : selectedPaymentMethod ? 'Update' : 'Add'} Payment Method
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  export default SettingsPage;
