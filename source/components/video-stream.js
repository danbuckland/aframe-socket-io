AFRAME.registerComponent('video-stream', {
  schema: {
    id: {type: 'string', default: false }
  },

  multiple: false,

  init: function () {
    this.webrtc = this.el.sceneEl.systems.webrtc
    this.localPlayerId = this.el.sceneEl.systems.game.data.localPlayerId
    // Determine if this video is for the local player
    const isLocal = this.data.id === this.localPlayerId
    
    // Grab the correct stream
    const videoStream = isLocal ? this.webrtc.localStream : this.webrtc.remoteStreams[this.data.id]
    
    // Create video element to attach the stream to
    const videoEl = document.createElement('video')
    videoEl.srcObject = videoStream
    videoEl.muted = this.data.id === this.localPlayerId
    videoEl.play().catch((e) => console.log(`Error playing video stream`, e))

    // Map video texture from video element to player shape
    const mesh = this.el.getObject3D('mesh')
    mesh.material.map = new THREE.VideoTexture(videoEl)
    mesh.material.needsUpdate = true
    mesh.material.color = new THREE.Color(0xffffdd)
  },
})