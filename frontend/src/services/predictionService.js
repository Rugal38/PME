import {api} from './api';

export const getPrediction = (centreId, trimester, annee) => {
    return api.get(`/api/predictions?centre_id=${centreId}&trimester=${trimester}&annee=${annee}`);
};
