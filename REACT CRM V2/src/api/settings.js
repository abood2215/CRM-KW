import client from './client';

export const getBusinessHours = () => client.get('/settings/business-hours').then((res) => res.data.business_hours);

export const updateBusinessHours = (hours) => client.put('/settings/business-hours', { hours }).then((res) => res.data);

export const getAutoReplies = () => client.get('/settings/auto-replies').then((res) => res.data.auto_replies);

export const updateAutoReplies = (replies) => client.put('/settings/auto-replies', { replies }).then((res) => res.data);
