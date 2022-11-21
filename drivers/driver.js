'use strict'

const { Driver } = require('homey')
const doSleep = require('../lib/sleep')

const hasValue = value => value && value !== 'undefined' && value !== 'null'

class RemootioDriver extends Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit () {
    this.log('RemootioDriver has been initialized')
  }

  async onPair (session) {
    let secretKey = ''
    let authKey = ''

    session.setHandler('login', async data => {
      secretKey = data.username
      authKey = data.password

      if (!data.username && !data.password) throw new Error(this.homey.__('driver.onPair.missing_secret_and_auth'))
      else if (!data.username) throw new Error(this.homey.__('driver.onPair.missing_secret'))
      else if (!data.password) throw new Error(this.homey.__('driver.onPair.missing_auth'))

      // there's no way to know if keys are valid until device has been discovered, so we assume it is
      return true
    })

    session.setHandler('list_devices', async () => {
      const discoveryStrategy = this.getDiscoveryStrategy()
      const discoveryResults = discoveryStrategy.getDiscoveryResults()

      const devices = Object.values(discoveryResults).map(discoveryResult => {
        console.dir(discoveryResult)
        const name = hasValue(discoveryResult.id) ? discoveryResult.txt.name || discoveryResult.name : discoveryResult.host
        const id = hasValue(discoveryResult.id) ? discoveryResult.id : discoveryResult.txt.name || discoveryResult.name
        return {
          name,
          data: {
            id
          },
          settings: {
            ipaddress: discoveryResult.address,
            secretKey,
            authKey
          }
        }
      })

      return devices
    })
  }

  async onRepair (session, device) {
    let secretKey = ''
    let authKey = ''

    session.setHandler('login', async data => {
      secretKey = data.username
      authKey = data.password

      if (!data.username && !data.password) throw new Error(this.homey.__('driver.onPair.missing_secret_and_auth'))
      else if (!data.username) throw new Error(this.homey.__('driver.onPair.missing_secret'))
      else if (!data.password) throw new Error(this.homey.__('driver.onPair.missing_auth'))

      device.setSettings({
        secretKey,
        authKey
      })

      device.removeDevice()
      await doSleep(device.homey, 150)
      device.initialize()
      await doSleep(device.homey, 250)
      const isConnected = device.remootio.isConnected
      return isConnected
    })
  }
}

module.exports = RemootioDriver
