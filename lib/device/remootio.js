'use strict'

const { Device } = require('homey')
const Remootio = require('remootio-api-client')

const getReadableState = require('./get-readable-state')
const getState = require('./get-state')

const garageDoorCapabilityID = 'garagedoor_closed'

class RemootioDevice extends Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    this.log(`${this.getName()} -- onInit -- Device has been initialized`)

    // #region Remootio helper methods
    this.initialize = (addListeners = true) => {
      this.log(`${this.getName()} -- initialize -- Initialization started`)

      this.reconnectCount = 0
      this.remootio = new Remootio(this.getSetting('ipaddress'), this.getSetting('secretKey'), this.getSetting('authKey'))

      // add Remootio listeners
      if (addListeners) {
        this.remootio.on('connecting', this.onRemootioConnecting)
        this.remootio.on('connected', this.onRemootioConnected)
        this.remootio.on('authenticated', this.onRemootioAuthenticated)
        this.remootio.on('error', this.onRemootioError)
        this.remootio.on('disconnect', this.onRemootioDisconnect)
        this.remootio.on('incomingmessage', this.onRemootioIncommingMessage)
      }

      this.remootio.connect(true)
    }

    this.removeDevice = () => {
      this.remootio.removeAllListeners()
      this.remootio.disconnect()
    }

    this.onRemootioConnecting = () => {
      this.reconnectCount++
      this.log(`${this.getName()} -- onRemootioConnecting -- Connecting to device -- Tries: ${this.reconnectCount}`)
    }

    this.onRemootioConnected = () => {
      this.log(`${this.getName()} -- onRemootioConnected -- Connected to device. Starting authentication to device`)
      this.reconnectCount = 0
      this.remootio.authenticate()
    }

    this.onRemootioAuthenticated = () => {
      this.log(`${this.getName()} -- onRemootioAuthenticated -- Authenticated to device`)
      this.setAvailable()
      this.remootio.sendHello()
    }

    this.onRemootioError = error => {
      this.error(`${this.getName()} -- onRemootioError -- Error occured on device :`, error)
    }

    this.onRemootioDisconnect = error => {
      if (error) {
        this.setUnavailable(error)
        this.error(`${this.getName()} -- onRemootioDisconnect -- Device has disconnected due to an error :`, error)
      }

      const maxReconnectRetries = this.getSetting('maxReconnectRetries')
      if (this.reconnectCount >= maxReconnectRetries) {
        this.setUnavailable(this.homey.__('device.disconnected'))
        this.error(`${this.getName()} -- onRemootioDisconnect -- Disconnected from device -- Too many failed reconnect attempts: ${this.reconnectCount} out of ${maxReconnectRetries}`)
        this.remootio.disconnect()

        const autoreconnectMinutes = this.getSetting('autoreconnect')
        if (autoreconnectMinutes > 0) {
          setTimeout(() => {
            this.reconnectCount = 0
            this.log(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect started`)
            this.remootio.connect(true)
          }, autoreconnectMinutes * 60 * 1000)
        } else {
          this.log(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect is disabled`)
        }
      }
    }

    this.onRemootioIncommingMessage = (frame, decryptedPayload) => {
      if (frame && frame.type === 'SERVER_HELLO') {
        this.log(`${this.getName()} -- frame -- ${frame.type} : ${JSON.stringify(frame, null, 2)}`)
        this.setSettings({
          apiVersion: frame.apiVersion,
          serialNumber: frame.serialNumber ? frame.serialNumber : '',
          remootioVersion: frame.remootioVersion ? frame.remootioVersion : ''
        })
      }
      if (!decryptedPayload) return
      const logicFlipped = this.getSetting('logicFlipped')

      if (decryptedPayload.response !== undefined) { // it's a response frame to an action
        this.log(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Incomming message : ${JSON.stringify(decryptedPayload, null, 2)}`)
        if (decryptedPayload.response.type === 'TRIGGER') {
          // it's a response frame to a trigger action
          if (decryptedPayload.response.success) {
            this.log(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- The trigger action was successful`)
          } else {
            this.error(`${this.getName()} -- response error -- ${decryptedPayload.response.type} -- The trigger action was not successful :`, decryptedPayload.response.errorCode)
          }
          this.log(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- The status when triggering was ${getReadableState(logicFlipped, decryptedPayload.response.state)}`)
        }
        if (decryptedPayload.response.type === 'QUERY') {
          // it's a response frame for a query event, letting us know what state the garage_door currently is in
          if (decryptedPayload.response.success) {
            this.log(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}`)
            this.setCapabilityValue(garageDoorCapabilityID, getState(logicFlipped, decryptedPayload.response.state !== 'open'))
          } else {
            this.error(`${this.getName()} -- response error -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)} :`, decryptedPayload.response.errorCode)
          }
        }
        if (decryptedPayload.response.type === 'OPEN') {
          // it's a response frame for an open event, letting us know if the trigger succeeded or not
          if (decryptedPayload.response.success) {
            this.log(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`)
          } else {
            this.error(`${this.getName()} -- response error -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered} :`, decryptedPayload.response.errorCode)
          }
        }
        if (decryptedPayload.response.type === 'CLOSE') {
          // it's a response frame for a close event, letting us know if the trigger succeeded or not
          if (decryptedPayload.response.success) {
            this.log(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`)
          } else {
            this.error(`${this.getName()} -- response error -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered} :`, decryptedPayload.response.errorCode)
          }
        }
      }

      if (decryptedPayload.event !== undefined) { // it's a event frame containing a log entry from Remootio
        this.log(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- Incomming message : ${JSON.stringify(decryptedPayload, null, 2)}`)
        if (decryptedPayload.event.type === 'StateChange') {
          // this event is sent by Remootio when the status of the garage door has changed
          this.log(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- State changed to ${getReadableState(logicFlipped, decryptedPayload.event.state)}`)
          this.setCapabilityValue(garageDoorCapabilityID, getState(logicFlipped, decryptedPayload.event.state !== 'open'))
        }
        if (decryptedPayload.event.type === 'RelayTrigger') {
          // this event is sent by Remootio when the relay has been triggered
          this.log(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- Relay triggered by '${decryptedPayload.event.data.keyType}' (${decryptedPayload.event.data.keyNr}) via '${decryptedPayload.event.data.via}'. Current state is ${getReadableState(logicFlipped, decryptedPayload.event.state)}`)
        }
        if (decryptedPayload.event.type === 'SensorFlipped') {
          // this event is sent by Remootio when the sensor logic has been flipped or unflipped. There is no way to tell which it is, so this should be set manually by the user in settings
          this.log(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- Sensor flipped. Update manually in settings`)
        }
        if (decryptedPayload.event.type === 'LeftOpen') {
          // this event is sent by Remootio when the garage door has been left open for the set time duration
          const duration = decryptedPayload.event.data.timeOpen100ms * 0.1 // timeOpen100ms shows how long the gate has been left open in multiples of 100 ms
          this.log(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- Left open for ${duration} seconds`)

          const tokens = {
            duration,
            name: this.getName()
          }
          this.homey.flow.getDeviceTriggerCard('left_open').trigger(this, tokens)
        }
      }
    }

    this.changeState = state => {
      /* bear in mind that the sensor can have its logic flipped.
        NOT FLIPPED : false = closed ; true = open
        FLIPPED     : false = open   ; true = closed
      */
      if (this.getSetting('logicFlipped')) {
        if (!state) {
          this.remootio.sendClose()
          this.log(`${this.getName()} -- changeState -- Open command sent`)
        } else {
          this.remootio.sendOpen()
          this.log(`${this.getName()} -- changeState -- Close command sent`)
        }
      } else {
        if (!state) {
          this.remootio.sendOpen()
          this.log(`${this.getName()} -- changeState -- Open command sent`)
        } else {
          this.remootio.sendClose()
          this.log(`${this.getName()} -- changeState -- Close command sent`)
        }
      }
    }
    // #endregion

    // initialize device
    this.initialize()

    // add garagedoor_closed ui toggle listener
    this.registerCapabilityListener(garageDoorCapabilityID, async value => {
      this.log(`${this.getName()} -- ${garageDoorCapabilityID} capability listener -- Triggered with value:`, value)
      this.changeState(value)
    })
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded () {
    this.log(`${this.getName()} -- onAdded -- Device has been added`)
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings ({ oldSettings, newSettings, changedKeys }) {
    this.log(`${this.getName()} -- onSettings -- These device settings were changed:`, changedKeys)

    if (changedKeys.includes('logicFlipped')) {
      const logicFlipped = newSettings.logicFlipped
      const currentCapabilityValue = this.getCapabilityValue(garageDoorCapabilityID)
      const newCapabilityValue = !currentCapabilityValue
      const newCapabilityReadable = getReadableState(logicFlipped, newCapabilityValue)

      this.log(`${this.getName()} -- onSettings -- logicFlipped setting changed to`, logicFlipped)
      this.setCapabilityValue(garageDoorCapabilityID, newCapabilityValue)
      this.log(`${this.getName()} -- onSettings -- Capability set from '${currentCapabilityValue}' to '${newCapabilityValue}':`, newCapabilityReadable)
    }

    if (changedKeys.includes('ipaddress') || changedKeys.includes('secretKey') || changedKeys.includes('authKey')) {
      // since the new settings isn't saved until this function is finished, reconnect after 150ms
      this.removeDevice()
      setTimeout(() => {
        this.initialize()
      }, 150)
    }
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed (name) {
    this.log(`${this.getName()} -- onRenamed -- Device was renamed to`, name)
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted () {
    this.log(`${this.getName()} -- onDeleted -- Device has been deleted`)
    this.removeDevice()
  }
}

module.exports = RemootioDevice
