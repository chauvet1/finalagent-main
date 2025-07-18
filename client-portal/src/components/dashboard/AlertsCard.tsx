import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  siteId?: string;
  siteName?: string;
  agentId?: string;
  agentName?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
}

interface AlertsCardProps {
  alerts: Alert[];
}

const AlertsCard: React.FC<AlertsCardProps> = ({ alerts }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Alerts</Typography>
      <List>
        {alerts.map(alert => (
          <ListItem key={alert.id}>
            <ListItemText
              primary={alert.title}
              secondary={
                <>
                  <Typography variant="body2">{alert.message}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(alert.timestamp).toLocaleString()} | Priority: {alert.priority}
                  </Typography>
                </>
              }
            />
            <Chip label={alert.type} color={alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : alert.type === 'success' ? 'success' : 'info'} size="small" sx={{ ml: 1 }} />
          </ListItem>
        ))}
      </List>
    </CardContent>
  </Card>
);

export default AlertsCard;
