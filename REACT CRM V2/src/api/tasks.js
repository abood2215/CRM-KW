import client from './client';

export const getTasks = (params) => client.get('/tasks', { params }).then((res) => res.data);

export const createTask = (data) => client.post('/tasks', data).then((res) => res.data);

export const updateTask = (id, data) => client.put(`/tasks/${id}`, data).then((res) => res.data);

export const deleteTask = (id) => client.delete(`/tasks/${id}`).then((res) => res.data);

export const completeTask = (id) => client.post(`/tasks/${id}/complete`).then((res) => res.data);
