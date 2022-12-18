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
        const state = device.getGarageDoorState() === true
        device.log(`${device.getName()} -- garagedoor_closed_sub -- ${state}`)
        return state
      })

    // add action listeners (only applicable for drivers 'remootio-fg' and 'remootio-gf')
    this.homey.flow.getActionCard('garagedoor_close_sub')
      .registerRunListener(args => {
        const { device } = args
        const garageCapabilityId = device.getGarageDoorCapabilityId()
        if (garageCapabilityId) {
          device.log(`${device.getName()} -- garagedoor_close_sub called`)
          device.triggerCapabilityListener(device.getGarageDoorCapabilityId(), true)
          return true
        } else {
          device.log(`${device.getName()} -- garagedoor_close_sub -- Garagedoor capability not found`)
          return false
        }
      })

    this.homey.flow.getActionCard('garagedoor_open_sub')
      .registerRunListener(args => {
        const { device } = args
        const garageCapabilityId = device.getGarageDoorCapabilityId()
        if (garageCapabilityId) {
          device.log(`${device.getName()} -- garagedoor_open_sub called`)
          device.triggerCapabilityListener(device.getGarageDoorCapabilityId(), false)
          return true
        } else {
          device.log(`${device.getName()} -- garagedoor_open_sub -- Garagedoor capability not found`)
          return false
        }
      })

    this.homey.flow.getActionCard('garagedoor_toggle_sub')
      .registerRunListener(args => {
        const { device } = args
        const garageCapabilityId = device.getGarageDoorCapabilityId()
        if (garageCapabilityId) {
          device.log(`${device.getName()} -- garagedoor_toggle_sub called`)
          device.triggerCapabilityListener(device.getGarageDoorCapabilityId(), !device.getGarageDoorState())
          return true
        } else {
          device.log(`${device.getName()} -- garagedoor_toggle_sub -- Garagedoor capability not found`)
          return false
        }
      })

    this.homey.flow.getActionCard('garagedoor_toggle_free_sub')
      .registerRunListener(args => {
        const { device } = args
        const id = device.getFreeRelayCapabilityId()
        if (!id) {
          device.log(`${device.getName()} -- garagedoor_toggle_free_sub -- CapabilityId not found for free relay output -- ${id}`)
          return false
        }
        device.log(`${device.getName()} -- garagedoor_toggle_free_sub called`)
        device.triggerCapabilityListener(id, !device.getFreeRelayState())
        return true
      })
  }
}

module.exports = Remootio
