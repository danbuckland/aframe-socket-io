import * as io from 'socket.io-client';
let socket;
let playerId;
let remoteData = [];


AFRAME.registerComponent('game', {

	init: function () {
		// append new local-player component to scene
		this.el.sceneEl.setAttribute('local-player', '');

		socket.on('remoteData', function (data) { remoteData = data });

		// Remove remote players who disconnect
		// TODO handle local player disconnecting if that's a thing
		socket.on('deletePlayer', function (data) {
			let disconnectedPlayer = document.getElementById(data.id);
			console.log(`Player ${data.id} disconnected`);
			if (disconnectedPlayer) {
				disconnectedPlayer.setAttribute('destroyer', { ttl: 3 });
				disconnectedPlayer.setAttribute('dynamic-body', { shape: 'box', mass: 0.5, angularDamping: 0.5, linearDamping: 0.9 });
			}
		});
	},

	tick: function (t, dt) {
		// TODO: Use closures to avoid creating new variables each frame - 
		// https://aframe.io/docs/1.0.0/introduction/best-practices.html#tick-handlers
		let scene = this.el.sceneEl;
		// Return if there are no remote players
		if (remoteData === undefined || remoteData.length == 0 || playerId === undefined) { return };

		const remotePlayers = [];
		remoteData.forEach(function (data) {
			if (playerId != data.id) {
				if (!document.getElementById(data.id)) {
					// Append player to scene if remote player does not exist
					let remotePlayer = document.createElement('a-entity');
					remotePlayer.setAttribute('player', { id: data.id, shape: data.shape, color: data.color, x: data.x, y: data.y, z: data.z });
					scene.appendChild(remotePlayer);
				} else if (document.getElementById(data.id)) {
					// Update remote player position if it does exist
					let remotePlayer = document.getElementById(data.id);
					remotePlayer.object3D.position.set(data.x, data.y, data.z);
					remotePlayer.object3D.quaternion.set(data.rx, data.ry, data.rz, data.rw);
				}
			}
		});

		var position = new THREE.Vector3();
		var quaternion = new THREE.Quaternion();

		let localPlayerElement = document.getElementById(playerId);
		localPlayerElement.object3D.getWorldPosition(position);
		localPlayerElement.object3D.getWorldQuaternion(quaternion);

		// TODO: Send positional data as Vector3
		socket.emit('update', {
			x: position.x,
			y: position.y,
			z: position.z,
			rx: quaternion.x,
			ry: quaternion.y,
			rz: quaternion.z,
			rw: quaternion.w
		});
	}
});

// builds the player model itself
AFRAME.registerComponent('player', {

	// TODO: Consider creating an 'a-player' primitive
	multiple: true,

	schema: {
		color: { type: 'color' },
		shape: { type: 'string' },
		id: { type: 'string' },
		x: { type: 'number' },
		y: { type: 'number' },
		z: { type: 'number' }
	},

	init: function () {
		const colors = ['#ff6666', '#ff66ff', '#ffff66', '#66ffff', '#66ff66', '#6666ff'];
		const shapes = ['cylinder', 'box', 'cone'];
		let color = this.data.color;
		let shape = this.data.shape;
		let local = !shape;
		let position = new THREE.Vector3(this.data.x, this.data.y + 1.6, this.data.z); // account for head height

		// if player component is local, set some values for the player
		if (local) {
			color = colors[Math.floor(Math.random() * colors.length)];
			shape = shapes[Math.floor(Math.random() * shapes.length)];
			position = new THREE.Vector3(0, 0, -1.3);
		}

		const initSocket = () => {
			socket.emit('init', {
				shape: shape,
				color: color,
				id: this.data.id,
				x: position.x,
				y: position.y,
				z: position.z
			});
		}

		// create the 3d model of the player 
		let el = this.el;
		el.setAttribute('id', this.data.id);
		el.setAttribute('geometry', { primitive: shape });
		el.setAttribute('material', 'color', color);
		el.setAttribute('scale', '0.25 0.25 0.25');
		el.setAttribute('position', position);

		// emit 'init' event to share info about the player if player is local
		if (local) {
			console.log(`You joined as a ${color} ${shape}`)
			initSocket();
		} else {
			console.log(`Player ${this.data.id} joined as a ${color} ${shape}`);
		}

		// if local, move the camera to this player's position
	}
});

