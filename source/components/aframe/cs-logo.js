import './velocity-glow';

AFRAME.registerComponent('cs-logo', {
  multiple: true,
  
  init: function () {
    let csLogo = document.createElement('a-entity');

    let csLogoArms = document.createElement('a-entity');
    csLogoArms.setAttribute('gltf-model', '#cs-logo');
    csLogoArms.setAttribute('position', '0 1.5 -1');
    csLogoArms.setAttribute('dynamic-body', { shape: 'none', mass: 0.5, angularDamping: 0.5, linearDamping: 0.9 });
    csLogoArms.setAttribute('shape__top', { shape: 'box', halfExtents: '0.25 0.04455 0.04455', offset: '0 0.20545 0' });
    csLogoArms.setAttribute('shape__right', { shape: 'box', halfExtents: '0.04455 0.25 0.04455', offset: '0.20545 0 0' });
    csLogoArms.setAttribute('shape__bottom', { shape: 'box', halfExtents: '0.1475 0.04455 0.04455', offset: '0.1 -0.20545 0' });
    csLogoArms.setAttribute('shape__left', { shape: 'box', halfExtents: '0.04455 0.1475 0.04455', offset: '-0.20545 0.1  0' });
    csLogoArms.setAttribute('velocity-glow', '');

    let csLogoDot = document.createElement('a-cylinder');
    csLogoDot.setAttribute('color', '#212121');
    csLogoDot.setAttribute('radius', '0.07');
    csLogoDot.setAttribute('height', '0.0891');
    csLogoDot.setAttribute('dynamic-body', { mass: 0.1, angularDamping: 0.5, linearDamping: 0.9 });
    csLogoDot.setAttribute('position', '-0.1917 1.3083 -1');
    csLogoDot.setAttribute('rotation', '90 0 0');
    csLogoDot.setAttribute('velocity-glow', '');
    
    csLogo.appendChild(csLogoArms);
    csLogo.appendChild(csLogoDot);

    this.el.appendChild(csLogo);
  },
});