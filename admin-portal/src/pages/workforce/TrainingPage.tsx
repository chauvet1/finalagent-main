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
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  Rating,
} from '@mui/material';
import {
  School as TrainingIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CompletedIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Star as StarIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  School as CertificateIcon,
  Quiz as QuizIcon,
  VideoLibrary as VideoIcon,
  Description as DocumentIcon,
  Group as GroupIcon,
  TrendingUp as ProgressIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { format, addDays, differenceInDays } from 'date-fns';

interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  category: 'safety' | 'security' | 'compliance' | 'skills' | 'emergency';
  type: 'online' | 'classroom' | 'practical' | 'blended';
  duration: number; // in hours
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string[];
  modules: TrainingModule[];
  isActive: boolean;
  createdDate: Date;
  lastUpdated: Date;
  instructor?: string;
  maxParticipants?: number;
  passingScore: number;
  certificateTemplate?: string;
}

interface TrainingModule {
  id: string;
  title: string;
  type: 'video' | 'document' | 'quiz' | 'practical';
  duration: number; // in minutes
  content?: string;
  videoUrl?: string;
  documentUrl?: string;
  questions?: QuizQuestion[];
  isRequired: boolean;
  order: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[];
  correctAnswer: string | number;
  points: number;
}

interface TrainingEnrollment {
  id: string;
  courseId: string;
  courseName: string;
  employeeId: string;
  employeeName: string;
  enrollmentDate: Date;
  startDate?: Date;
  completionDate?: Date;
  dueDate: Date;
  status: 'not-started' | 'in-progress' | 'completed' | 'overdue' | 'failed';
  progress: number; // percentage
  score?: number;
  attempts: number;
  timeSpent: number; // in minutes
  certificateIssued?: boolean;
  notes?: string;
}

interface TrainingSchedule {
  id: string;
  courseId: string;
  courseName: string;
  instructor: string;
  startDate: Date;
  endDate: Date;
  location: string;
  maxParticipants: number;
  enrolledCount: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  participants: string[];
}

const mockCourses: TrainingCourse[] = [
  {
    id: '1',
    title: 'Basic Security Procedures',
    description: 'Fundamental security protocols and procedures for new security personnel.',
    category: 'security',
    type: 'blended',
    duration: 8,
    difficulty: 'beginner',
    modules: [
      {
        id: 'm1',
        title: 'Introduction to Security',
        type: 'video',
        duration: 45,
        videoUrl: '/videos/intro-security.mp4',
        isRequired: true,
        order: 1,
      },
      {
        id: 'm2',
        title: 'Security Protocols Quiz',
        type: 'quiz',
        duration: 30,
        questions: [
          {
            id: 'q1',
            question: 'What is the first step in incident response?',
            type: 'multiple-choice',
            options: ['Call police', 'Secure the area', 'Document everything', 'Notify supervisor'],
            correctAnswer: 1,
            points: 10,
          },
        ],
        isRequired: true,
        order: 2,
      },
    ],
    isActive: true,
    createdDate: new Date('2024-01-01'),
    lastUpdated: new Date('2024-01-10'),
    instructor: 'John Smith',
    maxParticipants: 20,
    passingScore: 80,
  },
  {
    id: '2',
    title: 'Emergency Response Training',
    description: 'Comprehensive emergency response procedures and protocols.',
    category: 'emergency',
    type: 'practical',
    duration: 12,
    difficulty: 'intermediate',
    prerequisites: ['Basic Security Procedures'],
    modules: [
      {
        id: 'm3',
        title: 'Emergency Procedures',
        type: 'document',
        duration: 60,
        documentUrl: '/docs/emergency-procedures.pdf',
        isRequired: true,
        order: 1,
      },
      {
        id: 'm4',
        title: 'Practical Exercise',
        type: 'practical',
        duration: 120,
        isRequired: true,
        order: 2,
      },
    ],
    isActive: true,
    createdDate: new Date('2024-01-05'),
    lastUpdated: new Date('2024-01-12'),
    instructor: 'Sarah Johnson',
    maxParticipants: 15,
    passingScore: 85,
  },
];

const mockEnrollments: TrainingEnrollment[] = [
  {
    id: '1',
    courseId: '1',
    courseName: 'Basic Security Procedures',
    employeeId: 'emp1',
    employeeName: 'Mike Wilson',
    enrollmentDate: new Date('2024-01-10'),
    startDate: new Date('2024-01-12'),
    dueDate: new Date('2024-01-25'),
    status: 'in-progress',
    progress: 65,
    attempts: 1,
    timeSpent: 180,
  },
  {
    id: '2',
    courseId: '1',
    courseName: 'Basic Security Procedures',
    employeeId: 'emp2',
    employeeName: 'Lisa Chen',
    enrollmentDate: new Date('2024-01-08'),
    startDate: new Date('2024-01-10'),
    completionDate: new Date('2024-01-15'),
    dueDate: new Date('2024-01-23'),
    status: 'completed',
    progress: 100,
    score: 92,
    attempts: 1,
    timeSpent: 420,
    certificateIssued: true,
  },
  {
    id: '3',
    courseId: '2',
    courseName: 'Emergency Response Training',
    employeeId: 'emp3',
    employeeName: 'David Brown',
    enrollmentDate: new Date('2024-01-05'),
    dueDate: new Date('2024-01-20'),
    status: 'overdue',
    progress: 25,
    attempts: 0,
    timeSpent: 45,
  },
];

