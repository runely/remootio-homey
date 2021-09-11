# Remootio

Make your Homey even smarter by controlling your gates and garage doors with Remootio

## Prerequisites :man_mechanic:

- **Your Remootio device is set up**
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

## Backlog

- Trigger for garage door left open

## Changelog

- 1.1.0
    - Support for multiple Remootio devices
- 1.0.0
    - Initial release

## Links

[Remootio](https://www.remootio.com/)

[Remootio API Client for Node.js](https://www.npmjs.com/package/remootio-api-client)

[Remootio Websocket API documentation](https://documents.remootio.com/docs/WebsocketApiDocs.pdf)
