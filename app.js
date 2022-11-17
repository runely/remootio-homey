'use strict'

const Homey = require('homey')

class Remootio extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit () {
    this.log('Remootio has been initialized')
  }
}

module.exports = Remootio
