import api from '../index.js'

export const login = (data) => {
    return api.post('/system/login', data)
}
