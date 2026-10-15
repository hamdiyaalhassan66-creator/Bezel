import { getStrapStyles } from "../MockupScene.jsx";

const CUSTOM_FINISH = { value: "Custom", label: "Custom", hex: null };

const TITANIUM_FINISHES = [
  { value: "Desert titanium", label: "Desert titanium", hex: "BFA18A", roughness: 0.12, metalness: 1 },
  { value: "Natural titanium", label: "Natural titanium", hex: "B8B0A3", roughness: 0.1, metalness: 1 },
  { value: "White titanium", label: "White titanium", hex: "E4E2DD", roughness: 0.35, metalness: 0.7 },
  { value: "Black titanium", label: "Black titanium", hex: "454545", roughness: 0.45, metalness: 0.6 },
];

// iPhone 15 Pro / 15 Pro Max's real launch palette — hexes from research
// (Natural/Blue/White/Black Titanium). Brushed-titanium frame: moderate
// roughness so it doesn't read as polished chrome like the generic set above.
const IPHONE_15_PRO_FINISHES = [
  { value: "Natural titanium", label: "Natural titanium", hex: "B8B0A3", roughness: 0.3, metalness: 0.9 },
  { value: "Blue titanium", label: "Blue titanium", hex: "5D6B7D", roughness: 0.3, metalness: 0.9 },
  { value: "White titanium", label: "White titanium", hex: "E3E2DE", roughness: 0.32, metalness: 0.75 },
  { value: "Black titanium", label: "Black titanium", hex: "454545", roughness: 0.32, metalness: 0.85 },
];
const ALUMINUM_FINISHES_17 = [
  { value: "Black", label: "Black", hex: "252525", roughness: 0.1, metalness: 0.9 },
  { value: "White", label: "White", hex: "F2F1ED", roughness: 0.1, metalness: 0.9 },
  { value: "Sage", label: "Sage", hex: "B5C5A8", roughness: 0.1, metalness: 0.9 },
  { value: "Lavender", label: "Lavender", hex: "D5C8E9", roughness: 0.1, metalness: 0.9 },
  { value: "Mist blue", label: "Mist blue", hex: "B9D6E8", roughness: 0.1, metalness: 0.9 },
];

// Back-glass (frosted matte) hexes from research; frame/plateau/ring colors live in
// DEVICE_FINISH_PART_COLORS in MockupScene.jsx, keyed by these same value strings.
const IPHONE_16_PLUS_FINISHES = [
  { value: "Ultramarine", label: "Ultramarine", hex: "5265C8", roughness: 0.42, metalness: 0.9 },
  { value: "Teal", label: "Teal", hex: "A3C9BE", roughness: 0.42, metalness: 0.9 },
  { value: "Pink", label: "Pink", hex: "E98DAF", roughness: 0.42, metalness: 0.9 },
  { value: "Black", label: "Black", hex: "222222", roughness: 0.42, metalness: 0.9 },
  { value: "White", label: "White", hex: "F2F0EB", roughness: 0.42, metalness: 0.9 },
];

const IPHONE_AIR_FINISHES = [
  { value: "Space black", label: "Space black", hex: "343434", roughness: 0.1, metalness: 0.9 },
  { value: "Cloud white", label: "Cloud white", hex: "EAE9E5", roughness: 0.1, metalness: 0.9 },
  { value: "Light gold", label: "Light gold", hex: "E4D5B9", roughness: 0.1, metalness: 0.9 },
  { value: "Sky blue", label: "Sky blue", hex: "C4D8E8", roughness: 0.1, metalness: 0.9 },
];

// Kept as-is — this set is actually shared with the iPhone 14 series
// (DEVICE_FINISHES below), whose swatches weren't part of this research pass.
const ALUMINUM_FINISHES_13 = [
  { value: "Midnight", label: "Midnight", hex: "242424", roughness: 0.1, metalness: 0.9 },
  { value: "Starlight", label: "Starlight", hex: "F1EFE8", roughness: 0.1, metalness: 0.9 },
  { value: "Blue", label: "Blue", hex: "A9C5E4", roughness: 0.1, metalness: 0.9 },
  { value: "Purple", label: "Purple", hex: "C9B8E7", roughness: 0.1, metalness: 0.9 },
  { value: "Yellow", label: "Yellow", hex: "F3E5A7", roughness: 0.1, metalness: 0.9 },
  { value: "Product Red", label: "(PRODUCT)RED", hex: "A91E32", roughness: 0.1, metalness: 0.9 },
];

