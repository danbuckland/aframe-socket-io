AFRAME.registerPrimitive('a-player', {
	// https://aframe.io/docs/1.0.0/introduction/html-and-primitives.html#registering-a-primitive
	defaultComponents: {
		player: {}
	},

	mappings: {
		id: 'player.id',
		shape: 'player.shape',
		color: 'player.color'
	}
});

// builds the player model itself
AFRAME.registerComponent('player', {

	// TODO: Add separate collision geometry to prevent players intersecting
	multiple: true,

	schema: {
		color: { type: 'color' },
		shape: { type: 'string' },
		position: { type: 'vec3', default: { x: 0, y: 0, z: -1.3 } },
		id: { type: 'string' },
	},

	init: function () {
		const colors = ['#3A7D44', '#ffc2c5', '#e3bac6', '#bc9ec1', '#dbf4a7', '#9dcdc0', '#ff934f', '#5E6472', '#507DBC'];
		const shapes = ['octahedron', 'dodecahedron', 'box', 'tetrahedron'];
		let el = this.el;
		let color = this.data.color;
		let shape = this.data.shape;
		let local = !shape;
		let position = this.data.position;
		let quaternion = new THREE.Quaternion();
		this.game = this.el.sceneEl.systems.game;

		// if player component is local, set some values for the player
		if (local) {
			color = colors[Math.floor(Math.random() * colors.length)];
			shape = shapes[Math.floor(Math.random() * shapes.length)];
		}

		// create the 3d model of the player 
		el.setAttribute('id', this.data.id);
		el.setAttribute('geometry', { primitive: shape });
		el.setAttribute('material', 'color', color);
		el.setAttribute('scale', '0.25 0.25 0.25');
		el.setAttribute('position', position);

		// emit 'init' event to share info about the player if player is local
		if (local) {
			console.log(`Local player ${this.game.data.localPlayerId} joined as a ${color} ${shape}`);
			this.initSocket(shape, color, position, quaternion);
		} else {
			console.log(`Player ${this.data.id} joined as a ${color} ${shape}`);
		}
	},

	initSocket: function (shape, color, position, quaternion) {
		if (!this.game.socket) { return };
		this.game.socket.emit('init', {
			shape: shape,
			color: color,
			id: this.data.id,
			position: position,
			quaternion: quaternion
		});
	}
});