import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Badge,
  Divider,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import {
  Send as SendIcon,
  Message as MessageIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Notifications as NotificationIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  ReportProblem as EmergencyIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  AttachFile as AttachIcon,
  Mic as MicIcon,
  VideoCall as VideoIcon,
  RadioButtonChecked as RadioIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface Message {
  id: string;
  type: 'sms' | 'email' | 'push' | 'radio' | 'phone';
  sender: string;
  recipient: string | string[];
  subject?: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  priority: 'low' | 'normal' | 'high' | 'emergency';
  attachments?: string[];
  groupId?: string;
  isEmergency?: boolean;
}

interface CommunicationGroup {
  id: string;
  name: string;
  type: 'team' | 'site' | 'client' | 'emergency';
  members: string[];
  description: string;
  isActive: boolean;
  createdDate: Date;
}

interface Contact {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  radioId?: string;
  isOnline: boolean;
  lastSeen?: Date;
  avatar?: string;
  department: string;
}

const mockMessages: Message[] = [
  {
    id: '1',
    type: 'radio',
    sender: 'Agent Smith',
    recipient: 'Security Team Alpha',
    content: 'Patrol complete on sector 7. All clear.',
    timestamp: new Date('2024-01-15T14:30:00'),
    status: 'delivered',
    priority: 'normal',
    groupId: 'team-alpha',
  },
  {
    id: '2',
    type: 'sms',
    sender: 'Control Center',
    recipient: '+1-555-0123',
    subject: 'Shift Reminder',
    content: 'Your shift starts in 30 minutes. Please confirm receipt.',
    timestamp: new Date('2024-01-15T13:45:00'),
    status: 'read',
    priority: 'normal',
  },
  {
    id: '3',
    type: 'email',
    sender: 'System Admin',
    recipient: ['team@security.com', 'manager@security.com'],
    subject: 'Security Alert - Unauthorized Access Attempt',
    content: 'Multiple failed login attempts detected from IP 192.168.1.100. Please investigate immediately.',
    timestamp: new Date('2024-01-15T12:15:00'),
    status: 'delivered',
    priority: 'high',
    isEmergency: true,
  },
  {
    id: '4',
    type: 'push',
    sender: 'Mobile App',
    recipient: 'All Guards',
    content: 'Weather alert: Heavy rain expected. Take necessary precautions.',
    timestamp: new Date('2024-01-15T11:00:00'),
    status: 'delivered',
    priority: 'normal',
  },
];

const mockGroups: CommunicationGroup[] = [
  {
    id: 'team-alpha',
    name: 'Security Team Alpha',
    type: 'team',
    members: ['agent1', 'agent2', 'agent3', 'supervisor1'],
    description: 'Primary security team for building A',
    isActive: true,
    createdDate: new Date('2024-01-01'),
  },
  {
    id: 'emergency-response',
    name: 'Emergency Response Team',
    type: 'emergency',
    members: ['supervisor1', 'supervisor2', 'manager1', 'control-center'],
    description: 'Emergency escalation and response coordination',
    isActive: true,
    createdDate: new Date('2024-01-01'),
  },
  {
    id: 'client-techcorp',
    name: 'TechCorp Communications',
    type: 'client',
    members: ['client-contact1', 'account-manager', 'supervisor1'],
    description: 'Client communication channel for TechCorp',
    isActive: true,
    createdDate: new Date('2024-01-05'),
  },
];

const mockContacts: Contact[] = [
  {
    id: 'agent1',
    name: 'John Smith',
    role: 'Security Guard',
    phone: '+1-555-0101',
    email: 'john.smith@security.com',
    radioId: 'RADIO-001',
    isOnline: true,
    department: 'Security',
  },
  {
    id: 'agent2',
    name: 'Sarah Johnson',
    role: 'Security Guard',
    phone: '+1-555-0102',
    email: 'sarah.johnson@security.com',
    radioId: 'RADIO-002',
    isOnline: false,
    lastSeen: new Date('2024-01-15T13:00:00'),
    department: 'Security',
  },
  {
    id: 'supervisor1',
    name: 'Mike Wilson',
    role: 'Security Supervisor',
    phone: '+1-555-0201',
    email: 'mike.wilson@security.com',
    radioId: 'RADIO-SUP-001',
    isOnline: true,
    department: 'Management',
  },
];

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
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CommunicationPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [groups, setGroups] = useState<CommunicationGroup[]>(mockGroups);
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [tabValue, setTabValue] = useState(0);
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [messageType, setMessageType] = useState<'sms' | 'email' | 'push' | 'radio'>('sms');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'emergency'>('normal');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSendMessage = () => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: messageType,
      sender: 'Control Center',
      recipient: selectedGroup || recipient,
      subject: messageType === 'email' ? subject : undefined,
      content: messageContent,
      timestamp: new Date(),
      status: 'sent',
      priority,
      groupId: selectedGroup || undefined,
      isEmergency: priority === 'emergency',
    };

    setMessages(prev => [newMessage, ...prev]);
    setComposeDialogOpen(false);
    setRecipient('');
    setSubject('');
    setMessageContent('');
    setPriority('normal');
    setSelectedGroup('');
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'sms': return <SmsIcon />;
      case 'email': return <EmailIcon />;
      case 'push': return <NotificationIcon />;
      case 'radio': return <RadioIcon />;
      case 'phone': return <PhoneIcon />;
      default: return <MessageIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'info';
      case 'delivered': return 'success';
      case 'read': return 'primary';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.sender.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || message.status === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const onlineContacts = contacts.filter(contact => contact.isOnline);
  const emergencyMessages = messages.filter(message => message.isEmergency || message.priority === 'emergency');

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Communication Center
        </Typography>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={() => setComposeDialogOpen(true)}
        >
          New Message
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Online Contacts
              </Typography>
              <Typography variant="h4" color="success">
                {onlineContacts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Messages Today
              </Typography>
              <Typography variant="h4">
                {messages.filter(m => 
                  format(m.timestamp, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                ).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Emergency Alerts
              </Typography>
              <Typography variant="h4" color="error">
                {emergencyMessages.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Groups
              </Typography>
              <Typography variant="h4">
                {groups.filter(g => g.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Emergency Alerts */}
      {emergencyMessages.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Active Emergency Communications
          </Typography>
          {emergencyMessages.slice(0, 3).map(message => (
            <Typography key={message.id} variant="body2">
              • {message.content} ({format(message.timestamp, 'HH:mm')})
            </Typography>
          ))}
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Messages" icon={<MessageIcon />} />
            <Tab label="Contacts" icon={<PersonIcon />} />
            <Tab label="Groups" icon={<GroupIcon />} />
            <Tab label="Radio" icon={<RadioIcon />} />
          </Tabs>
        </Box>

        {/* Messages Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Search and Filter */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="All">All Messages</MenuItem>
                  <MenuItem value="Sent">Sent</MenuItem>
                  <MenuItem value="Delivered">Delivered</MenuItem>
                  <MenuItem value="Read">Read</MenuItem>
                  <MenuItem value="Failed">Failed</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Messages Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>From/To</TableCell>
                  <TableCell>Content</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMessages
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((message) => (
                    <TableRow key={message.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getMessageIcon(message.type)}
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {message.type}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            From: {message.sender}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            To: {Array.isArray(message.recipient) ? 
                              message.recipient.join(', ') : 
                              message.recipient
                            }
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {message.subject && (
                            <Typography variant="body2" fontWeight="medium">
                              {message.subject}
                            </Typography>
                          )}
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {message.content}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={message.priority}
                          color={getPriorityColor(message.priority) as any}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={message.status}
                          color={getStatusColor(message.status) as any}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(message.timestamp, 'MMM dd, HH:mm')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredMessages.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </TabPanel>

        {/* Contacts Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {contacts.map((contact) => (
              <Grid item xs={12} sm={6} md={4} key={contact.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Badge
                        color={contact.isOnline ? 'success' : 'default'}
                        variant="dot"
                        overlap="circular"
                      >
                        <Avatar>{contact.name.charAt(0)}</Avatar>
                      </Badge>
                      <Box>
                        <Typography variant="h6">
                          {contact.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {contact.role}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {contact.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {contact.phone}
                          </Typography>
                        </Box>
                      )}
                      {contact.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {contact.email}
                          </Typography>
                        </Box>
                      )}
                      {contact.radioId && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <RadioIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {contact.radioId}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        label={contact.isOnline ? 'Online' : 'Offline'}
                        color={contact.isOnline ? 'success' : 'default'}
                        size="small"
                      />
                      {!contact.isOnline && contact.lastSeen && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          Last seen: {format(contact.lastSeen, 'MMM dd, HH:mm')}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button size="small" startIcon={<MessageIcon />}>
                      Message
                    </Button>
                    <Button size="small" startIcon={<PhoneIcon />}>
                      Call
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Groups Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {groups.map((group) => (
              <Grid item xs={12} sm={6} md={4} key={group.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <GroupIcon color="primary" />
                      <Box>
                        <Typography variant="h6">
                          {group.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {group.type} • {group.members.length} members
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {group.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        label={group.isActive ? 'Active' : 'Inactive'}
                        color={group.isActive ? 'success' : 'default'}
                        size="small"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Created: {format(group.createdDate, 'MMM dd, yyyy')}
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button size="small" startIcon={<MessageIcon />}>
                      Message Group
                    </Button>
                    <Button size="small" startIcon={<EditIcon />}>
                      Edit
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Radio Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Radio Communications
                  </Typography>
                  <List>
                    {messages
                      .filter(m => m.type === 'radio')
                      .slice(0, 10)
                      .map((message) => (
                        <ListItem key={message.id}>
                          <ListItemAvatar>
                            <Avatar>
                              <RadioIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={message.content}
                            secondary={`${message.sender} • ${format(message.timestamp, 'HH:mm')}`}
                          />
                          <ListItemSecondaryAction>
                            <Chip
                              label={message.priority}
                              color={getPriorityColor(message.priority) as any}
                              size="small"
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Radio Status
                  </Typography>
                  <List>
                    {contacts
                      .filter(c => c.radioId)
                      .map((contact) => (
                        <ListItem key={contact.id}>
                          <ListItemAvatar>
                            <Badge
                              color={contact.isOnline ? 'success' : 'default'}
                              variant="dot"
                            >
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {contact.name.charAt(0)}
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary={contact.name}
                            secondary={contact.radioId}
                          />
                        </ListItem>
                      ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Compose Message Dialog */}
      <Dialog
        open={composeDialogOpen}
        onClose={() => setComposeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Compose New Message
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Message Type</InputLabel>
                <Select
                  value={messageType}
                  label="Message Type"
                  onChange={(e) => setMessageType(e.target.value as any)}
                >
                  <MenuItem value="sms">SMS</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="push">Push Notification</MenuItem>
                  <MenuItem value="radio">Radio</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priority}
                  label="Priority"
                  onChange={(e) => setPriority(e.target.value as any)}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="emergency">Emergency</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Group</InputLabel>
                <Select
                  value={selectedGroup}
                  label="Group"
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  <MenuItem value="">Select individual recipient</MenuItem>
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {!selectedGroup && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter phone number, email, or radio ID"
                />
              </Grid>
            )}
            
            {messageType === 'email' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message"
                multiline
                rows={4}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message here..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComposeDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!messageContent || (!selectedGroup && !recipient)}
            startIcon={<SendIcon />}
          >
            Send Message
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommunicationPage;