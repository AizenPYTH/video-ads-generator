import sharp from "sharp";
import { writeFileSync } from "fs";

async function main() {
  const path = "public/brand/snowolf-template.png";
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  console.log("size", w, h);

  const isWhite = (x: number, y: number) => {
    const i = (y * w + x) * c;
    return (
      data[i] > 245 &&
      data[i + 1] > 245 &&
      data[i + 2] > 245 &&
      data[i + 3] > 200
    );
  };

  let best = { x: 0, y: 0, w: 0, h: 0, area: 0 };
  for (let y = Math.floor(h * 0.15); y < Math.floor(h * 0.75); y += 4) {
    for (let x = Math.floor(w * 0.15); x < Math.floor(w * 0.85); x += 4) {
      if (!isWhite(x, y)) continue;
      let x2 = x;
      while (x2 + 4 < w && isWhite(x2 + 4, y)) x2 += 4;
      let y2 = y;
      while (y2 + 4 < h) {
        let ok = true;
        for (let xx = x; xx <= x2; xx += 8) {
          if (!isWhite(xx, y2 + 4)) {
            ok = false;
            break;
          }
        }
        if (!ok) break;
        y2 += 4;
      }
      const area = (x2 - x) * (y2 - y);
      if (area > best.area) best = { x, y, w: x2 - x, h: y2 - y, area };
    }
  }
  console.log(JSON.stringify(best));
  writeFileSync(
    "public/brand/snowolf-zone.json",
    JSON.stringify({ width: w, height: h, zone: best }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
