import * as io from 'socket.io-client';
import './destroyer';
import './velocity-glow';

AFRAME.registerComponent('client', {

  init: function () {
    let scene = document.querySelector('a-scene');
    let socket = io();

    socket.on('spawnEntity', function (data) {
      let spawn = document.createElement('a-entity');
      spawn.setAttribute('cs-logo', '');
      spawn.setAttribute('position', '0 0 0');
      spawn.setAttribute('destroyer', { ttl: 120 } );
      scene.appendChild(spawn);
    });
  },

  multiple: false,

});