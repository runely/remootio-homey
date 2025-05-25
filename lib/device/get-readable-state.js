module.exports = (logicFlipped, state) => {
  if (logicFlipped) {
    return state === 'open' ? 'closed' : 'open';
  }

  return state === 'open' ? 'open' : 'closed';
}
