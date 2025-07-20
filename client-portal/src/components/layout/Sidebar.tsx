import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Typography,
  Collapse,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assessment as ReportsIcon,
  RequestPage as RequestIcon,
  Warning as IncidentIcon,
  Receipt as BillingIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Monitor as MonitorIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  AccountCircle,
  Logout,
  Edit as EditIcon,
  ExpandLess,
  ExpandMore,
  Timeline,
  BarChart,
  PieChart,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

interface MenuItemType {
  text: string;
  icon: React.ReactElement;
  path: string;
  subItems?: MenuItemType[];
}

const Sidebar: React.FC<SidebarProps> = ({ open, isMobile = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { user } = useUser();
  const [reportsOpen, setReportsOpen] = React.useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = React.useState<null | HTMLElement>(null);

  const menuItems: MenuItemType[] = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
    },
    {
      text: 'Reports',
      icon: <ReportsIcon />,
      path: '/reports',
      subItems: [
        {
          text: 'Analytics',
          icon: <BarChart />,
          path: '/reports/analytics',
        },
        {
          text: 'Performance',
          icon: <Timeline />,
          path: '/reports/performance',
        },
        {
          text: 'Summary',
          icon: <PieChart />,
          path: '/reports/summary',
        },
      ],
    },
    {
      text: 'Service Requests',
      icon: <RequestIcon />,
      path: '/service-requests',
    },
    {
      text: 'Incidents',
      icon: <IncidentIcon />,
      path: '/incidents',
    },
    {
      text: 'Live Monitoring',
      icon: <MonitorIcon />,
      path: '/monitoring',
    },
    {
      text: 'Messages',
      icon: <MessageIcon />,
      path: '/messages',
    },
    {
      text: 'Notifications',
      icon: <NotificationsIcon />,
      path: '/notifications',
    },
    {
      text: 'Billing',
      icon: <BillingIcon />,
      path: '/billing',
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
    },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleReportsToggle = () => {
    setReportsOpen(!reportsOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleSignOut = async () => {
    await signOut();
    handleProfileMenuClose();
  };

  const handleProfileEdit = () => {
    navigate('/profile');
    handleProfileMenuClose();
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const drawerWidth = 240;
  const collapsedWidth = 60;

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={open}
      onClose={isMobile ? () => {} : undefined}
      sx={{
        width: open ? drawerWidth : (isMobile ? 0 : collapsedWidth),
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : (isMobile ? drawerWidth : collapsedWidth),
          boxSizing: 'border-box',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #e0e0e0',
        },
      }}
    >
      <Toolbar>
        {open && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon sx={{ color: '#1976d2' }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#1976d2',
                fontSize: '1.1rem',
              }}
            >
              Client Portal
            </Typography>
          </Box>
        )}
      </Toolbar>
      
      <Divider />
      
      <List sx={{ pt: 1 }}>
        {menuItems.map((item) => {
          if (item.subItems) {
            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={item.text === 'Reports' ? handleReportsToggle : () => handleNavigation(item.path)}
                    sx={{
                      minHeight: 48,
                      justifyContent: open ? 'initial' : 'center',
                      px: 2.5,
                      backgroundColor: isActive(item.path) ? '#e3f2fd' : 'transparent',
                      '&:hover': {
                        backgroundColor: '#f0f0f0',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 3 : 'auto',
                        justifyContent: 'center',
                        color: isActive(item.path) ? '#1976d2' : '#666',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {open && (
                      <>
                        <ListItemText
                          primary={item.text}
                          sx={{
                            '& .MuiListItemText-primary': {
                              fontSize: '0.9rem',
                              fontWeight: isActive(item.path) ? 600 : 400,
                              color: isActive(item.path) ? '#1976d2' : '#333',
                            },
                          }}
                        />
                        {item.text === 'Reports' && (reportsOpen ? <ExpandLess /> : <ExpandMore />)}
                      </>
                    )}
                  </ListItemButton>
                </ListItem>
                {open && (
                  <Collapse in={reportsOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.subItems.map((subItem) => (
                        <ListItem key={subItem.text} disablePadding>
                          <ListItemButton
                            onClick={() => handleNavigation(subItem.path)}
                            sx={{
                              pl: 4,
                              minHeight: 40,
                              backgroundColor: isActive(subItem.path) ? '#e3f2fd' : 'transparent',
                              '&:hover': {
                                backgroundColor: '#f0f0f0',
                              },
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: 0,
                                mr: 2,
                                color: isActive(subItem.path) ? '#1976d2' : '#666',
                              }}
                            >
                              {subItem.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={subItem.text}
                              sx={{
                                '& .MuiListItemText-primary': {
                                  fontSize: '0.85rem',
                                  fontWeight: isActive(subItem.path) ? 600 : 400,
                                  color: isActive(subItem.path) ? '#1976d2' : '#555',
                                },
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            );
          }

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                  backgroundColor: isActive(item.path) ? '#e3f2fd' : 'transparent',
                  '&:hover': {
                    backgroundColor: '#f0f0f0',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                    color: isActive(item.path) ? '#1976d2' : '#666',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.text}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: '0.9rem',
                        fontWeight: isActive(item.path) ? 600 : 400,
                        color: isActive(item.path) ? '#1976d2' : '#333',
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      {/* User Profile Section */}
      <Box sx={{ mt: 'auto', p: 1 }}>
        <Divider sx={{ mb: 1 }} />
        {open ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 0.75,
              borderRadius: 1.5,
              backgroundColor: '#f8f9fa',
              cursor: 'pointer',
              border: '1px solid #e0e0e0',
              '&:hover': {
                backgroundColor: '#e3f2fd',
                borderColor: '#1976d2',
              },
            }}
            onClick={handleProfileMenuOpen}
          >
            {user?.imageUrl ? (
              <Avatar
                src={user.imageUrl}
                alt={user.fullName || 'User'}
                sx={{ width: 36, height: 36 }}
              />
            ) : (
              <Avatar sx={{ width: 36, height: 36, bgcolor: '#1976d2' }}>
                <PersonIcon />
              </Avatar>
            )}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#333',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.fullName || 'User'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.primaryEmailAddress?.emailAddress || 'user@example.com'}
              </Typography>
            </Box>
          </Box>
        ) : (
          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{
              width: 40,
              height: 40,
              mx: 'auto',
              display: 'block',
            }}
          >
            {user?.imageUrl ? (
              <Avatar
                src={user.imageUrl}
                alt={user.fullName || 'User'}
                sx={{ width: 32, height: 32 }}
              />
            ) : (
              <AccountCircle sx={{ fontSize: 32, color: '#1976d2' }} />
            )}
          </IconButton>
        )}
        
        <Menu
          anchorEl={profileMenuAnchor}
          open={Boolean(profileMenuAnchor)}
          onClose={handleProfileMenuClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <MenuItem onClick={handleProfileEdit}>
            <EditIcon sx={{ mr: 1 }} />
            Edit Profile
          </MenuItem>
          <MenuItem onClick={() => { navigate('/settings'); handleProfileMenuClose(); }}>
            <SettingsIcon sx={{ mr: 1 }} />
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleSignOut}>
            <Logout sx={{ mr: 1 }} />
            Sign Out
          </MenuItem>
        </Menu>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
