# A-Frame Socket.IO WebRTC Multiplayer Experience
A simple video conference multiplayer experience using [A-Frame](https://aframe.io/), [Socket.IO](https://socket.io/) and WebRTC.

## Demo
See it running at https://webxr.work/. 

Video can be toggled with **v** and you can mute/unmute with **m**. While the experience also works on mobile, there are no equivalent video/audio toggles on mobile platforms. VR support can be described as limited to non-existent (basically it might work with A-Frame's out of the box setup, but no effort has been put into its development).

## Background
This project was built as a personal development project for me to better understand SocketIO, A-Frame and WebRTC and how they can be used in combination to create online, web-based 3D multiplayer experiences. SocketIO is used as a signalling server for WebRTC and to keep track of players and their positions centrally. WebRTC allows connected clients to chat peer-to-peer with video and audio. A-Frame is used for everything else you can see! If you are looking to achieve something similar for your own project, by all means use this code but also consider that [Networked-Aframe](https://github.com/networked-aframe/networked-aframe) can achieve everything here and more and has an active community on the [A-Frame Slack community](https://join.slack.com/t/aframevr/shared_invite/zt-f6rne3ly-ekVaBU~Xu~fsZHXr56jacQ).

While I've done my best to keep the code clean and understandable, some of it is a little old, may not be following some best practises, and/or may not be in use at all. The code is offered as UNLICENSED meaning you can use it without limitation and without referencing this repo.

## Building and running
In order to run locally, you will need to generate local ssh keys. Do this by running `mkcert localhost`.

1. `yarn install`
2. `yarn serve`
3. Navigate to https://0.0.0.0:2002 in your browser
4. Join with another tab or from a mobile device to see other users
