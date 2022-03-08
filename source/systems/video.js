// FROM https://github.com/gmenezesg/webrtc-group-chat

AFRAME.registerSystem('video', {
  schema: {},

  init: function () {
    const USE_AUDIO = false
    const USE_VIDEO = true
    const DEFAULT_CHANNEL = 'video-call'
    const MUTE_AUDIO_BY_DEFAULT = false

    const mediaConstraints = {
      audio: false,
      video: { width: 1280, height: 720 },
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

    var local_media_stream = null /* our own microphone / webcam */
    var peers =
      {} /* keep track of our peer connections, indexed by peer_id (aka socket.io id) */
    var peer_media_elements =
      {} /* keep track of our <video>/<audio> tags, indexed by peer_id */

    this.socket = window.io
    console.log('Connecting to signaling server')
    this.socket.on('connect', async () => {
      console.log('Connected to signaling server')
      await this.setLocalStream(mediaConstraints)
      this.socket.emit('join', DEFAULT_CHANNEL)
    })
    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server')
      /* Tear down all of our peer connections and remove all the
       * media divs when we disconnect */
      for (peer_id in peer_media_elements) {
        peer_media_elements[peer_id].remove()
      }
      for (peer_id in peers) {
        peers[peer_id].close()
      }

      peers = {}
      peer_media_elements = {}
    })

    /**
     * When we join a group, our signaling server will send out 'add-peer' events to each pair
     * of users in the group (creating a fully-connected graph of users, ie if there are 6 people
     * in the channel you will connect directly to the other 5, so there will be a total of 15
     * connections in the network).
     */
    this.socket.on('add-peer', (config) => {
      console.log('Signaling server said to add peer:', config)
      var peer_id = config.peer_id
      if (peer_id in peers) {
        /* This could happen if the user joins multiple channels where the other peer is also in. */
        console.log('Already connected to peer ', peer_id)
        return
      }
      var peer_connection = new RTCPeerConnection(this.iceServers)
      peers[peer_id] = peer_connection

      peer_connection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('relayICECandidate', {
            peer_id: peer_id,
            ice_candidate: {
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              candidate: event.candidate.candidate,
            },
          })
        }
      }
      peer_connection.ontrack = (event) => {
        const remoteVideoComponent = document.getElementById(peer_id)
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
      }
      // 	this.rtcPeerConnection.onicecandidate = sendIceCandidate
      // peer_connection.onaddstream = (event) => {
      //   console.log(`Adding stream for ${peer_id}`, event)
      //   // TODO: Add remote video to scene here
      //   // var remote_media = USE_VIDEO ? $('<video>') : $('<audio>')
      //   // remote_media.attr('autoplay', 'autoplay')
      //   // if (MUTE_AUDIO_BY_DEFAULT) {
      //   //   remote_media.attr('muted', 'true')
      //   // }
      //   // remote_media.attr('controls', '')
      //   // peer_media_elements[peer_id] = remote_media
      //   // $('body').append(remote_media)
      //   // attachMediaStream(remote_media[0], event.stream)
      // }

      /* Add our local stream */
      this.addLocalTracks(peer_connection)
      // peer_connection.addStream(local_media_stream)

      /* Only one side of the peer connection should create the
       * offer, the signaling server picks one to be the offerer.
       * The other user will get a 'sessionDescription' event and will
       * create an offer, then send back an answer 'sessionDescription' to us
       */
      if (config.should_create_offer) {
        console.log('Creating RTC offer to ', peer_id)
        peer_connection.createOffer(
          (local_description) => {
            console.log('Local offer description is: ', local_description)
            peer_connection.setLocalDescription(
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
     * Peers exchange session descriptions which contains information
     * about their audio / video settings and that sort of stuff. First
     * the 'offerer' sends a description to the 'answerer' (with type
     * "offer"), then the answerer sends one back (with type "answer").
     */
    this.socket.on('sessionDescription', (config) => {
      console.log('Remote description received: ', config)
      var peer_id = config.peer_id
      var peer = peers[peer_id]
      var remote_description = config.session_description
      console.log(config.session_description)

      var desc = new RTCSessionDescription(remote_description)
      var stuff = peer.setRemoteDescription(
        desc,
        () => {
          console.log('setRemoteDescription succeeded')
          if (remote_description.type == 'offer') {
            console.log('Creating answer')
            peer.createAnswer(
              (local_description) => {
                console.log('Answer description is: ', local_description)
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
      console.log('Description Object: ', desc)
    })

    /**
     * The offerer will send a number of ICE Candidate blobs to the answerer so they
     * can begin trying to find the best path to one another on the net.
     */
    this.socket.on('iceCandidate', (config) => {
      var peer = peers[config.peer_id]
      var ice_candidate = config.ice_candidate
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
      var peer_id = config.peer_id
      if (peer_id in peer_media_elements) {
        peer_media_elements[peer_id].remove()
      }
      if (peer_id in peers) {
        peers[peer_id].close()
      }

      delete peers[peer_id]
      delete peer_media_elements[config.peer_id]
    })

    // /***********************/
    // /** Local media stuff **/
    // /***********************/
    // const setup_local_media = async (callback, errorback) => {
    //   if (local_media_stream != null) {
    //     /* ie, if we've already been initialized */
    //     if (callback) callback()
    //     return
    //   }
    //   /* Ask user for permission to use the computers microphone and/or camera,
    //    * attach it to an <audio> or <video> tag if they give us access. */
    //   console.log('Requesting access to local audio / video inputs')

    //   navigator.getUserMedia =
    //     navigator.getUserMedia ||
    //     navigator.webkitGetUserMedia ||
    //     navigator.mozGetUserMedia ||
    //     navigator.msGetUserMedia

    //   stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    //   navigator.getUserMedia(
    //     { audio: USE_AUDIO, video: USE_VIDEO },
    //     (stream) => {
    //       /* user accepted access to a/v */
    //       console.log('Access granted to audio/video')
    //       local_media_stream = stream
    //       // TODO: Render video from stream here
    //       // var local_media = USE_VIDEO ? $('<video>') : $('<audio>')
    //       // local_media.attr('autoplay', 'autoplay')
    //       // local_media.attr(
    //       //   'muted',
    //       //   'true'
    //       // ) /* always mute ourselves by default */
    //       // local_media.attr('controls', '')
    //       // $('body').append(local_media)
    //       // attachMediaStream(local_media[0], stream)
    //       // local_media[0].muted = true

    //       if (callback) callback()
    //     },
    //     () => {
    //       /* user denied access to a/v */
    //       console.log('Access denied for audio/video')
    //       alert(
    //         'You chose not to provide access to the camera/microphone, demo will not work.'
    //       )
    //       if (errorback) errorback()
    //     }
    //   )
    // }
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

  addLocalTracks: function (rtcPeerConnection) {
    this.localStream.getTracks().forEach((track) => {
      rtcPeerConnection.addTrack(track, this.localStream)
    })
  },
})
