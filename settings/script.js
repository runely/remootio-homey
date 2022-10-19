let deviceLog

function onHomeyReady (Homey) {
  // Tell Homey we're ready to be displayed
  Homey.ready()

  // setting ids
  const settingLogEnabled = 'logEnabled'
  const settingDeviceNames = 'deviceNames'
  const settingLogs = 'logs'

  // ui elements
  const logEnabled = document.getElementById('logEnabled')
  const clearBtn = document.getElementById('clearBtn')
  const devicesSelect = document.getElementById('devices')
  const levelsSelect = document.getElementById('level')
  const logsTxt = document.getElementById('log')

  /* GET SETTINGS */
  // get logEnabled from settings
  Homey.get(settingLogEnabled, (error, isEnabled) => {
    if (error) return Homey.alert(error, 'error')
    setupIsEnabled(isEnabled, logEnabled, clearBtn)
  })

  // get device names from settings
  Homey.get(settingDeviceNames, (error, deviceNames) => {
    if (error) return Homey.alert(error, 'error')
    setupDevices(deviceNames, devicesSelect)
  })

  // get logs from settings
  Homey.get(settingLogs, (error, logs) => {
    if (error) return Homey.alert(error, 'error')
    deviceLog = logs
    setupLogs(logs, logsTxt)
  })

  /* EVENT LISTENERS */
  logEnabled.addEventListener('change', () => {
    clearBtn.disabled = !logEnabled.checked
    clearBtn.classList.toggle('clearBtnEnabled')
    clearBtn.classList.toggle('clearBtnDisabled')
    Homey.set(settingLogEnabled, logEnabled.checked, error => {
      if (error) return Homey.alert(error, 'error')
    })
  })

  clearBtn.addEventListener('click', () => {
    Homey.confirm('Are you sure you want to clear all logs?', 'warning', (error, willProceed) => {
      if (error) return Homey.alert(error, 'error')
      if (!willProceed) return

      Homey.set(settingLogs, [], error => {
        if (error) return Homey.alert(error, 'error')

        Homey.alert('Logs have been cleared')
      })
      logsTxt.value = ''
    })
  })

  devicesSelect.addEventListener('change', () => {
    if (!Array.isArray(deviceLog)) return

    let deviceLogsToShow = deviceLog
    if (devicesSelect.selectedIndex > 0) {
      const selectedDeviceName = devicesSelect.options[devicesSelect.selectedIndex].text
      deviceLogsToShow = deviceLogsToShow.filter(logItem => logItem.device === selectedDeviceName)
    }
    if (levelsSelect.selectedIndex > 0) {
      const selectedLevelName = levelsSelect.options[levelsSelect.selectedIndex].text
      deviceLogsToShow = deviceLogsToShow.filter(logItem => logItem.type === selectedLevelName)
    }
    logsTxt.value = JSON.stringify(deviceLogsToShow, null, 2)
  })

  levelsSelect.addEventListener('change', () => {
    if (!Array.isArray(deviceLog)) return

    let deviceLogsToShow = deviceLog
    if (devicesSelect.selectedIndex > 0) {
      const selectedDeviceName = devicesSelect.options[devicesSelect.selectedIndex].text
      deviceLogsToShow = deviceLogsToShow.filter(logItem => logItem.device === selectedDeviceName)
    }
    if (levelsSelect.selectedIndex > 0) {
      const selectedLevelName = levelsSelect.options[levelsSelect.selectedIndex].text
      deviceLogsToShow = deviceLogsToShow.filter(logItem => logItem.type === selectedLevelName)
    }
    logsTxt.value = JSON.stringify(deviceLogsToShow, null, 2)
  })
}

function setupIsEnabled (isEnabled, logEnabled, clearBtn) {
  logEnabled.checked = isEnabled
  if (isEnabled) {
    clearBtn.disabled = !isEnabled
    clearBtn.classList.toggle('clearBtnEnabled')
    clearBtn.classList.toggle('clearBtnDisabled')
  }
}

function setupDevices (deviceNames, devicesSelect) {
  if (!deviceNames || !Array.isArray(deviceNames) || deviceNames.length === 0) return

  deviceNames.forEach(deviceItem => {
    const option = document.createElement('option')
    option.value = deviceItem
    option.text = deviceItem

    devicesSelect.options.add(option)
  })
}

function setupLogs (logs, logsTxt) {
  if (!logs || !Array.isArray(logs) || logs.length === 0) return

  logsTxt.value = JSON.stringify(logs, null, 2)
}
