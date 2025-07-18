import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color?: string;
  trend?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, color, trend }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" gap={2}>
        <Box color={color || 'primary.main'}>{icon}</Box>
        <Box>
          <Typography variant="h6">{value}</Typography>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          {typeof trend === 'number' && (
            <Typography variant="caption" color={trend >= 0 ? 'success.main' : 'error.main'}>
              {trend >= 0 ? '+' : ''}{trend}%
            </Typography>
          )}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default MetricCard;
