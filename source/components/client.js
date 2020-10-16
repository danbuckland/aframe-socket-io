import * as io from 'socket.io-client';
import './aframe/destroyer';
import './aframe/velocity-glow';

AFRAME.registerComponent('client', {

  init: function () {
    let scene = document.querySelector('a-scene');
    let socket = io();

    socket.on('spawnEntity', function (data) {
      let randomRadius = 0.05 + Math.random() * 0.1;
      let spawn = document.createElement('a-sphere');
      spawn.setAttribute('radius', randomRadius);
      spawn.setAttribute('position', '0 2 -1')
      spawn.setAttribute('material', 'color', '#232323');
      spawn.setAttribute('dynamic-body', { mass: randomRadius, linearDamping: 0.5, angularDamping: 0.5 });
      spawn.setAttribute('velocity-glow', '');
      spawn.setAttribute('grab', '');
      spawn.setAttribute('class', 'collidable');
      spawn.setAttribute(`destroyer`, { ttl: 120 } );
      scene.appendChild(spawn);
    });
  },

  multiple: false,

});