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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';
import {
  AccessTime as TimeIcon,
  Person as PersonIcon,
  CheckCircle as CheckInIcon,
  Cancel as CheckOutIcon,
  Warning as LateIcon,
  Error as AbsentIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  LocationOn as LocationIcon,
  Fingerprint as BiometricIcon,
  QrCode as QrCodeIcon,
  Phone as PhoneIcon,
  Notifications as NotificationIcon,
  Assignment as ReportIcon,
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, addDays, differenceInMinutes, parseISO } from 'date-fns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker as MuiTimePicker } from '@mui/x-date-pickers/TimePicker';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: 'present' | 'absent' | 'late' | 'early-departure' | 'overtime';
  location?: string;
  checkInMethod?: 'biometric' | 'qr-code' | 'mobile' | 'manual';
  checkOutMethod?: 'biometric' | 'qr-code' | 'mobile' | 'manual';
  totalHours?: number;
  overtimeHours?: number;
  breakTime?: number;
  notes?: string;
  approvedBy?: string;
  isApproved: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  avatar?: string;
  isActive: boolean;
  workSchedule: {
    monday: { start: string; end: string; isWorkDay: boolean };
    tuesday: { start: string; end: string; isWorkDay: boolean };
    wednesday: { start: string; end: string; isWorkDay: boolean };
    thursday: { start: string; end: string; isWorkDay: boolean };
    friday: { start: string; end: string; isWorkDay: boolean };
    saturday: { start: string; end: string; isWorkDay: boolean };
    sunday: { start: string; end: string; isWorkDay: boolean };
  };
}

interface AttendanceSettings {
  gracePeriodsMinutes: number;
  overtimeThresholdMinutes: number;
  autoCheckOutHours: number;
  requireLocationVerification: boolean;
  allowMobileCheckIn: boolean;
  allowQrCodeCheckIn: boolean;
  requireBiometricVerification: boolean;
  notifyManagerOnLateArrival: boolean;
  notifyManagerOnAbsence: boolean;
}

// Employee data will be loaded from API

// Attendance records will be loaded from API

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
      id={`attendance-tabpanel-${index}`}
      aria-labelledby={`attendance-tab-${index}`}
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

