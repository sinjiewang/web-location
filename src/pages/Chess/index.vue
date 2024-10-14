<template>
  <div ref="chessBoardContainer" class="chess-board-container"></div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  BOARD_SIZE,
  TILE_SIZE,
  TILE_DEPTH,
  WHITE_PIECE_COLOR,
  BLACK_PIECE_COLOR,
  WHITE_PIECE_HOVER_COLOR,
  BLACK_PIECE_HOVER_COLOR,
  WHITE_PIECE_SELECTED_COLOR,
  BLACK_PIECE_SELECTED_COLOR,
  HIGHLIGHT_BOX_COLOR,
  PIECE_COORDINATE_Z,
} from './config';
import * as chessHelper from '@/utils/chessHelper';

const emit = defineEmits(['move']);
const props = defineProps({
  isWhitePieces: {
    type: Boolean,
    default: true,
  },
  movable: {
    type: Boolean,
    default: true,
  },
  selectable: {
    type: Boolean,
    default: true,
  },
});

const chessBoardContainer = ref(null);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
let controls; // 宣告控制器
let animationId = null;
let pieces = null;
let controlsChanged = false;
const tiles = [];

const initThreeJS = async () => {
  const container = chessBoardContainer.value;

  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x333333); // 背景設置為 0x333333 (深灰色)
  container.appendChild(renderer.domElement);

  // 初始化 OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // 啟用阻尼效果，使拖曳更平滑
  controls.dampingFactor = 0.25;
  controls.enableZoom = true; // 啟用縮放
  controls.addEventListener('change', () => {
    if (controlsChanged) clearTimeout(controlsChanged);

    controlsChanged = setTimeout(() => controlsChanged = null, 50);
  });

  // 添加環境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  // 添加兩個方向光
  for (let i = 0; i < 2; i++) {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);

    directionalLight.position.set(10 * (i ? -1 : 1), 10, 10 * (i ? -1 : 1)); // 設置光源位置
    scene.add(directionalLight);
  }

  // 棋盤大小
  const boardSize = BOARD_SIZE;
  const tileSize = TILE_SIZE;
  const tileDepth = TILE_DEPTH;
  const { isWhitePieces } = props;

  // 建立棋盤
  for (let x = 0; x < boardSize; x+=1) {
    for (let y = 0; y < boardSize; y+=1) {
      const color = (x + y) % 2 === 0 ? 0xffffff : 0x000000;
      const geometry = new THREE.BoxGeometry(tileSize, tileDepth, tileSize); // 每個方格有厚度
      const material = new THREE.MeshBasicMaterial({ color: color });
      const tile = new THREE.Mesh(geometry, material);
      const label = String.fromCharCode(97 + x) + (8 - y);
      const coordinate = translateLabelToCoordinate(label, isWhitePieces);
      const coordinateX = coordinate.x;
      const coordinateY = tileDepth * -1;
      const coordinateZ = coordinate.z;

      tile.label = label;
      tile.position.set(coordinateX, coordinateY, coordinateZ); // 微調位置
      tiles.push(tile);
      scene.add(tile);
    }
  }

  // 讀取/建立棋子
  pieces = await createPieces();

  // initChessboard({ isWhitePieces });

  // 設置相機位置
  camera.position.z = 7;
  camera.position.y = 5;
  camera.lookAt(0, 0, 0);

  animate();
}

let animateActions = [];

// 動畫循環
const animate = () => {
  animationId = requestAnimationFrame(animate);

  controls.update(); // 更新 OrbitControls
  renderer.render(scene, camera);

  const result = animateActions.map((action) => action());

  for (let i=result.length - 1; i>=0; i-=1) {
    if (result[i]) animateActions.splice(i, 1);
  }
};

const appendActionToAnimate = async (action) => {
  return new Promise((resolve) => {
    animateActions.push(() => {
      let isDone = false;

      action((res) => {
        resolve(res);

        isDone = true;
      });

      return isDone;
    });
  });
};

