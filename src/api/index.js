import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: '/api/v1', // 直接使用相对路径，由nginx代理
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 在发送请求之前做些什么
    const token = localStorage.getItem('access_token')
    console.log(`[API Request] URL: ${config.url} | Token exists: ${!!token}`)

    // Optional: Log token for debugging (masked)
    if (token) {
      // console.log('Token value:', token)
    } else {
      console.log('No token found in localStorage for this request')
    }
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
      // console.log('Final Headers:', config.headers)
    }
    return config
  },
  error => {
    // 对请求错误做些什么
    console.error('Request Interceptor Error:', error)
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
    if (error.response && error.response.status === 401) {
      console.error('API 401 Log:', {
        url: error.config?.url,
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      })
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        // Only clean up if we are sure it's a token issue
        if (localStorage.getItem('access_token')) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
        window.location.href = '/login'
      }
    }
    const message = error.response?.data?.message || error.message || '网络错误'
    throw new Error(message)
  }
)

export default api