// get's called first when the user connects and creates the socket
AFRAME.registerComponent('local-player', {
	multiple: false,

	init: function () {
		socket = io();

		socket.on('setId', function (data) {
			playerId = data.id;
			console.log('You are player ' + playerId);
			let scene = document.querySelector('a-scene');
			let camera = document.getElementById('camera');
			let localPlayer = document.createElement('a-entity');
			localPlayer.setAttribute('player', { id: data.id });
			localPlayer.setAttribute('is-local', 'yes');
			camera.appendChild(localPlayer);
		});
	}
});

class Game {
	constructor() {
		// SURPLUS: if browser does not support WebGl, show a message
		if (!Detector.webgl) Detector.addGetWebGLMessage();

		// SURPLUS: define the different states the game can be in
		this.modes = Object.freeze({
			NONE: Symbol("none"),
			PRELOAD: Symbol("preload"),
			INITIALISING: Symbol("initialising"),
			CREATING_LEVEL: Symbol("creating_level"),
			ACTIVE: Symbol("active"),
			GAMEOVER: Symbol("gameover")
		});
		this.mode = this.modes.NONE;

		// SURPLUS: set instance variables and define assets path
		this.container;
		this.player;
		this.cameras;
		this.camera;
		this.scene;
		this.renderer;
		this.animations = {};
		this.assetsPath = 'assets/';

		// TODO: create empty arrays representing the remote players, colliders and remote data
		this.remotePlayers = [];
		this.remoteColliders = [];
		this.initialisingPlayers = [];
		this.remoteData = [];

		// SURPLUS: initialise a message for when the player joins
		this.messages = {
			text: [
				"Welcome to Blockland",
				"GOOD LUCK!"
			],
			index: 0
		}

		// SURPLUS: setup the scene in ThreeJS
		this.container = document.createElement('div');
		this.container.style.height = '100%';
		document.body.appendChild(this.container);

		// SURPLUS: if browser support .mp3 use that, otherwise .ogg
		const sfxExt = SFX.supportsAudioType('mp3') ? 'mp3' : 'ogg';

		// SURPLUS: create a reference to the game object to that is can be initialised
		const game = this;
		this.anims = ['Walking', 'Walking Backwards', 'Turn', 'Running', 'Pointing', 'Talking', 'Pointing Gesture'];

		// SURPLUS: Not sure exactly how this works but don't think it's needed
		const options = {
			assets: [
				`${this.assetsPath}images/nx.jpg`,
				`${this.assetsPath}images/px.jpg`,
				`${this.assetsPath}images/ny.jpg`,
				`${this.assetsPath}images/py.jpg`,
				`${this.assetsPath}images/nz.jpg`,
				`${this.assetsPath}images/pz.jpg`
			],
			oncomplete: function () {
				game.init();
			}
		}

		// SURPLUS: Add animations to options object
		this.anims.forEach(function (anim) { options.assets.push(`${game.assetsPath}fbx/anims/${anim}.fbx`) });
		options.assets.push(`${game.assetsPath}fbx/town.fbx`);

		// SURPLUS: Set the mode to PRELOAD
		this.mode = this.modes.PRELOAD;

		// SURPLUS: Used to calculate deltatime elsewhere
		this.clock = new THREE.Clock();

		const preloader = new Preloader(options);

		window.onError = function (error) {
			console.error(JSON.stringify(error));
		}
	}

