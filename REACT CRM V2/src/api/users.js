import client from './client';

export const getUsers = () => client.get('/users').then((res) => res.data.users);

export const getOnlineUsers = () => client.get('/users/online').then((res) => res.data.users);

export const createUser = (data) => client.post('/users', data).then((res) => res.data);

export const updateUser = (id, data) => client.put(`/users/${id}`, data).then((res) => res.data);

export const deleteUser = (id) => client.delete(`/users/${id}`).then((res) => res.data);