const createPieces = async () => {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();

    loader.load('/glb/chess/pieces.glb', (gltf) => {
      const root = gltf.scene;
      const pieces = [];

      root.traverse((node) => {
        if (node.isMesh) {
          const clone = node.clone();

          clone.material.roughness = 0.5;
          clone.material.metalness = 0;
          clone.material = node.material.clone();

          pieces.push(clone);
        }
      });

      resolve(pieces);
    });
  });
};

const translateLabelToCoordinate = (label, isWhitePieces=true) => {
  const xMapWhite = {
    'a': -3.5,  'b': -2.5,  'c': -1.5,  'd': -0.5,
    'e': 0.5,   'f': 1.5,   'g': 2.5,   'h': 3.5,
  };
  const xMapBlack = {
    'h': -3.5,  'g': -2.5,  'f': -1.5,  'e': -0.5,
    'd': 0.5,   'c': 1.5,   'b': 2.5,   'a': 3.5,
  };
  const zMapWhite = {
    '1': 3.5,   '2': 2.5,   '3': 1.5,   '4': 0.5,
    '5': -0.5,  '6': -1.5,  '7': -2.5,  '8': -3.5,
  };
  const zMapBlack = {
    '8': 3.5,   '7': 2.5,   '6': 1.5,   '5': 0.5,
    '4': -0.5,  '3': -1.5,  '2': -2.5,  '1': -3.5,
  };
  const file = label[0];
  const rank = label[1];
  const x = isWhitePieces ? xMapWhite[file] : xMapBlack[file];
  const z = isWhitePieces ? zMapWhite[rank] : zMapBlack[rank];

  return { x, z };
};

const piecesForPlayer = [];
const piecesForOpponent = [];
// let isWhitePieces = true;
let boardState = {};

const appendPiece = (piece, { square, color=WHITE_PIECE_COLOR, isWhitePieces=true }={}) => {
  const clone = piece.clone();
  const coordinate = translateLabelToCoordinate(square, isWhitePieces);

  clone.material = piece.material.clone();
  clone.position.set(coordinate.x, PIECE_COORDINATE_Z, coordinate.z);
  clone.square = square;
  clone.color = color;

  scene.add(clone);

  boardState[square] = clone;

  return clone;
};

const appendPieceWithRotate = (piece, { square, color, isWhitePieces, rotate=0 }={}) => {
  const clone = appendPiece(piece, { square, color, isWhitePieces });

  clone.rotation.y = rotate;

  return clone;
};

const appendPawnPiece = (piece, { square, color, isWhitePieces }={}) => {
  const clone = appendPiece(piece, { square, color, isWhitePieces });

  clone.init = true;
  clone.enPassant = false;

  return clone;
};

