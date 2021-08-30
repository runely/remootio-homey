const Remootio = require('remootio-api-client')
const getReadableState = require('./get-readable-state')
const getState = require('./get-state')

let self
let device
let logInfo
let logError
let sendPingMs
let remootio
let ipaddress
let secretKey
let authKey
let reconnectMaxCount
let reconnectCount = 0

/**
 * Description of options for RemootioDevice
 * @typedef {Object} options
 * @property {object} device Device instance
 * @property {number} [sendPingMessageEveryXMs] The API client sends a ping frame to the Remootio device every sendPingMessageEveryXMs milliseconds to keep the connection alive. Remootio closes the connection if no message is received for 120 seconds. If no message is received from Remootio within (sendPingMessageEveryXMs/2) milliseconds after PING frame is sent the API client considers the connection to be broken and closes it. It's not recommended to set sendPingMessageEveryXMs below 10000 (10 seconds).
 */
class RemootioDevice {
  /**
   * Instantiate a new Remootio device
   * @param {options} options - Options for new Remootio device
   */
  constructor (options) {
    self = this

    device = options.device

    reconnectMaxCount = device.getSetting('maxReconnectRetries') || 3

    logInfo = (...message) => device.log(`[${device.getName()}]${device.getSetting('logicFlipped') ? ' [logic flipped]' : ''}`, `[${message.join('] [')}]`)
    logError = (error, ...message) => device.error(`[${device.getName()}]${device.getSetting('logicFlipped') ? ' [logic flipped]' : ''}`, `[${error}]`, `[${message.join('] [')}]`)

    if (options.sendPingMessageEveryXMs) {
      sendPingMs = options.sendPingMessageEveryXMs
    }

    // set as private when standard supports it....
    this.initialize()
  }

  // set as private when standard supports it....
  initialize (addListeners = true) {
    logInfo('initialize', `initialization started${addListeners ? ' with listener adding': ''}`)
    reconnectCount = 0
    ipaddress = device.getSetting('ipaddress')
    secretKey = device.getSetting('secretKey')
    authKey = device.getSetting('authKey')

    if (sendPingMs) {
      remootio = new Remootio(ipaddress, secretKey, authKey, sendPingMs)
    } else {
      remootio = new Remootio(ipaddress, secretKey, authKey)
    }

    // add Remootio listeners
    if (addListeners) {
      remootio.on('connecting', self.onRemootioConnecting)
      remootio.on('connected', self.onRemootioConnected)
      remootio.on('authenticated', self.onRemootioAuthenticated)
      remootio.on('error', self.onRemootioError)
      remootio.on('disconnect', self.onRemootioDisconnect)
      remootio.on('incomingmessage', self.onRemootioIncommingMessage)
    }

    remootio.connect(true)
  }

  // set as private when standard supports it....
  onRemootioConnecting () {
    reconnectCount++
    logInfo('onRemootioConnecting', 'Connecting to Remootio device', `Tries: ${reconnectCount}`)
  }

  // set as private when standard supports it....
  onRemootioConnected () {
    logInfo('onRemootioConnected', 'Connected to Remootio device. Starting authentication...')
    reconnectCount = 0
    remootio.authenticate()
  }

  // set as private when standard supports it....
  onRemootioAuthenticated () {
    logInfo('onRemootioAuthenticated', 'Authenticated to Remootio device')
    device.setAvailable()
  }

  // set as private when standard supports it....
  onRemootioError (error) {
    logError(error, 'onRemootioError', 'Error occured on Remootio device')
  }

  // set as private when standard supports it....
  onRemootioDisconnect (error) {
    if (!error) {
      if (reconnectCount >= reconnectMaxCount) {
        device.setUnavailable(device.homey.__('device.disconnected'))
        logError('onRemootioDisconnect', 'Disconnected from Remootio device', `Too many failed reconnect attempts: ${reconnectCount} out of ${reconnectMaxCount}`)
        remootio.disconnect()
      }
    } else {
      device.setUnavailable(error)
      logError(error, 'onRemootioDisconnect', 'Remootio has disconnected due to an error')
    }
  }

