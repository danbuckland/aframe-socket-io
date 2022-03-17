// FROM https://github.com/gmenezesg/webrtc-group-chat

AFRAME.registerSystem('video', {
  schema: {},

  init: function () {
    this.throttledFunction = AFRAME.utils.throttle(this.everyFewSeconds, 3000, this)
    this.socket = window.io
    const DEFAULT_CHANNEL = 'video-call'
    const MEDIA_CONSTRAINTS = {
      audio: false,
      video: true,
    }
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // { urls: 'stun:stun1.l.google.com:19302' },
        // { urls: 'stun:stun2.l.google.com:19302' },
        // { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
    }

    this.peers = {} /* keep track of our peer connections, indexed by peer_id (aka socket.io id) */

    // TODO: Debugging/test tools to be removed
    window.addEventListener('keypress', (e) => {
      if (e.key === 'x') {
        console.log('disconnecting...')
        this.socket.close()
      }
    })

    window.addEventListener('keypress', (e) => {
      if (e.key === 'c') {
        console.log('connecting...')
        this.socket.connect()
      }
    })

    /* On connection, set the local stream to the player object and then join the video-call */
    this.socket.on('connect', async () => {
      await this.setLocalStream(MEDIA_CONSTRAINTS)
      this.socket.emit('join', DEFAULT_CHANNEL)
    })

    this.socket.on('disconnect', () => {
      /* Tear down all of our peer connections and remove all the
       * media divs when we disconnect */
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
    this.socket.on('add-peer', (config) => {
      
      console.log('Adding peer:', config)

      const sendIceCandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('webrtc-ice-candidate', {
            peer_id: peer_id,
            ice_candidate: {
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              candidate: event.candidate.candidate,
            },
          })
        }
      } 

      const peer_id = config.peer_id
      
      if (peer_id in this.peers) return /** Could happen if there were multiple channels */
      
      const rtcPeerConnection = new RTCPeerConnection(this.iceServers)
      this.peers[peer_id] = rtcPeerConnection
      this.addLocalTracks(rtcPeerConnection)
      rtcPeerConnection.onicecandidate = sendIceCandidate
      rtcPeerConnection.ontrack = (event) => this.setRemoteStream(event, peer_id)
      
      /* Only one side of the peer connection should create the
      * offer, the signaling server picks one to be the offerer.
      * The other user will get a 'sessionDescription' event and will
      * create an offer, then send back an answer 'sessionDescription' to us
      */
     if (config.should_create_offer) {
       console.log('Creating RTC offer to ', peer_id)
       let sessionDescription = rtcPeerConnection.createOffer()
       rtcPeerConnection.createOffer(
         (local_description) => {
            // console.log('Local offer description is: ', local_description)
            rtcPeerConnection.setLocalDescription(
              local_description,
              () => {
                this.socket.emit('relaySessionDescription', {
                  peer_id: peer_id,
                  session_description: local_description,
                })
                console.log('Offer setLocalDescription succeeded')
              },
              () => {
                Alert('Offer setLocalDescription failed!')
              }
            )
          },
          (error) => {
            console.log('Error sending offer: ', error)
          }
        )
      }
    })

    /**
     * this.peers exchange session descriptions which contains information
     * about their audio / video settings and that sort of stuff. First
     * the 'offerer' sends a description to the 'answerer' (with type
     * "offer"), then the answerer sends one back (with type "answer").
     */
    this.socket.on('sessionDescription', ({peer_id, session_description}) => {
      console.log(`Remote description received for ${peer_id}: ${session_description}`)
      const peer = this.peers[peer_id]
      const remote_description = session_description
      // console.log(config.session_description)

      const desc = new RTCSessionDescription(remote_description)
      const stuff = peer.setRemoteDescription(
        desc,
        () => {
          console.log('setRemoteDescription succeeded')
          if (remote_description.type == 'offer') {
            console.log('Creating answer')
            peer.createAnswer(
              (local_description) => {
                // console.log('Answer description is: ', local_description)
                peer.setLocalDescription(
                  local_description,
                  () => {
                    this.socket.emit('relaySessionDescription', {
                      peer_id: peer_id,
                      session_description: local_description,
                    })
                    console.log('Answer setLocalDescription succeeded')
                  },
                  () => {
                    Alert('Answer setLocalDescription failed!')
                  }
                )
              },
              (error) => {
                console.log('Error creating answer: ', error)
                console.log(peer)
              }
            )
          }
        },
        (error) => {
          console.log('setRemoteDescription error: ', error)
        }
      )
      // console.log('Description Object: ', desc)
    })

    /**
     * The offerer will send a number of ICE Candidate blobs to the answerer so they
     * can begin trying to find the best path to one another on the net.
     */
    this.socket.on('iceCandidate', ({peer_id, ice_candidate}) => {
      var peer = this.peers[peer_id]
      peer.addIceCandidate(new RTCIceCandidate(ice_candidate))
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
    this.socket.on('remove-peer', (config) => {
      console.log('Signaling server said to remove peer:', config)
      let peer_id = config.peer_id

      if (peer_id in this.peers) {
        this.peers[peer_id].close()
      }

      delete this.peers[peer_id]
    })
  },

  tick: function (d, dt) {
    this.throttledFunction()
  },

  everyFewSeconds: function () {
    console.log(this.peers)
  },

  setLocalStream: async function (mediaConstraints) {
    this.localVideoComponent = document.getElementById(this.socket.id)
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    } catch (error) {
      console.error('Could not get user media', error)
    }

    if (!this.video) {
      const video = document.createElement('video')
      video.setAttribute('autoplay', true)
      video.setAttribute('playsinline', true)
      video.setAttribute('muted', true)
      this.video = video
    }

    this.video.srcObject = stream
    this.video.muted = true

    const playResult = this.video.play()
    if (playResult instanceof Promise) {
      playResult.catch((e) => console.log(`Error play video stream`, e))
    }

    if (this.videoTexture) {
      this.videoTexture.dispose()
    }

    this.videoTexture = new THREE.VideoTexture(this.video)

    const mesh = this.localVideoComponent.getObject3D('mesh')
    mesh.material.map = this.videoTexture
    mesh.material.needsUpdate = true
    this.localStream = stream
    this.videoTexture = new THREE.VideoTexture(this.localStream)
    this.localVideoComponent.srcObject = stream
  },

  setRemoteStream: function (event, peerId) {
    const remoteVideoComponent = document.getElementById(peerId)
    if (!remoteVideoComponent) {
      return console.log(`No player mesh created for ${peerId}`)
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
    mesh.material.needsUpdate = true
    remoteVideoComponent.srcObject = event.streams[0]
  },

  addLocalTracks: function (rtcPeerConnection) {
    this.localStream.getTracks().forEach((track) => {
      rtcPeerConnection.addTrack(track, this.localStream)
    })
  },
})
