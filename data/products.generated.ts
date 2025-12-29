/* AUTO-GENERATED FILE — DO NOT EDIT BY HAND
   Source: data/products.csv
   Generated: 2025-12-29T20:20:56.724Z
*/
export type Product = {
  sku: string;
  id: string;
  title: string;
  category: string;
  priceARS: number;
  currency: "ARS";
  stock: 0 | 1;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  weightG: number | null;
  shippingClass: string;
  finish: string;
  foodSafe: boolean | null;
  microwaveSafe: boolean | null;
  dishwasherSafe: boolean | null;
  description: string;
  care: string;
  tags: string[];
  photos: string[];
};

export const PRODUCTS: Product[] = [
  {
    "sku": "AK-0001",
    "id": "ak-0001",
    "title": "Taza Nube",
    "category": "Tazas",
    "priceARS": 18500,
    "currency": "ARS",
    "stock": 1,
    "heightCm": 9,
    "widthCm": 8,
    "depthCm": 8,
    "weightG": 350,
    "shippingClass": "small",
    "finish": "satinado",
    "foodSafe": true,
    "microwaveSafe": true,
    "dishwasherSafe": true,
    "description": "Pieza única esmaltada. Apta para uso diario. Hecha a mano en Córdoba, Argentina.",
    "care": "Apta microondas y lavavajillas (lavado suave recomendado).",
    "tags": [
      "Taza",
      "Esmaltado",
      "Pieza única"
    ],
    "photos": [
      "/products/IMG_1.jpg",
      "/products/IMG_1.jpg"
    ]
  },
  {
    "sku": "AK-0002",
    "id": "ak-0002",
    "title": "Bowl Arena",
    "category": "Bowls",
    "priceARS": 24000,
    "currency": "ARS",
    "stock": 0,
    "heightCm": 6,
    "widthCm": 14,
    "depthCm": 14,
    "weightG": 420,
    "shippingClass": "medium",
    "finish": "mate",
    "foodSafe": true,
    "microwaveSafe": true,
    "dishwasherSafe": false,
    "description": "Bowl de cerámica gres con textura sutil. Ideal para desayuno o snacks.",
    "care": "Apto microondas. Lavado suave recomendado.",
    "tags": [
      "Bowl",
      "Gres",
      "Pieza única"
    ],
    "photos": [
      "/products/IMG_1.jpg"
    ]
  }
];
