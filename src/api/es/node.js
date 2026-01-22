import api from '../index.js'

// 获取节点信息
export const getNodeInfo = (instanceId) => {
  return api.get('/node/ClusterNodeInfo', { 
    params: { instance_id: instanceId }
  })
}

// 获取节点统计信息
export const getNodeStats = (instanceId) => {
  return api.get('/node/ClusterNodeStats', { 
    params: { instance_id: instanceId }
  })
}