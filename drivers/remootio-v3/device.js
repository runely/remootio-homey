'use strict'

const { Device } = require('homey')

const RemootioDevice = require('../../lib/device/remootio')
const getReadableState = require('../../lib/device/get-readable-state')

const garageDoorCapabilityID = 'garagedoor_closed'

let device

class MyDevice extends Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    this.log('onInit', 'Device has been initialized')

    device = this

    // initialize device
    this.initializeDevice()

    // add garagedoor_closed ui toggle listener
    this.registerCapabilityListener(garageDoorCapabilityID, async value => {
      this.log(`${garageDoorCapabilityID} capability listener`, 'Triggered with value:', value)
      this.remootio.changeState(value)
    })
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded () {
    this.log('onAdded', 'Device has been added')
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
    this.log('onSettings', 'These device settings were changed', changedKeys)

    if (changedKeys.includes('logicFlipped')) {
      const logicFlipped = newSettings['logicFlipped']
      const currentCapabilityValue = this.getCapabilityValue(garageDoorCapabilityID)
      const newCapabilityValue = !currentCapabilityValue
      const newCapabilityReadable = getReadableState(logicFlipped, newCapabilityValue)

      this.log('onSettings', 'logicFlipped setting changed to', logicFlipped)
      this.setCapabilityValue(garageDoorCapabilityID, newCapabilityValue)
      this.log('onSettings', `Capability set from '${currentCapabilityValue}' to '${newCapabilityValue}':`, newCapabilityReadable)
    }

    if (changedKeys.includes('maxReconnectRetries')) {
      device.remootio.setReconnectMaxCount(newSettings['maxReconnectRetries'])
    }

    if (changedKeys.includes('ipaddress') || changedKeys.includes('secretKey') || changedKeys.includes('authKey')) {
      // since the new settings isn't saved until this function is finished, set reconnect in a timeout
      setTimeout(() => {
        device.removeDevice()
        device.initializeDevice()
      }, 100)
    }
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed (name) {
    this.log('onRenamed', 'Device was renamed to', name)
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted () {
    this.log('onDeleted', 'Device has been deleted')
    this.removeDevice()
  }

  initializeDevice () {
    device.remootio = new RemootioDevice({
      device
    })
  }

  removeDevice () {
    // remove Remootio listeners and disconnect
    device.remootio.removeAllListeners()
    device.remootio.disconnect()
  }
}

module.exports = MyDevice
