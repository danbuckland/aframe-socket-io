import io from 'socket.io-client'
import 'aframe'
import './components/destroyer'
import './components/velocity-glow'
import './systems/game'
import './systems/video'
import './primitives/a-player'

window.CLOCK = new THREE.Clock()
window.io = io(`wss://${window.location.hostname}:2002`) // LOCAL