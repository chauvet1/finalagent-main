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
  Divider,
  Alert,
  Menu,
  MenuList,
  ListItemButton,
  Avatar,
} from '@mui/material';
import {
  Receipt as BillingIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Send as SendIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  Description as InvoiceIcon,
  MoreVert as MoreIcon,
  Payment as PaymentIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, differenceInDays, isAfter, isBefore } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  paidDate?: Date;
  notes?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  serviceType: string;
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  method: 'credit_card' | 'bank_transfer' | 'check' | 'cash';
  reference: string;
  status: 'pending' | 'completed' | 'failed';
}

interface BillingSettings {
  defaultPaymentTerms: number;
  taxRate: number;
  currency: string;
  autoSendReminders: boolean;
  reminderDays: number[];
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
      id={`billing-tabpanel-${index}`}
      aria-labelledby={`billing-tab-${index}`}
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

const BillingPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInvoiceForMenu, setSelectedInvoiceForMenu] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    clientName: '',
    issueDate: new Date(),
    dueDate: addDays(new Date(), 30),
    items: [{ description: '', quantity: 1, unitPrice: 0, serviceType: 'security_services' }],
    notes: '',
  });

  useEffect(() => {
    // Load billing data from API
    const loadBillingData = async () => {
      // Check authentication availability first
      const authAvailable = await isAuthenticationAvailable();
      if (!authAvailable) {
        console.error('Authentication not available. Please log in.');
        return;
      }

      try {
        // Get current token info for debugging
        const tokenInfo = await getCurrentTokenInfo();
        console.debug(`Loading billing data with ${tokenInfo.type} token`);

        // Use the enhanced API service (token automatically injected)
        const [invoicesResponse, paymentsResponse] = await Promise.all([
          adminAPI.getBillingInvoices?.() || Promise.resolve({ data: { data: [] } }),
          adminAPI.getBillingPayments?.() || Promise.resolve({ data: { data: [] } })
        ]);
        
        setInvoices(invoicesResponse.data.data || []);
        setPayments(paymentsResponse.data.data || []);
      } catch (error: any) {
        console.error('Failed to load billing data:', error);
        // Initialize with empty arrays on error
        setInvoices([]);
        setPayments([]);
      }
    };
    
    loadBillingData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'sent': return 'info';
      case 'draft': return 'default';
      case 'overdue': return 'error';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card': return <CreditCardIcon />;
      case 'bank_transfer': return <BankIcon />;
      case 'check': return <PaymentIcon />;
      case 'cash': return <MoneyIcon />;
      default: return <PaymentIcon />;
    }
  };

  const getDaysOverdue = (dueDate: Date) => {
    const today = new Date();
    return differenceInDays(today, dueDate);
  };

  const handleOpenDialog = (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        clientName: invoice.clientName,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        items: invoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          serviceType: item.serviceType,
        })),
        notes: invoice.notes || '',
      });
    } else {
      setEditingInvoice(null);
      setFormData({
        clientName: '',
        issueDate: new Date(),
        dueDate: addDays(new Date(), 30),
        items: [{ description: '', quantity: 1, unitPrice: 0, serviceType: 'security_services' }],
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingInvoice(null);
  };

  const handleSaveInvoice = () => {
    // Implementation for saving invoice
    handleCloseDialog();
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, invoice: Invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoiceForMenu(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoiceForMenu(null);
  };

  const handleSendInvoice = () => {
    // Implementation for sending invoice
    handleMenuClose();
  };

  const handleMarkAsPaid = () => {
    // Implementation for marking invoice as paid
    handleMenuClose();
  };

  const addInvoiceItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unitPrice: 0, serviceType: 'security_services' }],
    });
  };

  const removeInvoiceItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.085; // 8.5% tax rate
  };

  const overdueInvoices = invoices.filter(invoice => invoice.status === 'overdue');
  const totalOutstanding = invoices
    .filter(invoice => invoice.status !== 'paid' && invoice.status !== 'cancelled')
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalPaid = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BillingIcon color="primary" />
            Billing & Invoicing
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            New Invoice
          </Button>
        </Box>

        {/* Alert for Overdue Invoices */}
        {overdueInvoices.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Overdue Invoices</Typography>
            <Typography>
              {overdueInvoices.length} invoice(s) are overdue with a total amount of $
              {overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}
            </Typography>
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main">
                  ${totalPaid.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Paid
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="warning.main">
                  ${totalOutstanding.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Outstanding
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="error.main">
                  {overdueInvoices.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overdue Invoices
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="info.main">
                  {invoices.filter(inv => inv.status === 'sent').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Payment
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="All Invoices" />
              <Tab label="Payments" />
              <Tab label="Reports" />
              <Tab label="Settings" />
            </Tabs>
          </Box>

          {/* Invoices Tab */}
          <TabPanel value={tabValue} index={0}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Issue Date</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => {
                    const daysOverdue = invoice.status === 'overdue' ? getDaysOverdue(invoice.dueDate) : 0;
                    
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <InvoiceIcon color="action" />
                            {invoice.invoiceNumber}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                              {invoice.clientName.charAt(0)}
                            </Avatar>
                            {invoice.clientName}
                          </Box>
                        </TableCell>
                        <TableCell>{format(invoice.issueDate, 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {format(invoice.dueDate, 'MMM dd, yyyy')}
                            </Typography>
                            {invoice.status === 'overdue' && (
                              <Typography variant="caption" color="error.main">
                                {daysOverdue} days overdue
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          ${invoice.totalAmount.toLocaleString()} {invoice.currency}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.status.replace('_', ' ').toUpperCase()}
                            color={getStatusColor(invoice.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <ViewIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(invoice)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, invoice)}
                          >
                            <MoreIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Payments Tab */}
          <TabPanel value={tabValue} index={1}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Payment ID</TableCell>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment) => {
                    const invoice = invoices.find(inv => inv.id === payment.invoiceId);
                    
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.id}</TableCell>
                        <TableCell>
                          {invoice ? invoice.invoiceNumber : 'N/A'}
                        </TableCell>
                        <TableCell>
                          ${payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getPaymentMethodIcon(payment.method)}
                            {payment.method.replace('_', ' ').toUpperCase()}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {format(payment.paymentDate, 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payment.status.toUpperCase()}
                            color={payment.status === 'completed' ? 'success' : payment.status === 'failed' ? 'error' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{payment.reference}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Reports Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Revenue Summary
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="This Month"
                          secondary={`$${invoices.filter(inv => 
                            inv.issueDate.getMonth() === new Date().getMonth()
                          ).reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Last Month"
                          secondary={`$${invoices.filter(inv => 
                            inv.issueDate.getMonth() === new Date().getMonth() - 1
                          ).reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Year to Date"
                          secondary={`$${invoices.filter(inv => 
                            inv.issueDate.getFullYear() === new Date().getFullYear()
                          ).reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}`}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Collection Metrics
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Average Days to Pay"
                          secondary="18 days"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Collection Rate"
                          secondary="94.2%"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Overdue Rate"
                          secondary="5.8%"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Settings Tab */}
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Default Settings
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Default Payment Terms (days)"
                          type="number"
                          defaultValue={30}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Tax Rate (%)"
                          type="number"
                          defaultValue={8.5}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Default Currency</InputLabel>
                          <Select defaultValue="USD">
                            <MenuItem value="USD">USD - US Dollar</MenuItem>
                            <MenuItem value="EUR">EUR - Euro</MenuItem>
                            <MenuItem value="GBP">GBP - British Pound</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Reminder Settings
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Send reminders before due date (days)"
                          defaultValue="7, 3, 1"
                          helperText="Comma-separated values"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Send overdue reminders every (days)"
                          type="number"
                          defaultValue={7}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Card>

        {/* Invoice Details Dialog */}
        {selectedInvoice && (
          <Dialog
            open={!!selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              Invoice Details - {selectedInvoice.invoiceNumber}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Invoice Information
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Client"
                        secondary={selectedInvoice.clientName}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Issue Date"
                        secondary={format(selectedInvoice.issueDate, 'MMM dd, yyyy')}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Due Date"
                        secondary={format(selectedInvoice.dueDate, 'MMM dd, yyyy')}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Status"
                        secondary={
                          <Chip
                            label={selectedInvoice.status.replace('_', ' ').toUpperCase()}
                            color={getStatusColor(selectedInvoice.status) as any}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Payment Information
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Subtotal"
                        secondary={`$${selectedInvoice.amount.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Tax"
                        secondary={`$${selectedInvoice.taxAmount.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Total Amount"
                        secondary={`$${selectedInvoice.totalAmount.toLocaleString()}`}
                      />
                    </ListItem>
                    {selectedInvoice.paymentMethod && (
                      <ListItem>
                        <ListItemText
                          primary="Payment Method"
                          secondary={selectedInvoice.paymentMethod.replace('_', ' ').toUpperCase()}
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Invoice Items
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Description</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Unit Price</TableCell>
                          <TableCell>Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedInvoice.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>${item.unitPrice.toLocaleString()}</TableCell>
                            <TableCell>${item.total.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                {selectedInvoice.notes && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Notes
                    </Typography>
                    <Typography variant="body2">
                      {selectedInvoice.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedInvoice(null)}>Close</Button>
              <Button startIcon={<DownloadIcon />}>Download PDF</Button>
              <Button variant="contained" startIcon={<SendIcon />}>
                Send Invoice
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Add/Edit Invoice Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
          <DialogTitle>
            {editingInvoice ? 'Edit Invoice' : 'New Invoice'}
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
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Issue Date"
                  value={formData.issueDate}
                  onChange={(date) => setFormData({ ...formData, issueDate: date || new Date() })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Due Date"
                  value={formData.dueDate}
                  onChange={(date) => setFormData({ ...formData, dueDate: date || new Date() })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              {/* Invoice Items */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Invoice Items
                </Typography>
                {formData.items.map((item, index) => (
                  <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Description"
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Quantity"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', Number(e.target.value))}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Unit Price"
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateInvoiceItem(index, 'unitPrice', Number(e.target.value))}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth>
                        <InputLabel>Service Type</InputLabel>
                        <Select
                          value={item.serviceType}
                          onChange={(e) => updateInvoiceItem(index, 'serviceType', e.target.value)}
                        >
                          <MenuItem value="security_services">Security Services</MenuItem>
                          <MenuItem value="patrol">Patrol Services</MenuItem>
                          <MenuItem value="monitoring">Monitoring</MenuItem>
                          <MenuItem value="emergency_response">Emergency Response</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          ${(item.quantity * item.unitPrice).toLocaleString()}
                        </Typography>
                        {formData.items.length > 1 && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeInvoiceItem(index)}
                          >
                            ×
                          </IconButton>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={addInvoiceItem}
                  sx={{ mb: 2 }}
                >
                  Add Item
                </Button>
              </Grid>
              
              {/* Totals */}
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'right', mt: 2 }}>
                  <Typography variant="body1">
                    Subtotal: ${calculateSubtotal().toLocaleString()}
                  </Typography>
                  <Typography variant="body1">
                    Tax (8.5%): ${calculateTax(calculateSubtotal()).toLocaleString()}
                  </Typography>
                  <Typography variant="h6">
                    Total: ${(calculateSubtotal() + calculateTax(calculateSubtotal())).toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleSaveInvoice}
              variant="contained"
              disabled={!formData.clientName || formData.items.some(item => !item.description)}
            >
              {editingInvoice ? 'Update' : 'Create'} Invoice
            </Button>
          </DialogActions>
        </Dialog>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuList>
            <ListItemButton onClick={handleSendInvoice}>
              <ListItemIcon>
                <SendIcon />
              </ListItemIcon>
              <ListItemText>Send Invoice</ListItemText>
            </ListItemButton>
            <ListItemButton onClick={handleMarkAsPaid}>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText>Mark as Paid</ListItemText>
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon>
                <DownloadIcon />
              </ListItemIcon>
              <ListItemText>Download PDF</ListItemText>
            </ListItemButton>
          </MenuList>
        </Menu>
      </Box>
    </LocalizationProvider>
  );
};

export default BillingPage;