// Hexes from research: Space Black is a deep matte charcoal with anti-fingerprint
// anodization, Silver is classic metallic aluminum. Both are satin anodized,
// so roughness sits well above the glossy phone-frame values.
const MACBOOK_PRO_FINISHES = [
  { value: "Space black", label: "Space black", hex: "2E3033", roughness: 0.45, metalness: 0.9 },
  { value: "Silver", label: "Silver", hex: "E3E4E5", roughness: 0.45, metalness: 0.9 },
];

const MACBOOK_AIR_FINISHES = [
  { value: "Midnight", label: "Midnight", hex: "2C343E", roughness: 0.45, metalness: 0.9 },
  { value: "Starlight", label: "Starlight", hex: "E6DFD5", roughness: 0.45, metalness: 0.9 },
  { value: "Space gray", label: "Space gray", hex: "7D7E80", roughness: 0.45, metalness: 0.9 },
  { value: "Silver", label: "Silver", hex: "E3E4E5", roughness: 0.45, metalness: 0.9 },
];

const IPAD_AIR_FINISHES = [
  { value: "Space Gray", label: "Space Gray", hex: "68696E", roughness: 0.45, metalness: 0.9 },
  { value: "Starlight", label: "Starlight", hex: "E6DFD5", roughness: 0.45, metalness: 0.9 },
  { value: "Purple", label: "Purple", hex: "D1CCE0", roughness: 0.45, metalness: 0.9 },
  { value: "Blue", label: "Blue", hex: "C2D0D6", roughness: 0.45, metalness: 0.9 },
];

// iPad mini 6 launch palette. Hexes are approximations; tune by eye.
const IPAD_MINI_FINISHES = [
  { value: "Space Gray", label: "Space Gray", hex: "68696E", roughness: 0.45, metalness: 0.9 },
  { value: "Pink", label: "Pink", hex: "EBCDCB", roughness: 0.45, metalness: 0.9 },
  { value: "Purple", label: "Purple", hex: "C3BCD8", roughness: 0.45, metalness: 0.9 },
  { value: "Starlight", label: "Starlight", hex: "E6DFD5", roughness: 0.45, metalness: 0.9 },
];

// iPad Pro only ships in two finishes — no glass back, bare anodized aluminum unibody.
const IPAD_PRO_FINISHES = [
  { value: "Space Gray", label: "Space Gray", hex: "68696E", roughness: 0.45, metalness: 0.9 },
  { value: "Silver", label: "Silver", hex: "E3E4E5", roughness: 0.45, metalness: 0.9 },
];

const IPHONE_17_PRO_FINISHES = [
  { value: "Silver", label: "Silver", hex: "D9D9D6", roughness: 0.35, metalness: 0.8 },
  { value: "Cosmic Orange", label: "Cosmic Orange", hex: "D98245", roughness: 0.35, metalness: 0.78 },
  { value: "Deep Blue", label: "Deep Blue", hex: "344B70", roughness: 0.35, metalness: 0.78 },
];

// Extracted so "Pro" and "Pro Max" of the same generation can share a finish set
const IPHONE_14_PRO_FINISHES = [
  { value: "Space Black", label: "Space Black", hex: "3A3A3C", roughness: 0.15, metalness: 1 },
  { value: "Silver", label: "Silver", hex: "E3E3E1", roughness: 0.15, metalness: 1 },
  { value: "Gold", label: "Gold", hex: "E3D3B8", roughness: 0.15, metalness: 1 },
  { value: "Deep Purple", label: "Deep Purple", hex: "51415E", roughness: 0.15, metalness: 1 },
];

const getStrapStyleOptions = (device) => Object.entries(getStrapStyles(device)).map(([value, { label }]) => ({ value, label }));

const STRAP_ORIGINAL = { value: "original", label: "Original", hex: null };

