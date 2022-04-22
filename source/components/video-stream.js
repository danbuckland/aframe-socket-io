AFRAME.registerComponent('video-stream', {
  schema: {
    id: { type: 'string' },
    muted: { type: 'boolean', default: false },
  },

  init: function () {
    // Get the stream from the webrtc system
    const stream = this.el.sceneEl.systems.webrtc.streams[this.data.id]

    // Create video element to attach the stream to
    const videoEl = document.createElement('video')
    videoEl.srcObject = stream
    videoEl.muted = this.data.muted
    videoEl.play().catch((e) => console.log(`Error playing video stream`, e))

    // Map video texture from video element to player shape
    const mesh = this.el.getObject3D('mesh')
    mesh.material.map = new THREE.VideoTexture(videoEl)
    mesh.material.needsUpdate = true
    mesh.material.color = new THREE.Color(0xffffdd)
  },
})
