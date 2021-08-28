module.exports = (logicFlipped, state) => logicFlipped ? state === 'open' ? 'closed' : 'open' : state === 'open' ? 'open' : 'closed'
