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
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Campaign as BroadcastIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Message as MessageIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Notifications as PushIcon,
  ReportProblem as EmergencyIcon,
  Schedule as ScheduleIcon,
  AttachFile as AttachIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI, usersAPI, analyticsAPI } from '../../services/api';

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
      id={`communication-tabpanel-${index}`}
      aria-labelledby={`communication-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface Communication {
  id: string;
  type: 'EMAIL' | 'SMS' | 'PUSH_NOTIFICATION' | 'INTERNAL_MESSAGE' | 'BROADCAST' | 'EMERGENCY_ALERT';
  subject?: string;
  message: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY';
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  senderId?: string;
  recipientId?: string;
  groupId?: string;
  siteId?: string;
  scheduledAt?: string;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  recipient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  group?: {
    id: string;
    name: string;
    description?: string;
  };
  site?: {
    id: string;
    name: string;
  };
}

interface CommunicationGroup {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface CommunicationStats {
  totalMessages: number;
  sentToday: number;
  pendingMessages: number;
  failedMessages: number;
  emergencyAlerts: number;
  activeGroups: number;
}

const CommunicationCenterPage: React.FC = () => {
  const { user } = useAuth();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [groups, setGroups] = useState<CommunicationGroup[]>([]);
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null);
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Form states
  const [newMessage, setNewMessage] = useState({
    type: 'MESSAGE' as 'MESSAGE' | 'ALERT' | 'ANNOUNCEMENT' | 'EMERGENCY',
    subject: '',
    message: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    recipientId: '',
    groupId: '',
    siteId: '',
    scheduledAt: '',
    isEmergency: false,
  });

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    memberIds: [] as string[],
  });

  const [broadcastMessage, setBroadcastMessage] = useState({
    type: 'ANNOUNCEMENT' as 'ANNOUNCEMENT' | 'ALERT' | 'EMERGENCY',
    subject: '',
    message: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    groupId: '',
    targetAudience: 'all' as 'all' | 'agents' | 'supervisors' | 'clients',
    channels: {
      email: true,
      sms: false,
      push: true,
    },
    isEmergency: false,
  });

  // Data fetching functions
  const fetchAvailableUsers = useCallback(async () => {
    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      console.debug('Authentication not available for fetching users');
      return;
    }

    try {
      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Fetching available users with ${tokenInfo.type} token`);

      const response = await usersAPI.getAll({ available: true });
      setAvailableUsers(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch available users:', err);
    }
  }, []);

  const fetchCommunications = useCallback(async () => {
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
      console.debug(`Loading communication data with ${tokenInfo.type} token`);

      const [communicationsResponse, groupsResponse, statsResponse] = await Promise.all([
        adminAPI.getCommunications(),
        adminAPI.getCommunications({ type: 'groups' }), // Assuming groups are a type of communication
        analyticsAPI.getDashboard({ type: 'communication-stats' })
      ]);

      setCommunications(communicationsResponse.data.data || []);
      setGroups(groupsResponse.data.data || []);
      setStats(statsResponse.data.data || {
        totalMessages: 0,
        sentToday: 0,
        pendingMessages: 0,
        failedMessages: 0,
        emergencyAlerts: 0,
        activeGroups: 0,
      });
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Failed to fetch communications:', err);
      setError('Failed to load communication data. Please check your connection and try again.');
      setCommunications([]);
      setGroups([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = async () => {
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
      console.debug(`Sending message with ${tokenInfo.type} token`);

      const messageData = {
        type: newMessage.isEmergency ? 'EMERGENCY' : newMessage.type,
        subject: newMessage.subject,
        content: newMessage.message,
        priority: newMessage.isEmergency ? 'URGENT' : newMessage.priority,
        recipientId: newMessage.recipientId,
        isUrgent: newMessage.isEmergency || newMessage.priority === 'URGENT'
      };

      await adminAPI.createCommunication(messageData);

      setComposeDialogOpen(false);
      setNewMessage({
        type: 'MESSAGE',
        subject: '',
        message: '',
        priority: 'NORMAL',
        recipientId: '',
        groupId: '',
        siteId: '',
        scheduledAt: '',
        isEmergency: false,
      });
      fetchCommunications();

    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    }
  };

  const sendBroadcast = async () => {
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
      console.debug(`Sending broadcast with ${tokenInfo.type} token`);

      const broadcastData = {
        type: broadcastMessage.isEmergency ? 'EMERGENCY' : broadcastMessage.type,
        subject: broadcastMessage.subject,
        content: broadcastMessage.message,
        priority: broadcastMessage.isEmergency ? 'URGENT' : broadcastMessage.priority,
        groupId: broadcastMessage.groupId || null,
        isUrgent: broadcastMessage.isEmergency || broadcastMessage.priority === 'URGENT',
        isBroadcast: true
      };

      await adminAPI.createCommunication(broadcastData);

      setBroadcastDialogOpen(false);
      setBroadcastMessage({
        type: 'ANNOUNCEMENT',
        subject: '',
        message: '',
        priority: 'NORMAL',
        groupId: '',
        targetAudience: 'all',
        channels: {
          email: true,
          sms: false,
          push: true,
        },
        isEmergency: false,
      });
      fetchCommunications();

    } catch (err: any) {
      console.error('Failed to send broadcast:', err);
      setError('Failed to send broadcast. Please try again.');
    }
  };

  // Utility functions
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return <EmailIcon />;
      case 'SMS':
        return <SmsIcon />;
      case 'PUSH_NOTIFICATION':
        return <PushIcon />;
      case 'INTERNAL_MESSAGE':
        return <MessageIcon />;
      case 'BROADCAST':
        return <BroadcastIcon />;
      case 'EMERGENCY_ALERT':
        return <EmergencyIcon />;
      default:
        return <MessageIcon />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY':
        return 'error';
      case 'URGENT':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'NORMAL':
        return 'info';
      case 'LOW':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'success';
      case 'DELIVERED':
        return 'success';
      case 'READ':
        return 'info';
      case 'FAILED':
        return 'error';
      case 'SCHEDULED':
        return 'warning';
      case 'DRAFT':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredCommunications = communications.filter(comm => {
    if (filterType !== 'all' && comm.type !== filterType) return false;
    if (filterStatus !== 'all' && comm.status !== filterStatus) return false;
    if (filterPriority !== 'all' && comm.priority !== filterPriority) return false;
    if (searchQuery && !comm.subject?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !comm.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Effects
  useEffect(() => {
    fetchCommunications();
    fetchAvailableUsers();
  }, [fetchCommunications, fetchAvailableUsers]);

  useEffect(() => {
    const interval = setInterval(fetchCommunications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchCommunications]);

  // Loading state
  if (loading && communications.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Communication Center...
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
            Communication Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time messaging, broadcast capabilities, and team coordination
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
            onClick={fetchCommunications}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={() => setComposeDialogOpen(true)}
            startIcon={<SendIcon />}
          >
            Compose
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => setBroadcastDialogOpen(true)}
            startIcon={<BroadcastIcon />}
          >
            Broadcast
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Compose Message Dialog */}
      <Dialog
        open={composeDialogOpen}
        onClose={() => setComposeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Compose Message</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Message Type</InputLabel>
              <Select
                value={newMessage.type}
                label="Message Type"
                onChange={(e) => setNewMessage({ ...newMessage, type: e.target.value as 'MESSAGE' | 'ALERT' | 'ANNOUNCEMENT' | 'EMERGENCY' })}
              >
                <MenuItem value="MESSAGE">Message</MenuItem>
                <MenuItem value="ALERT">Alert</MenuItem>
                <MenuItem value="ANNOUNCEMENT">Announcement</MenuItem>
                <MenuItem value="EMERGENCY">Emergency</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Subject"
              value={newMessage.subject}
              onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
            />

            <TextField
              fullWidth
              label="Message"
              multiline
              rows={4}
              value={newMessage.message}
              onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newMessage.priority}
                label="Priority"
                onChange={(e) => setNewMessage({ ...newMessage, priority: e.target.value as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' })}
              >
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="NORMAL">Normal</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="URGENT">Urgent</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Recipient</InputLabel>
              <Select
                value={newMessage.recipientId}
                label="Recipient"
                onChange={(e) => setNewMessage({ ...newMessage, recipientId: e.target.value })}
              >
                {availableUsers.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComposeDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={sendMessage}
            variant="contained"
            disabled={!newMessage.subject || !newMessage.message || !newMessage.recipientId}
          >
            Send Message
          </Button>
        </DialogActions>
      </Dialog>

      {/* Broadcast Message Dialog */}
      <Dialog
        open={broadcastDialogOpen}
        onClose={() => setBroadcastDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Broadcast Message</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Broadcast Type</InputLabel>
              <Select
                value={broadcastMessage.type}
                label="Broadcast Type"
                onChange={(e) => setBroadcastMessage({ ...broadcastMessage, type: e.target.value as 'ANNOUNCEMENT' | 'ALERT' | 'EMERGENCY' })}
              >
                <MenuItem value="ANNOUNCEMENT">Announcement</MenuItem>
                <MenuItem value="ALERT">Alert</MenuItem>
                <MenuItem value="EMERGENCY">Emergency</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Subject"
              value={broadcastMessage.subject}
              onChange={(e) => setBroadcastMessage({ ...broadcastMessage, subject: e.target.value })}
            />

            <TextField
              fullWidth
              label="Message"
              multiline
              rows={4}
              value={broadcastMessage.message}
              onChange={(e) => setBroadcastMessage({ ...broadcastMessage, message: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={broadcastMessage.priority}
                label="Priority"
                onChange={(e) => setBroadcastMessage({ ...broadcastMessage, priority: e.target.value as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' })}
              >
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="NORMAL">Normal</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="URGENT">Urgent</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Target Group</InputLabel>
              <Select
                value={broadcastMessage.groupId}
                label="Target Group"
                onChange={(e) => setBroadcastMessage({ ...broadcastMessage, groupId: e.target.value })}
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name} ({group.memberCount} members)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBroadcastDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={sendBroadcast}
            variant="contained"
            color="warning"
            disabled={!broadcastMessage.subject || !broadcastMessage.message}
          >
            Send Broadcast
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommunicationCenterPage;
