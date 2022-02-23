AFRAME.registerComponent('velocity-glow', {
  init: function () {},

  tick: function () {
    let velocity = this.el.body.velocity
    let speed = Math.sqrt(
      velocity.x * velocity.x +
        velocity.y * velocity.y +
        velocity.z * velocity.z
    )

    this.el.setAttribute('material', 'emissive', '#ffffff')
    this.el.setAttribute('material', 'emissiveIntensity', speed / 5)
  },
})
