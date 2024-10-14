function isValidSquare(square) {
  if (typeof square !== 'string' || square.length !== 2) {
    return false;
  }

  const file = square[0].toLowerCase();
  const rank = square[1];

  return 'abcdefgh'.includes(file) && '12345678'.includes(rank);
}
// rankOffset: ↑, fileOffset: →
function moveSquare(square, rankOffset= 0, fileOffset=0) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const file = square[0];
  const rank = parseInt(square[1], 10);

  const newFileIndex = files.indexOf(file) + fileOffset;
  const newRank = rank + rankOffset;

  if (newFileIndex >= 0 && newFileIndex < files.length && newRank >= 1 && newRank <= 8) {
    const newFile = files[newFileIndex];
    const newSquare = newFile + newRank;
    return isValidSquare(newSquare) ? newSquare : null;
  }

  return null;
}

const pawnMoves = (piece, boardState = {}, isWhitePiece = true) => {
  const { square } = piece;
  const direct = isWhitePiece ? 1 : -1; // 白棋向上，黑棋向下
  const moves = [];

  let move = moveSquare(square, direct);

  if (isValidSquare(move) && !boardState[move]) {
    moves.push(move);

    move = moveSquare(square, direct * 2);
    if (piece.init && isValidSquare(move) && !boardState[move]) {
      moves.push(move);
    }
  }

  [moveSquare(square, direct, 1), moveSquare(square, direct, -1)].forEach((target) => {
    if (isValidSquare(target) && boardState[target] && boardState[target].color !== piece.color) {
      moves.push(target);
    }
  });

  // En passant
  [moveSquare(square, 0, 1), moveSquare(square, 0, -1)].forEach((target) => {
    if (!isValidSquare(target)) {
      return;
    }

    const adjacentPiece = boardState[target];

    if (adjacentPiece
      && adjacentPiece.name === 'pawn'
      && adjacentPiece.color !== piece.color
      && adjacentPiece.enPassant
    ) {
      const enPassantMove = moveSquare(target, direct);

      if (isValidSquare(enPassantMove) && !boardState[enPassantMove]) {
        moves.push(enPassantMove);
      }
    }
  });

  return moves;
};

const knightMoves = (piece, boardState={}) => {
  const { square } = piece;
  const moves = [];
  const potentialMoves = [
    moveSquare(square, 2, 1),  // 上兩格，右一格
    moveSquare(square, 2, -1), // 上兩格，左一格
    moveSquare(square, -2, 1), // 下兩格，右一格
    moveSquare(square, -2, -1),// 下兩格，左一格
    moveSquare(square, 1, 2),  // 上一格，右兩格
    moveSquare(square, 1, -2), // 上一格，左兩格
    moveSquare(square, -1, 2), // 下一格，右兩格
    moveSquare(square, -1, -2) // 下一格，左兩格
  ];

  potentialMoves.forEach((move) => {
    if (isValidSquare(move)) {
      const targetPiece = boardState[move];
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push(move);
      }
    }
  });

  return moves;
};

const generateMoves = (piece, directions, boardState) => {
  const { square } = piece;
  const moves = [];

  directions.forEach(({ rankOffset, fileOffset }) => {
    let move = moveSquare(square, rankOffset, fileOffset);

    while (isValidSquare(move)) {
      const targetPiece = boardState[move];

      if (!targetPiece) {
        moves.push(move);
      } else {
        if (targetPiece.color !== piece.color) {
          moves.push(move);
        }
        break;
      }

      move = moveSquare(move, rankOffset, fileOffset);
    }
  });

  return moves;
};

const DIRECTIONS_STRAIGHT = [
  { rankOffset: 1, fileOffset: 0 },   // 上
  { rankOffset: -1, fileOffset: 0 },  // 下
  { rankOffset: 0, fileOffset: 1 },   // 右
  { rankOffset: 0, fileOffset: -1 },  // 左
];
const DIRECTIONS_DIAGONAL = [
  { rankOffset: 1, fileOffset: 1 },   // 右上
  { rankOffset: 1, fileOffset: -1 },  // 左上
  { rankOffset: -1, fileOffset: 1 },  // 右下
  { rankOffset: -1, fileOffset: -1 }  // 左下
];
const DIRECTIONS_ALL = [
  ...DIRECTIONS_STRAIGHT,
  ...DIRECTIONS_DIAGONAL,
];

