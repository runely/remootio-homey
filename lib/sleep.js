module.exports = (homey, ms) => new Promise(resolve => homey ? homey.setTimeout(resolve, ms) : setTimeout(resolve, ms))