	// SURPLUS: Initialise sound
	initSfx() {
		this.sfx = {};
		this.sfx.context = new (window.AudioContext || window.webkitAudioContext)();
		this.sfx.gliss = new SFX({
			context: this.sfx.context,
			src: { mp3: `${this.assetsPath}sfx/gliss.mp3`, ogg: `${this.assetsPath}sfx/gliss.ogg` },
			loop: false,
			volume: 0.3
		});
	}

	// SURPLUS: Moves the camera to a predefined position in relation to the player
	set activeCamera(object) {
		this.cameras.active = object;
	}

	// TODO: Initialise the Game class
	init() {
		// SURPLUS: Set mode to INITIALISING
		this.mode = this.modes.INITIALISING;

		// SURPLUS: Create a camera for the scene
		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 200000);

		// SURPLUS: Create a new scene with lights
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x00a0f0);

		const ambient = new THREE.AmbientLight(0xaaaaaa);
		this.scene.add(ambient);

		const light = new THREE.DirectionalLight(0xaaaaaa);
		light.position.set(30, 100, 40);
		light.target.position.set(0, 0, 0);

		light.castShadow = true;

		const lightSize = 500;
		light.shadow.camera.near = 1;
		light.shadow.camera.far = 500;
		light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
		light.shadow.camera.right = light.shadow.camera.top = lightSize;

		light.shadow.bias = 0.0039;
		light.shadow.mapSize.width = 1024;
		light.shadow.mapSize.height = 1024;

		this.sun = light;
		this.scene.add(light);

		// TODO: Create instance of local player and assign it to player
		const loader = new THREE.FBXLoader();
		const game = this;

		this.player = new PlayerLocal(this);

		// SURPLUS: Load the rest of the environment and UI
		this.loadEnvironment(loader);

		this.speechBubble = new SpeechBubble(this, "", 150);
		this.speechBubble.mesh.position.set(0, 350, 0);

		this.joystick = new JoyStick({
			onMove: this.playerControl,
			game: this
		});

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.container.appendChild(this.renderer.domElement);

		// SURPLUS: Handle mouse events
		if ('ontouchstart' in window) {
			window.addEventListener('touchdown', (event) => game.onMouseDown(event), false);
		} else {
			window.addEventListener('mousedown', (event) => game.onMouseDown(event), false);
		}

		// SURPLUS: Handle resize event
		window.addEventListener('resize', () => game.onWindowResize(), false);
	}

	// SURPLUS: Load Town environment complete with colliders and textures
	loadEnvironment(loader) {
		const game = this;
		loader.load(`${this.assetsPath}fbx/town.fbx`, function (object) {
			game.environment = object;
			game.colliders = [];
			game.scene.add(object);
			object.traverse(function (child) {
				if (child.isMesh) {
					if (child.name.startsWith("proxy")) {
						game.colliders.push(child);
						child.material.visible = false;
					} else {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				}
			});

			const tloader = new THREE.CubeTextureLoader();
			tloader.setPath(`${game.assetsPath}/images/`);

			var textureCube = tloader.load([
				'px.jpg', 'nx.jpg',
				'py.jpg', 'ny.jpg',
				'pz.jpg', 'nz.jpg'
			]);

			game.scene.background = textureCube;

			game.loadNextAnim(loader);
		})
	}

	// SURPLUS: Load all animations
	loadNextAnim(loader) {
		let anim = this.anims.pop();
		const game = this;
		loader.load(`${this.assetsPath}fbx/anims/${anim}.fbx`, function (object) {
			game.player.animations[anim] = object.animations[0];
			if (game.anims.length > 0) {
				game.loadNextAnim(loader);
			} else {
				delete game.anims;
				game.action = "Idle";
				game.mode = game.modes.ACTIVE;
				game.animate();
			}
		});
	}

	// SURPLUS: Sets player actions and motion to be shared
	playerControl(forward, turn) {
		turn = -turn;

		if (forward > 0.3) {
			if (this.player.action != 'Walking' && this.player.action != 'Running') this.player.action = 'Walking';
		} else if (forward < -0.3) {
			if (this.player.action != 'Walking Backwards') this.player.action = 'Walking Backwards';
		} else {
			forward = 0;
			if (Math.abs(turn) > 0.1) {
				if (this.player.action != 'Turn') this.player.action = 'Turn';
			} else if (this.player.action != "Idle") {
				this.player.action = 'Idle';
			}
		}

		if (forward == 0 && turn == 0) {
			delete this.player.motion;
		} else {
			this.player.motion = { forward, turn };
		}

		this.player.updateSocket();
	}

	// SURPLUS: Creates different cameras for various activities
	createCameras() {
		const offset = new THREE.Vector3(0, 80, 0);
		const front = new THREE.Object3D();
		front.position.set(112, 100, 600);
		front.parent = this.player.object;
		const back = new THREE.Object3D();
		back.position.set(0, 300, -1050);
		back.parent = this.player.object;
		const chat = new THREE.Object3D();
		chat.position.set(0, 200, -450);
		chat.parent = this.player.object;
		const wide = new THREE.Object3D();
		wide.position.set(178, 139, 1665);
		wide.parent = this.player.object;
		const overhead = new THREE.Object3D();
		overhead.position.set(0, 400, 0);
		overhead.parent = this.player.object;
		const collect = new THREE.Object3D();
		collect.position.set(40, 82, 94);
		collect.parent = this.player.object;
		this.cameras = { front, back, wide, overhead, collect, chat };
		this.activeCamera = this.cameras.back;
	}

	// SURPLUS: Displays messages
	showMessage(msg, fontSize = 20, onOK = null) {
		const txt = document.getElementById('message_text');
		txt.innerHTML = msg;
		txt.style.fontSize = fontSize + 'px';
		const btn = document.getElementById('message_ok');
		const panel = document.getElementById('message');
		const game = this;
		if (onOK != null) {
			btn.onclick = function () {
				panel.style.display = 'none';
				onOK.call(game);
			}
		} else {
			btn.onclick = function () {
				panel.style.display = 'none';
			}
		}
		panel.style.display = 'flex';
	}

	// SURPLUS: Updates the camera and rendered view when resizing
	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth, window.innerHeight);

	}

	// TODO: 
	updateRemotePlayers(dt) {
		if (this.remoteData === undefined || this.remoteData.length == 0 || this.player === undefined || this.player.id === undefined) return;

		const newPlayers = [];
		const game = this;
		//Get all remotePlayers from remoteData array
		const remotePlayers = [];
		const remoteColliders = [];

		this.remoteData.forEach(function (data) {
			if (game.player.id != data.id) {
				//Is this player being initialised?
				let iplayer;
				game.initialisingPlayers.forEach(function (player) {
					if (player.id == data.id) iplayer = player;
				});
				//If not being initialised check the remotePlayers array
				if (iplayer === undefined) {
					let rplayer;
					game.remotePlayers.forEach(function (player) {
						if (player.id == data.id) rplayer = player;
					});
					if (rplayer === undefined) {
						//Initialise player
						game.initialisingPlayers.push(new Player(game, data));
					} else {
						//Player exists
						remotePlayers.push(rplayer);
						remoteColliders.push(rplayer.collider);
					}
				}
			}
		});

		// Cleanup remote players
		this.scene.children.forEach(function (object) {
			if (object.userData.remotePlayer && game.getRemotePlayerById(object.userData.id) == undefined) {
				game.scene.remove(object);
			}
		});

		this.remotePlayers = remotePlayers;
		this.remoteColliders = remoteColliders;
		this.remotePlayers.forEach(function (player) { player.update(dt); });
	}

	// SURPLUS: Handle mouse clicks and interactions
	onMouseDown(event) {
		if (this.remoteColliders === undefined || this.remoteColliders.length == 0 || this.speechBubble === undefined || this.speechBubble.mesh === undefined) return;

		// calculate mouse position in normalized device coordinates
		// (-1 to +1) for both components
		const mouse = new THREE.Vector2();
		mouse.x = (event.clientX / this.renderer.domElement.width) * 2 - 1;
		mouse.y = - (event.clientY / this.renderer.domElement.height) * 2 + 1;

		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(mouse, this.camera);

		const intersects = raycaster.intersectObjects(this.remoteColliders);
		const chat = document.getElementById('chat');

		if (intersects.length > 0) {
			const object = intersects[0].object;
			const players = this.remotePlayers.filter(function (player) {
				if (player.collider !== undefined && player.collider == object) {
					return true;
				}
			});
			if (players.length > 0) {
				const player = players[0];
				console.log(`onMouseDown: player ${player.id}`);
				this.speechBubble.player = player;
				this.speechBubble.update('');
				this.scene.add(this.speechBubble.mesh);
				this.chatSocketId = player.id;
				chat.style.bottom = '0px';
				this.activeCamera = this.cameras.chat;
			}
		} else {
			//Is the chat panel visible?
			if (chat.style.bottom == '0px' && (window.innerHeight - event.clientY) > 40) {
				console.log("onMouseDown: No player found");
				if (this.speechBubble.mesh.parent !== null) this.speechBubble.mesh.parent.remove(this.speechBubble.mesh);
				delete this.speechBubble.player;
				delete this.chatSocketId;
				chat.style.bottom = '-50px';
				this.activeCamera = this.cameras.back;
			} else {
				console.log("onMouseDown: typing");
			}
		}
	}

	// TODO: Possibly. Not sure exactly what this is doing/how it does it
	getRemotePlayerById(id) {
		if (this.remotePlayers === undefined || this.remotePlayers.length == 0) return;

		const players = this.remotePlayers.filter(function (player) {
			if (player.id == id) return true;
		});

		if (players.length == 0) return;

		return players[0];
	}

	// SURPLUS: Deals with animation and player motion and ultimately renders the scene
	animate() {
		const game = this;
		const dt = this.clock.getDelta();

		requestAnimationFrame(function () { game.animate(); });

		this.updateRemotePlayers(dt);

		if (this.player.mixer != undefined && this.mode == this.modes.ACTIVE) this.player.mixer.update(dt);

		if (this.player.action == 'Walking') {
			const elapsedTime = Date.now() - this.player.actionTime;
			if (elapsedTime > 1000 && this.player.motion.forward > 0) {
				this.player.action = 'Running';
			}
		}

		if (this.player.motion !== undefined) this.player.move(dt);

		if (this.cameras != undefined && this.cameras.active != undefined && this.player !== undefined && this.player.object !== undefined) {
			this.camera.position.lerp(this.cameras.active.getWorldPosition(new THREE.Vector3()), 0.05);
			const pos = this.player.object.position.clone();
			if (this.cameras.active == this.cameras.chat) {
				pos.y += 200;
			} else {
				pos.y += 300;
			}
			this.camera.lookAt(pos);
		}

		if (this.sun !== undefined) {
			this.sun.position.copy(this.camera.position);
			this.sun.position.y += 10;
		}

		if (this.speechBubble !== undefined) this.speechBubble.show(this.camera.position);

		this.renderer.render(this.scene, this.camera);
	}
}
class Player {
	constructor(game, options) {
		this.local = true;
		let model, colour;

		const colours = ['Black', 'Brown', 'White'];
		colour = colours[Math.floor(Math.random() * colours.length)];


		if (options === undefined) { // constructor called without 'options' must be local 
			const people = ['BeachBabe', 'BusinessMan', 'Doctor', 'FireFighter', 'Housewife', 'Policeman', 'Prostitute', 'Punk', 'RiotCop', 'Roadworker', 'Robber', 'Sheriff', 'Streetman', 'Waitress'];
			model = people[Math.floor(Math.random() * people.length)];
		} else if (typeof options == 'object') { // else if called with options it must be remote 
			this.local = false;
			this.options = options;
			this.id = options.id;
			model = options.model;
			colour = options.colour;
		} else { // I think this is to handle user just passing in the model and no other details
			model = options;
		}
		this.model = model;
		this.colour = colour;
		this.game = game;
		this.animations = this.game.animations;

		const loader = new THREE.FBXLoader();
		const player = this;

		// actually load the 3D model representing the player
		loader.load(`${game.assetsPath}fbx/people/${model}.fbx`, function (object) {

			object.mixer = new THREE.AnimationMixer(object);
			player.root = object;
			player.mixer = object.mixer;

			object.name = "Person";

			object.traverse(function (child) {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});


			const textureLoader = new THREE.TextureLoader();

			textureLoader.load(`${game.assetsPath}images/SimplePeople_${model}_${colour}.png`, function (texture) {
				object.traverse(function (child) {
					if (child.isMesh) {
						child.material.map = texture;
					}
				});
			});

			player.object = new THREE.Object3D();
			player.object.position.set(3122, 0, -173);
			player.object.rotation.set(0, 2.6, 0);

			player.object.add(object);
			if (player.deleted === undefined) game.scene.add(player.object);

			if (player.local) {
				game.createCameras();
				game.sun.target = game.player.object;
				game.animations.Idle = object.animations[0];
				if (player.initSocket !== undefined) player.initSocket();
			} else {
				const geometry = new THREE.BoxGeometry(100, 300, 100);
				const material = new THREE.MeshBasicMaterial({ visible: false });
				const box = new THREE.Mesh(geometry, material);
				box.name = "Collider";
				box.position.set(0, 150, 0);
				player.object.add(box);
				player.collider = box;
				player.object.userData.id = player.id;
				player.object.userData.remotePlayer = true;
				const players = game.initialisingPlayers.splice(game.initialisingPlayers.indexOf(this), 1);
				game.remotePlayers.push(players[0]);
			}

			if (game.animations.Idle !== undefined) player.action = "Idle";
		});
	}

