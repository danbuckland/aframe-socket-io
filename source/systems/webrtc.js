// Inspired by the code samples at https://github.com/gmenezesg/webrtc-group-chat

AFRAME.registerSystem('webrtc', {
  schema: {},

  init: function () {
    this.throttledFunction = AFRAME.utils.throttle(this.everyFewSeconds, 3000, this)
    this.socket = window.io
    this.localStream
    const DEFAULT_CHANNEL = 'video-call'
    const MEDIA_CONSTRAINTS = {
      audio: true,
      video: true,
    }
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // { urls: 'stun:stun2.l.google.com:19302' },
        // { urls: 'stun:stun3.l.google.com:19302' },
        // { urls: 'stun:stun4.l.google.com:19302' },
      ],
    }

    this.peers = {} // Keep track of peers connected to this client

    /** On connection, set the local stream to the player object and join the video-call */
    this.socket.on('connect', async () => {
      await this.setLocalStream(MEDIA_CONSTRAINTS)
      window.addEventListener('keypress', (e) => {
        if (e.key === 'm') {
          const audioTrack = this.localStream.getTracks().find(track => track.kind === 'audio')
          if (audioTrack.enabled) {
            audioTrack.enabled = false
          } else {
            audioTrack.enabled = true
          }
          console.log(`${audioTrack.enabled ? 'Microphone unmuted' : 'Microphone muted'}`)
        }
      })
      window.addEventListener('keypress', (e) => {
        if (e.key === 'v') {
          const videoTrack = this.localStream.getTracks().find(track => track.kind === 'video')
          console.log(videoTrack)
          if (videoTrack.enabled) {
            videoTrack.enabled = false
          } else {
            videoTrack.enabled = true
          }
        }
      })
      this.socket.emit('join', DEFAULT_CHANNEL)
    })

    this.socket.on('disconnect', () => {
      // Close all peer connections on disconnect
      for (const peerId in this.peers) {
        this.peers[peerId].close()
      }
      this.peers = {}
    })

    /**
     * When we join a group, our signaling server will send out 'add-peer' events to each pair
     * of users in the group (creating a fully-connected graph of users, ie if there are 6 people
     * in the channel you will connect directly to the other 5, so there will be a total of 15
     * connections in the network).
     */
    this.socket.on('add-peer', async ({ peerId, shouldCreateOffer }) => {
      if (peerId in this.peers) return // Possible if there were multiple channels
      const rtcPeerConnection = new RTCPeerConnection(this.iceServers)
      this.peers[peerId] = rtcPeerConnection
      this.addLocalTracks(rtcPeerConnection)
      rtcPeerConnection.onicecandidate = (event) => this.sendIceCandidate(event, peerId)
      rtcPeerConnection.ontrack = (event) => this.setRemoteStream(event, peerId)

      if (shouldCreateOffer) {
        await this.createOffer(rtcPeerConnection, peerId)
      }
    })

    /**
     * Peers exchange session descriptions which contains information
     * about their audio / video settings and that sort of stuff. First
     * the 'offerer' sends a description to the 'answerer' (with type
     * "offer"), then the answerer sends one back (with type "answer").
     */
    this.socket.on('session-description', async ({ peerId, sessionDescription }) => {
        const peer = this.peers[peerId]

        peer.setRemoteDescription(new RTCSessionDescription(sessionDescription))
        if (sessionDescription.type === 'offer') {
          await this.createAnswer(peer, peerId)
        }
      }
    )

    /**
     * The offerer will send a number of ICE Candidate blobs to the answerer so they
     * can begin trying to find the best path to one another on the net.
     */
    this.socket.on('ice-candidate', ({ peerId, iceCandidate }) => {
      this.peers[peerId].addIceCandidate(new RTCIceCandidate(iceCandidate))
    })

    /**
     * When a user leaves a channel (or is disconnected from the
     * signaling server) everyone will recieve a 'remove-peer' message
     * telling them to trash the media channels they have open for those
     * that peer. If it was this client that left a channel, they'll also
     * receive the remove-peers. If this client was disconnected, they
     * wont receive remove-peers, but rather the
     * signaling_socket.on('disconnect') code will kick in and tear down
     * all the peer sessions.
     */
    this.socket.on('remove-peer', ({ peerId }) => {
      if (peerId in this.peers) this.peers[peerId].close()

      delete this.peers[peerId]
    })
  },

  tick: function (d, dt) {
    // this.throttledFunction()
  },

  everyFewSeconds: function () {
    console.log(this.peers)
  },

  setLocalStream: async function (mediaConstraints) {
    this.localVideoComponent = document.getElementById(this.socket.id)
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    } catch (error) {
      console.error('Could not get user media', error)
    }
    // If video element doesn't already exist, create it
    if (!this.video) {
      const video = document.createElement('video')
      video.setAttribute('autoplay', true)
      video.setAttribute('playsinline', true)
      video.setAttribute('muted', true)
      this.video = video
    }

    this.video.srcObject = this.localStream
    this.video.muted = true

    const playResult = this.video.play()
    if (playResult instanceof Promise) {
      playResult.catch((e) => console.log(`Error playing video stream`, e))
    }

    if (this.videoTexture) {
      this.videoTexture.dispose()
    }

    this.videoTexture = new THREE.VideoTexture(this.video)

    const mesh = this.localVideoComponent.getObject3D('mesh')
    mesh.material.map = this.videoTexture
    mesh.material.needsUpdate = true
    mesh.material.color = new THREE.Color(0xffffdd)
    this.localVideoComponent.srcObject = this.localStream
  },

  setRemoteStream: function (event, peerId) {
    const remoteVideoComponent = document.getElementById(peerId)
    if (!remoteVideoComponent) {
      return console.error(`No player mesh created for ${peerId}`)
    }
    const remoteStream = event.streams[0]
    let remoteVideoTexture = null
    let remoteVideo = null

    if (!remoteVideo) {
      const video = document.createElement('video')
      video.setAttribute('autoplay', true)
      video.setAttribute('playsinline', true)
      video.setAttribute('muted', true)
      remoteVideo = video
    }

    remoteVideo.srcObject = remoteStream

    const playResult = remoteVideo.play()
    if (playResult instanceof Promise) {
      playResult.catch((e) => console.log(`Error play video stream`, e))
    }

    if (remoteVideoTexture) {
      remoteVideoTexture.dispose()
    }

    remoteVideoTexture = new THREE.VideoTexture(remoteVideo)
    const mesh = remoteVideoComponent.getObject3D('mesh')
    mesh.material.map = remoteVideoTexture
    mesh.material.color = new THREE.Color(0xffffdd)
    mesh.material.needsUpdate = true
    remoteVideoComponent.srcObject = event.streams[0]
  },

  sendIceCandidate: function (event, peerId) {
    if (event.candidate) {
      this.socket.emit('webrtc-ice-candidate', {
        peerId,
        iceCandidate: {
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          candidate: event.candidate.candidate,
        },
      })
    }
  },

  createOffer: async function (rtcPeerConnection, peerId) {
    let sessionDescription
    try {
      sessionDescription = await rtcPeerConnection.createOffer()
      rtcPeerConnection.setLocalDescription(sessionDescription)
    } catch (error) {
      console.error(error)
    }

    this.socket.emit('relay-session-description', {
      peerId,
      sessionDescription,
    })
  },

  createAnswer: async function (rtcPeerConnection, peerId) {
    let sessionDescription
    try {
      sessionDescription = await rtcPeerConnection.createAnswer()
      rtcPeerConnection.setLocalDescription(sessionDescription)
    } catch (error) {
      console.error(error)
    }

    this.socket.emit('relay-session-description', {
      peerId,
      sessionDescription,
    })
  },

  addLocalTracks: function (rtcPeerConnection) {
    if (!this.localStream) {
      return console.log('No local stream')
    }

    this.localStream.getTracks().forEach((track) => {
      rtcPeerConnection.addTrack(track, this.localStream)
    })
  },
})
