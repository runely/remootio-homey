# Remootio

Make your Homey even smarter by controlling your gates and garage doors with Remootio

## Prerequisites :man_mechanic:

- **Your Remootio device is already set up**
- **Make sure your Remootio and Homey is on the same network / VLAN**
- **The status sensor is installed and enabled in the Remootio app (Homey needs to know the current state of your gate/garage door)**
- **A static/fixed IP address for your Remootio is recommended**

### Websocket API

The API in the Remootio must be enabled before adding Remootio device(s) to Homey. Instructions [here](https://documents.remootio.com/docs/WebsocketApiDocs.pdf)

Take a note of the `API Secret Key` and `API Auth Key` shown when enabling the API

## Pairing

When adding a Remootio device to your Homey, your Remootio device(s) will be found automatically on your network with mDNS

When asked, input your `API Secret Key` and `API Auth Key`

## Settings

### Flipped logic

If you have flipped the logic (in the Remootio app) used on the sensor connected to your Remootio device, you must set `Is sensor logic flipped` to `yes` in the Remootio device settings in Homey.

## Troubleshooting

- `Device shows incorrect status of the gate/garage door`
    1. Make sure `Is sensor logic flipped` setting on the Device in Homey is set equal to `Flip logic` setting in the Remootio app
- `Device doesn't change status when gate/garage door is opened/closed externally (by button or Remootio app etc.)`
    1. Make sure **Websocket API** is enabled with logging
- `Device not found in pairing`
    1. Make sure your Remootio device is successfully setup
    1. Make sure you have enabled Wi-Fi on your Remootio device
    1. Make sure your Remootio device is on the same Wi-Fi network as your Homey
    1. Make sure your Remootio device isn't already added as a device in Homey

For any other issues, see [Remootio Installation Guide](https://documents.remootio.com/docs/Remootio_Installation_Guide.pdf) for installation instructions and troubleshooting

## Backlog

- Trigger for whom/what opened/closed the gate/garage door

## Changelog

- 1.2.1
    - Reconnect when retry settings are changed aswell
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