	set action(name) {
		//Make a copy of the clip if this is a remote player
		if (this.actionName == name) return;
		const clip = (this.local) ? this.animations[name] : THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(this.animations[name]));
		const action = this.mixer.clipAction(clip);
		action.time = 0;
		this.mixer.stopAllAction();
		this.actionName = name;
		this.actionTime = Date.now();

		action.fadeIn(0.5);
		action.play();
	}

	get action() {
		return this.actionName;
	}

	update(dt) {
		this.mixer.update(dt);

		if (this.game.remoteData.length > 0) {
			let found = false;
			for (let data of this.game.remoteData) {
				if (data.id != this.id) continue;
				//Found the player
				this.object.position.set(data.x, data.y, data.z);
				const euler = new THREE.Euler(data.pb, data.heading, data.pb);
				this.object.quaternion.setFromEuler(euler);
				this.action = data.action;
				found = true;
			}
			if (!found) this.game.removePlayer(this);
		}
	}
}

class PlayerLocal extends Player {
	constructor(game, model) {
		super(game, model);

		const player = this;
		const socket = io();
		socket.on('setId', function (data) {
			player.id = data.id;
		});
		socket.on('remoteData', function (data) {
			game.remoteData = data;
		});
		socket.on('deletePlayer', function (data) {
			const players = game.remotePlayers.filter(function (player) {
				if (player.id == data.id) {
					return player;
				}
			});
			if (players.length > 0) {
				let index = game.remotePlayers.indexOf(players[0]);
				if (index != -1) {
					game.remotePlayers.splice(index, 1);
					game.scene.remove(players[0].object);
				} else {
					index = game.initialisingPlayers.indexOf(data.id);
					if (index != -1) {
						const player = game.initialisingPlayers[index];
						player.deleted = true;
						game.initialisingPlayers.splice(index, 1);
					}
				}
			}
		})
		socket.on('chat message', function (data) {
			document.getElementById('chat').style.bottom = '0px';
			const player = game.getRemotePlayerById(data.id);
			game.speechBubble.player = player;
			game.chatSocketId = player.id;
			game.activeCamera = game.cameras.chat;
			game.speechBubble.update(data.message);
		});
		$('#msg-form').submit(function (e) {
			socket.emit('chat message', { id: game.chatSocketId, message: $('#m').val() });
			$('#m').val('');
			return false;
		});

		this.socket = socket;
	}