const rookMoves = (piece, boardState = {}) => {
  return generateMoves(piece, DIRECTIONS_STRAIGHT, boardState);
};

const bishopMoves = (piece, boardState = {}) => {
  return generateMoves(piece, DIRECTIONS_DIAGONAL, boardState);
};

const queenMoves = (piece, boardState = {}) => {
  return generateMoves(piece, DIRECTIONS_ALL, boardState);
};

const kingMoves = (piece, boardState = {}) => {
  const { square } = piece;
  const moves = [];

  DIRECTIONS_ALL.forEach(({ rankOffset, fileOffset }) => {
    const move = moveSquare(square, rankOffset, fileOffset);

    if (isValidSquare(move)) {
      const targetPiece = boardState[move];

      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push(move);
      }
    }
  });

  return moves;
};

function calculateJumpParabola({x1=0, z1=0, x2=0, z2=0, segments=25}) {
  const points = [];
  const distance = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
  const h = distance / 2;  // 高度與距離成比例
  const deltaX = (x2 - x1);
  const deltaZ = (z2 - z1);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;  // 線性插值參數，從 0 到 1

    // 線性插值 x 和 z
    const x = x1 + t * deltaX;
    const z = z1 + t * deltaZ;

    // 拋物線高度
    const y = 4 * h * t * (1 - t) * 1.5;

    // 保存 (x, y, z) 坐標
    points.push({ x, y, z });
  }

  return points;
}

// 緩動函數 (Ease-In-Out)
function easeInOut(t) {
  return 3 * t ** 2 - 2 * t ** 3;
}

// 計算兩點之間的歐幾里得距離
function calculateDistance(x1, z1, x2, z2) {
  return Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
}

// 計算 (x1, z1) 到 (x2, z2) 的非線性直線移動
function calculateNonlinearMovement({x1=0, z1=0, x2=0, z2=0, segmentFactor=10}) {
  // 計算距離
  const distance = calculateDistance(x1, z1, x2, z2);

  // 根據距離自動計算 segments 數量
  const segments = Math.max(Math.floor(distance * segmentFactor), 1); // 保證至少 1 段

  const points = [];
  const deltaX = (x2 - x1);
  const deltaZ = (z2 - z1);

  for (let i = 0; i <= segments; i++) {
      const t = i / segments;  // 線性插值參數，從 0 到 1
      const easedT = easeInOut(t);  // 應用緩動函數

      // 使用 easedT 進行非線性插值計算 x 和 z
      const x = x1 + easedT * deltaX;
      const z = z1 + easedT * deltaZ;

      // y 保持 0，因為是直線移動
      const y = 0;

      // 保存 (x, y, z) 坐標
      points.push({ x, y, z });
  }

  return points;
}

function isPawnMovingDiagonally(start, end) {
  // Convert start and end positions (e.g., 'b6', 'a7') into column and row indices
  const startCol = start.charCodeAt(0); // 'b' -> 98
  const startRow = parseInt(start[1]);  // '6' -> 6
  const endCol = end.charCodeAt(0);     // 'a' -> 97
  const endRow = parseInt(end[1]);      // '7' -> 7

  // Pawn moves diagonally if the column changes by 1 and the row changes by 1
  const colDifference = Math.abs(startCol - endCol); // Absolute difference in column
  const rowDifference = Math.abs(startRow - endRow); // Absolute difference in row

  return colDifference === 1 && rowDifference === 1;
}

export {
  pawnMoves,
  knightMoves,
  rookMoves,
  bishopMoves,
  queenMoves,
  kingMoves,
  calculateJumpParabola,
  calculateNonlinearMovement,
  isPawnMovingDiagonally,
};
