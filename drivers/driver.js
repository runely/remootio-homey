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

    session.setHandler('login-secret-keys-post', async data => {
      secretKey = data.secretKey
      authKey = data.authKey
      this.log('driver_onPair -> login-secret-keys-post :', data)

      if (!data.secretKey && !data.authKey) {
        throw new Error(this.homey.__('driver.onPair.missing_secret_and_auth'))
      } else if (!data.secretKey) {
        throw new Error(this.homey.__('driver.onPair.missing_secret'))
      } else if (!data.authKey) {
        throw new Error(this.homey.__('driver.onPair.missing_auth'))
      }

      // there's no way to know if keys are valid until device has been discovered, so we assume it is
      if (data.manual) {
        this.log('driver_onPair -> login-secret-keys-post : showing add-device-manually')
        await session.showView('add-device-manually')
      }

      this.log('driver_onPair -> login-secret-keys-post : showing list_devices')
      await session.showView('list_devices')
    })

    session.setHandler('add-device-manually-post', async data => {
      const device = {
        name: data.name,
        data: {
          id: data.id
        },
        settings: {
          ipaddress: data.ip,
          secretKey,
          authKey
        }
      }

      this.log('driver_onPair -> add-device-manually-post :', device)
      return device
    })

    session.setHandler('list_devices', async () => {
      const discoveryStrategy = this.getDiscoveryStrategy()
      const discoveryResults = discoveryStrategy.getDiscoveryResults()
      const discoveryResultValues = Object.values(discoveryResults)
      this.log('driver_onPair -> list_devices:', discoveryResultValues)

      const devices = discoveryResultValues.map(discoveryResult => {
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

      this.log('driver_onPair -> list_devices : devices config :', devices)
      return devices
    })
  }

  async onRepair (session, device) {
    let secretKey = ''
    let authKey = ''

    session.setHandler('login', async data => {
      secretKey = data.username
      authKey = data.password

      if (!data.username && !data.password) {
        throw new Error(this.homey.__('driver.onPair.missing_secret_and_auth'))
      } else if (!data.username) {
        throw new Error(this.homey.__('driver.onPair.missing_secret'))
      } else if (!data.password) {
        throw new Error(this.homey.__('driver.onPair.missing_auth'))
      }

      this.log('driver_onRepair -> login : isConnected before repair :', device.remootio.isConnected)
      await device.setSettings({
        secretKey,
        authKey
      })

      device.removeDevice()
      await doSleep(device.homey, 150)
      device.initialize()
      await doSleep(device.homey, 250)

      this.log('driver_onRepair -> login : isConnected after repair :', device.remootio.isConnected)
      return device.remootio.isConnected
    })
  }
}

module.exports = RemootioDriver
