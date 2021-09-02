Gives Homey flow cards to interact with your garage doors and gates

Prerequisites

- Your Remootio device is set up
- Make sure your Remootio and Homey is on the same network / VLAN
- The status sensor is installed and enabled in the Remootio app (Homey needs to know the current state of your gate/garage door)
- A static/fixed IP address for your Remootio is recommended

Websocket API

The API in the Remootio must be enabled before adding Remootio device(s) to Homey. Instructions on Remootio homepage
Take a note of the 'API Secret Key' and 'API Auth Key' shown when enabling the API

Pairing

When adding a Remootio device to your Homey, your Remootio device(s) will be found automatically on your network with mDNS
When asked, input your 'API Secret Key' and 'API Auth Key'

Logic flipped

If you have flipped the logic (in the Remootio app) used on the sensor connected to your Remootio device, you must set 'Is sensor logic flipped' to 'yes' in the Remootio device settings in Homey.
