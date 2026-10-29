// Silhouette size (px) inside the 117px-high card preview, per device family
export const TEMPLATE_DEVICE_SHAPE = {
  phone: { w: 30, h: 62, r: 7 },
  tablet: { w: 46, h: 62, r: 6 },
  desktop: { w: 78, h: 50, r: 4 },
  watch: { w: 34, h: 40, r: 10 },
};

export const CANVAS_SIZE_OPTIONS = [
  { value: "Fill", label: "Fill", ratio: null },
  { value: "3:4", label: "3:4", sublabel: "1080×1440", ratio: 3 / 4, w: 1080, h: 1440 },
  { value: "3:2", label: "3:2", sublabel: "1620×1080", ratio: 3 / 2, w: 1620, h: 1080 },
  { value: "16:9", label: "16:9", sublabel: "1920×1080", ratio: 16 / 9, w: 1920, h: 1080 },
  { value: "1:1", label: "1:1", sublabel: "1080×1080", ratio: 1, w: 1080, h: 1080 },
  { value: "4:3", label: "4:3", sublabel: "1440×1080", ratio: 4 / 3, w: 1440, h: 1080 },
  { value: "2:3", label: "2:3", sublabel: "1080×1620", ratio: 2 / 3, w: 1080, h: 1620 }, 
  { value: "9:16", label: "9:16", sublabel: "1080×1920", ratio: 9 / 16, w: 1080, h: 1920 },
];

export const EXPORT_SIZES = [
  { label: "2K", width: 1920 },
  { label: "4K", width: 3840 },
  { label: "8K", width: 7680, warn: true },
];

// bpp = rough bytes per pixel, only used for the size estimate
export const EXPORT_FORMATS = [
  { value: "png", label: "PNG", mime: "image/png", ext: "png", bpp: 1.5 },
  { value: "jpg", label: "JPG", mime: "image/jpeg", ext: "jpg", bpp: 0.25 },
  { value: "webp", label: "WebP", mime: "image/webp", ext: "webp", bpp: 0.15 },
];

export const formatBytes = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(n / 1e6))} MB`);

export const DEVICE_TYPE_OPTIONS = [
  { value: "iPhone 17 Pro Max", label: "iPhone 17 Pro Max" },
  { value: "iPhone 17 Pro", label: "iPhone 17 Pro" },
  { value: "iPhone 17", label: "iPhone 17" },
  { value: "iPhone Air", label: "iPhone Air" },
  { value: "iPhone 16 Pro Max", label: "iPhone 16 Pro Max" },
  { value: "iPhone 16 Pro", label: "iPhone 16 Pro" },
  { value: "iPhone 15 Pro Max", label: "iPhone 15 Pro Max" },
  { value: "iPhone 15 Pro", label: "iPhone 15 Pro" },
  { value: "iPhone 14 Pro Max", label: "iPhone 14 Pro Max" },
  { value: "iPhone 14 Pro", label: "iPhone 14 Pro" },
  { value: "iPhone 14 Plus", label: "iPhone 14 Plus" },
  { value: "iPhone 14", label: "iPhone 14" },
];

export const CATEGORY_DEVICE_OPTIONS = {
  phone: DEVICE_TYPE_OPTIONS,
  tablet: [
    { value: "iPad Air", label: "iPad Air" },
    { value: "iPad mini", label: "iPad mini" },
    { value: "iPad Pro 11-inch", label: "iPad Pro 11\"" },
    { value: "iPad Pro 12.9-inch", label: "iPad Pro 12.9\"" },
  ],
  desktop: [
    { value: 'MacBook Pro 14"', label: 'MacBook Pro 14"' },
    { value: "MacBook Air", label: "MacBook Air" },
    { value: 'MacBook Pro 16"', label: 'MacBook Pro 16"' },
    { value: "Pro Display XDR", label: "Pro Display XDR" },
  ],
  watch: [
    { value: "Apple Watch Ultra", label: "Apple Watch Ultra" },
    { value: "Apple Watch Series 9", label: "Apple Watch Series 9" },
    { value: "Apple Watch Series 7", label: "Apple Watch Series 7" },
  ],
};