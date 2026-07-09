import client from './client';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((res) => res.data);

export const logout = () => client.post('/auth/logout').then((res) => res.data);

export const me = () => client.get('/auth/me').then((res) => res.data);

export const updateProfile = (data) => {
  if (data instanceof FormData) {
    // Laravel/PHP don't parse multipart bodies on PUT — spoof the method over POST.
    data.append('_method', 'PUT');

    return client.post('/auth/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data);
  }

  return client.put('/auth/profile', data).then((res) => res.data);
};

export const updatePassword = (data) =>
  client.put('/auth/password', data).then((res) => res.data);