const initChessboard = ({ isWhitePieces=true }={}) => {
  // clear chessboard
  [ piecesForPlayer, piecesForOpponent ].forEach((piecesList) => {
    piecesList.forEach((piece) => scene.remove(piece));
    piecesList.length = 0;
  });
  boardState = {};

  [ BLACK_PIECE_COLOR, WHITE_PIECE_COLOR ].forEach((color, index) => {
    const isCurrentPlayer = !(index ^ isWhitePieces);
    const piecesList = isCurrentPlayer ? piecesForPlayer : piecesForOpponent;
    const rank = index ? 1 : 8;

    pieces.forEach((node) => {
      const piece = node.clone();
      let clone;

      piece.material = node.material.clone();
      piece.material.color.set(color);

      switch (piece.name) {
        case 'king':
          clone = appendPiece(piece, {
            square: 'e' + rank,
            color,
            isWhitePieces,
          });

          piecesList.push(clone);
          break;
        case 'queen':
          clone = appendPiece(piece, {
            square: 'd' + rank,
            color,
            isWhitePieces,
          });

          piecesList.push(clone);
          break;
        case 'rook':
          ['a' + rank, 'h' + rank].forEach((label) => {
            clone = appendPiece(piece, {
              square: label,
              color,
              isWhitePieces,
            });

            piecesList.push(clone);
          });
          break;
        case 'knight':
          ['b' + rank, 'g' + rank].forEach((label) => {
            clone = appendPieceWithRotate(piece, {
              square: label,
              rotate: Math.PI * ( isCurrentPlayer ? 1.5 : 0.5 ),
              color,
              isWhitePieces,
            });

            piecesList.push(clone);
          });
          break;
        case 'bishop':
          ['c' + rank, 'f' + rank].forEach((label) => {
            clone = appendPieceWithRotate(piece, {
              square: label,
              rotate: Math.PI * ( isCurrentPlayer ? 0.5 : 1.5),
              color,
              isWhitePieces,
            });

            piecesList.push(clone);
          });
          break;
        case 'pawn':
          Array.from({ length: 8 }).forEach((_, i) => {
            const label = String.fromCharCode(97 + i) + (rank + ( index ? 1 : -1));

            clone = appendPawnPiece(piece, {
              square: label,
              color,
              isWhitePieces,
            });

            piecesList.push(clone);
          });
          break;
      }
    });
  });
};

const initBoard = ({ isWhitePieces=true, boardSize=BOARD_SIZE, tileSize=TILE_SIZE, tileDepth=TILE_DEPTH }={}) => {
  tiles.forEach((tile) => scene.remove(tile));
  tiles.length = 0;
  // 建立棋盤
  for (let x = 0; x < boardSize; x+=1) {
    for (let y = 0; y < boardSize; y+=1) {
      const color = (x + y) % 2 === 0 ? 0xffffff : 0x000000;
      const geometry = new THREE.BoxGeometry(tileSize, tileDepth, tileSize); // 每個方格有厚度
      const material = new THREE.MeshBasicMaterial({ color: color });
      const tile = new THREE.Mesh(geometry, material);
      const label = String.fromCharCode(97 + x) + (8 - y);
      const coordinate = translateLabelToCoordinate(label, isWhitePieces);
      const coordinateX = coordinate.x;
      const coordinateY = tileDepth * -1;
      const coordinateZ = coordinate.z;

      tile.label = label;
      tile.position.set(coordinateX, coordinateY, coordinateZ); // 微調位置
      tiles.push(tile);
      scene.add(tile);
    }
  }
};

const raycaster = new THREE.Raycaster();
raycaster.precision = 0.001; // 提高精度
raycaster.params.Mesh.threshold = 0.1; // 擴大檢測範圍

const catchObjectByMouseEvent = (event) => {
  const container = chessBoardContainer.value;
  mouse.x = (event.offsetX / container.clientWidth) * 2 - 1;
  mouse.y = -(event.offsetY / container.clientHeight) * 2 + 1;

  // 使用 Raycaster 投射來檢測是否有物體被選中
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  return intersects.length ? intersects[0].object : null;
};

const mouse = new THREE.Vector2();
let hoverObject = null; // 用來跟踪當前 hover 的物體
let selectedObject = null; // 用來跟踪當前被選中的物體

const pieceBaseColor = computed(() => props.isWhitePieces ? WHITE_PIECE_COLOR : BLACK_PIECE_COLOR );
const pieceHoverColor = computed(() => props.isWhitePieces ? WHITE_PIECE_HOVER_COLOR : BLACK_PIECE_HOVER_COLOR );
const pieceSelectedColor = computed(() => props.isWhitePieces ? WHITE_PIECE_SELECTED_COLOR : BLACK_PIECE_SELECTED_COLOR );

