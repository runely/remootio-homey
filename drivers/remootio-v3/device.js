'use strict';

const { Device } = require('homey');
const Remootio = require('remootio-api-client')

const getReadableState = state => {
  if (logicFlipped) return state === 'open' ? "closed" : "open"
  else return state
}

const getState = state => {
  if (logicFlipped) return !state
  else return state
}

let homey
let deviceName
let logicFlipped
let logInfo
let logError

class MyDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('MyDevice has been initialized. Starting connection to Remootio');
    homey = this
    deviceName = this.getName()
    logicFlipped = this.getSetting('logicFlipped')
    logInfo = msg => this.log(`'${deviceName}'${logicFlipped ? ' - logic flipped' : ''} - ${msg}`)
    logError = (msg, error) => this.error(`'${deviceName}'${logicFlipped ? ' - logic flipped' : ''} - ${msg} : ${error}`)

    // initialize device
    this.remootio = new Remootio(this.getSetting('ipaddress'), this.getSetting('secretKey'), this.getSetting('authKey'))

    // add Remootio listeners
    this.remootio.on('connecting', this.onRemootioConnecting)
    this.remootio.on('connected', this.onRemootioConnected)
    this.remootio.on('authenticated', this.onRemootioAuthenticated)
    this.remootio.on('error', this.onRemootioError)
    this.remootio.on('disconnect', this.onRemootioDisconnect)
    this.remootio.on('incomingmessage', this.onRemootioIncommingMessage)

    // add garagedoor_closed listener
    this.registerCapabilityListener('garagedoor_closed', async value => {
      /* bear in mind that the sensor can have its logic flipped.
        NOT FLIPPED : false = closed ; true = open
        FLIPPED     : false = open   ; true = closed
      */
      this.log('garagedoor_closed capability triggered:', value)
      if (logicFlipped) {
        if (!value) {
          this.remootio.sendClose()
          logInfo('Open command sent')
        } else {
          this.remootio.sendOpen()
          logInfo('Close command sent')
        }
      } else {
        if (!value) {
          this.remootio.sendOpen()
          logInfo('Open command sent')
        } else {
          this.remootio.sendClose()
          logInfo('Close command sent')
        }
      }
    })

    // start connecting to the api
    this.remootio.connect(true)
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('MyDevice settings where changed');

    if (changedKeys.includes('logicFlipped')) {
      logicFlipped = newSettings['logicFlipped']
      this.log('logicFlipped setting changed to', logicFlipped)
    }
    if (changedKeys.includes('ipaddress') || changedKeys.includes('secretKey') || changedKeys.includes('authKey')) {
      this.remootio.disconnect
    }
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('MyDevice was renamed');
    deviceName = name
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MyDevice has been deleted');
    
    // remove Remootio listeners
    this.remootio.removeAllListenersListeners('connecting')
    this.remootio.removeAllListenersListeners('connected')
    this.remootio.removeAllListenersListeners('authenticated')
    this.remootio.removeAllListenersListeners('error')
    this.remootio.removeAllListenersListeners('disconnect')
    this.remootio.removeAllListenersListeners('incomingmessage')

    this.remootio.disconnect()
  }

  onRemootioConnecting() {
    logInfo('connecting...')
  }

  onRemootioConnected() {
    logInfo('connected. Starting authentication...')
    homey.remootio.authenticate()
  }

  onRemootioAuthenticated() {
    logInfo('authenticated. Enjoy :)')
    homey.setAvailable()
  }

  onRemootioError(error) {
    logError('RemootioError', error)
  }

  onRemootioDisconnect(error) {
    if (!error) {
      homey.setUnavailable('Remootio has disconnected. Check your WiFi and connection to the device')
      logInfo('disconnected. Will try to reconnect...')
      // create a function to reset device
      // create a function to setup device
    } else {
      homey.setUnavailable(error)
      logError('Remootio disconnected due to an error', error)
    }
  }

  onRemootioIncommingMessage(frame, decryptedPayload) {
    if (!decryptedPayload) return
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
          logInfo('The trigger action was successful')
        } else {
          logError('The trigger action was not successful', decryptedPayload.response.errorCode)
        }
        logInfo(`The status when triggering was ${getReadableState(decryptedPayload.response.state)}`)
      }
      if (decryptedPayload.response.type === 'QUERY') {
        // it's a response frame for a query event, letting us know what state the garage_door currently is in
        if (decryptedPayload.response.success) {
          logInfo(`Current state is ${getReadableState(decryptedPayload.response.state)}`)
          homey.setCapabilityValue('garagedoor_closed', getState(decryptedPayload.response.state !== 'open'))
        } else {
          logError(`Current state is ${getReadableState(decryptedPayload.response.state)}`, decryptedPayload.response.errorCode)
        }
      }
      if (decryptedPayload.response.type === 'OPEN') {
        // it's a response frame for an open event, letting us know if the trigger succeeded or not
        if (decryptedPayload.response.success) {
          logInfo(`Current state is ${getReadableState(decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`)
        } else {
          logError(`Current state is ${getReadableState(decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`, decryptedPayload.response.errorCode)
        }
      }
      if (decryptedPayload.response.type === 'CLOSE') {
        // it's a response frame for a close event, letting us know if the trigger succeeded or not
        if (decryptedPayload.response.success) {
          logInfo(`Current state is ${getReadableState(decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`)
        } else {
          logError(`Current state is ${getReadableState(decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`, decryptedPayload.response.errorCode)
        }
      }
    }

    if (decryptedPayload.event !== undefined) { // it's a event frame containing a log entry from Remootio
      if (!knownTypes.includes(decryptedPayload.event.type)) logInfo(`Incomming event message : ${JSON.stringify(decryptedPayload, null, 2)}`)
      if (decryptedPayload.event.type === 'StateChange') {
        // this event is sent by Remootio when the status of the garage door has changed
        logInfo(`State changed to ${getReadableState(decryptedPayload.event.state)}`)
        homey.setCapabilityValue('garagedoor_closed', getState(decryptedPayload.event.state !== 'open'))
      }
      if (decryptedPayload.event.type === 'RelayTrigger') {
        // this event is sent by Remootio when the relay has been triggered
        logInfo(`Relay triggered by '${decryptedPayload.event.data.keyType}' (${decryptedPayload.event.data.keyNr}) via '${decryptedPayload.event.data.via}'. Current state is ${getReadableState(decryptedPayload.event.state)}`)
      }
      if (decryptedPayload.event.type === 'SensorFlipped') {
        // this event is sent by Remootio when the sensor logic has been flipped or unflipped. There is no way to tell which it is, so this should be set manually by the user in settings
        logInfo(`Sensor flipped. Should be set manually`)
      }
    }
  }

}

module.exports = MyDevice;
