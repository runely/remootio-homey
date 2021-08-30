# Remootio

Control your Remootio device with Homey

## Requirements :man_mechanic:

- **A sensor connected to your Remootio device is required to open and/or close the garage door through this app**
- **A static/fixed IP address is recommended**
- **Make sure your Remootio device and Homey is on the same network / VLAN**

### Websocket API

The API in the Remootio must be enabled before adding Remootio device(s) to Homey. Instructions [here](https://documents.remootio.com/docs/WebsocketApiDocs.pdf)

Take a note of the `API Secret Key` and `API Auth Key` shown when enabling the API

## Pairing

When adding Remootio to your Homey, your Remootio device(s) will be found automatically on your network via mDSN

When asked, input your `API Secret Key` and `API Auth Key`

## Settings

1. If you need to change a setting, open your Remootio device(s) from your device list in Homey.
1. Click on the gear icon in the upper right corner
1. Choose `Advanced settings`
1. Do your adjustments and click the checkmark in the upper right corner (**otherwise your settings will not be saved**)

### Flipped logic

If you have flipped the logic used on the sensor connected to your Remootio device, you must set `Is sensor logic flipped` to `yes` in the Remootio device.

If the logic is flipped and `Is sensor logic flipped` is set to `no`, the status and actions sent to the Remootio device will be wrong.

## Troubleshooting

## Backlog

- Trigger for whom opened the garage door
- Logging
- Trigger for garage door left open

## Changelog

## Links

[Remootio API Client for Node.js](https://www.npmjs.com/package/remootio-api-client)

[Remootio Websocket API documentation](https://documents.remootio.com/docs/WebsocketApiDocs.pdf)
