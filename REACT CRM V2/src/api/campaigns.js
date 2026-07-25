import client from './client';

export const getCampaigns = (params) => client.get('/campaigns', { params }).then((res) => res.data);

export const getCampaign = (id) => client.get(`/campaigns/${id}`).then((res) => res.data.campaign);

export const createCampaign = (data) => client.post('/campaigns', data).then((res) => res.data);

export const updateCampaign = (id, data) => client.put(`/campaigns/${id}`, data).then((res) => res.data);

export const deleteCampaign = (id) => client.delete(`/campaigns/${id}`).then((res) => res.data);

export const startCampaign = (id) => client.post(`/campaigns/${id}/start`).then((res) => res.data);

export const pauseCampaign = (id) => client.post(`/campaigns/${id}/pause`).then((res) => res.data);

export const resumeCampaign = (id) => client.post(`/campaigns/${id}/resume`).then((res) => res.data);

// Secondary/manual fallback — auto-blacklisting on delivery failure normally makes this unnecessary.
export const blacklistFailedRecipients = (id) => client.post(`/campaigns/${id}/blacklist-failed`).then((res) => res.data);

export const getCampaignRecipients = (id, params) =>
  client.get(`/campaigns/${id}/recipients`, { params }).then((res) => res.data);

export const getCampaignAnalytics = (id) => client.get(`/campaigns/${id}/analytics`).then((res) => res.data);

export const getCampaignReport = (id, params) => client.get(`/campaigns/${id}/report`, { params }).then((res) => res.data);

export const exportCampaignRecipientsCsv = (id) =>
  client.get(`/campaigns/${id}/recipients/export/csv`, { responseType: 'blob' }).then((res) => res.data);

export const uploadCampaignImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);

  return client.post('/campaigns/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);
};
