import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  TrendingUp as PromoteIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI, apiClient } from '../services/api';

interface AdminUser {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'SUPERVISOR';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  adminProfile?: {
    department?: string;
    position?: string;
    accessLevel: 'STANDARD' | 'ELEVATED' | 'ADMIN' | 'SUPER_ADMIN';
  };
}

interface InviteUserForm {
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'SUPERVISOR';
  accessLevel: 'STANDARD' | 'ELEVATED' | 'ADMIN' | 'SUPER_ADMIN';
  department: string;
  position: string;
}

interface PromoteUserForm {
  email: string;
  role: 'ADMIN' | 'SUPERVISOR';
  accessLevel: 'STANDARD' | 'ELEVATED' | 'ADMIN' | 'SUPER_ADMIN';
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [inviteForm, setInviteForm] = useState<InviteUserForm>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'ADMIN',
    accessLevel: 'STANDARD',
    department: '',
    position: ''
  });

  const [promoteForm, setPromoteForm] = useState<PromoteUserForm>({
    email: '',
    role: 'ADMIN',
    accessLevel: 'ADMIN'
  });

  useEffect(() => {
    fetchAdminUsers();
  }, [page, rowsPerPage]);

  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      
      // Check authentication availability first
      const authAvailable = await isAuthenticationAvailable();
      if (!authAvailable) {
        showSnackbar('Authentication not available. Please log in.', 'error');
        setLoading(false);
        return;
      }

      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Loading admin users with ${tokenInfo.type} token`);

      const response = await adminAPI.getUsers({ 
        page: page + 1, 
        limit: rowsPerPage,
        role: 'ADMIN,SUPERVISOR' 
      });

      if (response.data.success) {
        // Handle both array response and paginated response
        const responseData = response.data.data;
        if (Array.isArray(responseData)) {
          setUsers(responseData);
          setTotal(responseData.length);
        } else if (responseData && typeof responseData === 'object') {
          // Handle paginated response structure
          const paginatedData = responseData as any;
          setUsers(paginatedData.users || paginatedData.data || []);
          setTotal(paginatedData.pagination?.total || paginatedData.total || 0);
        } else {
          setUsers([]);
          setTotal(0);
        }
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
      showSnackbar('Failed to fetch admin users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    try {
      const authAvailable = await isAuthenticationAvailable();
      if (!authAvailable) {
        showSnackbar('Authentication not available. Please log in.', 'error');
        return;
      }

      const response = await adminAPI.createUser(inviteForm);

      if (response.data.success) {
        showSnackbar('Admin user invited successfully!', 'success');
        setInviteDialogOpen(false);
        setInviteForm({
          email: '',
          firstName: '',
          lastName: '',
          role: 'ADMIN',
          accessLevel: 'STANDARD',
          department: '',
          position: ''
        });
        fetchAdminUsers();
      }
    } catch (error: any) {
      console.error('Error inviting user:', error);
      const message = error.response?.data?.error?.message || 'Failed to invite user';
      showSnackbar(message, 'error');
    }
  };

  const handleUpdateUserRole = async (userId: string, role: string, accessLevel: string) => {
    try {
      const authAvailable = await isAuthenticationAvailable();
      if (!authAvailable) {
        showSnackbar('Authentication not available. Please log in.', 'error');
        return;
      }

      const response = await adminAPI.updateUser(userId, {
        role,
        accessLevel
      });

      if (response.data.success) {
        showSnackbar('User role updated successfully!', 'success');
        setEditDialogOpen(false);
        fetchAdminUsers();
      }
    } catch (error: any) {
      console.error('Error updating user role:', error);
      const message = error.response?.data?.error?.message || 'Failed to update user role';
      showSnackbar(message, 'error');
    }
  };

  const handlePromoteUser = async () => {
    try {
      const response = await apiClient.post('/auth-test/promote-to-admin', promoteForm);

      if (response.data.success) {
        showSnackbar('User promoted to admin successfully!', 'success');
        setPromoteDialogOpen(false);
        setPromoteForm({
          email: '',
          role: 'ADMIN',
          accessLevel: 'ADMIN'
        });
        fetchAdminUsers();
      }
    } catch (error: any) {
      console.error('Error promoting user:', error);
      const message = error.response?.data?.error?.message || 'Failed to promote user';
      showSnackbar(message, 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'default';
      case 'SUSPENDED': return 'error';
      default: return 'default';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'primary';
      case 'SUPERVISOR': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Admin Users Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<PromoteIcon />}
            onClick={() => setPromoteDialogOpen(true)}
          >
            Promote User
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteDialogOpen(true)}
          >
            Invite Admin User
          </Button>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Access Level</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={getRoleColor(user.role) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.adminProfile?.accessLevel || 'STANDARD'}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.adminProfile?.department || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.status}
                      color={getStatusColor(user.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedUser(user);
                        setEditDialogOpen(true);
                      }}
                    >
                      <EditIcon />
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
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite New Admin User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              required
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="First Name"
                value={inviteForm.firstName}
                onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Last Name"
                value={inviteForm.lastName}
                onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                required
                fullWidth
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                  label="Role"
                >
                  <MenuItem value="ADMIN">Admin</MenuItem>
                  <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Access Level</InputLabel>
                <Select
                  value={inviteForm.accessLevel}
                  onChange={(e) => setInviteForm({ ...inviteForm, accessLevel: e.target.value as any })}
                  label="Access Level"
                >
                  <MenuItem value="STANDARD">Standard</MenuItem>
                  <MenuItem value="ELEVATED">Elevated</MenuItem>
                  <MenuItem value="ADMIN">Admin</MenuItem>
                  <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Department"
                value={inviteForm.department}
                onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                fullWidth
              />
              <TextField
                label="Position"
                value={inviteForm.position}
                onChange={(e) => setInviteForm({ ...inviteForm, position: e.target.value })}
                fullWidth
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleInviteUser} variant="contained">
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Promote User Dialog */}
      <Dialog open={promoteDialogOpen} onClose={() => setPromoteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Promote Existing User to Admin</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will promote an existing user (from Clerk) to admin role in the database.
            Enter the email address of the user you want to promote.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="User Email"
              type="email"
              value={promoteForm.email}
              onChange={(e) => setPromoteForm({ ...promoteForm, email: e.target.value })}
              required
              fullWidth
              helperText="Enter the email address of the user to promote"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={promoteForm.role}
                  onChange={(e) => setPromoteForm({ ...promoteForm, role: e.target.value as any })}
                  label="Role"
                >
                  <MenuItem value="ADMIN">Admin</MenuItem>
                  <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Access Level</InputLabel>
                <Select
                  value={promoteForm.accessLevel}
                  onChange={(e) => setPromoteForm({ ...promoteForm, accessLevel: e.target.value as any })}
                  label="Access Level"
                >
                  <MenuItem value="STANDARD">Standard</MenuItem>
                  <MenuItem value="ELEVATED">Elevated</MenuItem>
                  <MenuItem value="ADMIN">Admin</MenuItem>
                  <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromoteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePromoteUser} variant="contained" color="primary">
            Promote User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminUsersPage;
