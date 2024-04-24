const MAX_LENGTH = 128;

export default async function genThumbnail(src) {
  const img = new Image();
  const thumbnailSrc = await new Promise(resolve => {
    img.onload = () => {
      const { width, height } = img;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let w, h;

      if (width >= height) {
        w = MAX_LENGTH;
        h = MAX_LENGTH / width * height;
      } else {
        h = MAX_LENGTH;
        w = MAX_LENGTH / width * height;
      }

      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(img, 0, 0, width, height, 0, 0, w, h);

      resolve(canvas.toDataURL('image/webp', 1));
    };

    img.src = src;
  });

  return {
    src,
    image: img,
    thumbnailSrc,
  };
};