const setSelectObject = (object) => {
  if (!props.selectable) return;

  selectedObject = object;
  selectedObject.material.color.set(pieceSelectedColor.value);

  // 計算選中棋子的可移動位置
  const possibleMoves = calculatePossibleMoves(object);
  // 高亮顯示可移動的位置
  highlightPossibleMoves(possibleMoves);
};
const clearSelectedObject = () => {
  if (selectedObject) {
    selectedObject.material.color.set(pieceBaseColor.value);
    selectedObject = null;

    clearHighlightedPossibleMoves();
    clearHighlightedSelectableMove();
  }
};

function onMouseMove(event) {
  const intersectedObject = catchObjectByMouseEvent(event);

  if (intersectedObject) {
    if (intersectedObject !== hoverObject) {
      const isSelectOpponentPieces = piecesForOpponent.includes(intersectedObject);
      // 重置前一個選中物體的材質
      if (hoverObject && hoverObject !== selectedObject) {
        hoverObject.material.color.set(pieceBaseColor.value);
      }

      // hover player's pieces
      if (piecesForPlayer.includes(intersectedObject)) {
        if (intersectedObject !== selectedObject) {
          hoverObject = intersectedObject;
          hoverObject.material.color.set(pieceHoverColor);
        }
      } else if (tiles.includes(intersectedObject) && selectedObject) {
        const tileLabel = intersectedObject.label;

        if (highlightTiles.includes(tileLabel)) {
          highlightSelectableMove(tileLabel);
        } else {
          clearHighlightedSelectableMove();
        }
      } else if (isSelectOpponentPieces && highlightTiles.includes(intersectedObject.square)) {
        highlightSelectableMove(intersectedObject.square);
      } else {
        clearHighlightedSelectableMove();
      }
    }
  } else {
    // 如果滑鼠沒有指向任何物體
    if (hoverObject !== selectedObject) {
      hoverObject?.material.color.set(pieceBaseColor.value);
    }
    hoverObject = null;
  }
}

function onMouseClick(event) {
  if (controlsChanged) {
    return;
  }
  const intersectedObject = catchObjectByMouseEvent(event);

  if (intersectedObject) {
    if (intersectedObject !== selectedObject) {
      const targetSquare = intersectedObject.label || intersectedObject.square;
      // const isSelectOpponentPieces = piecesForOpponent.includes(intersectedObject);

      if (targetSquare) {
        if (selectedObject && highlightTile !== targetSquare) {
          clearSelectedObject();
        }
      // } else if (isSelectOpponentPieces) {
        // DO NOTHING
      } else if (selectedObject) {
        clearSelectedObject();
      }

      if (piecesForPlayer.includes(intersectedObject)) {
        setSelectObject(intersectedObject);
      } else if (tiles.includes(intersectedObject) && highlightTile === intersectedObject.label) {
        move(selectedObject, intersectedObject.label);
      } else if (highlightTile === intersectedObject.square) {
        move(selectedObject, intersectedObject.square);
      }
    }
  } else {
    // 如果滑鼠沒有指向任何物體，重置上一次選中的物體
    if (selectedObject) {
      clearSelectedObject();
    }
  }
}

