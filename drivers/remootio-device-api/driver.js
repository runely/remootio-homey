'use strict'

const { Driver } = require('homey')
const { query } = require('../../lib/device/api/device-api')
/* const doSleep = require('../../lib/sleep') */

class RemootioDeviceAPIDriver extends Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit () {
    this.log('RemootioDeviceAPIDriver has been initialized')
  }

  async onPair (session) {
    let secretKey = ''
    let deviceName = ''
    let serialNumber = ''

    session.setHandler('login-secret-key-post', async data => {
      secretKey = data.secretKey
      this.log('driver_onPair -> login-secret-key-post :', data)

      if (!data.secretKey) throw new Error(this.homey.__('driver.onPair.missing_token'))

      // make a GET request to the device API. If the secretKey is valid, we will receive 200 OK and info about the device
      const deviceData = await query(secretKey)
      this.log('DeviceData:')
      this.log(deviceData)
      if (!deviceData.success || !deviceData.data.success || !deviceData.data.deviceState || !deviceData.data.deviceState.gateName || !deviceData.data.deviceState.serialNo) {
        this.log(`[ERROR] - driver_onPair -> login-secret-key-post -> device-api communication failed : ${deviceData.status} -- ${deviceData.statusText} --`, deviceData.data)
        throw new Error(`Invalid token:\r\n${deviceData.status} : ${deviceData.statusText}`)
      }

      const { deviceState: { gateName, serialNo } } = deviceData.data
      deviceName = gateName
      serialNumber = serialNo
      this.log(`driver_onPair -> login-secret-key-post -> device-api communication success : I will add device with name '${deviceName}' and serialNo '${serialNumber}'`)
      await session.showView('list_devices')
    })

    session.setHandler('list_devices', async () => {
      this.log('driver_onPair -> list_devices')

      const devices = [
        {
          name: deviceName,
          data: {
            id: serialNumber
          },
          settings: {
            secretKey
          }
        }
      ]

      this.log('driver_onPair -> list_devices : devices config :', devices)
      return devices
    })
  }

  /* async onRepair (session, device) {
    let secretKey = ''
    let authKey = ''

    session.setHandler('login', async data => {
      secretKey = data.username
      authKey = data.password

      if (!data.username && !data.password) throw new Error(this.homey.__('driver.onPair.missing_secret_and_auth'))
      else if (!data.username) throw new Error(this.homey.__('driver.onPair.missing_secret'))
      else if (!data.password) throw new Error(this.homey.__('driver.onPair.missing_auth'))

      this.log('driver_onRepair -> login : isConnected before repair :', device.remootio.isConnected)
      device.setSettings({
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
  } */
}

module.exports = RemootioDeviceAPIDriver
