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
          device.triggerCapabilityListener(garageCapabilityId, true)
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
          device.triggerCapabilityListener(garageCapabilityId, false)
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
          device.triggerCapabilityListener(garageCapabilityId, !device.getGarageDoorState())
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

    // add action listeners (only applicable for driver remootio-device-api
    this.homey.flow.getActionCard('garagedoor_close_if_open')
      .registerRunListener(async args => {
        const { device } = args
        const { success, closed } = await device.getApiDeviceStatus()
        if (!success) {
          device.log(`${device.getName()} -- garagedoor_close_if_open failed to fetch status`)
          return false
        }

        if (!closed) {
          const garageCapabilityId = device.getGarageDoorCapabilityId()
          if (garageCapabilityId) {
            device.log(`${device.getName()} -- garagedoor_close_if_open called`)
            device.triggerCapabilityListener(garageCapabilityId, false)
            return true
          } else {
            device.log(`${device.getName()} -- garagedoor_close_if_open -- Garagedoor capability not found`)
            return false
          }
        }

        device.log(`${device.getName()} -- garagedoor_close_if_open did nothing since its already closed`)
        return true
      })

      this.homey.flow.getActionCard('garagedoor_open_if_closed')
      .registerRunListener(async args => {
        const { device } = args
        const { success, closed } = await device.getApiDeviceStatus()
        if (!success) {
          device.log(`${device.getName()} -- garagedoor_open_if_closed failed to fetch status`)
          return false
        }

        if (closed) {
          const garageCapabilityId = device.getGarageDoorCapabilityId()
          if (garageCapabilityId) {
            device.log(`${device.getName()} -- garagedoor_open_if_closed called`)
            device.triggerCapabilityListener(garageCapabilityId, false)
            return true
          } else {
            device.log(`${device.getName()} -- garagedoor_open_if_closed -- Garagedoor capability not found`)
            return false
          }
        }

        device.log(`${device.getName()} -- garagedoor_open_if_closed did nothing since its already open`)
        return true
      })
  }
}

module.exports = Remootio
