# Remootio

Make your Homey even smarter by controlling your gates and garage doors with Remootio

## Prerequisites :man_mechanic:

- **Your Remootio device is already set up**
- **Make sure your Remootio and Homey is on the same network / VLAN**
- **The status sensor is installed and enabled in the Remootio app (Homey needs to know the current state of your gate/garage door)**
- **A static/fixed IP address for your Remootio is recommended**
- ***Output configuration* for your Remootio device *MUST* be set to one of these:**
    - **Output 1: disabled Output 2: gate impulse control**
    - **Output 1: gate impulse control Output 2: free relay output**
    - **Output 1: free relay output Output 2: gate impulse control**
    - **Output 1 & Output 2: gate impulse control**
    - **Output 1: gate impulse control Output 2: disabled**

### Websocket API

The API in the Remootio must be enabled before adding Remootio device(s) to Homey. Instructions [here](https://documents.remootio.com/docs/WebsocketApiDocs.pdf)

Take a note of the `API Secret Key` and `API Auth Key` shown when enabling the API

### Which driver to use

#### Remootio (gate impulse control)

This driver supports the following Output configurations:
- **Output 1: disabled Output 2: gate impulse control**
- **Output 1 & Output 2: gate impulse control**
- **Output 1: gate impulse control Output 2: disabled**

#### Remootio (Output 1: gate impulse control, Output 2: free relay output)

This driver supports the following Output configuration:
- **Output 1: gate impulse control Output 2: free relay output**

> Keep in mind that the `status sensor` only senses state changes on **Output 1**

> **Output 2** will be a stateless toggle (Homey will show different states when toggled, but this state don't necessarily reflect the actual state for **Output 2**)

#### Remootio (Output 1: free relay output, Output 2: gate impulse control)

This driver supports the following Output configuration:
- **Output 1: free relay output Output 2: gate impulse control**

> Keep in mind that the `status sensor` only senses state changes on **Output 2**

> **Output 1** will be a stateless toggle (Homey will show different states when toggled, but this state don't necessarily reflect the actual state for **Output 1**)

## Pairing

When adding a Remootio device to your Homey, you can choose to find it automatically on your network with mDNS, or you can add it manually

> :exclamation: Remootio3 with Software version >= 2.40 `MUST` be added manually because **mDNS** support is currently **not available** because Remootio has rewritten the Software to support `HomeKit` and in the process borked **mDNS** support

- When asked, input your `API Secret Key` and `API Auth Key` -> Found in **Websocket API configuration in your Remootio app on your phone**
- Choose `Find devices (mDNS)` to find your device(s) automatically on your network with mDNS
- Choose `Manually add device` to manually set **Name**, **Serial Number** and **IP address** of your device

## Settings

### Flipped logic

If you have flipped the logic (in the Remootio app) used on the sensor connected to your Remootio device, you must set `Is sensor logic flipped` to `yes` in the Remootio device settings in Homey.

## Troubleshooting

First, consider this:
```
The physical Remootio device:
- does not use the `Websocket API` itself. This API is only used for 3.party apps/services who wants to talk to the device.
- is limited to `1` WiFi connection at a time! This means:
    - That when the Homey app is connected through the API, you can not use the Remootio app on your phone to connect to the device through WiFi (though through internet and bluetooth connection it will still work) and vica versa.
    - That when you are connected to the device via WiFi through the Remootio app on your phone, you can not connect the Homey app through the API

If you have a WiFi connection open from your phone (or any other device other than the Homey app), to get the Homey app reconnected you must restart the physical Remootio device, and then reconnect the device through the Homey app!

These are limitations with the physical Remootio device itself!
```

- `Device shows incorrect status of the gate/garage door`
    1. Make sure `Is sensor logic flipped` setting on the Device in Homey is set equal to `Flip logic` setting in the Remootio app
    1. Make sure you have chosen the correct driver for your Output configuration
- `Device doesn't change status when gate/garage door is opened/closed externally (by button or Remootio app etc.)`
    1. Make sure **Websocket API** is enabled with logging
- `Device not found in pairing`
    1. Make sure your Remootio device is successfully setup
    1. Make sure you have enabled Wi-Fi on your Remootio device
    1. Make sure your Remootio device is on the same Wi-Fi network as your Homey
    1. Make sure your Remootio device isn't already added as a device in Homey
    1. IF your device is a Remootio3 and has software >= 2.40, the device `MUST` be added manually because **mDNS** support is currently **not available** because Remootio has rewritten the Software to support `HomeKit` and in the process borked **mDNS** support
- `Device unavailable with error`: <b><u>Authentication or encryption error -- Remootio has disconnected. Check your WiFi connection to the device. Too many failed reconnect attempts...</u></b>
    1. Make sure you have entered the correct `API Secret Key` and `API Auth Key`.
    1. Too many failed connect attempts to a Remootio device will brake the websocket client.<br>Restarting the app or setting new auth settings for the device will create a new websocket client

For any other issues, see [Remootio Installation Guide](https://documents.remootio.com/docs/Remootio_Installation_Guide.pdf) for installation instructions and troubleshooting

## Backlog

- Trigger for whom/what opened/closed the gate/garage door

## Changelog

- 1.5.0
    - Updated hint on `left_open` trigger to show correct time range
    - Added the possibility to manually add device (instead of mDNS) to also support Remootio3 FW >= 2.40 -> [Issue #35](https://github.com/runely/remootio-homey/issues/35)
    - Dependency updates
- 1.4.6
    - Dependency updates
- 1.4.5
    - Minor fixes
    - Handle all floating promises
    - Added information and reconnect possibility if IP, secretkey or authkey is wrong
    - Dependency updates
- 1.4.4
    - Dependency updates
    - Don't use garageDoorCapability if not registered
    - More logging
- 1.4.3
    - Bugfix: Autoreconnect `setTimeout` function would still fire after device has been reconnected, disconnected, even removed or even worse when app has been uninstalled/paused
- 1.4.2
    - Bugfix: Invalid capability
- 1.4.1
    - Added drivers `remootio-fg` and `remootio-gf` to the flow `left_open`
    - sub-capabilities should only use 1 `.` to prevent any possible problems in the future (this won't break anything for anyone since **v1.4.0** were never released)
    - Added sub-capability
        - triggers `Closed` and `Opened`
        - condition `Is closed/open`
        - actions `Close`, `Open`, `Toggle open or closed` and `Toggle free relay open or closed`
    - Added repair functionallity to drivers
- 1.4.0
    - Added possibility to control `gate impulse control` aswell as `free relay output` -> [Issue #27](https://github.com/runely/remootio-homey/issues/27)
        - Added driver `Remootio (Output 1: gate impulse control, Output 2: free relay output)`
        - Added driver `Remootio (Output 1: free relay output, Output 2: gate impulse control)`
        - Renamed default driver to `Remootio (gate impulse control)`. ***This has no impact on existing devices***
    - Dependency updates
- 1.3.2
    - Dependency updates
- 1.3.1
    - `this.warn` is not a function...
- 1.3.0
    - When Remootio device has been offline for more than (maxReconnectAttempts * autoreconnectMinutes):
        - Previous behavior were not to reconnect anymore
        - Now the app will try to reconnect every hour after (maxReconnectAttempts * autoreconnectMinutes) has past and the device still hasn't reconnected
    - Dependency updates
- 1.2.4
    - Dependency updates
    - **Bugfix**: Prevent `QuickAction` button from changing state when it's clicked. Let the WebSocket API determine when the state should change.
        - Before this fix, the app could be fooled / confused to think that the state was changed (if the gate was prevented from opening/closing as it was told)
- 1.2.3
    - DevDependency updates
- 1.2.2
    - Fixed a bug where device would be set as available when device is unreachable and max retry count was exceeded
    - Fixed a bug where Remootios auto reconnect feature would be activated again when device is unreachable and max retry count was exceeded
    - Better error messages on device screen when device is unreachable
- 1.2.1
    - Reconnect when retry settings are changed aswell
    - Auto reconnect by Remootio library deactivated
    - Fixed auto reconnect (**Too many failed connect attempts to a Remootio device will brake the websocket client. Restart of the app or new auth settings for the device will create a new websocket client**)
    - `Max reconnect retries` changed to `3` since a Remootio's websocket client will brake with too many attempts
- 1.2.0
    - Added auto reconnect every `x` minutes (when not connected)
    - Flow card `Left Open` limited to this app only instead of all apps of class `garagedoor`
- 1.1.2
    - Moved trigger `Left Open` into device
- 1.1.1
    - Fixed a bug where app would retry connecting to device even after max retry count was hit
    - Added settings for hardware information (updated every time device is connected)
- 1.1.0
    - Support for multiple Remootio devices
    - Trigger card `Left open`
- 1.0.0
    - Initial release

## Links

[Remootio](https://www.remootio.com/)

[Remootio API Client for Node.js](https://www.npmjs.com/package/remootio-api-client)

[Remootio Websocket API documentation](https://documents.remootio.com/docs/WebsocketApiDocs.pdf)
