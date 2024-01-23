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
      if (!response.success || !response.data.success) {
        this.log(`[ERROR] -- ${garageDoorCapabilityId} -- Toggled -- device-api communication failed : ${response.status} -- ${response.statusText} --`, response.data)
        throw new Error(`Toggle failed: ${response.status} : ${response.statusText}`)
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
    if (!response.success || !response.data.success || !response.data.deviceState.openStatus) {
      this.log(`[ERROR] -- queryDevice -- Query -- device-api communication failed : ${response.status} -- ${response.statusText} --`, response.data)
      throw new Error(`Query failed: ${response.status} : ${response.statusText}`)
    }

    this.log('Capability value before changed:', this.getCapabilityValue(garageDoorCapabilityId))
    await this.setCapabilityValue(garageDoorCapabilityId, response.data.deviceState.openStatus === 'closed')
    this.log('Capability value after changed:', this.getCapabilityValue(garageDoorCapabilityId))

    if (interval) {
      this.log(`${this.getName()} -- queryDevice -- Next update in ${this.getSetting('queryInterval')} minutes @ ${this.getNextQueryDate().toISOString()}`)
    }
  }

  getNextQueryDate (interval) {
    const dt = new Date()
    return new Date(dt.setTime(dt.getTime() + this.getQueryIntervalMS(interval)))
  }

  getQueryIntervalMS (interval) {
    return (interval || this.getSetting('queryInterval')) * 60 * 1000
  }

  setQueryInterval (interval) {
    this.queryInterval = this.homey.setInterval(async () => { await this.queryDevice(true) }, this.getQueryIntervalMS(interval))
    this.log(`${this.getName()} -- setQueryInterval -- Next update in ${interval || this.getSetting('queryInterval')} minutes @ ${this.getNextQueryDate(interval).toISOString()}`)
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

    if (changedKeys.includes('logicFlipped') && oldSettings.logicFlipped !== newSettings.logicFlipped) {
      this.log(`${this.getName()} -- onSettings -- logicFlipped changed from ${oldSettings.logicFlipped} to ${newSettings.logicFlipped}`)
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
    this.log(`${this.getName()} -- onDeleted -- Device has been deleted`)
  }
}

module.exports = RemootioDeviceAPI