const AttendancePage: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [manualEntryDialogOpen, setManualEntryDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);

  useEffect(() => {
    const loadAttendanceData = async () => {
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
        console.debug(`Loading attendance data with ${tokenInfo.type} token`);

        // Use the enhanced API service (token automatically injected)
        const [employeesResponse, attendanceResponse] = await Promise.all([
          adminAPI.getEmployees?.() || adminAPI.getUsers(),
          adminAPI.getAttendanceRecords?.() || adminAPI.getAttendance()
        ]);
        
        const employeesData = employeesResponse.data.data || [];
        const attendanceData = attendanceResponse.data.data || [];
        
        setEmployees(employeesData);
        setAttendanceRecords(attendanceData);
      } catch (err: any) {
        console.error('Failed to load attendance data:', err);
        setError(err.response?.data?.message || 'Failed to load attendance data');
        
        // Initialize with empty arrays on error
        setEmployees([]);
        setAttendanceRecords([]);
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'success';
      case 'late': return 'warning';
      case 'absent': return 'error';
      case 'early-departure': return 'info';
      case 'overtime': return 'primary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckInIcon />;
      case 'late': return <LateIcon />;
      case 'absent': return <AbsentIcon />;
      case 'early-departure': return <CheckOutIcon />;
      case 'overtime': return <TrendingUpIcon />;
      default: return <TimeIcon />;
    }
  };

  const getMethodIcon = (method?: string) => {
    switch (method) {
      case 'biometric': return <BiometricIcon fontSize="small" />;
      case 'qr-code': return <QrCodeIcon fontSize="small" />;
      case 'mobile': return <PhoneIcon fontSize="small" />;
      case 'manual': return <EditIcon fontSize="small" />;
      default: return <TimeIcon fontSize="small" />;
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = record.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || record.status === statusFilter.toLowerCase();
    const employee = employees.find(emp => emp.id === record.employeeId);
    const matchesDepartment = departmentFilter === 'All' || (employee && employee.department === departmentFilter);
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const todayRecords = attendanceRecords.filter(record => 
    format(record.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  const presentToday = todayRecords.filter(record => record.status === 'present').length;
  const lateToday = todayRecords.filter(record => record.status === 'late').length;
  const absentToday = todayRecords.filter(record => record.status === 'absent').length;
  const totalEmployees = employees.filter(emp => emp.isActive).length;
  const attendanceRate = totalEmployees > 0 ? ((presentToday + lateToday) / totalEmployees) * 100 : 0;

  const handleManualEntry = () => {
    if (selectedEmployee && checkInTime) {
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        date: selectedDate,
        checkInTime,
        checkOutTime: checkOutTime || undefined,
        scheduledStart: new Date(selectedDate.setHours(9, 0, 0, 0)),
        scheduledEnd: new Date(selectedDate.setHours(17, 0, 0, 0)),
        status: 'present',
        checkInMethod: 'manual',
        checkOutMethod: checkOutTime ? 'manual' : undefined,
        totalHours: checkOutTime ? differenceInMinutes(checkOutTime, checkInTime) / 60 : undefined,
        isApproved: false,
        notes: 'Manual entry',
      };
      
      setAttendanceRecords([...attendanceRecords, newRecord]);
      setManualEntryDialogOpen(false);
      setSelectedEmployee(null);
      setCheckInTime(null);
      setCheckOutTime(null);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Attendance Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
            >
              Export Report
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setManualEntryDialogOpen(true)}
            >
              Manual Entry
            </Button>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Present Today
                    </Typography>
                    <Typography variant="h4" color="success">
                      {presentToday}
                    </Typography>
                  </Box>
                  <CheckInIcon color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Late Arrivals
                    </Typography>
                    <Typography variant="h4" color="warning">
                      {lateToday}
                    </Typography>
                  </Box>
                  <LateIcon color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Absent Today
                    </Typography>
                    <Typography variant="h4" color="error">
                      {absentToday}
                    </Typography>
                  </Box>
                  <AbsentIcon color="error" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Attendance Rate
                    </Typography>
                    <Typography variant="h4">
                      {attendanceRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <TrendingUpIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Today's Attendance" icon={<TodayIcon />} />
              <Tab label="Attendance Records" icon={<CalendarIcon />} />
              <Tab label="Employee Schedules" icon={<ScheduleIcon />} />
              <Tab label="Reports" icon={<ReportIcon />} />
            </Tabs>
          </Box>

          {/* Today's Attendance Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {employees.filter(emp => emp.isActive).map((employee) => {
                const todayRecord = todayRecords.find(record => record.employeeId === employee.id);
                const dayOfWeek = format(new Date(), 'EEEE').toLowerCase() as keyof typeof employee.workSchedule;
                const workDay = employee.workSchedule[dayOfWeek];
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={employee.id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Avatar sx={{ width: 48, height: 48 }}>
                            {employee.name.charAt(0)}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6">
                              {employee.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {employee.position}
                            </Typography>
                          </Box>
                          {todayRecord && (
                            <Chip
                              label={todayRecord.status}
                              color={getStatusColor(todayRecord.status) as any}
                              size="small"
                              icon={getStatusIcon(todayRecord.status)}
                              sx={{ textTransform: 'capitalize' }}
                            />
                          )}
                        </Box>
                        
                        {workDay.isWorkDay ? (
                          <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Scheduled:
                              </Typography>
                              <Typography variant="body2">
                                {workDay.start} - {workDay.end}
                              </Typography>
                            </Box>
                            
                            {todayRecord ? (
                              <>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Check In:
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {getMethodIcon(todayRecord.checkInMethod)}
                                    <Typography variant="body2">
                                      {todayRecord.checkInTime ? format(todayRecord.checkInTime, 'HH:mm') : '-'}
                                    </Typography>
                                  </Box>
                                </Box>
                                
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Check Out:
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {getMethodIcon(todayRecord.checkOutMethod)}
                                    <Typography variant="body2">
                                      {todayRecord.checkOutTime ? format(todayRecord.checkOutTime, 'HH:mm') : '-'}
                                    </Typography>
                                  </Box>
                                </Box>
                                
                                {todayRecord.totalHours && (
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      Total Hours:
                                    </Typography>
                                    <Typography variant="body2">
                                      {todayRecord.totalHours.toFixed(2)}h
                                    </Typography>
                                  </Box>
                                )}
                                
                                {todayRecord.location && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                    <LocationIcon fontSize="small" color="action" />
                                    <Typography variant="body2" color="text.secondary">
                                      {todayRecord.location}
                                    </Typography>
                                  </Box>
                                )}
                              </>
                            ) : (
                              <Box sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                  No attendance record
                                </Typography>
                              </Box>
                            )}
                          </>
                        ) : (
                          <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Not scheduled today
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </TabPanel>

          {/* Attendance Records Tab */}
          <TabPanel value={tabValue} index={1}>
            {/* Search and Filter */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="All">All Status</MenuItem>
                    <MenuItem value="Present">Present</MenuItem>
                    <MenuItem value="Late">Late</MenuItem>
                    <MenuItem value="Absent">Absent</MenuItem>
                    <MenuItem value="Early-departure">Early Departure</MenuItem>
                    <MenuItem value="Overtime">Overtime</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={departmentFilter}
                    label="Department"
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  >
                    <MenuItem value="All">All Departments</MenuItem>
                    <MenuItem value="Security">Security</MenuItem>
                    <MenuItem value="Administration">Administration</MenuItem>
                    <MenuItem value="Operations">Operations</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <MuiDatePicker
                  label="Date"
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue || new Date())}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
            </Grid>

            {/* Attendance Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Check In</TableCell>
                    <TableCell>Check Out</TableCell>
                    <TableCell>Total Hours</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((record) => (
                      <TableRow key={record.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              {record.employeeName.charAt(0)}
                            </Avatar>
                            <Typography variant="body2">
                              {record.employeeName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(record.date, 'MMM dd, yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getMethodIcon(record.checkInMethod)}
                            <Typography variant="body2">
                              {record.checkInTime ? format(record.checkInTime, 'HH:mm') : '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getMethodIcon(record.checkOutMethod)}
                            <Typography variant="body2">
                              {record.checkOutTime ? format(record.checkOutTime, 'HH:mm') : '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {record.totalHours ? `${record.totalHours.toFixed(2)}h` : '-'}
                          </Typography>
                          {record.overtimeHours && record.overtimeHours > 0 && (
                            <Typography variant="caption" color="primary" display="block">
                              +{record.overtimeHours.toFixed(2)}h OT
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={record.status.replace('-', ' ')}
                            color={getStatusColor(record.status) as any}
                            size="small"
                            icon={getStatusIcon(record.status)}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {record.location && <LocationIcon fontSize="small" color="action" />}
                            <Typography variant="body2">
                              {record.location || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <ViewIcon fontSize="small" />
                          </IconButton>
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
              count={filteredRecords.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
            />
          </TabPanel>

          {/* Employee Schedules Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              {employees.filter(emp => emp.isActive).map((employee) => (
                <Grid item xs={12} md={6} key={employee.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Avatar sx={{ width: 48, height: 48 }}>
                          {employee.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {employee.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {employee.position} - {employee.department}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Typography variant="subtitle1" gutterBottom>
                        Weekly Schedule
                      </Typography>
                      
                      <List dense>
                        {Object.entries(employee.workSchedule).map(([day, schedule]) => (
                          <ListItem key={day} sx={{ px: 0 }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" sx={{ textTransform: 'capitalize', minWidth: 80 }}>
                                    {day}
                                  </Typography>
                                  {schedule.isWorkDay ? (
                                    <Typography variant="body2">
                                      {schedule.start} - {schedule.end}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      Off Day
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                    
                    <CardActions>
                      <Button size="small" startIcon={<EditIcon />}>
                        Edit Schedule
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Reports Tab */}
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Weekly Attendance Summary
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Present</Typography>
                        <Typography variant="h6" color="success">
                          {presentToday * 5}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Late Arrivals</Typography>
                        <Typography variant="h6" color="warning">
                          {lateToday * 3}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Absences</Typography>
                        <Typography variant="h6" color="error">
                          {absentToday * 2}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" fontWeight="medium">Weekly Attendance Rate</Typography>
                        <Typography variant="h5" color="primary">
                          {attendanceRate.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Overtime Summary
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Total Overtime Hours</Typography>
                        <Typography variant="h6">
                          {attendanceRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0).toFixed(1)}h
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Employees with Overtime</Typography>
                        <Typography variant="h6">
                          {attendanceRecords.filter(record => record.overtimeHours && record.overtimeHours > 0).length}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Average Overtime per Employee</Typography>
                        <Typography variant="h6">
                          {(attendanceRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0) / employees.length).toFixed(1)}h
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Department Attendance Breakdown
                    </Typography>
                    <Grid container spacing={2}>
                      {['Security', 'Administration', 'Operations'].map((department) => {
                        const deptEmployees = employees.filter(emp => emp.department === department);
                        const deptRecords = attendanceRecords.filter(record => {
                          const employee = employees.find(emp => emp.id === record.employeeId);
                          return employee && employee.department === department;
                        });
                        const deptPresent = deptRecords.filter(record => record.status === 'present' || record.status === 'late').length;
                        const deptRate = deptEmployees.length > 0 ? (deptPresent / deptEmployees.length) * 100 : 0;
                        
                        return (
                          <Grid item xs={12} sm={4} key={department}>
                            <Box sx={{ textAlign: 'center', p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                              <Typography variant="h6">{department}</Typography>
                              <Typography variant="h4" color="primary" sx={{ my: 1 }}>
                                {deptRate.toFixed(1)}%
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {deptPresent}/{deptEmployees.length} present
                              </Typography>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Paper>

        {/* Manual Entry Dialog */}
        <Dialog
          open={manualEntryDialogOpen}
          onClose={() => setManualEntryDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Manual Attendance Entry</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Employee</InputLabel>
                  <Select
                    value={selectedEmployee?.id || ''}
                    label="Employee"
                    onChange={(e) => {
                      const employee = employees.find(emp => emp.id === e.target.value);
                      setSelectedEmployee(employee || null);
                    }}
                  >
                    {employees.filter(emp => emp.isActive).map((employee) => (
                      <MenuItem key={employee.id} value={employee.id}>
                        {employee.name} - {employee.position}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <MuiDatePicker
                  label="Date"
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue || new Date())}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <MuiTimePicker
                  label="Check In Time"
                  value={checkInTime}
                  onChange={(newValue) => setCheckInTime(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <MuiTimePicker
                  label="Check Out Time (Optional)"
                  value={checkOutTime}
                  onChange={(newValue) => setCheckOutTime(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setManualEntryDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleManualEntry}
              disabled={!selectedEmployee || !checkInTime}
            >
              Save Entry
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default AttendancePage;