	initSocket() {
		//console.log("PlayerLocal.initSocket");
		this.socket.emit('init', {
			model: this.model,
			colour: this.colour,
			x: this.object.position.x,
			y: this.object.position.y,
			z: this.object.position.z,
			h: this.object.rotation.y,
			pb: this.object.rotation.x
		});
	}

	updateSocket() {
		if (this.socket !== undefined) {
			//console.log(`PlayerLocal.updateSocket - rotation(${this.object.rotation.x.toFixed(1)},${this.object.rotation.y.toFixed(1)},${this.object.rotation.z.toFixed(1)})`);
			this.socket.emit('update', {
				x: this.object.position.x,
				y: this.object.position.y,
				z: this.object.position.z,
				h: this.object.rotation.y,
				pb: this.object.rotation.x,
				action: this.action
			})
		}
	}

	move(dt) {
		const pos = this.object.position.clone();
		pos.y += 60;
		let dir = new THREE.Vector3();
		this.object.getWorldDirection(dir);
		if (this.motion.forward < 0) dir.negate();
		let raycaster = new THREE.Raycaster(pos, dir);
		let blocked = false;
		const colliders = this.game.colliders;

		if (colliders !== undefined) {
			const intersect = raycaster.intersectObjects(colliders);
			if (intersect.length > 0) {
				if (intersect[0].distance < 50) blocked = true;
			}
		}

		if (!blocked) {
			if (this.motion.forward > 0) {
				const speed = (this.action == 'Running') ? 500 : 150;
				this.object.translateZ(dt * speed);
			} else {
				this.object.translateZ(-dt * 30);
			}
		}

		if (colliders !== undefined) {
			//cast left
			dir.set(-1, 0, 0);
			dir.applyMatrix4(this.object.matrix);
			dir.normalize();
			raycaster = new THREE.Raycaster(pos, dir);

			let intersect = raycaster.intersectObjects(colliders);
			if (intersect.length > 0) {
				if (intersect[0].distance < 50) this.object.translateX(100 - intersect[0].distance);
			}

			//cast right
			dir.set(1, 0, 0);
			dir.applyMatrix4(this.object.matrix);
			dir.normalize();
			raycaster = new THREE.Raycaster(pos, dir);

			intersect = raycaster.intersectObjects(colliders);
			if (intersect.length > 0) {
				if (intersect[0].distance < 50) this.object.translateX(intersect[0].distance - 100);
			}

			//cast down
			dir.set(0, -1, 0);
			pos.y += 200;
			raycaster = new THREE.Raycaster(pos, dir);
			const gravity = 30;

			intersect = raycaster.intersectObjects(colliders);
			if (intersect.length > 0) {
				const targetY = pos.y - intersect[0].distance;
				if (targetY > this.object.position.y) {
					//Going up
					this.object.position.y = 0.8 * this.object.position.y + 0.2 * targetY;
					this.velocityY = 0;
				} else if (targetY < this.object.position.y) {
					//Falling
					if (this.velocityY == undefined) this.velocityY = 0;
					this.velocityY += dt * gravity;
					this.object.position.y -= this.velocityY;
					if (this.object.position.y < targetY) {
						this.velocityY = 0;
						this.object.position.y = targetY;
					}
				}
			}
		}

		this.object.rotateY(this.motion.turn * dt);

		this.updateSocket();
	}
}