import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText } from '@mui/material';

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  agentName?: string;
  siteName?: string;
  icon?: string;
}

interface RecentActivityCardProps {
  activities: Activity[];
}

const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ activities }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Recent Activity</Typography>
      <List>
        {activities.map((activity) => (
          <ListItem key={activity.id}>
            <ListItemText
              primary={activity.title}
              secondary={
                <>
                  <Typography variant="body2">{activity.description}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(activity.timestamp).toLocaleString()}
                  </Typography>
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </CardContent>
  </Card>
);

export default RecentActivityCard;
