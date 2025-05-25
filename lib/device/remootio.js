'use strict'

const { Device } = require('homey')
const Remootio = require('remootio-api-client')

const getReadableState = require('./get-readable-state')
const getState = require('./get-state')

const garageDoorCapabilityID = 'garagedoor_closed'
const garageDoorOutput1GateCapabilityID = 'garagedoor_closed.output1_gate'
const garageDoorOutput2FreeCapabilityID = 'garagedoor_closed.output2_free'
const garageDoorOutput1FreeCapabilityID = 'garagedoor_closed.output1_free'
const garageDoorOutput2GateCapabilityID = 'garagedoor_closed.output2_gate'

const getOutputsReadable = (configuration, capabilities) => {
  if (configuration.output1Only) {
    return 'Output 1: gate impulse control'
  }
  if (configuration.output1Gate && configuration.output2Free) {
    return 'Output 1: gate impulse control, Output 2: free relay output'
  }
  if (configuration.output1Free && configuration.output2Gate) {
    return 'Output 1: free relay output, Output 2: gate impulse control'
  }

  return `Unknown output configuration: ${capabilities.join(', ')}`
}

const maskKey = key => {
  let maskedKey = ''
  for (let i = 0; i < key.length - 5; i++) {
    maskedKey += 'x'
  }
  return `${maskedKey}${key.slice(-5)}`
}

