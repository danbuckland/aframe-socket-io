AFRAME.registerSystem('debug', {
  schema: {},

  init: function () {
    this.socket = window.io
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
  }
})