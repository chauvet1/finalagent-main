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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Assignment as ContractIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Description as DocumentIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, differenceInDays, addDays } from 'date-fns';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface Contract {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  type: 'security_services' | 'patrol' | 'monitoring' | 'consulting';
  status: 'draft' | 'active' | 'expired' | 'terminated' | 'pending_renewal';
  startDate: Date;
  endDate: Date;
  value: number;
  currency: string;
  renewalTerms: string;
  slaMetrics: SLAMetric[];
  documents: ContractDocument[];
  lastReviewed: Date;
  nextReview: Date;
}

interface SLAMetric {
  id: string;
  name: string;
  description: string;
  target: number;
  unit: string;
  currentValue: number;
  status: 'meeting' | 'at_risk' | 'failing';
  lastUpdated: Date;
}

interface ContractDocument {
  id: string;
  name: string;
  type: 'contract' | 'amendment' | 'sla' | 'invoice' | 'report';
  uploadDate: Date;
  size: string;
  url: string;
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
      id={`contracts-tabpanel-${index}`}
      aria-labelledby={`contracts-tab-${index}`}
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

const ContractsPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState<{
    clientName: string;
    title: string;
    type: 'security_services' | 'patrol' | 'monitoring' | 'consulting';
    startDate: Date;
    endDate: Date;
    value: number;
    renewalTerms: string;
  }>({
    clientName: '',
    title: '',
    type: 'security_services',
    startDate: new Date(),
    endDate: addDays(new Date(), 365),
    value: 0,
    renewalTerms: '',
  });

