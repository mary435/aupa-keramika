import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { z } from "zod";

const root = process.cwd();

const CSV_PATH = path.join(root, "data", "products.csv");
const OUT_PATH = path.join(root, "data", "products.generated.ts");
const IMG_DIR = path.join(root, "public", "products");

// Helpers
const fail = (msg) => {
  console.error(`\n[products] ERROR: ${msg}\n`);
  process.exit(1);
};

const warn = (msg) => {
  console.warn(`[products] WARN: ${msg}`);
};

const isNonEmpty = (s) => typeof s === "string" && s.trim().length > 0;

const splitPipe = (s) =>
  String(s ?? "")
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);

const toInt = (v, fieldName) => {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) fail(`Campo '${fieldName}' inválido: '${raw}'`);
  return n;
};

const toBool = (v, fieldName) => {
  const raw = String(v ?? "").trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "") return null;
  fail(`Campo '${fieldName}' inválido (usar true/false): '${v}'`);
};

// 1) Validaciones de existencia de archivos base
if (!fs.existsSync(CSV_PATH)) fail(`No existe ${path.relative(root, CSV_PATH)}`);
if (!fs.existsSync(IMG_DIR)) fail(`No existe ${path.relative(root, IMG_DIR)} (creá la carpeta)`);

// 2) Leer CSV
const csv = fs.readFileSync(CSV_PATH, "utf8");
const parsed = Papa.parse(csv, {
  header: true,
  skipEmptyLines: true,
});

if (parsed.errors?.length) {
  console.error(parsed.errors);
  fail("Errores parseando CSV (ver arriba).");
}

const rows = parsed.data;

// 3) Schema esperado (campos requeridos)
const RowSchema = z.object({
  sku: z.string().min(1),
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  price_ars: z.string().min(1),
  stock: z.string().min(1),
  height_cm: z.string().optional().default(""),
  width_cm: z.string().optional().default(""),
  depth_cm: z.string().optional().default(""),
  weight_g: z.string().optional().default(""),
  shipping_class: z.string().min(1),
  finish: z.string().optional().default(""),
  food_safe: z.string().optional().default(""),
  microwave_safe: z.string().optional().default(""),
  dishwasher_safe: z.string().optional().default(""),
  description: z.string().min(1),
  care: z.string().min(1),
  tags: z.string().optional().default(""),
  photos: z.string().min(1),
});

// 4) Transformación + validación de reglas de negocio
const products = [];
const seenSku = new Set();
const seenId = new Set();

for (let idx = 0; idx < rows.length; idx++) {
  const rowNum = idx + 2; // por el header
  const raw = rows[idx];

  const parsedRow = RowSchema.safeParse(raw);
  if (!parsedRow.success) {
    console.error(parsedRow.error.issues);
    fail(`Fila ${rowNum}: faltan campos o hay campos vacíos requeridos.`);
  }

  const r = parsedRow.data;

  // Normalizar
  const sku = r.sku.trim();
  const id = r.id.trim();
  const title = r.title.trim();
  const category = r.category.trim();
  const shippingClass = r.shipping_class.trim();

  // Duplicados
  if (seenSku.has(sku)) fail(`Fila ${rowNum}: SKU duplicado '${sku}'`);
  if (seenId.has(id)) fail(`Fila ${rowNum}: id duplicado '${id}'`);
  seenSku.add(sku);
  seenId.add(id);

  // Tipos numéricos
  const priceARS = toInt(r.price_ars, "price_ars");
  if (priceARS === null || priceARS < 0) fail(`Fila ${rowNum}: price_ars inválido`);

  const stock = toInt(r.stock, "stock");
  if (stock !== 0 && stock !== 1)
    fail(`Fila ${rowNum}: stock debe ser 0 o 1 (piezas únicas)`);

  const heightCm = toInt(r.height_cm, "height_cm");
  const widthCm = toInt(r.width_cm, "width_cm");
  const depthCm = toInt(r.depth_cm, "depth_cm");
  const weightG = toInt(r.weight_g, "weight_g");

  // Booleanos (opcionales)
  const foodSafe = toBool(r.food_safe, "food_safe");
  const microwaveSafe = toBool(r.microwave_safe, "microwave_safe");
  const dishwasherSafe = toBool(r.dishwasher_safe, "dishwasher_safe");

  // Fotos
  const photoFiles = splitPipe(r.photos);
  if (photoFiles.length === 0) fail(`Fila ${rowNum}: debe incluir al menos 1 foto`);

  // Validar que existan archivos
  for (const f of photoFiles) {
    const full = path.join(IMG_DIR, f);
    if (!fs.existsSync(full)) {
      fail(`Fila ${rowNum}: no existe la foto '${f}' en public/products/`);
    }
  }

  // Tags
  const tags = splitPipe(r.tags);

  // Campos texto
  if (!isNonEmpty(r.description)) fail(`Fila ${rowNum}: description requerida`);
  if (!isNonEmpty(r.care)) fail(`Fila ${rowNum}: care requerido`);

  products.push({
    sku,
    id,
    title,
    category,
    priceARS,
    currency: "ARS",
    stock,
    heightCm,
    widthCm,
    depthCm,
    weightG,
    shippingClass,
    finish: r.finish?.trim() || "",
    foodSafe,
    microwaveSafe,
    dishwasherSafe,
    description: r.description.trim(),
    care: r.care.trim(),
    tags,
    photos: photoFiles.map((f) => `/products/${f}`),
  });
}

// Validación adicional (shipping_class sugeridas)
const allowedShipping = new Set(["small", "medium", "large", "fragile"]);
for (const p of products) {
  if (!allowedShipping.has(p.shippingClass)) {
    warn(
      `shipping_class '${p.shippingClass}' no está en {small|medium|large|fragile}. Se permite igual, pero revisalo.`
    );
  }
}

// 5) Generar TS
const out = `/* AUTO-GENERATED FILE — DO NOT EDIT BY HAND
   Source: data/products.csv
   Generated: ${new Date().toISOString()}
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

export const PRODUCTS: Product[] = ${JSON.stringify(products, null, 2)};
`;

fs.writeFileSync(OUT_PATH, out, "utf8");

console.log(
  `[products] OK: ${products.length} productos validados y generado ${path.relative(root, OUT_PATH)}`
);
