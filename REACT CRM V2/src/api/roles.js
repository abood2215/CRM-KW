import client from './client';

export const getRoles = () => client.get('/roles').then((res) => res.data.roles);

export const getPermissions = () => client.get('/permissions').then((res) => res.data.permissions);

export const createRole = (data) => client.post('/roles', data).then((res) => res.data);

export const updateRole = (id, data) => client.put(`/roles/${id}`, data).then((res) => res.data);

export const deleteRole = (id) => client.delete(`/roles/${id}`).then((res) => res.data);
