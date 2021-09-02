Gir Homey flytkort for å samhandle med dine garasjeporter

Forutsetninger

- Din Remootio er ferdig satt opp
- Remootio og Homey må være på sammme nettverk / VLAN
- Statussensoren er installert og aktivert i Remootio appen (Homey må kunne vite nåværende status på dine garasjeporter)
- Statisk IP-adresse for Remootio er anbefalt

Websocket API

API'et i Remootio må være aktivert før man kan legge til Remootio enheter i Homey. Instruksjoner på Remootio sine sider
Noter ned 'API Secret Key' og 'API Auth Key' vist når API'et aktiveres

Sammenkobling

Dine Remootio enheter blir funnet på nettverket automatisk via mDNS når en Remootio enhet blir lagt til
Under sammenkoblingen blir du spurt om å legge inn 'API Secret Key' og API Auth Key'

Reversert sensorlogikk

Dersom du har reversert sensorlogikken i Remootio, må du sette 'Er sensorlogikken reversert' til 'Ja' i Remootio enhetsinstillingene i Homey
