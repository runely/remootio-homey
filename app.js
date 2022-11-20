'use strict'

const Homey = require('homey')

class Remootio extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit () {
    this.log('Remootio has been initialized')

    // add condition listeners (only applicable for drivers 'remootio-fg' and 'remootio-gf')
    this.homey.flow.getConditionCard('garagedoor_closed_sub')
      .registerRunListener(args => {
        const { device } = args
        return device.getGarageDoorState() === true
      })

    // add action listeners (only applicable for drivers 'remootio-fg' and 'remootio-gf')
    this.homey.flow.getActionCard('garagedoor_close_sub')
      .registerRunListener(args => {
        const { device } = args
        device.triggerCapabilityListener(device.getGarageDoorCapabilityId(), true)
        return true
      })

    this.homey.flow.getActionCard('garagedoor_open_sub')
      .registerRunListener(args => {
        const { device } = args
        device.triggerCapabilityListener(device.getGarageDoorCapabilityId(), false)
        return true
      })

    this.homey.flow.getActionCard('garagedoor_toggle_sub')
      .registerRunListener(args => {
        const { device } = args
        device.triggerCapabilityListener(device.getGarageDoorCapabilityId(), !device.getGarageDoorState())
        return true
      })

    this.homey.flow.getActionCard('garagedoor_toggle_free_sub')
      .registerRunListener(args => {
        const { device } = args
        const id = device.getFreeRelayCapabilityId()
        if (!id) {
          device.log('garagedoor_toggle_free_sub : CapabilityId not found for free relay output', id)
          return false
        }
        device.triggerCapabilityListener(id, !device.getFreeRelayState())
        return true
      })
  }
}

module.exports = Remootio
