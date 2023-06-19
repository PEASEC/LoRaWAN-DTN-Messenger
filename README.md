# LoRaWAN DTN Messenger

This project aims to provide an user interface for the [LoRaWAN-DTN](https://github.com/PEASEC/LoRaWAN-DTN) project.

## Description

LoRaWAN DTN Messenger is basically an emergency messenger for a multi-hop DTN LoRaWAN Network using BP7 packages.
Goal is to use it in a research project [AgriRegio](https://agriregio.peasec.de).

## Installation

### Requirements 

* [Node.js](https://nodejs.org) with npm
* [ionic](https://ionicframework.com/)

### Building and Running

#### Browser App

Build and run:
```
npm run start
```


#### Android:

Building APK for Android requires Android Studio.
```
export CAPACITOR_ANDROID_STUDIO_PATH="/opt/android-studio/bin/studio.sh"
```

Build:
```
ionic capacitor build android
```
In Android Studio: Build->Build bundles<br>
APK is now in build folder of the project


Run:
```
ionic capcitor run android
```


## Notes

### Non-secure communication allowed

The app is allowed in Android to communicate with non-secure communication protocols like http or ws.
To change this, the line "android:usesCleartextTraffic="true"" in /android/app/src/main/Androidmanifest.xml must either be set to false or removed.


## Acknowledgments

* This work was created at Science and Technology for Peace and Security (PEASEC), Technical University of Darmstadt, www.peasec.de.
* Original code is based on the bachelor thesis of _Denis Orlov_

## License

Licensed under either of [Apache License, Version 2.0](LICENSE-APACHE) or [MIT license](LICENSE-MIT) at your option.

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in `LoRaWAN-DTN-Messenger` by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
