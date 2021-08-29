const garageDoorID = 'garagedoor_closed'

module.exports = device => {
  const closedCondition = device.homey.flow.getConditionCard(garageDoorID)
  closedCondition.registerRunListener((args, state) => {
    return device.getCapabilityValue(garageDoorID)
  })
}
