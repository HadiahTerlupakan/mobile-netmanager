import fs from "fs";
import path from "path";

// Shims di `shims/` menggantikan paket rentan lewat `overrides` package.json.
// Tes ini menjaga dua hal: perbaikan keamanannya tetap berlaku, dan bentuk
// pemanggilan lama yang dipakai Metro, query-string, serta @expo/config tetap jalan.

const ROOT = path.resolve(__dirname, "../..");
const ICON_PATH = path.join(ROOT, "assets/images/notification-icon.png");
const ICON_SIZE_PX = 432;
const MALFORMED_RUN_COUNT = 20000;
const DECODE_BUDGET_MS = 1000;

describe("shim image-size (dipakai Metro)", () => {
  const getImageSize = require("image-size");

  it("menerima path file seperti image-size 1.x yang dipanggil Metro", () => {
    expect(getImageSize(ICON_PATH)).toMatchObject({
      width: ICON_SIZE_PX,
      height: ICON_SIZE_PX,
      type: "png",
    });
  });

  it("menerima buffer", () => {
    expect(getImageSize(fs.readFileSync(ICON_PATH)).width).toBe(ICON_SIZE_PX);
  });

  it("didukung image-size versi yang sudah ditambal (>= 2.0.3)", () => {
    const manifestPath = path.join(ROOT, "node_modules/image-size-fixed/package.json");
    const { version } = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const [major, minor, patch] = version.split(".").map(Number);
    expect(major * 10000 + minor * 100 + patch).toBeGreaterThanOrEqual(20003);
  });
});

describe("shim decode-uri-component (dipakai query-string/expo-router)", () => {
  const decodeUriComponent = require("decode-uri-component");

  it("bisa di-require sebagai fungsi CommonJS", () => {
    expect(typeof decodeUriComponent).toBe("function");
    expect(decodeUriComponent("%E2%82%AC %zz")).toBe("€ %zz");
  });

  it("tidak kuadratik pada banyak run percent-encoded yang rusak (GHSA-qr28-fpjm-wq7f)", () => {
    let input = "";
    for (let i = 0; i < MALFORMED_RUN_COUNT; i++) {
      input += `%${(0xc0 + (i % 32)).toString(16)}%${(0x80 + ((i >> 5) % 64)).toString(16)}x`;
    }
    input += "%zz";

    const startedAt = Date.now();
    decodeUriComponent(input);
    expect(Date.now() - startedAt).toBeLessThan(DECODE_BUDGET_MS);
  });
});

describe("shim deepmerge (dipakai @expo/config dan jest-config)", () => {
  const deepmerge = require("deepmerge");
  const poisoned = () =>
    JSON.parse('{"__proto__":{"polluted":"yes"},"nested":{"a":1}}');

  it("target hasil JSON.parse tidak meracuni prototipe hasil (GHSA-gcqx-w48m-w2h4)", () => {
    const merged = deepmerge(poisoned(), { nested: { b: 2 } });
    expect(merged.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect(merged.nested).toEqual({ a: 1, b: 2 });
  });

  it("source hasil JSON.parse juga tidak meracuni", () => {
    expect(deepmerge({}, poisoned()).polluted).toBeUndefined();
  });

  it("perilaku merge biasa dan deepmerge.all tetap sama", () => {
    expect(deepmerge.all([{ list: [1] }, { list: [2] }, { flag: true }])).toEqual({
      list: [1, 2],
      flag: true,
    });
  });
});
