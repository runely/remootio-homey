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
    let keyNumber = '0'
    let remootioType = ''
    let outputConfig = ''

    session.setHandler('login-secret-key-post', async data => {
      secretKey = data.secretKey
      this.log('driver_onPair -> login-secret-key-post :', data)

      if (!data.secretKey) {
        throw new Error(this.homey.__('driver.onPair.missing_token'))
      }

      // make a GET request to the device API. If the secretKey is valid, we will receive 200 OK and info about the device
      const deviceData = await query(secretKey)
      this.log('DeviceData:')
      this.log(deviceData)
      if (!deviceData.success || !deviceData.data.success || !deviceData.data.deviceState || !deviceData.data.deviceState.gateName || !deviceData.data.deviceState.serialNo) {
        this.log(`[ERROR] - driver_onPair -> login-secret-key-post -> device-api communication failed : ${deviceData.status} -- ${deviceData.statusText} --`, deviceData.data)
        throw new Error(`Invalid token:\r\n${deviceData.status} : ${deviceData.statusText}`)
      }

      const { deviceState } = deviceData.data
      outputConfig = deviceState.outputConfig
      deviceName = deviceState.gateName
      serialNumber = deviceState.serialNo
      keyNumber = deviceState.keyNumber.toString()
      remootioType = deviceState.type
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
            outputConfig,
            deviceName,
            serialNumber,
            keyNumber,
            remootioType
          },
          store: {
            token: secretKey
          }
        }
      ]

      this.log('driver_onPair -> list_devices : devices config :', devices)
      return devices
    })
  }

  async onRepair (session, device) {
    session.setHandler('login-secret-key-post', async data => {
      const deviceName = device.getName()
      const serialNumber = device.getSetting('serialNumber')
      this.log(`[${deviceName}][${serialNumber}] - driver_onRepair -> login-secret-key-post :`, data)

      if (!data.secretKey) {
        throw new Error(this.homey.__('driver.onPair.missing_token'))
      }

      // make a GET request to the device API. If the secretKey is valid, we will receive 200 OK and info about the device
      const deviceData = await query(data.secretKey)
      this.log(`[${deviceName}][${serialNumber}] - DeviceData :`, deviceData)
      if (!deviceData.success || !deviceData.data.success || !deviceData.data.deviceState || !deviceData.data.deviceState.gateName || !deviceData.data.deviceState.serialNo) {
        this.log(`[${deviceName}][${serialNumber}] - [ERROR] - driver_onRepair -> login-secret-key-post -> device-api communication failed : ${deviceData.status} -- ${deviceData.statusText} --`, deviceData.data)
        throw new Error(`Invalid token:\r\n${deviceData.status} : ${deviceData.statusText}`)
      }

      const { deviceState: { outputConfig, gateName, serialNo, keyNumber, type } } = deviceData.data
      const deviceSettings = {
        outputConfig,
        deviceName: gateName,
        serialNumber: serialNo,
        keyNumber: keyNumber.toString(),
        remootioType: type
      }
      this.log(`[${deviceName}][${serialNumber}] - driver_onRepair -> login-secret-key-post -> Updating device hardware info :`, deviceSettings)
      await device.setSettings(deviceSettings)

      this.log(`[${deviceName}][${serialNumber}] - driver_onRepair -> login-secret-key-post -> Updating token value in store`)
      await device.setStoreValue('token', data.secretKey)

      this.log(`[${deviceName}][${serialNumber}] - driver_onRepair -> login-secret-key-post -> Setting device as available`)
      await device.setAvailable()

      this.log(`[${deviceName}][${serialNumber}] - driver_onRepair -> login-secret-key-post -> Repair finished successfully`)
      await session.done()
    })
  }
}

module.exports = RemootioDeviceAPIDriver
