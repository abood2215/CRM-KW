import client from './client';

export const getContactLists = () => client.get('/contact-lists').then((res) => res.data.contact_lists);

export const getContactList = (id, params) => client.get(`/contact-lists/${id}`, { params }).then((res) => res.data);

export const createContactList = (data) => client.post('/contact-lists', data).then((res) => res.data);

export const updateContactList = (id, data) => client.put(`/contact-lists/${id}`, data).then((res) => res.data);

export const deleteContactList = (id) => client.delete(`/contact-lists/${id}`).then((res) => res.data);

export const addContactsToList = (id, data) => client.post(`/contact-lists/${id}/contacts`, data).then((res) => res.data);
