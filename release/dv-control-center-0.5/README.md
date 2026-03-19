## Companion DV Control Center Module

This is a separate custom module build for Companion.
It is intended to run in parallel with legacy `datavideo-dvip` without changing legacy behavior.

### Custom Scope

* Keeps standard Datavideo DVIP control/actions from the base module
* Adds DV Control Center merge integration:
* Action: run merge key by name (`dvcc_merge_run_named`)
* Variables: `dvcc_merge_active_flex`, `dvcc_merge_running_flex`, `dvcc_merge_active_pip`, `dvcc_merge_running_pip`
* Feedback: active merge preset match (`dvcc_merge_active`)
* Polls DV Control Center state from `/api/merge/state?mode=flex|pip`

By default DV Control Center base URL is `http://127.0.0.1:9999` (override in module config).

---
## Companion Datavideo DVIP Module

Work in progress module to control Datavideo vision mixers, with feedback.

Note: You have to restart companion after selecting or changing the model to get the correct instance actions.  

This module attempts to implement the realtime DVIP protocol to listen to changes while using the command protocol to send control commands to the vision mixer.  
More documentation on the DVIP specification is here: https://github.com/BB21B/datavideo-dvip-docs

Currently supports:  
SE-650  
SE-700  
SE-1200MU/HS-1300  
SE-2200/HS-2200 (Work in Progress, no feedback).   
SE-3200/HS-3200  
  
The SE-2200 uses the "LAN Service" port for control with the PC Control button enabled  
Use the Presets to setup the SE-2200  

Please add an issue for other Datavision vision mixers you would like to see added or any feedback you have.

**Available commands**

* Switch PGM and PVW bus input
* Switch Key, DSK and Aux bus input
* Transition Controls
* Set ME, DSK and FTB frame durations
* Fade to Black
* Keyer Controls
* Audio Controls
* Switch Audio Source Input
* Output Controls
* User Load/User Save
* Streamer Controls
* Change input name on mixer
* Select wipe
* Menu Controls
* Set Bus Matte Color
* Set System Standard
* SE-3200 Multiview settings (mode, main sources, labels)
* SE-3200 Flex source routing (BG, DVE1-4, FG, FG enable)
* SE-3200 PiP/Flex window geometry control (position/size/crop)
* SE-3200 raw DVIP control write by Control Label
* SE-3200 raw DVIP control write by Section/SubSection/Control ID
* SE-3200 Flex 1 Run / Flex 2 Run / Flex Stop one-shot actions


**Available feedback**
* Current PGM and PVW Bus selected input feedback (PVW bus also has running transition feedback)
* Current Key, DSK and Aux Bus selected input feedback (Key and DSK also feedback when live in PGM)
* HDMI/SDI selected output source
* T Bar and DSK T Bar transition active indication
* Currently selected transition type
* Current audio source
* Currently selected user
* Keyer Control (PGM/PVW) state
* Transition and FTB button states
* Currently selected wipe
* Current Bus Matte Colour
* Current system standard


**Available presets**
* PGM Bus with feedback
* PVW Bus with feedback
* Key 1 Bus with feedback
* DSK 1 Bus with feedback
* Transition Mix, Wipe Clip and DVE with feedback
* Transition Auto and DSK Auto with feedback
* Transition Cut and DSK Cut
* Audio source set with feedback
* Keyer controls with feedback
* FTB controls with feedback
* Select wipe with feedback
* Audio output state with feedback
* SE-3200 Flex Key 1 preset (DVE 1)
* SE-3200 Flex Key 2 preset (DVE 2)

## SE-3200 Extended Controls

The module now includes dedicated SE-3200 actions for:

* `SE-3200 Multiview Settings`
* `SE-3200 Flex Sources`
* `SE-3200 PiP Window`
* `SE-3200 Set Control by Label`
* `SE-3200 Set Control by Section/ID`
* `SE-3200 Flex 1 Run`
* `SE-3200 Flex 2 Run`
* `SE-3200 Flex Stop`

`Flex 1 Run` and `Flex 2 Run` use documented SE-3200 Flex behavior:
* Flex source selection controls (`SWITCHER_FLEX_SRC_*`)
* Flex sub-section window control (`SECTION_SWITCHER`, `subSection=2`) with PINP-compatible control IDs

**Available variables**
* Current PGM and PVW inputs sources
* Current PGM and PVW inputs source names
* Current Key, DSK and Aux bus inputs sources
* Current Key, DSK and Aux bus inputs source names
* Current HDMI and SDI output sources
* Current HDMI and SDI output source names
* Current audio source
* Current ME, DSK and FTB duration frames
* KEY and DSK button states
* Input name labels from mixer
* Currently selected user
* Transition and FTB button states
* Current wipe number
* Audio output states

## Screenshots

![Mix](/images/mix.png)
![Key Aux](/images/keyaux.png)
![Key](/images/key.png)
![HDMI 1](/images/hdmi1.png)
![Audio](/images/audio.png)

## Control Center Integration

This Companion module is aligned with `datavideo-control-center` in `DataVideo Control Center`:

- Uses the same DVIP-oriented naming (`DVIP*` namespace in web UI).
- Uses model capabilities (`supports`) to hide unsupported UI/actions per model.
- For SE-3200 factory scenario, Flex triggers are `Flex Key 1` / `Flex Key 2` (transition IDs `16/17`).
- Extended geometry editing (X/Y/Scale/Crop) is handled in Control Center UI and can be triggered from Companion via API/actions.

If the detected model does not support a feature (for example Flex or Multiview), related controls should be hidden/disabled.
