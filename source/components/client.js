import * as io from 'socket.io-client';
import './destroyer';

let socket;
let scene;
let spawnedElement;

AFRAME.registerComponent('client', {
  multiple: true,
  init: function () {
    let spawnCount = 0;
    scene = document.querySelector('a-scene');
    socket = io();
    
    // Set up the tick throttling.
    this.tick = AFRAME.utils.throttleTick(this.tick, 10000, this);
  },

  events: {
    initSpawn: function(evt) {
      console.log('init spawn init!');
    }
  },

  update: function () {
    this.el.addEventListener('initSpawn', function (event) {
      console.log('Entity collided with');
    });

    
  },

  tick: function (t, dt) { 
    socket.on('spawnEntity', function() {
      console.log('Spawning entity');
      spawnedElement = document.createElement('a-entity');
      spawnedElement.setAttribute('cs-logo', '')
      scene.appendChild(spawnedElement);
    });
  }
});