const WATCH_STRAPS = [
  STRAP_ORIGINAL,
  { value: "sport-black", label: "Sport band · Black", pattern: "solid", hex: "1C1C1E", roughness: 0.4, metalness: 0 },
  { value: "sport-blue", label: "Sport band · Blue", pattern: "solid", hex: "2F5D8C", roughness: 0.4, metalness: 0 },
  { value: "sport-pink", label: "Sport band · Pink", pattern: "solid", hex: "E8B7B8", roughness: 0.4, metalness: 0 },
  { value: "sport-red", label: "Sport band · Red", pattern: "solid", hex: "C8102E", roughness: 0.4, metalness: 0 },
  { value: "ocean-orange", label: "Ocean band · Orange", pattern: "rib", hex: "F26B1D", roughness: 0.35, metalness: 0 },
  { value: "ocean-navy", label: "Ocean band · Navy", pattern: "rib", hex: "1F2A44", roughness: 0.35, metalness: 0 },
  { value: "vent-black", label: "Vented sport · Black", pattern: "dots", hex: "202022", roughness: 0.45, metalness: 0 },
  { value: "nylon-gray", label: "Nylon weave · Gray", pattern: "weave", hex: "8A8D91", roughness: 0.85, metalness: 0 },
  { value: "nylon-green", label: "Nylon weave · Green", pattern: "weave", hex: "465A4F", roughness: 0.85, metalness: 0 },
  { value: "canvas-tan", label: "Canvas · Tan", pattern: "canvas", hex: "B08A55", roughness: 0.9, metalness: 0 },
  { value: "canvas-olive", label: "Canvas · Olive", pattern: "canvas", hex: "5B6446", roughness: 0.9, metalness: 0 },
  { value: "perlon-black", label: "Perlon · Black", pattern: "braid", hex: "202022", roughness: 0.8, metalness: 0 },
  { value: "perlon-gray", label: "Perlon · Gray", pattern: "braid", hex: "8A8D91", roughness: 0.8, metalness: 0 },
  { value: "stripe-blue", label: "Nylon stripe · Blue/White", pattern: "stripes", hex: "2F5D8C", hex2: "F2F2F2", roughness: 0.85, metalness: 0 },
  { value: "stripe-red", label: "Nylon stripe · Red/Cream", pattern: "stripes", hex: "C8102E", hex2: "F3E9D2", roughness: 0.85, metalness: 0 },
  { value: "leather-brown", label: "Leather · Saddle brown", pattern: "leather", hex: "7A4A2B", hex2: "E9D7B5", roughness: 0.6, metalness: 0 },
  { value: "leather-black", label: "Leather · Black", pattern: "leather", hex: "1A1A1A", hex2: "8C8C8C", roughness: 0.55, metalness: 0 },
  { value: "milanese-silver", label: "Milanese · Silver", pattern: "mesh", hex: "C8C8C8", roughness: 0.3, metalness: 1, metal: true },
  { value: "milanese-graphite", label: "Milanese · Graphite", pattern: "mesh", hex: "4A4A4D", roughness: 0.3, metalness: 1, metal: true },
  { value: "milanese-gold", label: "Milanese · Gold", pattern: "mesh", hex: "D4AF6A", roughness: 0.3, metalness: 1, metal: true },
];

const APPLE_WATCH_ULTRA_FINISHES = [
  { value: "Natural titanium", label: "Natural titanium", hex: "A6A6A1", roughness: 0.42, metalness: 1 },
  { value: "Black titanium", label: "Black titanium", hex: "252525", roughness: 0.42, metalness: 1 },
];

const APPLE_WATCH_SERIES_9_FINISHES = [
  { value: "Pink", label: "Pink", hex: "E8B7B8", roughness: 0.4, metalness: 0.9 },
  { value: "Starlight", label: "Starlight", hex: "D8D3C8", roughness: 0.4, metalness: 0.9 },
  { value: "Midnight", label: "Midnight", hex: "202124", roughness: 0.4, metalness: 0.9 },
  { value: "Silver", label: "Silver", hex: "D9D9D9", roughness: 0.4, metalness: 0.9 },
  { value: "Product Red", label: "(PRODUCT)RED", hex: "C8102E", roughness: 0.4, metalness: 0.9 },
  { value: "Silver SS", label: "Silver stainless steel", hex: "C7C7C7", roughness: 0.18, metalness: 1 },
  { value: "Graphite SS", label: "Graphite stainless steel", hex: "454545", roughness: 0.18, metalness: 1 },
  { value: "Gold SS", label: "Gold stainless steel", hex: "D4AF6A", roughness: 0.18, metalness: 1 },
];

