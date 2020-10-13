import * as io from 'socket.io-client';
import './aframe/destroyer';
import './aframe/velocity-glow';

let socket;
let scene;
let spawnedElement;

AFRAME.registerComponent('client', {

  init: function () {
    scene = document.querySelector('a-scene');
    socket = io();
    // Set up the tick throttling.
    this.tick = AFRAME.utils.throttleTick(this.tick, 10000, this);
    let boxCount = 0;
  },

  multiple: true,

  events: {
    initSpawn: function (evt) {
      console.log('init spawn init!');
    }
  },

  update: function () {
    this.el.addEventListener('initSpawn', function (event) {
      console.log('Entity collided with');
    });


  },

  tick: function (t, dt) {
    let boxCount = 0;
    socket.on('spawnEntity', function (data) {
      let spawn;
      
      let randomRadius = 0.05 + Math.random() * 0.1;
      spawn = document.createElement('a-sphere');
      spawn.setAttribute('radius', randomRadius);
      spawn.setAttribute('position', '0 2 -1')
      spawn.setAttribute('material', 'color', '#232323');
      spawn.setAttribute('dynamic-body', { mass: randomRadius, linearDamping: 0.5, angularDamping: 0.5 });
      spawn.setAttribute('velocity-glow', '');
      spawn.setAttribute('grab', '');
      spawn.setAttribute('class', 'collidable');
      spawn.setAttribute(`destroyer__${boxCount += 1}`, { 'ttl': 10, 'msg': 'Custom message' });
      scene.appendChild(spawn);
    });
  }
});