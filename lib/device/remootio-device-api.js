'use strict'

const { Device } = require('homey')
const { toggle } = require('./api/device-api')

class RemootioDeviceAPI extends Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    this.registerCapabilityListener('garagedoor_closed', async (value) => {
      this.log(`${this.getName()} -- garagedoor_closed -- Toggled sent`)
      const response = await toggle(this.getStoreValue('token'))
      this.log(`${this.getName()} -- garagedoor_closed -- Toggled response --`, response)
      if (!response.success || !response.data.success) {
        this.log(`[ERROR] -- garagedoor_closed -- Toggled -- device-api communication failed : ${response.status} -- ${response.statusText} --`, response.data)
        throw new Error(`Toggle failed: ${response.status} : ${response.statusText}`)
      }
    })
    this.log(`${this.getName()} -- garagedoor_closed capability listener registered`)
    this.log(`${this.getName()} has being initialized`)
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
