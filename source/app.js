import io from 'socket.io-client'
import 'aframe'

import './components/destroyer'
import './components/velocity-glow'
import './components/video-stream'
import './primitives/a-player'
import './systems/debug'
import './systems/game'
import './systems/webrtc'

window.CLOCK = new THREE.Clock()
window.io = io(`wss://${window.location.hostname}:2002`) // LOCAL
// window.io = io(`wss://${window.location.hostname}`) // PRODUCTION
console.log('Cowboy hat by Poly by Google [CC-BY] via Poly Pizza')