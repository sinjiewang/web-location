const degreesToRadians = (degrees) => {
  return degrees * (Math.PI / 180);
}

const radiansToDegrees = (radians) => {
  return radians * (180 / Math.PI);
};

const getRotatedDimensions = (angle_in_degrees, width, height) => {
  var angle = angle_in_degrees * Math.PI / 180,
      sin   = Math.sin(angle),
      cos   = Math.cos(angle);
  var x1 = cos * width,
      y1 = sin * width;
  var x2 = -sin * height,
      y2 = cos * height;
  var x3 = cos * width - sin * height,
      y3 = sin * width + cos * height;
  var minX = Math.min(0, x1, x2, x3),
      maxX = Math.max(0, x1, x2, x3),
      minY = Math.min(0, y1, y2, y3),
      maxY = Math.max(0, y1, y2, y3);

  return [ Math.floor((maxX - minX)), Math.floor((maxY - minY)) ];
};

export default function calculateCoords(numCards=0, arcRadius=400, cardWidth=120, cardHeight=167, direction='N', cardSpacing=0.3) {
  // The separation between the cards, in terms of rotation around the circle's origin
  var anglePerCard = radiansToDegrees(Math.atan(((cardWidth * cardSpacing) / arcRadius)));

  var angleOffset = ({ "N": 270, "S": 90, "E": 0, "W": 180 })[direction];

  var startAngle = angleOffset - 0.5 * anglePerCard * (numCards - 1);

  var coords = [];

  if (numCards <= 0) {
    return coords;
  }

  var i;
  var minX = 99999;
  var minY = 99999;
  var maxX = -minX;
  var maxY = -minY;
  for (i = 0; i < numCards; i++) {
    var degrees = startAngle + anglePerCard * i;

    var radians = degreesToRadians(degrees);
    var x = cardWidth / 2 + Math.cos(radians) * arcRadius;
    var y = cardHeight / 2 + Math.sin(radians) * arcRadius;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);

    coords.push({ x: x, y: y, angle: degrees + 90 });
  }

  var rotatedDimensions = getRotatedDimensions(coords[0].angle, cardWidth, cardHeight);

  var offsetX = 0;
  var offsetY = 0;

  if (direction === "N") {
    offsetX = (minX * -1);
    offsetX += ((rotatedDimensions[0] - cardWidth) / 2);

    offsetY = (minY * -1);
  } else if (direction === "S") {
    offsetX = (minX * -1);
    offsetX += ((rotatedDimensions[0] - cardWidth) / 2);

    offsetY = ((minY + (maxY - minY)) * -1);
  } else if (direction === "W") {
    offsetY = (minY * -1);
    offsetY += ((rotatedDimensions[1] - cardHeight) / 2);

    offsetX = (minX * -1);
    offsetX += (cardHeight - Math.rotatePointInBox(0, 0, 270, cardWidth, cardHeight)[1]);
  } else if (direction === "E") {
    offsetY = (minY * -1);
    offsetY += ((rotatedDimensions[1] - cardHeight) / 2);

    offsetX = (arcRadius) * -1;
    offsetX -= (cardHeight - Math.rotatePointInBox(0, 0, 270, cardWidth, cardHeight)[1]);
    //offsetX -= ?????;  // HELP! Needs to line up with yellow line!
  }

  coords.forEach(function (coord) {
    coord.x += offsetX;
    coord.x = Math.round(coord.x);

    coord.y += offsetY;
    coord.y = Math.round(coord.y);

    coord.angle = Math.round(coord.angle);
  });

  // box.width = coords[numCards - 1].x + cardWidth;
  // box.height = coords[numCards - 1].y + cardHeight;

  return coords;
};
