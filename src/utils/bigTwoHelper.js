const EMPTY = 'empty';
const SINGLE = 'single';
const PAIR = 'pair';
const FULL_HOUSE = 'full house';
const STRAIGHT = 'straight';
const STRAIGHT_FLUSH = 'straight flush';
const BOMB = 'bomb';

const SUITS = ['C', 'D', 'H', 'S'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
const TYPE_ORDER = [STRAIGHT_FLUSH, BOMB];

function shuffle() {
  const arr = [];

  for (let i=0; i<SUITS.length; i+=1) {
    for (let j=0; j<RANKS.length; j+=1) {
      const card = `${ RANKS[j] }${ SUITS[i] }`;

      arr.push(card);
    }
  }

  const n = arr.length;

  for (let i = n - 1; i > 0; i -= 1) {
    const rand = Math.floor(Math.random() * (i + 1));

    [arr[i], arr[rand]] = [arr[rand], arr[i]];
  }

  return arr;
}

function sortByRank(cards=[]) {
  return Object.entries(cards.reduce((acc, curr) => ({
    ...acc,
    [curr[0]]: acc[curr[0]] ? [...acc[curr[0]], curr] : [curr],
  }), {}))
  .sort(([rankA], [rankB]) => RANKS.findIndex(rank => rank === rankA) - RANKS.findIndex(rank => rank === rankB))
  .map(([_, arr]) => arr.sort((a, b) => SUITS.findIndex(suit => suit === a[1]) - SUITS.findIndex(suit => suit === b[1])))
  .flat()
};

function sortBySuit(cards=[]) {
  return Object.entries(cards.reduce((acc, curr) => ({
    ...acc,
    [curr[1]]: acc[curr[1]] ? [...acc[curr[1]], curr] : [curr],
  }), {}))
  .sort(([suitA], [suitB]) => SUITS.findIndex(suit => suit === suitA) - SUITS.findIndex(suit => suit === suitB))
  .map(([_, arr]) => arr.sort((a, b) => RANKS.findIndex(rank => rank === a[0]) - RANKS.findIndex(rank => rank === b[0])))
  .flat()
};

function isFlush(cards=[]) {
  return cards.length === 5
    && cards.every((card, i) => i === 0 || card[1] === cards[i - 1][1]);
}

function analyzeIsSingle(cards=[]) {
  if (cards.length === 1) {
    const card = cards[0];
    const maxRank = RANKS.findIndex((r) => r === card[0]);
    const maxSuit = SUITS.findIndex((s) => s === card[1]);

    return {
      type: SINGLE,
      maxRank,
      maxSuit,
    };
  }
}

function analyzeIsPair(cards=[]) {
  if (cards.length === 2
    && cards[0][0] === cards[1][0]
    && cards[0][1] !== cards[1][1]
  ) {
    const sorted = sortByRank(cards);
    const card = sorted[1];
    const maxRank = RANKS.findIndex((r) => r === card[0]);
    const maxSuit = SUITS.findIndex((s) => s === card[1]);

    return {
      type: PAIR,
      maxRank,
      maxSuit,
    };
  }
}

function analyzeIsBombORFullHouse(cards=[]) {
  if (cards.length !== 5) return;

  const groups = Object.values(cards.reduce((acc, curr) => ({
    ...acc,
    [curr[0]]: acc[curr[0]] ? [...acc[curr[0]], curr] : [curr],
  }), {}));

  if (groups.length !== 2) return;  // 3+2 or 4+1

  let type = FULL_HOUSE;
  let card;

  const fourOfKind = groups.find((entry) => entry.length === 4);

  if (fourOfKind) {
    type = BOMB;
    card = fourOfKind.sort((a, b) => SUITS.findIndex(suit => suit === a[1]) - SUITS.findIndex(suit => suit === b[1])).pop();
  } else {
    const trips = groups.find((entry) => entry.length === 3);
    card = trips.sort((a, b) => SUITS.findIndex(suit => suit === a[1]) - SUITS.findIndex(suit => suit === b[1])).pop();
  }

  const maxRank = RANKS.findIndex((r) => r === card[0]);
  const maxSuit = SUITS.findIndex((s) => s === card[1]);

  return { type, maxRank, maxSuit };
}

function analyzeIsStraight(cards=[]) {
  const type = isFlush(cards) ? STRAIGHT_FLUSH : STRAIGHT;

  if (cards.length !== 5) return;

  let codes = cards.map((card) => RANKS.findIndex((rank) => rank === card[0])).sort((a, b) => a - b);

  const isContain2And3 = codes.includes(0) && codes.includes(12);

  if (isContain2And3) {
    codes = codes.map((code) => (code > 3) ? code - 13 : code).sort((a, b) => a - b);
  }

  const isConsecutive = codes.every((num, i) => i === 0 || num === codes[i - 1] + 1);
  const isJ2 = codes[0] === 8 && codes[4] === 12;

  if (!isConsecutive || isJ2) return;

  if (isContain2And3) {
    if (codes[0] === -2) {  // A5
      const card = cards.find((card) => card[0] === '5');
      const maxRank = RANKS.findIndex((r) => r === card[0]);
      const maxSuit = SUITS.findIndex((s) => s === card[1]);

      return { type, maxRank, maxSuit };
    } else if (codes[0] === -1) { //26
      const card = cards.find((card) => card[0] === '2');
      const maxRank = RANKS.findIndex((r) => r === card[0]);
      const maxSuit = SUITS.findIndex((s) => s === card[1]);

      return { type, maxRank, maxSuit };
    }
    // Q3 && K4 return
  } else { // others
    const card = sortByRank(cards).pop();
    const maxRank = RANKS.findIndex((r) => r === card[0]);
    const maxSuit = SUITS.findIndex((s) => s === card[1]);

    return { type, maxRank, maxSuit };
  }
}

function analyze(cards=[]) {
  if (!cards || cards.length === 0) {
    return { type: EMPTY, maxRank: null, maxSuit: null };
  }

  return [analyzeIsSingle, analyzeIsPair, analyzeIsStraight, analyzeIsBombORFullHouse]
    .reduce((acc, fn) => acc ? acc : fn(cards), undefined);
}

function compare(compared=[], comparator=[]) {
  if (!comparator || !comparator.length) return false;

  const comparatorInfo = analyze(comparator);

  if (!comparatorInfo) return false;
  if (!compared || !compared.length) return true;

  const comparedInfo = analyze(compared);

  const comparedTypeIndex = TYPE_ORDER.findIndex((type) => comparedInfo.type === type);
  const comparatorTypeIndex = TYPE_ORDER.findIndex((type) => comparatorInfo.type === type);

  if (comparedTypeIndex === -1 && comparatorTypeIndex === -1) {
    return comparedInfo.type === comparatorInfo.type
      && (comparedInfo.maxRank < comparatorInfo.maxRank
          || (comparedInfo.maxRank === comparatorInfo.maxRank && comparedInfo.maxSuit < comparatorInfo.maxSuit));
  } else if (comparedInfo.type === comparatorInfo.type) {
    return comparedInfo.maxRank < comparatorInfo.maxRank
      || (comparedInfo.maxRank === comparatorInfo.maxRank && comparedInfo.maxSuit < comparatorInfo.maxSuit);
  }

  return comparedTypeIndex < comparatorTypeIndex;
}

function score(cards=[]) {
  if (!cards || !cards.length) return 0;

  const { length } = cards;
  let score = length;

  if (length >= 11) {
    score *= 4;
  } else if (length >= 8) {
    score *= 2;
  }

  cards
    .filter(card => card[0] === RANKS[12])
    .forEach(() => score *= 2);

  return score * -1;
}

function findPairs(cards) {
  // Create a dictionary to count the occurrences of each rank
  const rankCount = {};

  // Count each rank in the cards array
  cards.forEach(card => {
    const rank = card[0]; // Get the rank of the card
    if (rankCount[rank]) {
      rankCount[rank].push(card);
    } else {
      rankCount[rank] = [card];
    }
  });

  Object.keys(rankCount).forEach((rank) => rankCount[rank] = sortBySuit(rankCount[rank]))

  // Find all pairs (two cards of the same rank)
  const pairs = [];
  for (const rank in rankCount) {
    const cardsWithSameRank = rankCount[rank];
    if (cardsWithSameRank.length >= 2) {
      // Pair the cards without permutation
      for (let i = 0; i < Math.floor(cardsWithSameRank.length / 2); i++) {
        pairs.push([cardsWithSameRank[2 * i], cardsWithSameRank[2 * i + 1]]);
      }
    }
  }

  return pairs;
}

function findStraights(cards) {
  const straightRANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  // Create a dictionary to store the cards by rank
  const rankGroups = {};

  cards.forEach(card => {
    const rank = card[0]; // Get the rank of the card

    if (!rankGroups[rank]) {
      rankGroups[rank] = [];
    }
    rankGroups[rank].push(card);
  });

  Object.keys(rankGroups).forEach((rank) => rankGroups[rank] = sortBySuit(rankGroups[rank]));

  const straights = [];

  // Check for possible straights
  for (let i = 0; i <= straightRANKS.length - 5; i++) {
    const straight = [];
    const isContinued = Array.from({length: 5})
      .every((_, index) => rankGroups[straightRANKS[i + index]] && rankGroups[straightRANKS[i + index]].length > 0);

    if (!isContinued) continue;

    for (let j = i; j < i + 5; j++) {
      const rank = straightRANKS[j];

      straight.push(rankGroups[rank].shift()); // Take one card of this rank
    }
    straights.push(straight);
  }

  // Check for A-5 straight
  const aceStraight = ['A', '2', '3', '4', '5'];
  const a5Straight = [];
  if (rankGroups['A'] && rankGroups['2'] && rankGroups['3'] && rankGroups['4'] && rankGroups['5']) {
    aceStraight.forEach(rank => {
      if (rankGroups[rank].length > 0) {
        a5Straight.push(rankGroups[rank].shift());
      }
    });
    if (a5Straight.length === 5) {
      straights.push(a5Straight);
    }
  }

  return straights;
}

function findStraightFlushes(cards) {
  const straightRANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  // Create a dictionary to store the cards by rank and suit
  const rankGroups = {};

  cards.forEach(card => {
    const [ rank, suit ] = card;

    if (!rankGroups[suit]) {
      rankGroups[suit] = {};
    }
    if (!rankGroups[suit][rank]) {
      rankGroups[suit][rank] = [];
    }
    rankGroups[suit][rank].push(card);
  });

  const straightFlushes = [];

  // Check for possible straight flushes
  Object.keys(rankGroups).forEach(suit => {
    const suitGroup = rankGroups[suit];

    for (let i = 0; i <= straightRANKS.length - 5; i++) {
      const straightFlush = [];
      const isStraightFlush = Array.from({length: 5})
        .every((_, index) => suitGroup[straightRANKS[i + index]] && suitGroup[straightRANKS[i + index]].length > 0);

      if (!isStraightFlush) continue;

      for (let j = i; j < i + 5; j++) {
        straightFlush.push(suitGroup[straightRANKS[j]].shift());
      }
      straightFlushes.push(straightFlush);
    }

    // Check for A-5 straight flush
    const a5Ranks = ['A', '2', '3', '4', '5'];
    const a5StraightFlush = [];
    const isA5StraightFlush = Array.from({length: 5})
      .every((_, index) => suitGroup[a5Ranks[index]] && suitGroup[a5Ranks[index]].length > 0);

    if (isA5StraightFlush) {
      for (let rank of a5Ranks) {
        a5StraightFlush.push(suitGroup[rank].shift());
      }

      straightFlushes.push(a5StraightFlush);
    }
  });

  return straightFlushes;
}

function findFullHouses(cards) {
  // Create a dictionary to store the cards by rank
  const rankGroups = {};

  cards.forEach(card => {
      const rank = card[0]; // Get the rank of the card

      if (!rankGroups[rank]) {
          rankGroups[rank] = [];
      }
      rankGroups[rank].push(card);
  });

  const fullHouses = [];

  // Find all possible full houses
  const ranks = Object.keys(rankGroups);
  for (let i = 0; i < ranks.length; i++) {
      const threeOfAKindRank = ranks[i];
      if (rankGroups[threeOfAKindRank].length === 3) {
          const threeOfAKind = rankGroups[threeOfAKindRank].slice(0, 3);
          const pairRank = ranks.filter((rank, j) => i !== j && rankGroups[rank].length === 2)
              .map((rank) => rankGroups[rank])
              .shift();

          if (pairRank) {
              const pair = findPairs(pairRank).flat();

              fullHouses.push([...threeOfAKind, ...pair]);
          }
      }
  }

  return fullHouses;
}

export {
  sortByRank,
  sortBySuit,
  shuffle,
  compare,
  analyze,
  score,
  findPairs,
  findStraights,
  findStraightFlushes,
  findFullHouses,
  SUITS,
  RANKS,
  EMPTY,
  SINGLE,
  PAIR,
  FULL_HOUSE,
  STRAIGHT,
  STRAIGHT_FLUSH,
  BOMB,
};
