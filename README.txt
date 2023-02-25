Gives Homey flow cards to interact with your garage doors and gates

Prerequisites

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