  useEffect(() => {
    // Load contracts from API
    const loadContracts = async () => {
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
        console.debug(`Loading contracts with ${tokenInfo.type} token`);

        // Use the enhanced API service (token automatically injected)
        const response = await adminAPI.getContracts();
        
        const contractsData = response.data.data || [];
        
        // Transform the data to match our Contract interface
        const transformedContracts = contractsData.map((contract: any) => ({
          ...contract,
          startDate: new Date(contract.startDate),
          endDate: new Date(contract.endDate),
          lastReviewed: new Date(contract.lastReviewed || Date.now()),
          nextReview: new Date(contract.nextReview || Date.now()),
          slaMetrics: contract.slaMetrics || [],
          documents: contract.documents || [],
        }));
        setContracts(transformedContracts);
      } catch (error: any) {
        console.error('Failed to load contracts:', error);
        setError(error.response?.data?.message || 'Failed to load contracts');
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadContracts();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'info';
      case 'expired': return 'error';
      case 'terminated': return 'error';
      case 'pending_renewal': return 'warning';
      default: return 'default';
    }
  };

  const getSLAStatusColor = (status: string) => {
    switch (status) {
      case 'meeting': return 'success';
      case 'at_risk': return 'warning';
      case 'failing': return 'error';
      default: return 'default';
    }
  };

  const getDaysUntilExpiry = (endDate: Date) => {
    return differenceInDays(endDate, new Date());
  };

  const getExpiryStatus = (endDate: Date) => {
    const days = getDaysUntilExpiry(endDate);
    if (days < 0) return 'expired';
    if (days <= 30) return 'expiring_soon';
    return 'active';
  };

  const handleOpenDialog = (contract?: Contract) => {
    if (contract) {
      setEditingContract(contract);
      setFormData({
        clientName: contract.clientName,
        title: contract.title,
        type: contract.type,
        startDate: contract.startDate,
        endDate: contract.endDate,
        value: contract.value,
        renewalTerms: contract.renewalTerms,
      });
    } else {
      setEditingContract(null);
      setFormData({
        clientName: '',
        title: '',
        type: 'security_services',
        startDate: new Date(),
        endDate: addDays(new Date(), 365),
        value: 0,
        renewalTerms: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingContract(null);
  };

  const handleSaveContract = async () => {
    try {
      setLoading(true);
      
      const contractData = {
        clientName: formData.clientName,
        title: formData.title,
        type: formData.type,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        value: formData.value,
        currency: 'USD',
        renewalTerms: formData.renewalTerms,
        status: 'draft',
        slaMetrics: [],
        documents: [],
        lastReviewed: new Date().toISOString(),
        nextReview: addDays(new Date(), 90).toISOString(), // Review in 90 days
      };

      if (editingContract) {
        // Update existing contract
        await adminAPI.updateContract(editingContract.id, contractData);
        
        // Update the contract in the local state
        setContracts(prev => prev.map(contract =>
          contract.id === editingContract.id
            ? { ...contract, ...contractData, startDate: formData.startDate, endDate: formData.endDate } as unknown as Contract
            : contract
        ));
      } else {
        // Create new contract
        const response = await adminAPI.createContract(contractData);
        const newContract = {
          ...response.data.data,
          startDate: formData.startDate,
          endDate: formData.endDate,
          lastReviewed: new Date(),
          nextReview: addDays(new Date(), 90),
        };
        
        // Add the new contract to the local state
        setContracts(prev => [...prev, newContract]);
      }
      
      handleCloseDialog();
    } catch (error: any) {
      console.error('Failed to save contract:', error);
      setError(error.response?.data?.message || 'Failed to save contract');
    } finally {
      setLoading(false);
    }
  };

  const expiringContracts = contracts.filter(contract => {
    const days = getDaysUntilExpiry(contract.endDate);
    return days >= 0 && days <= 30;
  });

  const expiredContracts = contracts.filter(contract => 
    getDaysUntilExpiry(contract.endDate) < 0
  );

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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ContractIcon color="primary" />
            Contracts & SLAs
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            New Contract
          </Button>
        </Box>

        {/* Alert Banners */}
        {expiredContracts.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Expired Contracts</Typography>
            <Typography>
              {expiredContracts.length} contract(s) have expired and require immediate attention.
            </Typography>
          </Alert>
        )}

        {expiringContracts.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="h6">Contracts Expiring Soon</Typography>
            <Typography>
              {expiringContracts.length} contract(s) will expire within 30 days.
            </Typography>
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  {contracts.filter(c => c.status === 'active').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Contracts
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="warning.main">
                  {expiringContracts.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expiring Soon
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main">
                  ${contracts.reduce((sum, c) => sum + c.value, 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Contract Value
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="info.main">
                  {contracts.filter(c => c.status === 'pending_renewal').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Renewal
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Contracts Table */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              All Contracts
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Contract Title</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contracts.map((contract) => {
                    const expiryStatus = getExpiryStatus(contract.endDate);
                    const daysUntilExpiry = getDaysUntilExpiry(contract.endDate);
                    
                    return (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BusinessIcon color="action" />
                            {contract.clientName}
                          </Box>
                        </TableCell>
                        <TableCell>{contract.title}</TableCell>
                        <TableCell>
                          <Chip
                            label={contract.type.replace('_', ' ').toUpperCase()}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={contract.status.replace('_', ' ').toUpperCase()}
                            color={getStatusColor(contract.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          ${contract.value.toLocaleString()} {contract.currency}
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {format(contract.endDate, 'MMM dd, yyyy')}
                            </Typography>
                            {expiryStatus === 'expiring_soon' && (
                              <Typography variant="caption" color="warning.main">
                                {daysUntilExpiry} days left
                              </Typography>
                            )}
                            {expiryStatus === 'expired' && (
                              <Typography variant="caption" color="error.main">
                                Expired {Math.abs(daysUntilExpiry)} days ago
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => setSelectedContract(contract)}
                          >
                            <ViewIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(contract)}
                          >
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Contract Details Dialog */}
        {selectedContract && (
          <Dialog
            open={!!selectedContract}
            onClose={() => setSelectedContract(null)}
            maxWidth="lg"
            fullWidth
          >
            <DialogTitle>
              Contract Details - {selectedContract.clientName}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                  <Tab label="Overview" />
                  <Tab label="SLA Metrics" />
                  <Tab label="Documents" />
                  <Tab label="Timeline" />
                </Tabs>
              </Box>

              {/* Overview Tab */}
              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Contract Information
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Contract Title"
                          secondary={selectedContract.title}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Type"
                          secondary={selectedContract.type.replace('_', ' ').toUpperCase()}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Value"
                          secondary={`$${selectedContract.value.toLocaleString()} ${selectedContract.currency}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Duration"
                          secondary={`${format(selectedContract.startDate, 'MMM dd, yyyy')} - ${format(selectedContract.endDate, 'MMM dd, yyyy')}`}
                        />
                      </ListItem>
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Renewal Terms
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {selectedContract.renewalTerms}
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      Review Schedule
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Last Reviewed"
                          secondary={format(selectedContract.lastReviewed, 'MMM dd, yyyy')}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Next Review"
                          secondary={format(selectedContract.nextReview, 'MMM dd, yyyy')}
                        />
                      </ListItem>
                    </List>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* SLA Metrics Tab */}
              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={3}>
                  {selectedContract.slaMetrics.map((metric) => (
                    <Grid item xs={12} md={6} key={metric.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Typography variant="h6">
                              {metric.name}
                            </Typography>
                            <Chip
                              label={metric.status.replace('_', ' ').toUpperCase()}
                              color={getSLAStatusColor(metric.status) as any}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {metric.description}
                          </Typography>
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" gutterBottom>
                              Target: {metric.target} {metric.unit}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              Current: {metric.currentValue} {metric.unit}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={(metric.currentValue / metric.target) * 100}
                              color={getSLAStatusColor(metric.status) as any}
                              sx={{ mt: 1 }}
                            />
                          </Box>
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Last Updated: {metric.lastUpdated.toLocaleString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </TabPanel>

              {/* Documents Tab */}
              <TabPanel value={tabValue} index={2}>
                <List>
                  {selectedContract.documents.map((document) => (
                    <ListItem key={document.id} divider>
                      <ListItemIcon>
                        <DocumentIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={document.name}
                        secondary={`${document.type.replace('_', ' ').toUpperCase()} • ${document.size} • Uploaded ${format(document.uploadDate, 'MMM dd, yyyy')}`}
                      />
                      <IconButton>
                        <DownloadIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              </TabPanel>

              {/* Timeline Tab */}
              <TabPanel value={tabValue} index={3}>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Contract Signed"
                      secondary={format(selectedContract.startDate, 'MMM dd, yyyy')}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <ScheduleIcon color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Last Review"
                      secondary={format(selectedContract.lastReviewed, 'MMM dd, yyyy')}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <WarningIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Next Review Due"
                      secondary={format(selectedContract.nextReview, 'MMM dd, yyyy')}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <TimelineIcon color={getExpiryStatus(selectedContract.endDate) === 'expired' ? 'error' : 'primary'} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Contract Expires"
                      secondary={format(selectedContract.endDate, 'MMM dd, yyyy')}
                    />
                  </ListItem>
                </List>
              </TabPanel>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedContract(null)}>Close</Button>
              <Button variant="contained" onClick={() => handleOpenDialog(selectedContract)}>
                Edit Contract
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Add/Edit Contract Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingContract ? 'Edit Contract' : 'New Contract'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Client Name"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Contract Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <MenuItem value="security_services">Security Services</MenuItem>
                    <MenuItem value="patrol">Patrol Services</MenuItem>
                    <MenuItem value="monitoring">Monitoring Services</MenuItem>
                    <MenuItem value="consulting">Security Consulting</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contract Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(date) => setFormData({ ...formData, startDate: date || new Date() })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(date) => setFormData({ ...formData, endDate: date || new Date() })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Contract Value (USD)"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Renewal Terms"
                  multiline
                  rows={3}
                  value={formData.renewalTerms}
                  onChange={(e) => setFormData({ ...formData, renewalTerms: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleSaveContract}
              variant="contained"
              disabled={!formData.clientName || !formData.title}
            >
              {editingContract ? 'Update' : 'Create'} Contract
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ContractsPage;