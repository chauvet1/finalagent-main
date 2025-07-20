import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Person as UserIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAdminSetup } from '../../utils/adminSetup';
import { getUserRole, isAdmin, debugUserRole } from '../../utils/roleUtils';

/**
 * Development Admin Setup Panel
 * Only shown in development mode to help set up admin users
 */
const AdminSetupPanel: React.FC = () => {
  const { user, assignAdmin, removeAdmin, autoAssign, getRoleStatus, logRoleInfo, isDevAdminEmail } = useAdminSetup();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'SUPERVISOR'>('ADMIN');
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const roleStatus = getRoleStatus();
  const currentRole = getUserRole(user);
  const isCurrentlyAdmin = isAdmin(currentRole);

  const handleAssignAdmin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const success = await assignAdmin(selectedRole);
      if (success) {
        setMessage({ type: 'success', text: `Successfully assigned ${selectedRole} role!` });
        // Refresh the page to update the UI
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: 'Failed to assign admin role. Check console for details.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error assigning admin role.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const success = await removeAdmin();
      if (success) {
        setMessage({ type: 'success', text: 'Successfully removed admin role!' });
        // Refresh the page to update the UI
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: 'Failed to remove admin role. Check console for details.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error removing admin role.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const success = await autoAssign();
      if (success) {
        setMessage({ type: 'success', text: 'Successfully auto-assigned admin role!' });
        // Refresh the page to update the UI
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'info', text: 'No auto-assignment needed for this email.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error during auto-assignment.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDebugInfo = () => {
    debugUserRole(user);
    logRoleInfo();
    setShowDebugInfo(!showDebugInfo);
  };

  if (!user) {
    return (
      <Card sx={{ mb: 2, border: '2px solid #ff9800' }}>
        <CardContent>
          <Typography variant="h6" color="warning.main" gutterBottom>
            🔧 Development Admin Setup
          </Typography>
          <Alert severity="info">
            Please sign in to use the admin setup panel.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 2, border: '2px solid #2196f3' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <SecurityIcon color="primary" />
          <Typography variant="h6" color="primary">
            🔧 Development Admin Setup Panel
          </Typography>
        </Box>

        <Alert severity="warning" sx={{ mb: 2 }}>
          This panel is only available in development mode for testing admin functionality.
        </Alert>

        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        {/* Current Status */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Current Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              icon={<UserIcon />}
              label={user.primaryEmailAddress?.emailAddress}
              variant="outlined"
            />
            <Chip
              icon={isCurrentlyAdmin ? <AdminIcon /> : <UserIcon />}
              label={`Role: ${currentRole}`}
              color={isCurrentlyAdmin ? 'success' : 'default'}
            />
            {isDevAdminEmail && (
              <Chip
                label="Dev Admin Email"
                color="info"
                size="small"
              />
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Admin Assignment Controls */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Admin Role Management
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedRole}
                label="Role"
                onChange={(e) => setSelectedRole(e.target.value as 'ADMIN' | 'SUPERVISOR')}
              >
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleAssignAdmin}
              disabled={loading || isCurrentlyAdmin}
              startIcon={<AdminIcon />}
            >
              Assign {selectedRole}
            </Button>

            <Button
              variant="outlined"
              onClick={handleRemoveAdmin}
              disabled={loading || !isCurrentlyAdmin}
              color="warning"
            >
              Remove Admin
            </Button>
          </Box>

          {isDevAdminEmail && (
            <Button
              variant="contained"
              color="info"
              onClick={handleAutoAssign}
              disabled={loading}
              startIcon={<SecurityIcon />}
              sx={{ mr: 2 }}
            >
              Auto-Assign Admin
            </Button>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Debug Controls */}
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={showDebugInfo}
                onChange={handleDebugInfo}
              />
            }
            label="Show Debug Info"
          />
          
          <Button
            variant="text"
            onClick={() => window.location.reload()}
            startIcon={<RefreshIcon />}
            sx={{ ml: 2 }}
          >
            Refresh Page
          </Button>
        </Box>

        {/* Debug Information */}
        {showDebugInfo && roleStatus && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Debug Information:
            </Typography>
            <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
              {JSON.stringify(roleStatus, null, 2)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSetupPanel;
