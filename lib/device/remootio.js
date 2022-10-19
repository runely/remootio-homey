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
    // add name to settings (delay for a random number of ms)
    const deviceNames = this.homey.settings.get('deviceNames')
    if (!deviceNames) {
      this.homey.settings.set('deviceNames', [this.getName()])
    } else {
      if (!deviceNames.includes(this.getName())) {
        this.homey.settings.set('deviceNames', [...deviceNames, this.getName()])
      }
    }

    // get if logs is enabled
    let logEnabled = this.homey.settings.get('logEnabled')
    if (logEnabled === null) {
      this.homey.settings.set('logEnabled', false)
      logEnabled = false
    }
    this.logEnabled = logEnabled

    // add a listener for when isEnabled is changed
    this.homey.settings.on('set', args => {
      if (args === 'logEnabled') {
        const newLogEnabled = this.homey.settings.get('logEnabled')
        this.logEnabled = newLogEnabled
      }
    })

    this.logInfo(`${this.getName()} -- onInit -- Device has been initialized`)

    // #region Remootio helper methods
    this.initialize = (addListeners = true) => {
      this.logInfo(`${this.getName()} -- initialize -- Initialization started`)

      this.reconnectCount = 0
      this.reconnectTimeout = null
      this.currentError = null
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

      this.remootio.connect(false)
    }

    this.removeDevice = () => {
      this.remootio.removeAllListeners()
      this.remootio.disconnect()
    }

    this.onRemootioConnecting = () => {
      this.reconnectCount++
      this.logInfo(`${this.getName()} -- onRemootioConnecting -- Connecting to device -- Tries: ${this.reconnectCount} / ${this.getSetting('maxReconnectRetries')}`)
    }

    this.onRemootioConnected = () => {
      this.logInfo(`${this.getName()} -- onRemootioConnected -- Connected to device. Starting authentication to device`)
      this.remootio.authenticate()
    }

    this.onRemootioAuthenticated = () => {
      this.logInfo(`${this.getName()} -- onRemootioAuthenticated -- Authenticated to device`)
      this.reconnectCount = 0
      this.currentError = null
      this.setWarning(null)
      this.setAvailable()
      this.remootio.sendHello()
    }

    this.onRemootioError = error => {
      this.logError(`${this.getName()} -- onRemootioError -- Error occured on device :`, error)
      this.currentError = error
      this.onRemootioDisconnect(error)
      this.setWarning(error)
      this.setUnavailable(error)
    }

    this.onRemootioDisconnect = error => {
      if (error) {
        this.setUnavailable(error)
        this.logError(`${this.getName()} -- onRemootioDisconnect -- Device has disconnected due to an error :`, error)
      } else {
        this.setUnavailable(this.homey.__('device.disconnected.normal'))
        this.logWarn(`${this.getName()} -- onRemootioDisconnect -- Device has disconnected`)
      }

      const maxReconnectRetries = this.getSetting('maxReconnectRetries')
      if (this.reconnectCount >= maxReconnectRetries) {
        // too many reconnect attempts in a short time. starting procedure to reconnect every hour instead
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
        }

        const millisecondsToNext = 1 * 60 * 60 * 1000
        const next = new Date(Date.now() + millisecondsToNext).toLocaleString(this.homey.__('driver.timezoneLocale'), { hour12: false, timeZone: this.homey.clock.getTimezone() })

        this.setUnavailable(`${error || this.currentError ? `${error || this.currentError} -- ${this.homey.__('device.disconnected.retryEveryXHour')}` : this.homey.__('device.disconnected.retryEveryXHour')} ${next}`)
        this.logWarn(`${this.getName()} -- onRemootioDisconnect -- Disconnected from device --${error || this.currentError ? ` ${error || this.currentError} --` : ''} Too many failed reconnect attempts in a short time: ${this.reconnectCount} / ${maxReconnectRetries}. Next reconnect attempt will be ${next}`)

        this.reconnectTimeout = setTimeout(() => {
          if (this.remootio.isConnected && this.remootio.isAuthenticated) {
            this.logInfo(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect not needed. Device already connected and authenticated`)
            return
          }

          this.logInfo(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect started`)
          this.remootio.connect(false)
        }, millisecondsToNext)
      } else {
        // max reconnect attempts not reached
        const autoreconnectMinutes = this.getSetting('autoreconnect')
        if (autoreconnectMinutes > 0) {
          // auto reconnect enabled
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
          }
          this.logInfo(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect will start in ${autoreconnectMinutes} minute(s)`)
          this.reconnectTimeout = setTimeout(() => {
            if (this.remootio.isConnected && this.remootio.isAuthenticated) {
              this.logInfo(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect not needed. Device already connected and authenticated`)
              return
            }

            this.logInfo(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect started`)
            this.remootio.connect(false)
          }, autoreconnectMinutes * 60 * 1000)
        } else {
          // auto reconnect disabled
          this.logInfo(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect is disabled`)
        }
      }
    }

    this.onRemootioIncommingMessage = (frame, decryptedPayload) => {
      if (frame && frame.type === 'SERVER_HELLO') {
        this.logInfo(`${this.getName()} -- frame -- ${frame.type} : ${JSON.stringify(frame, null, 2)}`)
        this.setSettings({
          apiVersion: frame.apiVersion,
          serialNumber: frame.serialNumber ? frame.serialNumber : '',
          remootioVersion: frame.remootioVersion ? frame.remootioVersion : ''
        })
      }
      if (!decryptedPayload) return
      const logicFlipped = this.getSetting('logicFlipped')

      if (decryptedPayload.response !== undefined) { // it's a response frame to an action
        this.logInfo(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Incomming message : ${JSON.stringify(decryptedPayload, null, 2)}`)
        if (decryptedPayload.response.type === 'TRIGGER') {
          // it's a response frame to a trigger action
          if (decryptedPayload.response.success) {
            this.logInfo(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- The trigger action was successful`)
          } else {
            this.logError(`${this.getName()} -- response error -- ${decryptedPayload.response.type} -- The trigger action was not successful :`, decryptedPayload.response.errorCode)
          }
          this.logInfo(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- The status when triggering was ${getReadableState(logicFlipped, decryptedPayload.response.state)}`)
        }
        if (decryptedPayload.response.type === 'QUERY') {
          // it's a response frame for a query event, letting us know what state the garage_door currently is in
          if (decryptedPayload.response.success) {
            this.logInfo(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}`)
            this.setCapabilityValue(garageDoorCapabilityID, getState(logicFlipped, decryptedPayload.response.state !== 'open'))
          } else {
            this.logError(`${this.getName()} -- response error -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)} :`, decryptedPayload.response.errorCode)
          }
        }
        if (decryptedPayload.response.type === 'OPEN') {
          // it's a response frame for an open event, letting us know if the trigger succeeded or not
          if (decryptedPayload.response.success) {
            this.logInfo(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`)
            this.setCapabilityValue(garageDoorCapabilityID, getState(logicFlipped, decryptedPayload.response.state !== 'open'))
          } else {
            this.logError(`${this.getName()} -- response error -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered} :`, decryptedPayload.response.errorCode)
          }
        }
        if (decryptedPayload.response.type === 'CLOSE') {
          // it's a response frame for a close event, letting us know if the trigger succeeded or not
          if (decryptedPayload.response.success) {
            this.logInfo(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`)
            this.setCapabilityValue(garageDoorCapabilityID, getState(logicFlipped, decryptedPayload.response.state !== 'open'))
          } else {
            this.logError(`${this.getName()} -- response error -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered} :`, decryptedPayload.response.errorCode)
          }
        }
      }

      if (decryptedPayload.event !== undefined) { // it's a event frame containing a log entry from Remootio
        this.logInfo(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- Incomming message : ${JSON.stringify(decryptedPayload, null, 2)}`)
        if (decryptedPayload.event.type === 'StateChange') {
          // this event is sent by Remootio when the status of the garage door has changed
          this.logInfo(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- State changed to ${getReadableState(logicFlipped, decryptedPayload.event.state)}`)
          this.setCapabilityValue(garageDoorCapabilityID, getState(logicFlipped, decryptedPayload.event.state !== 'open'))
        }
        if (decryptedPayload.event.type === 'RelayTrigger') {
          // this event is sent by Remootio when the relay has been triggered
          this.logInfo(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- Relay triggered by '${decryptedPayload.event.data.keyType}' (${decryptedPayload.event.data.keyNr}) via '${decryptedPayload.event.data.via}'. Current state is ${getReadableState(logicFlipped, decryptedPayload.event.state)}`)
        }
        if (decryptedPayload.event.type === 'SensorFlipped') {
          // this event is sent by Remootio when the sensor logic has been flipped or unflipped. There is no way to tell which it is, so this should be set manually by the user in settings
          this.logInfo(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- Sensor flipped. Update manually in settings`)
        }
        if (decryptedPayload.event.type === 'LeftOpen') {
          // this event is sent by Remootio when the garage door has been left open for the set time duration
          const duration = decryptedPayload.event.data.timeOpen100ms * 0.1 // timeOpen100ms shows how long the gate has been left open in multiples of 100 ms
          this.logInfo(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- Left open for ${duration} seconds`)

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
          this.logInfo(`${this.getName()} -- changeState -- Open command sent`)
        } else {
          this.remootio.sendOpen()
          this.logInfo(`${this.getName()} -- changeState -- Close command sent`)
        }
      } else {
        if (!state) {
          this.remootio.sendOpen()
          this.logInfo(`${this.getName()} -- changeState -- Open command sent`)
        } else {
          this.remootio.sendClose()
          this.logInfo(`${this.getName()} -- changeState -- Close command sent`)
        }
      }
    }
    // #endregion

    // initialize device
    this.initialize()

    // add garagedoor_closed ui toggle listener
    this.registerCapabilityListener(garageDoorCapabilityID, async value => {
      this.logInfo(`${this.getName()} -- ${garageDoorCapabilityID} capability listener -- Triggered with value:`, value)
      this.changeState(value)
    })
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded () {
    this.logInfo(`${this.getName()} -- onAdded -- Device has been added`)
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
    this.logInfo(`${this.getName()} -- onSettings -- These device settings were changed:`, changedKeys)

    if (changedKeys.includes('logicFlipped')) {
      const logicFlipped = newSettings.logicFlipped
      const currentCapabilityValue = this.getCapabilityValue(garageDoorCapabilityID)
      const newCapabilityValue = !currentCapabilityValue
      const newCapabilityReadable = getReadableState(logicFlipped, newCapabilityValue)

      this.logInfo(`${this.getName()} -- onSettings -- logicFlipped setting changed to`, logicFlipped)
      this.setCapabilityValue(garageDoorCapabilityID, newCapabilityValue)
      this.logInfo(`${this.getName()} -- onSettings -- Capability set from '${currentCapabilityValue}' to '${newCapabilityValue}':`, newCapabilityReadable)
    }

    if (changedKeys.includes('ipaddress') || changedKeys.includes('secretKey') || changedKeys.includes('authKey') || changedKeys.includes('maxReconnectRetries') || changedKeys.includes('autoreconnect')) {
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
    this.logInfo(`${this.getName()} -- onRenamed -- Device was renamed to`, name)
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted () {
    this.logInfo(`${this.getName()} -- onDeleted -- Device has been deleted`)
    this.removeDevice()
  }

  logInfo (message) {
    this.log(message)
    this.preserveLog('info', message)
  }

  logWarn (message) {
    this.log(`[WARN] - ${message}`)
    this.preserveLog('warn', message)
  }

  logError (message) {
    this.log(`[ERROR] - ${message}`)
    this.preserveLog('error', message)
  }

  preserveLog (type, message) {
    if (this.logEnabled) {
      const logs = this.homey.settings.get('logs')
      const newLog = {
        device: this.getName(),
        message,
        type,
        timestamp: new Date().toISOString()
      }
      if (logs === null) {
        this.homey.settings.set('logs', [newLog])
      } else {
        this.homey.settings.set('logs', [...logs, newLog])
      }
    }
  }
}

module.exports = RemootioDevice
