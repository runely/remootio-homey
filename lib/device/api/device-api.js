const axios = require('axios').default

const deviceApiUrl = 'https://deviceapi.remootio.com/device'

const createAxiosConfig = (token) => {
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
}

const get = async (token) => {
  try {
    const options = createAxiosConfig(token)
    const { data } = await axios.get(deviceApiUrl, options)
    return {
      success: true,
      data
    }
  } catch (ex) {
    if (ex.response) {
      const { status, statusText, data } = ex.response
      return {
        success: false,
        status,
        statusText,
        data
      }
    } else {
      const status = 500
      const data = ex.toString()
      return {
        success: false,
        status,
        data
      }
    }
  }
}

const post = async (body, token) => {
  try {
    const options = createAxiosConfig(token)
    const { data } = axios.post(deviceApiUrl, body, options)
    return {
      success: true,
      data
    }
  } catch (ex) {
    if (ex.response) {
      const { status, statusText, data } = ex.response
      return {
        success: false,
        status,
        statusText,
        data
      }
    } else {
      const status = 500
      const data = ex.toString()
      return {
        success: false,
        status,
        data
      }
    }
  }
}

module.exports = {
  get,
  post
}
