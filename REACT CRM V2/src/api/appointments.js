import client from './client';

export const getAppointments = (params) => client.get('/appointments', { params }).then((res) => res.data);

export const createAppointment = (data) => client.post('/appointments', data).then((res) => res.data);

export const updateAppointment = (id, data) => client.put(`/appointments/${id}`, data).then((res) => res.data);

export const deleteAppointment = (id) => client.delete(`/appointments/${id}`).then((res) => res.data);

export const confirmAppointment = (id) => client.post(`/appointments/${id}/confirm`).then((res) => res.data);

export const cancelAppointment = (id) => client.post(`/appointments/${id}/cancel`).then((res) => res.data);

export const completeAppointment = (id) => client.post(`/appointments/${id}/complete`).then((res) => res.data);

export const getPublicSlots = (params) => client.get('/public/booking/slots', { params }).then((res) => res.data);

export const createPublicBooking = (data) => client.post('/public/booking', data).then((res) => res.data);
