import * as io from 'socket.io-client';

// https://aframe.io/docs/1.0.0/core/systems.html
AFRAME.registerSystem('game', {
	schema: {
		localPlayerId: { type: 'string' },
		remoteData: { type: 'array' }
	},

	init: function () {
		this.socket = io();
		this.throttledFunction = AFRAME.utils.throttle(this.everySecond, 1000, this);

		this.socket.on('connect', () => {
			this.data.localPlayerId = this.socket.id;
			let localPlayer = document.createElement('a-player');
			localPlayer.setAttribute('id', this.socket.id);
			document.getElementById('camera').appendChild(localPlayer);
		});

		this.socket.on('remoteData', (data) => { this.data.remoteData = data });

		// Remove remote players who disconnect
		this.socket.on('deletePlayer', (data) => {
			console.log(`Player ${data.id} disconnected`);
			let disconnectedPlayer = document.getElementById(data.id);
			if (disconnectedPlayer) {
				disconnectedPlayer.setAttribute('destroyer', { ttl: 5 });
				disconnectedPlayer.setAttribute('id', 'destroyed');
				disconnectedPlayer.setAttribute('velocity-glow', '');
				disconnectedPlayer.setAttribute('dynamic-body', { shape: 'sphere', mass: 2, angularDamping: 0.01, linearDamping: 0.01 });
				disconnectedPlayer.setAttribute('material', 'color', '#5E6472');
				disconnectedPlayer.setAttribute('material', 'opacity', 0.6)
			};
		});
	},

	everySecond: function () {
		this.removeLocalDisconnects(this.data);
	},

	tick: function (t, dt) {
		// Return if there are no remote players
		if (this.data.remoteData === undefined || this.data.remoteData.length == 0 || this.data.localPlayerId === undefined) { return };
		this.throttledFunction();
		this.updatePlayersInScene(this.data, this.el.sceneEl);
		this.updateLocalPlayerOnServer(this.data);
	},

	updatePlayersInScene: (() => {
		const constructPlayer = (data, scene) => {
			// TODO: Check for race conditions and consider implementing concept of initialising players
			let remotePlayer = document.createElement('a-player');
			remotePlayer.setAttribute('id', data.id);
			remotePlayer.setAttribute('playershape', data.shape);
			remotePlayer.setAttribute('color', data.color);
			remotePlayer.setAttribute('position', data.position);
			scene.appendChild(remotePlayer);
		}

		const updatePlayer = (data) => {
			let remotePlayer = document.getElementById(data.id);
			remotePlayer.object3D.position.copy(data.position);
			remotePlayer.object3D.rotation.setFromQuaternion(data.quaternion);
		}

		return (gameData, scene) => {
			if (!gameData.localPlayerId) { return };
			gameData.remoteData.forEach((data) => {
				if (gameData.localPlayerId != data.id) {
					if (!document.getElementById(data.id)) {
						// Append player to scene if remote player does not exist
						constructPlayer(data, scene);
					} else {
						// Update remote player position and rotation if it does exist
						updatePlayer(data);
					}
				}
			});
		}
	})(),

	removeLocalDisconnects: (() => {
		// Catches and deletes instances of 'a-player' in the scene not in remote data
		// TODO: swap Arrays for Objects where possible to improve access speed
		let sceneIds = [];

		return (gameData) => {
			if (!gameData.localPlayerId) { return };
			// After creating any missing remote players locally, delete scene players not on the remote
			let remoteIds = gameData.remoteData.map(player => player.id);
			sceneIds = []; // Reset the array first before pushing
			document.querySelectorAll('a-player').forEach((player) => { sceneIds.push(player.id) })
			if (JSON.stringify(remoteIds.sort()) !== JSON.stringify(sceneIds.sort())) { // discrepancy exists
				let disconnectedIds = sceneIds.filter(x => !remoteIds.includes(x));
				disconnectedIds.forEach((id, index) => {
					if (id !== gameData.localPlayerId && id !== 'destroyed') {
						console.log(`Deleting already disconnected ${id}`);
						let disconnectedEntity = document.getElementById(id);
						disconnectedEntity.parentNode.removeChild(disconnectedEntity);
						sceneIds.splice(index, index + 1);
					}
				})
			};
		}
	})(),

	updateLocalPlayerOnServer: (() => {
		// https://aframe.io/docs/1.0.0/introduction/best-practices.html#tick-handlers
		let position = new THREE.Vector3();
		let quaternion = new THREE.Quaternion();

		return function (gameData) {
			if (!gameData.localPlayerId) { return };
			let localPlayerElement = document.getElementById(gameData.localPlayerId);
			if (localPlayerElement) {
				localPlayerElement.object3D.getWorldPosition(position);
				localPlayerElement.object3D.getWorldQuaternion(quaternion);
			}

			this.socket.emit('update', {
				position: position,
				quaternion: quaternion
			});
		}
	})()
});