const mockSchedules: TrainingSchedule[] = [
  {
    id: '1',
    courseId: '2',
    courseName: 'Emergency Response Training',
    instructor: 'Sarah Johnson',
    startDate: new Date('2024-01-20T09:00:00'),
    endDate: new Date('2024-01-20T17:00:00'),
    location: 'Training Room A',
    maxParticipants: 15,
    enrolledCount: 12,
    status: 'scheduled',
    participants: ['emp1', 'emp2', 'emp3'],
  },
  {
    id: '2',
    courseId: '1',
    courseName: 'Basic Security Procedures',
    instructor: 'John Smith',
    startDate: new Date('2024-01-25T10:00:00'),
    endDate: new Date('2024-01-25T18:00:00'),
    location: 'Conference Room B',
    maxParticipants: 20,
    enrolledCount: 8,
    status: 'scheduled',
    participants: ['emp4', 'emp5'],
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
      id={`training-tabpanel-${index}`}
      aria-labelledby={`training-tab-${index}`}
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

const TrainingPage: React.FC = () => {
  const [courses, setCourses] = useState<TrainingCourse[]>(mockCourses);
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>(mockEnrollments);
  const [schedules, setSchedules] = useState<TrainingSchedule[]>(mockSchedules);
  const [tabValue, setTabValue] = useState(0);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewCourse = (course: TrainingCourse) => {
    setSelectedCourse(course);
    setCourseDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'info';
      case 'not-started': return 'default';
      case 'overdue': return 'error';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'safety': return 'warning';
      case 'security': return 'primary';
      case 'compliance': return 'info';
      case 'skills': return 'success';
      case 'emergency': return 'error';
      default: return 'default';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || course.category === categoryFilter.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = enrollment.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || enrollment.status === statusFilter.toLowerCase().replace('-', '-');
    
    return matchesSearch && matchesStatus;
  });

  const completedCourses = enrollments.filter(e => e.status === 'completed').length;
  const inProgressCourses = enrollments.filter(e => e.status === 'in-progress').length;
  const overdueCourses = enrollments.filter(e => e.status === 'overdue').length;
  const averageScore = enrollments.filter(e => e.score).reduce((sum, e) => sum + (e.score || 0), 0) / enrollments.filter(e => e.score).length || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Training Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCourseDialogOpen(true)}
        >
          Create Course
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Courses
              </Typography>
              <Typography variant="h4">
                {courses.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" color="success">
                {completedCourses}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                In Progress
              </Typography>
              <Typography variant="h4" color="info">
                {inProgressCourses}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Score
              </Typography>
              <Typography variant="h4">
                {averageScore.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Overdue Alert */}
      {overdueCourses > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {overdueCourses} Overdue Training{overdueCourses > 1 ? 's' : ''}
          </Typography>
          <Typography variant="body2">
            Some employees have overdue training assignments that require immediate attention.
          </Typography>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Courses" icon={<TrainingIcon />} />
            <Tab label="Enrollments" icon={<PersonIcon />} />
            <Tab label="Schedule" icon={<CalendarIcon />} />
            <Tab label="Reports" icon={<ProgressIcon />} />
          </Tabs>
        </Box>

        {/* Courses Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Search and Filter */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="All">All Categories</MenuItem>
                  <MenuItem value="Safety">Safety</MenuItem>
                  <MenuItem value="Security">Security</MenuItem>
                  <MenuItem value="Compliance">Compliance</MenuItem>
                  <MenuItem value="Skills">Skills</MenuItem>
                  <MenuItem value="Emergency">Emergency</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Courses Grid */}
          <Grid container spacing={3}>
            {filteredCourses.map((course) => (
              <Grid item xs={12} sm={6} md={4} key={course.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {course.title}
                      </Typography>
                      <Chip
                        label={course.category}
                        color={getCategoryColor(course.category) as any}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {course.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip
                        label={course.type}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'capitalize' }}
                      />
                      <Chip
                        label={course.difficulty}
                        color={getDifficultyColor(course.difficulty) as any}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                      <Chip
                        label={`${course.duration}h`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {course.instructor || 'Self-paced'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssignmentIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {course.modules.length} modules
                      </Typography>
                    </Box>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => handleViewCourse(course)}
                    >
                      View Details
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

        {/* Enrollments Tab */}
        <TabPanel value={tabValue} index={1}>
          {/* Search and Filter */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search enrollments..."
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
                  <MenuItem value="All">All Status</MenuItem>
                  <MenuItem value="Not Started">Not Started</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Overdue">Overdue</MenuItem>
                  <MenuItem value="Failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Enrollments Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEnrollments
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((enrollment) => (
                    <TableRow key={enrollment.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {enrollment.employeeName.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">
                            {enrollment.employeeName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {enrollment.courseName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={enrollment.progress}
                            sx={{ width: 100, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="body2">
                            {enrollment.progress}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={enrollment.status.replace('-', ' ')}
                          color={getStatusColor(enrollment.status) as any}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={differenceInDays(enrollment.dueDate, new Date()) < 0 ? 'error' : 'inherit'}
                        >
                          {format(enrollment.dueDate, 'MMM dd, yyyy')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {enrollment.score ? (
                            <>
                              <Typography variant="body2">
                                {enrollment.score}%
                              </Typography>
                              {enrollment.certificateIssued && (
                                <CertificateIcon fontSize="small" color="success" />
                              )}
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <ViewIcon fontSize="small" />
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
            count={filteredEnrollments.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </TabPanel>

        {/* Schedule Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {schedules.map((schedule) => (
              <Grid item xs={12} md={6} key={schedule.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h3">
                        {schedule.courseName}
                      </Typography>
                      <Chip
                        label={schedule.status}
                        color={getStatusColor(schedule.status) as any}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          Instructor: {schedule.instructor}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {format(schedule.startDate, 'MMM dd, yyyy HH:mm')} - {format(schedule.endDate, 'HH:mm')}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GroupIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {schedule.enrolledCount}/{schedule.maxParticipants} participants
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        Location: {schedule.location}
                      </Typography>
                    </Box>
                    
                    <LinearProgress
                      variant="determinate"
                      value={(schedule.enrolledCount / schedule.maxParticipants) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </CardContent>
                  
                  <CardActions>
                    <Button size="small" startIcon={<ViewIcon />}>
                      View Details
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

        {/* Reports Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Training Completion Rate
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="h3" color="success">
                      {((completedCourses / enrollments.length) * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      of enrolled courses completed
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(completedCourses / enrollments.length) * 100}
                    sx={{ height: 12, borderRadius: 6 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Average Training Score
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="h3">
                      {averageScore.toFixed(1)}%
                    </Typography>
                    <Rating
                      value={averageScore / 20}
                      readOnly
                      precision={0.1}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Based on {enrollments.filter(e => e.score).length} completed assessments
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Training Status Overview
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success">
                          {completedCourses}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Completed
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="info">
                          {inProgressCourses}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          In Progress
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="error">
                          {overdueCourses}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Overdue
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4">
                          {enrollments.filter(e => e.status === 'not-started').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Not Started
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Course Details Dialog */}
      <Dialog
        open={courseDialogOpen}
        onClose={() => setCourseDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedCourse ? `Course Details - ${selectedCourse.title}` : 'Create New Course'}
        </DialogTitle>
        <DialogContent>
          {selectedCourse && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  Course Information
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedCourse.description}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  <Chip
                    label={selectedCourse.category}
                    color={getCategoryColor(selectedCourse.category) as any}
                    sx={{ textTransform: 'capitalize' }}
                  />
                  <Chip
                    label={selectedCourse.type}
                    variant="outlined"
                    sx={{ textTransform: 'capitalize' }}
                  />
                  <Chip
                    label={selectedCourse.difficulty}
                    color={getDifficultyColor(selectedCourse.difficulty) as any}
                    sx={{ textTransform: 'capitalize' }}
                  />
                  <Chip
                    label={`${selectedCourse.duration} hours`}
                    variant="outlined"
                  />
                </Box>
                
                <Typography variant="h6" gutterBottom>
                  Course Modules
                </Typography>
                {selectedCourse.modules.map((module, index) => (
                  <Accordion key={module.id}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        {module.type === 'video' && <VideoIcon />}
                        {module.type === 'document' && <DocumentIcon />}
                        {module.type === 'quiz' && <QuizIcon />}
                        {module.type === 'practical' && <AssignmentIcon />}
                        <Typography variant="subtitle1">
                          {module.title}
                        </Typography>
                        <Chip
                          label={`${module.duration} min`}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 'auto' }}
                        />
                        {module.isRequired && (
                          <Chip
                            label="Required"
                            color="error"
                            size="small"
                          />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary">
                        Module content and details would be displayed here.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  Course Details
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Instructor"
                      secondary={selectedCourse.instructor || 'Self-paced'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Max Participants"
                      secondary={selectedCourse.maxParticipants || 'Unlimited'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Passing Score"
                      secondary={`${selectedCourse.passingScore}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Created"
                      secondary={format(selectedCourse.createdDate, 'MMM dd, yyyy')}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Last Updated"
                      secondary={format(selectedCourse.lastUpdated, 'MMM dd, yyyy')}
                    />
                  </ListItem>
                </List>
                
                {selectedCourse.prerequisites && selectedCourse.prerequisites.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Prerequisites
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {selectedCourse.prerequisites.map((prereq, index) => (
                        <Chip
                          key={index}
                          label={prereq}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCourseDialogOpen(false)}>Close</Button>
          {selectedCourse && (
            <>
              <Button variant="outlined" startIcon={<GroupIcon />}>
                Enroll Users
              </Button>
              <Button variant="contained" startIcon={<EditIcon />}>
                Edit Course
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrainingPage;