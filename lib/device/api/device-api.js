const axios = require('axios')

const deviceApiUrl = 'https://deviceapi.remootio.com/device'

const createAxiosConfig = (token) => {
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
}

const query = async (token) => {
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
    }

    const status = 500
    const data = ex.toString()
    return {
      success: false,
      status,
      data
    }
  }
}

const toggle = async (token) => {
  try {
    const options = createAxiosConfig(token)
    const { data } = await axios.post(deviceApiUrl, { command: 'open' }, options)
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
    }

    const status = 500
    const data = ex.toString()
    return {
      success: false,
      status,
      data
    }
  }
}

module.exports = {
  query,
  toggle
}
