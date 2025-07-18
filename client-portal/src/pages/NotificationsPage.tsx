import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Button,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { clientPortalAPI } from '../services/api';

interface Notification {
  id: string;
  type: 'SECURITY' | 'SYSTEM' | 'BILLING' | 'SERVICE' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionUrl?: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  securityAlerts: boolean;
  billingAlerts: boolean;
  serviceUpdates: boolean;
  systemMaintenance: boolean;
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    securityAlerts: true,
    billingAlerts: true,
    serviceUpdates: true,
    systemMaintenance: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
    loadSettings();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clientPortalAPI.getNotifications();
      setNotifications(response.data || []);
    } catch (err: any) {
      setError('Failed to load notifications');
      console.error('Notifications load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      // Assuming there's a notification settings endpoint
      // const response = await clientPortalAPI.getNotificationSettings();
      // setSettings(response.data);
    } catch (err: any) {
      console.error('Settings load error:', err);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // await clientPortalAPI.markNotificationRead(notificationId);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err: any) {
      console.error('Mark as read error:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // await clientPortalAPI.markAllNotificationsRead();
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (err: any) {
      console.error('Mark all as read error:', err);
    }
  };

  const handleClearNotification = async (notificationId: string) => {
    try {
      // await clientPortalAPI.deleteNotification(notificationId);
      
      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
    } catch (err: any) {
      console.error('Clear notification error:', err);
    }
  };

  const handleSettingChange = async (setting: keyof NotificationSettings, value: boolean) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const newSettings = { ...settings, [setting]: value };
      setSettings(newSettings);

      // await clientPortalAPI.updateNotificationSettings(newSettings);
      setSuccess('Settings updated successfully');
    } catch (err: any) {
      setError('Failed to update settings');
      console.error('Settings update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SECURITY': return <SecurityIcon color="error" />;
      case 'BILLING': return <InfoIcon color="warning" />;
      case 'SERVICE': return <CheckCircleIcon color="success" />;
      case 'SYSTEM': return <SettingsIcon color="info" />;
      default: return <InfoIcon color="primary" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <NotificationsIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Notifications
        </Typography>
        {unreadCount > 0 && (
          <Chip 
            label={`${unreadCount} unread`} 
            color="primary" 
            size="small" 
            sx={{ ml: 2 }} 
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Box display="flex" gap={3}>
        {/* Notifications List */}
        <Paper elevation={3} sx={{ flex: 2, p: 3 }}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
            <Typography variant="h6">Recent Notifications</Typography>
            <Box>
              <IconButton onClick={loadNotifications} disabled={loading}>
                <RefreshIcon />
              </IconButton>
              {unreadCount > 0 && (
                <Button 
                  size="small" 
                  onClick={handleMarkAllAsRead}
                  sx={{ ml: 1 }}
                >
                  Mark All Read
                </Button>
              )}
            </Box>
          </Box>

          {notifications.length === 0 ? (
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center" 
              py={4}
            >
              <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No notifications
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You're all caught up!
              </Typography>
            </Box>
          ) : (
            <List>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      backgroundColor: notification.read ? 'transparent' : 'action.hover',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemIcon>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography 
                            variant="subtitle1" 
                            fontWeight={notification.read ? 'normal' : 'bold'}
                          >
                            {notification.title}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                              label={notification.priority}
                              size="small"
                              color={getPriorityColor(notification.priority) as any}
                              variant="outlined"
                            />
                            <IconButton 
                              size="small" 
                              onClick={() => handleClearNotification(notification.id)}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.primary" gutterBottom>
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(notification.timestamp)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>

        {/* Settings Panel */}
        <Paper elevation={3} sx={{ flex: 1, p: 3 }}>
          <Typography variant="h6" mb={2}>Notification Settings</Typography>
          
          <List>
            <ListItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    disabled={saving}
                  />
                }
                label="Email Notifications"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.smsNotifications}
                    onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                    disabled={saving}
                  />
                }
                label="SMS Notifications"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.securityAlerts}
                    onChange={(e) => handleSettingChange('securityAlerts', e.target.checked)}
                    disabled={saving}
                  />
                }
                label="Security Alerts"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.billingAlerts}
                    onChange={(e) => handleSettingChange('billingAlerts', e.target.checked)}
                    disabled={saving}
                  />
                }
                label="Billing Alerts"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.serviceUpdates}
                    onChange={(e) => handleSettingChange('serviceUpdates', e.target.checked)}
                    disabled={saving}
                  />
                }
                label="Service Updates"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.systemMaintenance}
                    onChange={(e) => handleSettingChange('systemMaintenance', e.target.checked)}
                    disabled={saving}
                  />
                }
                label="System Maintenance"
              />
            </ListItem>
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotificationsPage;
