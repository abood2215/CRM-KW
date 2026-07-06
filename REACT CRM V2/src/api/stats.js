import client from './client';

export const getDashboardStats = (range) => client.get('/stats/dashboard', { params: { range } }).then((res) => res.data);

export const getCampaignStats = () => client.get('/stats/campaigns').then((res) => res.data);

export const getAgentStats = () => client.get('/stats/agents').then((res) => res.data.agents);

export const getWhatsappStats = () => client.get('/stats/whatsapp').then((res) => res.data);

export const exportCampaignsCsv = () => client.get('/stats/campaigns/export/csv', { responseType: 'blob' }).then((res) => res.data);
