const closeGarageDoorID = 'close_garagedoor'
const openGarageDoorID = 'open_garagedoor'

module.exports = (device, garageDoorCapabilityID) => {
  const closeAction = device.homey.flow.getActionCard(closeGarageDoorID)
  closeAction.registerRunListener((args, state) => {
    device.triggerCapabilityListener(garageDoorCapabilityID, true)
  })

  const openAction = device.homey.flow.getActionCard(openGarageDoorID)
  openAction.registerRunListener((args, state) => {
    device.triggerCapabilityListener(garageDoorCapabilityID, false)
  })
}
