'use strict'

const { Driver } = require('homey')

const hasValue = value => value && value !== 'undefined' && value !== 'null'

class MyDriver extends Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit () {
    this.log('MyDriver has been initialized')
  }

  async onPair (session) {
    let secretKey = ''
    let authKey = ''

    session.setHandler('login', async data => {
      secretKey = data.username
      authKey = data.password

      if (!data.username && !data.password) throw new Error('Fill out \'API Secret Key\' and \'API Auth Key\'')
      else if (!data.username) throw new Error('Fill out \'API Secret Key\'')
      else if (!data.password) throw new Error('Fill out \'API Auth Key\'')

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
            port: discoveryResult.port,
            secretKey,
            authKey
          }
        }
      })

      return devices
    })
  }

  onDiscoveryResult (discoveryResult) {
    console.log('onDiscoveryResult:', discoveryResult)
    // Return a truthy value here if the discovery result matches your device.
    return discoveryResult.id === this.getData().id
  }

  async onDiscoveryAvailable (discoveryResult) {
    console.log('onDiscoveryAvailable:', discoveryResult)
  }

  onDiscoveryAddressChanged (discoveryResult) {
    // Update your connection details here, reconnect when the device is offline
    console.log('onDiscoveryAddressChanged:', discoveryResult)
  }

  onDiscoveryLastSeenChanged (discoveryResult) {
    // When the device is offline, try to reconnect here
    console.log('onDiscoveryLastSeenChanged:', discoveryResult)
  }
}

module.exports = MyDriver
