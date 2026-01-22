import request from '../index.js'

// 获取CronJob列表
export const getCronJobList = (namespace, instanceId) => {
  return request({
    url: `/k8s/cronjob/list/${namespace}`,
    method: 'get',
    params: {
      instance_id: instanceId
    }
  })
}

// 创建CronJob
export const createCronJob = (data, instanceId) => {
  return request({
    url: '/k8s/cronjob/create',
    method: 'post',
    data,
    params: {
      instance_id: instanceId
    }
  })
}

// 更新CronJob
export const updateCronJob = (data, instanceId) => {
  return request({
    url: '/k8s/cronjob/update',
    method: 'put',
    data,
    params: {
      instance_id: instanceId
    }
  })
}

// 删除CronJob
export const deleteCronJob = (namespace, name, instanceId) => {
  return request({
    url: '/k8s/cronjob/delete',
    method: 'delete',
    data: { namespace, name },
    params: {
      instance_id: instanceId
    }
  })
}