import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';

interface SiteStatus {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'alert';
  agentsOnSite: number;
  lastUpdate: string;
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface SiteStatusCardProps {
  sites: SiteStatus[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'alert':
      return 'warning';
    case 'inactive':
    default:
      return 'default';
  }
};

const SiteStatusCard: React.FC<SiteStatusCardProps> = ({ sites }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Site Status</Typography>
      <Box display="flex" flexDirection="column" gap={1}>
        {sites.map(site => (
          <Box key={site.id} display="flex" alignItems="center" gap={2}>
            <Typography>{site.name}</Typography>
            <Chip label={site.status} color={getStatusColor(site.status)} size="small" />
            <Typography variant="caption" color="text.secondary">
              Agents: {site.agentsOnSite} | Updated: {new Date(site.lastUpdate).toLocaleTimeString()}
            </Typography>
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
);

export default SiteStatusCard;
