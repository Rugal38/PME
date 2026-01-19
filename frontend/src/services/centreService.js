import { api } from './api';

export const getCentres = () => {
  return api.get('/centres');
};

export const getCentre = (id) => {
  return api.get(`/centres/${id}`);
};

export const addCentre = (data) => {
  return api.post('/centres', data);
};

export const updateCentre = (id, data) => {
  return api.put(`/centres/${id}`, data);
};

export const deleteCentre = (id) => {
  return api.delete(`/centres/${id}`);
};
