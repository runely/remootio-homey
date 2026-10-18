const RemootioDriver = require("../driver.js");

class Driver extends RemootioDriver {
  async onInit() {
    await super.onInit();
  }
}

module.exports = Driver;