class RemootioDevice extends Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    const capabilities = this.getCapabilities()
    this.configuration = {
      output1Only: Array.isArray(capabilities) && capabilities.includes(garageDoorCapabilityID),
      output1Gate: Array.isArray(capabilities) && capabilities.includes(garageDoorOutput1GateCapabilityID),
      output1Free: Array.isArray(capabilities) && capabilities.includes(garageDoorOutput1FreeCapabilityID),
      output2Gate: Array.isArray(capabilities) && capabilities.includes(garageDoorOutput2GateCapabilityID),
      output2Free: Array.isArray(capabilities) && capabilities.includes(garageDoorOutput2FreeCapabilityID)
    }
    this.configuration.outputsReadable = getOutputsReadable(this.configuration, capabilities)

    // #region Remootio helper methods
    this.initialize = (addListeners = true) => {
      this.log(`${this.getName()} -- initialize -- Initialization started -- Device will be initialized with configuration: ${this.configuration.outputsReadable}`)

      this.reconnectCount = 0
      if (this.reconnectTimeout) {
        this.homey.clearTimeout(this.reconnectTimeout)
      }
      if (this.connectTimeout) {
        this.homey.clearTimeout(this.connectTimeout)
      }
      this.reconnectTimeout = null
      this.connectTimeout = null
      this.currentError = null
      const ipaddress = this.getSetting('ipaddress')
      const secretKey = this.getSetting('secretKey')
      const authKey = this.getSetting('authKey')
      this.log(`${this.getName()} -- Connecting with IP:${ipaddress} SecretKey:'${maskKey(secretKey)}' AuthKey:'${maskKey(authKey)}'`)
      this.remootio = new Remootio(ipaddress, secretKey, authKey)

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

    this.removeDevice = (reconnect = false) => {
      if (this.reconnectTimeout) {
        this.homey.clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }

      if (this.connectTimeout) {
        this.homey.clearTimeout(this.connectTimeout)
        this.connectTimeout = null
      }

      if (this.remootio.isConnected) {
        if (!reconnect) {
          this.noListeners = true
          this.log(`${this.getName()} -- removeDevice -- Starting disconnection for device removal`)
          this.remootio.disconnect()
          return
        }

        delete this.noListeners
        this.log(`${this.getName()} -- removeDevice -- Starting disconnection for device reconnection`)
        this.remootio.disconnect()
        return
      } else if (reconnect) {
        this.log(`${this.getName()} -- removeDevice -- Starting reinitialization for device`)
        this.remootio.removeAllListeners()
        this.initialize()
        return
      }

      this.remootio.removeAllListeners()
      this.log(`${this.getName()} -- removeDevice -- Removing all listeners for device removal`)
    }

    this.onRemootioConnecting = () => {
      this.reconnectCount++
      this.log(`${this.getName()} -- onRemootioConnecting -- Connecting to device -- Tries: ${this.reconnectCount} / ${this.getSetting('maxReconnectRetries')}`)
      if (!this.remootio.isConnected) {
        this.log(`${this.getName()} -- onRemootioConnecting -- Connecting to device -- connectTimeout will trigger in 1 minute if connection isn't established`)
        this.connectTimeout = this.homey.setTimeout(() => {
          //this.onRemootioError('Wrong IP address, secret key or auth key')
          this.onRemootioError('Failed to connect. Restart app')
        }, 60 * 1000) // 1 minute timeout
      }
    }

    this.onRemootioConnected = () => {
      this.log(`${this.getName()} -- onRemootioConnected -- Connected to device. Starting authentication to device`)
      if (this.reconnectTimeout) {
        this.homey.clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }
      if (this.connectTimeout) {
        this.log(`${this.getName()} -- onRemootioConnected -- Connected to device -- connectTimeout canceled and removed`)
        this.homey.clearTimeout(this.connectTimeout)
        this.connectTimeout = null
      }
      this.remootio.authenticate()
    }

    this.onRemootioAuthenticated = () => {
      this.log(`${this.getName()} -- onRemootioAuthenticated -- Authenticated to device`)
      this.reconnectCount = 0
      this.currentError = null
      this.setWarning(null)
        .catch(err => this.error(`${this.getName()} -- onRemootioAuthenticated -- Failed to set warning : ${err}`))
      this.setAvailable()
        .catch(err => this.error(`${this.getName()} -- onRemootioAuthenticated -- Failed to set as available : ${err}`))
      this.remootio.sendHello()
    }

    this.onRemootioError = error => {
      this.error(`${this.getName()} -- onRemootioError -- Error occured on device :`, error)
      this.currentError = error
      if (this.reconnectTimeout) {
        this.homey.clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }
      if (this.connectTimeout) {
        this.log(`${this.getName()} -- onRemootioError -- Error occured on device -- connectTimeout cleared and removed`)
        this.homey.clearTimeout(this.connectTimeout)
        this.connectTimeout = null
      }
      this.onRemootioDisconnect(error)
      this.setWarning(error)
        .catch(err => this.error(`${this.getName()} -- onRemootioError -- Failed to set warning : ${err}`))
      this.setUnavailable(error)
        .catch(err => this.error(`${this.getName()} -- onRemootioError -- Failed to set as unavailable : ${err}`))
    }

    this.onRemootioDisconnect = error => {
      if (error) {
        this.setUnavailable(error)
          .catch(err => this.error(`${this.getName()} -- onRemootioDisconnect -- Failed to set as unavailable : ${err}`))
        this.error(`${this.getName()} -- onRemootioDisconnect -- Device has disconnected due to an error :`, error)
      } else if (this.noListeners) {
        this.log(`${this.getName()} -- device has been disconnected for the last time`)
        this.remootio.removeAllListeners()
        return
      } else {
        this.setUnavailable(this.homey.__('device.disconnected.normal'))
          .catch(err => this.error(`${this.getName()} -- onRemootioDisconnect -- Failed to set as unavailable : ${err}`))
        this.log(`[WARN] - ${this.getName()} -- onRemootioDisconnect -- Device has disconnected`)
      }

      /* const maxReconnectRetries = this.getSetting('maxReconnectRetries')
      if (this.reconnectCount >= maxReconnectRetries) {
        // too many reconnect attempts in a short time. starting procedure to reconnect every hour instead
        if (this.reconnectTimeout) {
          this.homey.clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }

        const millisecondsToNext = 60 * 60 * 1000
        const next = new Date(Date.now() + millisecondsToNext).toLocaleString(this.homey.__('driver.timezoneLocale'), { hour12: false, timeZone: this.homey.clock.getTimezone() })

        this.setUnavailable(`${error || this.currentError ? `${error || this.currentError} -- ${this.homey.__('device.disconnected.retryEveryXHour')}` : this.homey.__('device.disconnected.retryEveryXHour')} ${next}`)
          .catch(err => this.error(`${this.getName()} -- onRemootioDisconnect -- Failed to set as unavailable : ${err}`))
        this.log(`[WARN] - ${this.getName()} -- onRemootioDisconnect -- Disconnected from device --${error || this.currentError ? ` ${error || this.currentError} --` : ''} Too many failed reconnect attempts in a short time: ${this.reconnectCount} / ${maxReconnectRetries}. Next reconnect attempt will be ${next}`)

        this.reconnectTimeout = this.homey.setTimeout(() => {
          if (this.remootio.isConnected && this.remootio.isAuthenticated) {
            this.log(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect not needed. Device already connected and authenticated`)
            return
          }

          this.log(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect started`)
          this.remootio.removeAllListeners()
          this.initialize()
        }, millisecondsToNext)

        return
      }

      // max reconnect attempts not reached
      const autoreconnectMinutes = this.getSetting('autoreconnect')
      if (autoreconnectMinutes <= 0) {
        // auto reconnect disabled
        this.log(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect is disabled`)
        return
      }

      // auto reconnect enabled
      if (this.reconnectTimeout) {
        this.homey.clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }
      this.log(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect will start in ${autoreconnectMinutes} minute(s)`)
      this.reconnectTimeout = this.homey.setTimeout(() => {
        if (this.remootio.isConnected && this.remootio.isAuthenticated) {
          this.log(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect not needed. Device already connected and authenticated`)
          return
        }

            this.log(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect started`)
            this.remootio.removeAllListeners()
            this.initialize()
          }, autoreconnectMinutes * 60 * 1000)
        } else {
          // auto reconnect disabled
          this.log(`${this.getName()} -- onRemootioDisconnect -- Auto reconnect is disabled`)
        }
      } */
    }

    this.onRemootioIncommingMessage = (frame, decryptedPayload) => {
      if (frame && frame.type === 'SERVER_HELLO') {
        this.log(`${this.getName()} -- frame -- ${frame.type} : ${JSON.stringify(frame, null, 2)}`)
        this.setSettings({
          apiVersion: frame.apiVersion,
          serialNumber: frame.serialNumber ? frame.serialNumber : '',
          remootioVersion: frame.remootioVersion ? frame.remootioVersion : ''
        })
          .catch(err => this.error(`${this.getName()} -- frame -- ${frame.type} : ${JSON.stringify(frame, null, 2)} -- Failed to set hardware settings : ${err}`))
      }
      if (!decryptedPayload) return
      const logicFlipped = this.getSetting('logicFlipped')
      const garageCapabilityId = this.getGarageDoorCapabilityId()

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
          if (!decryptedPayload.response.success) {
            this.log(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}`)
            if (garageCapabilityId) {
              this.setCapabilityValue(garageCapabilityId, getState(logicFlipped, decryptedPayload.response.state !== 'open'))
                .catch(err => this.error(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Failed to set capability value on '${garageCapabilityId}' : ${err}`))
            } else {
              this.log(`[WARN] - ${this.getName()} -- response -- ${decryptedPayload.response.type} -- Garagedoor capability not found. Capabilities:`, capabilities)
            }
          } else {
            this.error(`${this.getName()} -- response error -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)} :`, decryptedPayload.response.errorCode)
          }
        }
        if (decryptedPayload.response.type === 'OPEN') {
          // it's a response frame for an open event, letting us know if the trigger succeeded or not
          if (decryptedPayload.response.success) {
            this.log(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`)
            if (garageCapabilityId) {
              this.setCapabilityValue(garageCapabilityId, getState(logicFlipped, decryptedPayload.response.state !== 'open'))
                .catch(err => this.error(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Failed to set capability value on '${garageCapabilityId}' : ${err}`))
            } else {
              this.log(`[WARN] - ${this.getName()} -- response -- ${decryptedPayload.response.type} -- Garagedoor capability not found. Capabilities:`, capabilities)
            }
          } else {
            this.error(`${this.getName()} -- response error -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered} :`, decryptedPayload.response.errorCode)
          }
        }
        if (decryptedPayload.response.type === 'CLOSE') {
          // it's a response frame for a close event, letting us know if the trigger succeeded or not
          if (decryptedPayload.response.success) {
            this.log(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered}`)
            if (garageCapabilityId) {
              this.setCapabilityValue(garageCapabilityId, getState(logicFlipped, decryptedPayload.response.state !== 'open'))
                .catch(err => this.error(`${this.getName()} -- response -- ${decryptedPayload.response.type} -- Failed to set capability value on '${garageCapabilityId}' : ${err}`))
            } else {
              this.log(`[WARN] - ${this.getName()} -- response -- ${decryptedPayload.response.type} -- Garagedoor capability not found. Capabilities:`, capabilities)
            }
          } else {
            this.error(`${this.getName()} -- response error -- ${decryptedPayload.response.type} -- Current state is ${getReadableState(logicFlipped, decryptedPayload.response.state)}. Was relay triggered: ${decryptedPayload.response.relayTriggered} :`, decryptedPayload.response.errorCode)
          }
        }
      }

      if (decryptedPayload.event !== undefined) { // it's an event frame containing a log entry from Remootio
        this.log(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- Incomming message : ${JSON.stringify(decryptedPayload, null, 2)}`)
        if (decryptedPayload.event.type === 'StateChange') {
          // this event is sent by Remootio when the status of the garage door has changed
          this.log(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- State changed to ${getReadableState(logicFlipped, decryptedPayload.event.state)}`)
          const state = getState(logicFlipped, decryptedPayload.event.state !== 'open')
          if (garageCapabilityId) {
            this.setCapabilityValue(garageCapabilityId, state)
              .catch(err => this.error(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- Failed to set capability value on '${garageCapabilityId}' : ${err}`))
          } else {
            this.log(`[WARN] - ${this.getName()} -- event -- ${decryptedPayload.event.type} -- Garagedoor capability not found. Capabilities:`, capabilities)
          }

          if (!this.configuration.output1Only) {
            this.homey.flow.getDeviceTriggerCard(`garagedoor_closed_${state}_sub`).trigger(this)
            this.log(`Triggered garagedoor_closed_${state}_sub`)
          }
        }
        if (decryptedPayload.event.type === 'RelayTrigger') {
          // this event is sent by Remootio when the relay has been triggered
          this.log(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- Relay triggered by '${decryptedPayload.event.data.keyType}' (${decryptedPayload.event.data.keyNr}) via '${decryptedPayload.event.data.via}'. Current state is ${getReadableState(logicFlipped, decryptedPayload.event.state)}`)
        }
        if (decryptedPayload.event.type === 'SensorFlipped') {
          // this event is sent by Remootio when the sensor logic has been flipped or unflipped. There is no way to tell which it is, so this should be set manually by the user in settings
          this.log(`${this.getName()} -- event -- ${decryptedPayload.event.type} -- Sensor flipped. Update manually in settings`)
          // TODO: Add a notification to timeline here maybe??
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
          return
        }

        this.remootio.sendOpen()
        this.log(`${this.getName()} -- changeState -- Close command sent`)
        return
      }

      if (!state) {
        this.remootio.sendOpen()
        this.log(`${this.getName()} -- changeState -- Open command sent`)
        return
      }

      this.remootio.sendClose()
      this.log(`${this.getName()} -- changeState -- Close command sent`)
    }

    this.getGarageDoorState = () => {
      const garageCapabilityId = this.getGarageDoorCapabilityId()
      if (!garageCapabilityId) {
        this.log(`[WARN] - ${this.getName()} -- getGarageDoorState -- Garagedoor capability not found. Capabilities:`, capabilities)
        return false
      }

      const logicFlipped = this.getSetting('logicFlipped')
      const capabilityValue = this.getCapabilityValue(garageCapabilityId)
      return getState(logicFlipped, capabilityValue)
    }

    this.getFreeRelayState = () => this.getCapabilityValue(this.getFreeRelayCapabilityId())

    this.getGarageDoorCapabilityId = () => {
      if (this.configuration.output1Only) {
        return garageDoorCapabilityID
      }
      if (this.configuration.output1Gate) {
        return garageDoorOutput1GateCapabilityID
      }
      if (this.configuration.output2Gate) {
        return garageDoorOutput2GateCapabilityID
      }

      return null
    }

    this.getFreeRelayCapabilityId = () => {
      if (this.configuration.output1Free) {
        return garageDoorOutput1FreeCapabilityID
      }
      if (this.configuration.output2Free) {
        return garageDoorOutput2FreeCapabilityID
      }

      return null
    }
    // #endregion

    // initialize device
    this.initialize()

    const garageCapabilityId = this.getGarageDoorCapabilityId()
    if (garageCapabilityId) {
      // add garagedoor ui toggle listener
      this.registerCapabilityListener(garageCapabilityId, async value => {
        this.log(`${this.getName()} -- ${this.getGarageDoorCapabilityId()} capability listener -- Triggered with value:`, value)
        this.changeState(value)
      })
      this.log(`${this.getName()} -- ${garageCapabilityId} capability listener registered`)
    } else {
      this.log(`[WARN] - ${this.getName()} -- Garagedoor capability listener NOT registered. Garagedoor capability not found. Capabilities:`, capabilities)
    }

    const freeCapabilityId = this.getFreeRelayCapabilityId()
    if (freeCapabilityId) {
      // add free ui toggle listener
      this.registerCapabilityListener(freeCapabilityId, async value => {
        this.log(`${this.getName()} -- ${this.getFreeRelayCapabilityId()} capability listener -- Triggered with value:`, value)
        this.remootio.sendTriggerSecondary()
      })
      this.log(`${this.getName()} -- ${freeCapabilityId} capability listener registered`)
    } else if (garageCapabilityId === garageDoorOutput1GateCapabilityID || garageCapabilityId === garageDoorOutput2GateCapabilityID) {
      this.log(`[WARN] - ${this.getName()} -- Free capability listener NOT registered. Garage door capability: '${garageCapabilityId}'. Capabilities:`, capabilities)
    }
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
      const garageCapabilityId = this.getGarageDoorCapabilityId()
      if (garageCapabilityId) {
        const logicFlipped = newSettings.logicFlipped
        const currentCapabilityValue = this.getCapabilityValue(garageCapabilityId)
        const newCapabilityValue = !currentCapabilityValue
        const newCapabilityReadable = getReadableState(logicFlipped, newCapabilityValue)

        this.log(`${this.getName()} -- onSettings -- logicFlipped setting changed to`, logicFlipped)
        this.setCapabilityValue(garageCapabilityId, newCapabilityValue)
          .catch(err => this.error(`${this.getName()} -- onSettings -- logicFlipped setting - Failed to set capability value on '${garageCapabilityId}' : ${err}`))
        this.log(`${this.getName()} -- onSettings -- Capability set from '${currentCapabilityValue}' to '${newCapabilityValue}':`, newCapabilityReadable)
      } else {
        this.log(`${this.getName()} -- onSettings -- Garagedoor capability not found. Changed keys:`, changedKeys)
      }
    }

    if (changedKeys.includes('ipaddress') || changedKeys.includes('secretKey') || changedKeys.includes('authKey') || changedKeys.includes('maxReconnectRetries') || changedKeys.includes('autoreconnect')) {
      // since the new settings isn't saved until this function is finished, do what must be done after 150ms
      this.homey.setTimeout(() => this.removeDevice(true), 150)
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