const APPLE_WATCH_SERIES_7_FINISHES = [
  { value: "Midnight", label: "Midnight", hex: "1D1D1F", roughness: 0.4, metalness: 0.9 },
  { value: "Starlight", label: "Starlight", hex: "D6D1C4", roughness: 0.4, metalness: 0.9 },
  { value: "Green", label: "Green", hex: "465A4F", roughness: 0.4, metalness: 0.9 },
  { value: "Blue", label: "Blue", hex: "3D5C78", roughness: 0.4, metalness: 0.9 },
  { value: "Product Red", label: "(PRODUCT)RED", hex: "C8102E", roughness: 0.4, metalness: 0.9 },
  { value: "Silver SS", label: "Silver stainless steel", hex: "C8C8C8", roughness: 0.18, metalness: 1 },
  { value: "Graphite SS", label: "Graphite stainless steel", hex: "414141", roughness: 0.18, metalness: 1 },
  { value: "Gold SS", label: "Gold stainless steel", hex: "D4AF6A", roughness: 0.18, metalness: 1 },
];

const DEVICE_FINISHES = {
  "Apple Watch Ultra": [...APPLE_WATCH_ULTRA_FINISHES, CUSTOM_FINISH],
  "Apple Watch Series 9": [...APPLE_WATCH_SERIES_9_FINISHES, CUSTOM_FINISH],
  "Apple Watch Series 7": [...APPLE_WATCH_SERIES_7_FINISHES, CUSTOM_FINISH],
  "iPhone 17 Pro Max": [...IPHONE_17_PRO_FINISHES, CUSTOM_FINISH],
  "iPhone 17 Pro": [...IPHONE_17_PRO_FINISHES, CUSTOM_FINISH],
  "iPhone 17": [...ALUMINUM_FINISHES_17, CUSTOM_FINISH],
  "iPhone Air": [...IPHONE_AIR_FINISHES, CUSTOM_FINISH],
  "iPhone 16 Pro Max": [...TITANIUM_FINISHES, CUSTOM_FINISH],
  "iPhone 16 Pro": [...TITANIUM_FINISHES, CUSTOM_FINISH],
  "iPhone 15 Pro Max": [...IPHONE_15_PRO_FINISHES, CUSTOM_FINISH],
  "iPhone 15 Pro": [...IPHONE_15_PRO_FINISHES, CUSTOM_FINISH],
  "iPhone 14 Pro Max": [...IPHONE_14_PRO_FINISHES, CUSTOM_FINISH],
  "iPhone 14 Pro": [...IPHONE_14_PRO_FINISHES, CUSTOM_FINISH],
  "iPhone 14 Plus": [...ALUMINUM_FINISHES_13, CUSTOM_FINISH],
  "iPhone 14": [...ALUMINUM_FINISHES_13, CUSTOM_FINISH],
  'MacBook Pro 16"': [...MACBOOK_PRO_FINISHES, CUSTOM_FINISH],
  'MacBook Pro 14"': [...MACBOOK_PRO_FINISHES, CUSTOM_FINISH],
  "MacBook Air": [...MACBOOK_AIR_FINISHES, CUSTOM_FINISH],
  "Pro Display XDR": [{ value: "Silver", label: "Silver", hex: "E3E4E5", roughness: 0.45, metalness: 0.9 }, CUSTOM_FINISH],
  "iPad Air": [...IPAD_AIR_FINISHES, CUSTOM_FINISH],
  "iPad mini": [...IPAD_MINI_FINISHES, CUSTOM_FINISH],
  "iPad Pro 11-inch": [...IPAD_PRO_FINISHES, CUSTOM_FINISH],
  "iPad Pro 12.9-inch": [...IPAD_PRO_FINISHES, CUSTOM_FINISH],
};

const DEFAULT_FINISHES = [...TITANIUM_FINISHES, CUSTOM_FINISH];

function getFinishesForDevice(deviceType) {
  return DEVICE_FINISHES[deviceType] || DEFAULT_FINISHES;
}

export {
  CUSTOM_FINISH,
  WATCH_STRAPS,
  DEVICE_FINISHES,
  DEFAULT_FINISHES,
  getStrapStyleOptions,
  getFinishesForDevice,
};