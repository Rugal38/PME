import { api } from './api';

export const getResponsables = () => {
  return api.get('/api/responsables');
};

export const addResponsable = (data) => {
  return api.post('/api/responsables', data);
};

export const updateResponsable = (id, data) => {
  return api.put(`/api/responsables/${id}`, data);
};

export const deleteResponsable = (id) => {
  return api.delete(`/api/responsables/${id}`);
};
