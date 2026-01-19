import { api } from './api';

export const getDepenses = () => {
  return api.get('/depenses');
};

export const getDepense = (id) => {
  return api.get(`/depenses/${id}`);
};

export const addDepense = (data) => {
  return api.post('/depenses', data);
};

export const updateDepense = (id, data) => {
  return api.put(`/depenses/${id}`, data);
};

export const deleteDepense = (id) => {
  return api.delete(`/depenses/${id}`);
};

export const getPrediction = (centreId) => {
    return api.get(`/prediction/${centreId}`);
};
