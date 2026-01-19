import {api} from './api';

export const getBudgets = () => {
    return api.get('/api/budgets');
};

export const addBudget = (budget) => {
    return api.post('/api/budgets', budget);
};

export const updateBudget = (id, budget) => {
    return api.put(`/api/budgets/${id}`, budget);
};

export const deleteBudget = (id) => {
    return api.delete(`/api/budgets/${id}`);
};
