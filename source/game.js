// import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { WEBGL } from 'three/examples/jsm/WebGL';
import * as io from 'socket.io-client';

class Game {
	constructor() {
		if (!WEBGL.isWebGLAvailable()) document.body.appendChild( WEBGL.getWebGLErrorMessage() );

		
		this.assetsPath = 'assets/';
	}
}

export { Game };