import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface PerformanceData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

interface PerformanceChartProps {
  data: PerformanceData | null;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Performance</Typography>
      {data ? (
        <Typography variant="body2">Chart goes here</Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">No data available</Typography>
      )}
    </CardContent>
  </Card>
);

export default PerformanceChart;
