AFRAME.registerComponent('velocity-glow', {
  init: function () {
    
  },

  tick: function() {

    let velocity = this.el.body.velocity;
    let speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
    let speedSquared = this.el.body.velocity.norm2() + this.el.body.angularVelocity.norm2();
    let speed2 = Math.sqrt(speedSquared);
  
    this.el.setAttribute('material', 'emissive', '#ff0000');
    this.el.setAttribute('material', 'emissiveIntensity', speed);
  }
});