Gives Homey flow cards to interact with your garage doors and gates

Prerequisites for Websocket API

- Your Remootio device is set up
- Make sure your Remootio and Homey is on the same network / VLAN
- The status sensor is installed and enabled in the Remootio app (Homey needs to know the current state of your gate/garage door)
- A static/fixed IP address for your Remootio is recommended
- "Output configuration" for your Remootio device MUST be set to one of these:
  1: Output 1: disabled Output 2: gate impulse control
  2: Output 1: gate impulse control Output 2: free relay output
  3: Output 1: free relay output Output 2: gate impulse control
  4: Output 1 & Output 2: gate impulse control
  5: Output 1: gate impulse control Output 2: disabled

Websocket API

The API in the Remootio must be enabled before adding Remootio device(s) to Homey. Instructions on Remootio homepage
Take a note of the 'API Secret Key' and 'API Auth Key' shown when enabling the API

Which driver to use

For output configurations 1, 4 and 5 - choose "Remootio (gate impulse control)"

For output configuration 2 - choose "Remootio (Output 1: gate impulse control, Output 2: free relay output)

For output configuration 3 - choose "Remootio (Output 1: free relay output, Output 2: gate impulse control)

Pairing

When adding a Remootio device to your Homey, you can choose to find it automatically on your network with mDNS, or you can add it manually

NOTE: Remootio3 with Software version >= 2.40 MUST be added manually because mDNS support is currently not available because Remootio has rewritten the Software to support HomeKit and in the process borked mDNS support

- When asked, input your 'API Secret Key' and 'API Auth Key' -> Found in Websocket API configuration in your Remootio app on your phone
- Choose 'Find devices (mDNS)' to find your device(s) automatically on your network with mDNS
- Choose 'Manually add device' to manually set 'Name', 'Serial Number' and 'IP address' of your device

Logic flipped

If you have flipped the logic (in the Remootio app) used on the sensor connected to your Remootio device, you must set 'Is sensor logic flipped' to 'yes' in the Remootio device settings in Homey.

For additional documentation or troubleshooting, check out the GitHub page


Prerequisites for Device API

- Your Remootio device is already set up
- For the Device API your Homey and Remootio can be on different LAN's or WAN's
- The status sensor is installed and enabled in the Remootio app (Homey needs to know the current state of your gate/garage door)
- "Output configuration" for your Remootio device MUST be set to one of these:
  1: Output 1: disabled Output 2: gate impulse control
  2: Output 1: gate impulse control Output 2: free relay output
  3: Output 1: free relay output Output 2: gate impulse control
  4: Output 1 & Output 2: gate impulse control
  5: Output 1: gate impulse control Output 2: disabled

Device API

The Device API is hosted on Remootio's servers, so your Remootio device must have internet access and be reachable by the Device API

IMPORTANT: The Device API is limited to 300 requests per 20 days (this is Remootio's limits!). This means you should be able to open and close your gate/garage door around 6 times a day.
If you exceed this limit you will not be able to send requests to the Device API for a while (not sure about the time frame)!

IMPORTANT: Given the low limit on the Device API, the Remootio app will only query the Device API for its status after it has been toggled. This to make sure the Remootio app has the same status as the Remootio device.

IMPORTANT: If the gate/garage door is operated outside the Remootio app, the status in the Remootio app will NOT reflect this until it's been toggled in the Remootio app in Homey.

To allow the Device API to control your Remootio device you must setup an App-Free key through the Remootio app on your phone:
- Go to shared keys
- Click 'Share a new key' and choose 'Share unique key (recommended)'
- Give the key a meaningful name
- On the next screen click on 'App-free key' and click on 'Share link'
- Copy only the 'token' value from the URL. You must add this value to the Remootio app on Homey under "pairing"

Which driver to use

Remootio Device API

This driver is the only driver that supports the Device API of Remootio.

Pairing

When adding the Remootio device to your Homey, copy in the 'token' value found in the previous steps. The pairing process will query the Device API using the 'token' value and find info about the device.

Settings

Seconds for status change

Number of seconds before the gate/garage door has changed status after being operated.
A query is sent to the device api after this amount of seconds to set the correct device status. This is done to make sure the device status has the same status as the Remootio device.

For additional documentation or troubleshooting, check out the GitHub page
