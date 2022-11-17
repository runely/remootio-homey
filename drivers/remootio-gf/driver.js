'use strict'

const RemootioDriver = require('../driver')

class Driver extends RemootioDriver {
  async onInit () {
    await super.onInit()
  }
}

module.exports = Driver
