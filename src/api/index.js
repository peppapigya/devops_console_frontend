import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: '/api', // 直接使用相对路径，由nginx代理
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 在发送请求之前做些什么
    return config
  },
  error => {
    // 对请求错误做些什么
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    // 对响应数据做点什么
    const { data } = response
    
    if (data.status !== 200) {
      throw new Error(data.message || '请求失败')
    }
    return data
  },
  error => {
    // 对响应错误做点什么
    const message = error.response?.data?.message || error.message || '网络错误'
    throw new Error(message)
  }
)

export default api