const movePieceByAnimate = (piece, square='') => {
  if (!piece || !square) return Promise.reject('parameter is incorrect');

  const { isWhitePieces } = props;
  const targetPiece = boardState[square];
  const originSquare = piece.square;
  const coordinateFrom = translateLabelToCoordinate(originSquare, isWhitePieces);
  const coordinateTo = translateLabelToCoordinate(square, isWhitePieces);

  piece.square = square;

  const { name } = piece;
  const calculate = name === 'knight' ? chessHelper.calculateJumpParabola : chessHelper.calculateNonlinearMovement;
  const positions = calculate({
    x1: coordinateFrom.x,
    z1: coordinateFrom.z,
    x2: coordinateTo.x,
    z2: coordinateTo.z,
  });
  const deltaX = (coordinateTo.x - coordinateFrom.x);
  const deltaZ = (coordinateTo.z - coordinateFrom.z);

  const enPassantSquare = square[0] + originSquare[1];
  const enPassantTarget = boardState[enPassantSquare];
  const isEnPassant = name === 'pawn'
    && chessHelper.isPawnMovingDiagonally(originSquare, square)
    && !targetPiece
    && enPassantTarget?.enPassant;

  if (isEnPassant) {
    console.warn('isEnPassant')
  }

  return new Promise((resolve) => {
    appendActionToAnimate((done) => {
      const position = positions.shift();

      piece.position.x = position.x;
      piece.position.y = position.y + PIECE_COORDINATE_Z;
      piece.position.z = position.z;

      if (targetPiece && positions.length === 10) {
        const backoffX = deltaX / (Math.abs(deltaX) + Math.abs(deltaZ));
        const backoffY = deltaZ / (Math.abs(deltaX) + Math.abs(deltaZ));

        const backoffPoints = chessHelper.calculateNonlinearMovement({
          x1: coordinateTo.x,
          z1: coordinateTo.z,
          x2: coordinateTo.x + backoffX,
          z2: coordinateTo.z + backoffY,
        });

        targetPiece.material.transparent = true; // 啟用透明度
        targetPiece.material.transparent = true; // 啟用透明度

        appendActionToAnimate((done) => {
          const backoffPoint = backoffPoints.shift();

          targetPiece.material.transparent = true; // 啟用透明度
          targetPiece.material.opacity = backoffPoints.length / 10;
          targetPiece.position.x = backoffPoint.x;
          targetPiece.position.y += 0.1;
          targetPiece.position.z = backoffPoint.z;

          if (!backoffPoints.length) {
            done();
          }
        });
      } else if (isEnPassant && enPassantTarget && positions.length === 10) {
        const steps = Array.from({ length: 10 });

        appendActionToAnimate((done) => {
          steps.shift();

          enPassantTarget.material.transparent = true; // 啟用透明度
          enPassantTarget.material.opacity = steps.length / 10;
          enPassantTarget.position.y += 0.1;

          if (!steps.length) {
            done();
          }
        }).then(() => {
          boardState[enPassantSquare] = null;

          scene.remove(enPassantTarget);
        });
      }

      if (!positions.length) {
        if (targetPiece) {
          scene.remove(targetPiece);
        }

        done();
      }
    }).then(() => {
      const [ _, rank ] = square;
      const isAtBottom = rank === '8' || rank === '1';

      if (name === 'pawn') {
        if (piece.init) {
          piece.init = false;
          piece.enPassant = true;
        } else {
          piece.enPassant = false;
        }

        if (isAtBottom) {
          promotion(piece);
        }
      }

      boardState[originSquare] = null;
      boardState[square] = piece;
    }).then(resolve);

    clearSelectedObject();
  });
};

const move = (piece, square='') => {
  if (!piece || !square) return;

  const from = piece.square;

  // movePieceByAnimate(piece, square);
  emit('move', {
    from,
    to: square,
  });
};

const promotion = (piece, target='queen') => {
  const { isWhitePieces } = props;
  const { name, square } = piece;

  if (name === 'pawn' && (square.includes('1') || square.includes('8'))) {
    const positions  = Array.from({ length: 30 }).map((_, index) => index / 30 + PIECE_COORDINATE_Z);

    appendActionToAnimate((done) => {
      const positionY = positions.shift();

      piece.position.y = positionY;

      if (!positions.length) {
        done();
      }
    }).then(() => {
      const piecesOrigin = isWhitePieces && piece.color === WHITE_PIECE_COLOR ? piecesForPlayer : piecesForOpponent;
      const targetPiece = piecesOrigin
        .filter((piece) => ['queen', 'rook', 'bishop', 'knight'].includes(piece.name))
        .find((piece) => piece.name === target);

      scene.remove(piece);

      const clone = appendPiece(targetPiece, {
        square,
        isWhitePieces,
        color: piece.color,
      });

      piecesForPlayer.push(clone);

      boardState[square] = clone;
    });
  }
};