  // set as private when standard supports it....
  onRemootioIncommingMessage (frame, decryptedPayload) {
    if (!decryptedPayload) return
    const logicFlipped = device.getSetting('logicFlipped')
    const knownTypes = [
      'TRIGGER',
      'QUERY',
      'OPEN',
      'CLOSE',
      'StateChange',
      'RelayTrigger',
      'SensorFlipped'
    ]

    if (decryptedPayload.response !== undefined) { // it's a response frame to an action
      if (!knownTypes.includes(decryptedPayload.response.type)) logInfo(`Incomming response message : ${JSON.stringify(decryptedPayload, null, 2)}`)
      if (decryptedPayload.response.type === 'TRIGGER') {
        // it's a response frame to a trigger action
        if (decryptedPayload.response.success) {
          logInfo(decryptedPayload.response.type, 'The trigger action was successful')
        } else {
          logError(decryptedPayload.response.errorCode, decryptedPayload.response.type, 'The trigger action was not successful')
        }
        logInfo(decryptedPayload.response.type, `The status when triggering was ${getReadableState(logicFlipped, decryptedPayload.response.state)}`)
      }
      if (decryptedPayload.response.type === 'QUERY') {
        // it's a response frame for a query event, letting us know what state the garage_door currently is in
        if (decryptedPayload.response.success) {
          logInfo(decryptedPayload.response.type, `Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}`)
          device.setCapabilityValue('garagedoor_closed', getState(logicFlipped, decryptedPayload.response.state !== 'open'))
        } else {
          logError(decryptedPayload.response.errorCode, decryptedPayload.response.type, `Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}`)
        }
      }
      if (decryptedPayload.response.type === 'OPEN') {
        // it's a response frame for an open event, letting us know if the trigger succeeded or not
        if (decryptedPayload.response.success) {
          logInfo(decryptedPayload.response.type, `Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`)
        } else {
          logError(decryptedPayload.response.errorCode, decryptedPayload.response.type, `Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`)
        }
      }
      if (decryptedPayload.response.type === 'CLOSE') {
        // it's a response frame for a close event, letting us know if the trigger succeeded or not
        if (decryptedPayload.response.success) {
          logInfo(decryptedPayload.response.type, `Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`)
        } else {
          logError(decryptedPayload.response.errorCode, decryptedPayload.response.type, `Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`)
        }
      }
    }

    if (decryptedPayload.event !== undefined) { // it's a event frame containing a log entry from Remootio
      if (!knownTypes.includes(decryptedPayload.event.type)) logInfo(`Incomming event message : ${JSON.stringify(decryptedPayload, null, 2)}`)
      if (decryptedPayload.event.type === 'StateChange') {
        // this event is sent by Remootio when the status of the garage door has changed
        logInfo(decryptedPayload.event.type, `State changed to ${getReadableState(logicFlipped, decryptedPayload.event.state)}`)
        device.setCapabilityValue('garagedoor_closed', getState(logicFlipped, decryptedPayload.event.state !== 'open'))
      }
      if (decryptedPayload.event.type === 'RelayTrigger') {
        // this event is sent by Remootio when the relay has been triggered
        logInfo(decryptedPayload.event.type, `Relay triggered by '${decryptedPayload.event.data.keyType}' (${decryptedPayload.event.data.keyNr}) via '${decryptedPayload.event.data.via}'. Current state is ${getReadableState(logicFlipped, decryptedPayload.event.state)}`)
      }
      if (decryptedPayload.event.type === 'SensorFlipped') {
        // this event is sent by Remootio when the sensor logic has been flipped or unflipped. There is no way to tell which it is, so this should be set manually by the user in settings
        logInfo(decryptedPayload.event.type, 'Sensor flipped. Update manually in settings')
      }
    }
  }

  /**
   * Change state of garage door
   * @param {boolean} state - True for sending close command. False for sending open command. IF logic is flipped, well, you know ;)
   */
  changeState (state) {
    /* bear in mind that the sensor can have its logic flipped.
      NOT FLIPPED : false = closed ; true = open
      FLIPPED     : false = open   ; true = closed
    */
    if (device.getSetting('logicFlipped')) {
      if (!state) {
        remootio.sendClose()
        logInfo('changeState', 'Open command sent')
      } else {
        remootio.sendOpen()
        logInfo('changeState', 'Close command sent')
      }
    } else {
      if (!state) {
        remootio.sendOpen()
        logInfo('changeState', 'Open command sent')
      } else {
        remootio.sendClose()
        logInfo('changeState', 'Close command sent')
      }
    }
  }

  removeAllListeners() {
    remootio.removeAllListeners('connecting')
    remootio.removeAllListeners('connected')
    remootio.removeAllListeners('authenticated')
    remootio.removeAllListeners('error')
    remootio.removeAllListeners('disconnect')
    remootio.removeAllListeners('incomingmessage')
    logInfo('removeAllListeners', 'All listeners removed')
  }

  disconnect() {
    remootio.disconnect()
    logInfo('disconnect', 'Remootio disconnect started')
  }

  setReconnectMaxCount (value) {
    reconnectMaxCount = value
    logInfo('setReconnectMaxCount', `ReconnectMaxCount set to ${value}`)
  }
}

module.exports = RemootioDevice
