Gir Homey flytkort for å samhandle med dine garasjeporter

Forutsetninger

- Din Remootio er ferdig satt opp
- Remootio og Homey må være på sammme nettverk / VLAN
- Statussensoren er installert og aktivert i Remootio appen (Homey må kunne vite nåværende status på dine garasjeporter)
- Statisk IP-adresse for Remootio er anbefalt
- "Output configuration" for din Remootio MÅ være stilt inn på en av disse:
  1: Output 1: disabled Output 2: gate impulse control
  2: Output 1: gate impulse control Output 2: free relay output
  3: Output 1: free relay output Output 2: gate impulse control
  4: Output 1 & Output 2: gate impulse control
  5: Output 1: gate impulse control Output 2: disabled

Websocket API

API'et i Remootio må være aktivert før man kan legge til Remootio enheter i Homey. Instruksjoner på Remootio sine sider
Noter ned 'API Secret Key' og 'API Auth Key' vist når API'et aktiveres

Hvilken driver bør jeg bruke

For output configurations 1, 4 og 5 - bruk "Remootio (gate impulse control)"

For output configuration 2 - bruk "Remootio (Output 1: gate impulse control, Output 2: free relay output)

For output configuration 3 - bruk "Remootio (Output 1: free relay output, Output 2: gate impulse control)

Sammenkobling

Dine Remootio enheter blir funnet på nettverket automatisk via mDNS når en Remootio enhet blir lagt til
Under sammenkoblingen blir du spurt om å legge inn 'API Secret Key' og API Auth Key'

Reversert sensorlogikk

Dersom du har reversert sensorlogikken i Remootio, må du sette 'Er sensorlogikken reversert' til 'Ja' i Remootio enhetsinstillingene i Homey

For ytterligere dokumentasjon eller feilsøking, sjekk ut GitHub-siden