onMounted(() => {
  renderer.domElement.addEventListener('mousemove', onMouseMove, false);
  renderer.domElement.addEventListener('click', onMouseClick, false);

  nextTick(() => initThreeJS())
});

onBeforeUnmount(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  controls.dispose(); // 清理控制器

  renderer.domElement.removeEventListener('mousemove', onMouseMove);
  renderer.domElement.removeEventListener('click', onMouseClick);
});

const createHighlightBox = ({ size=1, color=HIGHLIGHT_BOX_COLOR, lineWidth=5, padding=0 }={}) => {
  const positions = [
    -size / 2 + padding, 0, -size / 2 + padding,
    size / 2 - padding, 0, -size / 2 + padding,
    size / 2 - padding, 0, size / 2 - padding,
    -size / 2 + padding, 0, size / 2 - padding,
    -size / 2 + padding, 0, -size / 2 + padding
  ];
  const geometry = new LineGeometry();

  geometry.setPositions(positions);

  const material = new LineMaterial({
    color,
    linewidth: lineWidth, // 線條寬度
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight), // 設置解析度
  });
  const line = new Line2(geometry, material);

  line.computeLineDistances(); // 計算線條距離

  return line;
};

const highlightMoves = [];
const highlightTiles = [];
let highlightTile = null;
let highlightSelectable = null;

const highlightSelectableMove = (move) => {
  if (!props.movable) return;

  clearHighlightedSelectableMove();

  const { isWhitePieces } = props;
  const coordinate = translateLabelToCoordinate(move, isWhitePieces);
  const highlightBox = createHighlightBox({ lineWidth: 10, color: 0xff0000 }); // 創建線寬為 10 的線條

  highlightBox.position.set(coordinate.x, PIECE_COORDINATE_Z, coordinate.z); // 設定框框的位置
  highlightBox.square = move;

  scene.add(highlightBox); // 加到場景中

  highlightSelectable = highlightBox;
  highlightTile = move;
};

const clearHighlightedSelectableMove = () => {
  if (highlightSelectable) {
    scene.remove(highlightSelectable);
    highlightSelectable = null;
    highlightTile = null;
  }
};

const highlightPossibleMoves = (moves) => {
  clearHighlightedPossibleMoves();

  const { isWhitePieces } = props;

  moves.forEach(move => {
    const coordinate = translateLabelToCoordinate(move, isWhitePieces);
    const highlightBox = createHighlightBox({ lineWidth: 10, padding: 0.1 }); // 創建線寬為 10 的線條

    highlightBox.position.set(coordinate.x, PIECE_COORDINATE_Z, coordinate.z); // 設定框框的位置
    highlightBox.square = move;

    scene.add(highlightBox); // 加到場景中

    highlightMoves.push(highlightBox);
    highlightTiles.push(move);
  });
};

const clearHighlightedPossibleMoves = () => {
  highlightMoves.forEach((move) => scene.remove(move));
  highlightMoves.length = 0;
  highlightTiles.length = 0;
};

const calculatePossibleMoves = (piece) => {
  const { isWhitePieces } = props;
  const { name } = piece;

  return chessHelper[`${name}Moves`](piece, boardState, isWhitePieces);
};

defineExpose({
  move: ({from='', to=''}={}) => {
    const piece = boardState[from];

    if (!piece || !from || !to) return Promise.reject(new Error('parameter is incorrect'));

    return movePieceByAnimate(piece, to);
  },
  reset: () => {
    const {isWhitePieces } = props;

    initBoard({ isWhitePieces });
    initChessboard({ isWhitePieces });
  },
});

</script>

<style scoped>
.chess-board-container {
  max-width: 100%;
  aspect-ratio: 1;
  height: 100%;
  overflow: hidden;
}
</style>
