const deviceApiUrl = 'https://deviceapi.remootio.com/device'

const callDeviceApi = async (token, method, body = undefined) => {
  const init = {
    method,
    headers: {
      Authorization: `Bearer ${token}`
    }
  }

  if (body) {
    init.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(deviceApiUrl, init)
    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        statusText: response.statusText,
        data
      }
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    // NOTE: will only happen for network issues
    const data = error.toString()
    return {
      success: false,
      status: 500,
      data
    }
  }
}

const query = async (token) => {
  return await callDeviceApi(token, 'GET')
}

const toggle = async (token) => {
  return await callDeviceApi(token, 'POST', { command: 'open' })
}

module.exports = {
  query,
  toggle
}
