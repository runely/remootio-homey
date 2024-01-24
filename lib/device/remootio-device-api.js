'use strict'

const { Device } = require('homey')
const { query, toggle } = require('./api/device-api')

const garageDoorCapabilityId = 'garagedoor_closed'

class RemootioDeviceAPI extends Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    this.registerCapabilityListener(garageDoorCapabilityId, async (value) => {
      this.log(`${this.getName()} -- ${garageDoorCapabilityId} -- Toggled sent`)
      const response = await toggle(this.getStoreValue('token'))
      this.log(`${this.getName()} -- ${garageDoorCapabilityId} -- Toggled response --`, response)
      if (!response.success) {
        // didn't reach Device API
        this.log(`[ERROR] -- ${this.getName()} -- ${garageDoorCapabilityId} -- Toggled -- device-api communication failed : ${response.status} -- ${response.statusText} --`, response.data)
        throw new Error(`Toggle failed: ${response.status} : ${response.statusText}`)
      } else if (!response.data.success) {
        // reached Device API, but command failed
        this.log(`[WARN] -- ${this.getName()} -- ${garageDoorCapabilityId} -- Toggled -- device-api communication success but command failed : ${response.data.errorMessage}`)
        throw new Error(response.data.errorMessage)
      }
    })
    this.log(`${this.getName()} -- ${garageDoorCapabilityId} capability listener registered`)
    this.log(`${this.getName()} has being initialized`)

    await this.queryDevice()

    this.setQueryInterval()
  }

  /**
   * queryDevice is called on device init and on a set interval
   */
  async queryDevice (interval = false) {
    this.log(`${this.getName()} -- queryDevice -- Query sent`)
    const response = await query(this.getStoreValue('token'))
    this.log(`${this.getName()} -- queryDevice -- Query response --`, response)
    if (!response.success) {
      // didn't reach Device API
      this.log(`[ERROR] -- ${this.getName()} -- queryDevice -- Query -- device-api communication failed : ${response.status} -- ${response.statusText} --`, response.data)
      await this.setWarning(`Remootio API not reachable`)
      if (interval) { this.logNextQuery('queryDevice', this.getSetting('queryInterval')) }
      return
    } else if (!response.data.success) {
      // reached Device API, but query failed
      this.log(`[WARN] -- ${this.getName()} -- queryDevice -- Query -- device-api communication success but query failed : ${response.data.errorMessage}`)
      await this.setWarning(response.data.errorMessage)
      if (interval) { this.logNextQuery('queryDevice', this.getSetting('queryInterval')) }
      return
    }

    // remove any warnings since we have contact with the device
    await this.unsetWarning()

    this.log(`${this.getName()} -- queryDevice -- Capability value before changed: ${this.getCapabilityValue(garageDoorCapabilityId)}`)
    const newStatus = response.data.deviceState.openStatus === 'closed'
    try {
      await this.setCapabilityValue(garageDoorCapabilityId, newStatus)
      this.log(`${this.getName()} -- queryDevice -- Capability value after changed: ${this.getCapabilityValue(garageDoorCapabilityId)}`)
    } catch (ex) {
      this.log(`[ERROR] -- ${this.getName()} -- queryDevice -- queryDevice -- Failed to set capability '${garageDoorCapabilityId}' to ${newStatus} :`, ex)
    }

    if (interval) {
      this.logNextQuery('queryDevice', this.getSetting('queryInterval'))
    }
  }

  getNextQueryDate (interval) {
    const dt = new Date()
    return new Date(dt.setTime(dt.getTime() + this.getQueryIntervalMS(interval)))
  }

  getQueryIntervalMS (interval) {
    return (interval || this.getSetting('queryInterval')) * 60 * 1000
  }

  logNextQuery (origin, intervalMin) {
    this.log(`${this.getName()} -- ${origin} -- Next update in ${intervalMin} minutes @ ${this.getNextQueryDate().toISOString()}`)
  }

  setQueryInterval (interval) {
    this.queryInterval = this.homey.setInterval(async () => { await this.queryDevice(true) }, this.getQueryIntervalMS(interval))
    this.logNextQuery('setQueryInterval', interval || this.getSetting('queryInterval'))
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
    if (changedKeys.includes('queryInterval') && oldSettings.queryInterval !== newSettings.queryInterval) {
      this.homey.clearInterval(this.queryInterval)
      this.log(`${this.getName()} -- onSettings -- queryInterval cleared`)
      this.setQueryInterval(newSettings.queryInterval)
    }
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed (name) {
    this.log(`${this.getName()} -- onRenamed -- Device was renamed to ${name}`)
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted () {
    this.homey.clearInterval(this.queryInterval)
    this.log(`${this.getName()} -- onDeleted -- queryInterval cleared`)

    this.log(`${this.getName()} -- onDeleted -- Device has been deleted`)
  }
}

module.exports = RemootioDeviceAPI
