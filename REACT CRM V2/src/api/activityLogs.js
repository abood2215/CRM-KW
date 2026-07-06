import client from './client';

export const getActivityLogs = (params) => client.get('/activity-logs', { params }).then((res) => res.data);
