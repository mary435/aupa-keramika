"use client";

import { PRODUCTS } from "../data/products.generated";
import type { Product } from "../data/products.generated";
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  X,
  Truck,
  ShieldCheck,
  Instagram,
  Mail,
  Phone,
  MapPin,
  Minus,
  Plus,
} from "lucide-react";

/**
 * Aupa Keramika — MVP de tienda para “link en bio” (Instagram)
 * - 100% front-end (sin pasarela de pago). Incluye carrito + checkout con:
 *   - Opción de pago: Transferencia / Mercado Pago (link) / WhatsApp
 *   - Datos de envío, políticas y confirmación
 * - Para producción real: conectar a pasarela (Mercado Pago / Stripe) y a un backend
 */


type CartItem = {
  id: string;
  title: string;
  priceARS: number;
  qty: number;
  stock: number;
  thumb?: string;
};

type BuildWhatsAppArgs = {
  items: Array<Pick<CartItem, "title" | "qty" | "priceARS">>;
  subtotal: number;
  shippingZone?: string;
};



// Config básica (editá a tu gusto)
const BRAND = {
  name: "Aupa Keramika",
  instagramHandle: "@aupa.keramica",
  instagramUrl: "https://www.instagram.com/aupa.keramica/",
  whatsappNumberE164: "+5493515168426",
  supportEmail: "aupakeramika@gmail.com",
  location: "Córdoba, Argentina",
  mercadoPagoLink: "https://link.mercadopago.com.ar/aupakeramika",
};

function formatARS(value: number): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$ ${value}`;
  }
}
function formatDims(p: Product): string {
  const h = p.heightCm;
  const w = p.widthCm;
  const d = p.depthCm;

  // Si tenés alto + ancho + profundidad:
  if (h != null && w != null && d != null) return `${h}×${w}×${d} cm`;

  // Si tenés solo ancho + profundidad (ej. plato/bowl):
  if (w != null && d != null) return `${w}×${d} cm`;

  // Si tenés solo ancho:
  if (w != null) return `${w} cm`;

  return "Medidas a confirmar";
}

function formatWeight(p: Product): string {
  return p.weightG != null ? `${p.weightG} g` : "Peso a confirmar";
}

function classNames(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

function buildWhatsAppCheckoutMessage({
  items,
  subtotal,
  shippingZone,
}: BuildWhatsAppArgs): string {
  const lines = [
    `Hola! Quiero comprar en ${BRAND.name}.`,
    "",
    "Items:",
    ...items.map(
      (i) => `• ${i.title} (x${i.qty}) — ${formatARS(i.priceARS * i.qty)}`
    ),
    "",
    `Subtotal: ${formatARS(subtotal)}`,
    shippingZone ? `Zona de envío: ${shippingZone}` : "",
    "",
    "¿Me confirmás disponibilidad, costo de envío y medios de pago?",
  ].filter(Boolean);

  return encodeURIComponent(lines.join("\n"));
}

function clampQty(qty: number, stock?: number | null): number {
  if (qty < 1) return 1;
  if (stock != null && qty > stock) return stock;
  return qty;
}

type CheckoutState = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  payment: "transferencia" | "mercadopago" | "whatsapp";
};

export default function AupaKeramikaStorefront() {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [shippingZone, setShippingZone] = useState<string>("Córdoba Capital");
  const [checkout, setCheckout] = useState<CheckoutState>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    payment: "transferencia",
  });

  const productsById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of PRODUCTS) map.set(p.id, p);
    return map;
  }, []);

  const cartItems = useMemo<CartItem[]>(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const p = productsById.get(id);
        if (!p) return null;
        const item: CartItem = {
          id,
          title: p.title,
          priceARS: p.priceARS,
          qty,
          stock: p.stock,
          thumb: p.photos?.[0],
        };
        return item;
      })
      .filter((x): x is CartItem => x !== null);
  }, [cart, productsById]);

  const cartCount = useMemo<number>(
    () => cartItems.reduce((acc, i) => acc + i.qty, 0),
    [cartItems]
  );

  const subtotal = useMemo<number>(
    () => cartItems.reduce((acc, i) => acc + i.priceARS * i.qty, 0),
    [cartItems]
  );

  function addToCart(productId: string, qty: number = 1) {
    const p = productsById.get(productId);
    if (!p) return;
    setCart((prev) => {
      const next = { ...prev };
      const current = next[productId] ?? 0;
      const desired = current + qty;
      const finalQty = clampQty(desired, p.stock);
      next[productId] = finalQty;
      return next;
    });
    setCartOpen(true);
  }

  function setItemQty(productId: string, qty: number) {
    const p = productsById.get(productId);
    if (!p) return;
    setCart((prev) => {
      const next = { ...prev };
      const finalQty = clampQty(qty, p.stock);
      next[productId] = finalQty;
      return next;
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  const waText = buildWhatsAppCheckoutMessage({
    items: cartItems,
    subtotal,
    shippingZone,
  });

  const waUrl = `https://wa.me/${BRAND.whatsappNumberE164.replace(
    /\D/g,
    ""
  )}?text=${waText}`;

  const canCheckout = cartItems.length > 0;

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-[#faf9f7]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-neutral-900 text-neutral-50 grid place-items-center font-semibold">
              AK
            </div>
            <div className="leading-tight">
              <div className="text-sm tracking-wide text-neutral-600">
                Piezas únicas
              </div>
              <div className="text-lg font-semibold">{BRAND.name}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={BRAND.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
              aria-label="Abrir Instagram"
            >
              <Instagram className="h-4 w-4" />
              <span className="hidden sm:inline">{BRAND.instagramHandle}</span>
            </a>

            <button
              onClick={() => setCartOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-50 hover:bg-neutral-800"
              aria-label="Abrir carrito"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Carrito</span>
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-neutral-50 text-xs font-semibold text-neutral-900 ring-2 ring-[#faf9f7]">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-8">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Cerámica contemporánea, hecha a mano. Cada pieza es irrepetible.
            </motion.h1>
            <p className="mt-4 max-w-prose text-neutral-700">
              Selección curada de piezas únicas. Comprá directo desde el link en
              bio y coordinamos envío a todo el país.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#catalogo"
                className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-medium text-neutral-50 hover:bg-neutral-800"
              >
                Ver catálogo
              </a>
              <a
                href="#envios"
                className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
              >
                Envíos y cuidados
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <InfoPill
                icon={<Truck className="h-4 w-4" />}
                title="Envíos"
                text="A todo Argentina"
              />
              <InfoPill
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Empaque"
                text="Protección reforzada"
              />
              <InfoPill
                icon={<MapPin className="h-4 w-4" />}
                title="Origen"
                text={BRAND.location}
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-neutral-200/50 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-neutral-200 bg-white shadow-sm">
              <img
                src="/hero/aupa-keramika-hero.jpg"
                alt="Aupa Keramika – cerámica artesanal"
                className="h-[360px] w-full object-cover"
              />
              <div className="p-5">
                <div className="text-sm text-neutral-600">
                  Ediciones pequeñas • Producción artesanal
                </div>
                <div className="mt-1 text-lg font-semibold">Hecho para durar</div>
                <div className="mt-2 text-sm text-neutral-700">
                  Gres. Esmaltes alimentarios. Terminaciones mate y satinadas.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalogo" className="mx-auto max-w-6xl px-4 pb-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Catálogo</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Todas las piezas son únicas. Stock limitado a 1 unidad por ítem.
            </p>
          </div>
          <div className="hidden md:block text-sm text-neutral-600">
            Actualizado: hoy
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.35 }}
              className="group overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm"
            >
              <button
                onClick={() => setActiveProduct(p)}
                className="block w-full text-left"
                aria-label={`Ver ${p.title}`}
              >
                <div className="relative">
                  <img
                    src={p.photos?.[0]}
                    alt={p.title}
                    className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-800 border border-neutral-200">
                    Pieza única
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">{p.title}</div>
                      <div className="mt-1 text-sm text-neutral-600">
                        {formatDims(p)} • {formatWeight(p)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold">
                        {formatARS(p.priceARS)}
                      </div>
                      <div className="text-xs text-neutral-600">
                        {p.stock > 0 ? "Disponible" : "Agotado"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.tags?.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addToCart(p.id, 1);
                      }}
                      disabled={p.stock <= 0}
                      className={classNames(
                        "flex-1 rounded-2xl px-4 py-2 text-sm font-medium",
                        p.stock > 0
                          ? "bg-neutral-900 text-neutral-50 hover:bg-neutral-800"
                          : "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                      )}
                    >
                      Agregar
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveProduct(p);
                        setActivePhotoIndex(0);
                      }}
                      className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                    >
                      Detalles
                    </button>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Shipping / Policies */}
      <section id="envios" className="border-t border-neutral-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 md:grid-cols-3">
            <PolicyCard
              title="Envíos"
              icon={<Truck className="h-5 w-5" />}
              items={[
                "Despacho dentro de 48–72 hs hábiles (según stock y empaque).",
                "Envío por correo / mensajería. Costo según destino.",
                "Retiro en Córdoba (coordinar por WhatsApp).",
              ]}
            />
            <PolicyCard
              title="Pagos"
              icon={<ShieldCheck className="h-5 w-5" />}
              items={[
                "Transferencia bancaria (ARS).",
                "Mercado Pago (link de pago o alias, según coordinación).",
                "Si necesitás factura o datos fiscales, indicalo en notas.",
              ]}
            />
            <PolicyCard
              title="Cuidados"
              icon={<ShieldCheck className="h-5 w-5" />}
              items={[
                "Esmaltes aptos para uso alimentario (según pieza).",
                "Evitar golpes y cambios bruscos de temperatura.",
                "Lavado suave recomendado para preservar terminación.",
              ]}
            />
          </div>

          <div className="mt-10 rounded-[2rem] border border-neutral-200 bg-[#faf9f7] p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm text-neutral-600">
                  ¿Dudas o compras por mensaje?
                </div>
                <div className="text-xl font-semibold">
                  Te atendemos por WhatsApp
                </div>
              </div>
              <a
                href={`https://wa.me/${BRAND.whatsappNumberE164.replace(
                  /\D/g,
                  ""
                )}?text=${encodeURIComponent(
                  `Hola! Quiero consultar por piezas de ${BRAND.name}.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-medium text-neutral-50 hover:bg-neutral-800"
              >
                Comprar/consultar
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200/70 bg-[#faf9f7]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-lg font-semibold">{BRAND.name}</div>
              <div className="mt-2 text-sm text-neutral-700">
                Piezas de cerámica únicas. Hechas a mano.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                  href={BRAND.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
                <a
                  className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                  href={`mailto:${BRAND.supportEmail}`}
                >
                  <Mail className="h-4 w-4" /> Email
                </a>
              </div>
            </div>

            <div className="text-sm text-neutral-700">
              <div className="font-semibold text-neutral-900">Contacto</div>
              <div className="mt-3 grid gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {BRAND.location}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> {BRAND.whatsappNumberE164}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> {BRAND.supportEmail}
                </div>
              </div>
            </div>

            <div className="text-sm text-neutral-700">
              <div className="font-semibold text-neutral-900">Legales</div>
              <ul className="mt-3 list-disc pl-5 space-y-2">
                <li>Los tonos pueden variar levemente según pantalla.</li>
                <li>
                  Al ser piezas artesanales, pueden presentar pequeñas
                  variaciones propias del proceso.
                </li>
                <li>
                  Reclamos por rotura en envío: reportar dentro de 24 hs con
                  fotos del empaque.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-neutral-200/70 pt-6 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
            <div>
              © {new Date().getFullYear()} {BRAND.name}. Todos los derechos
              reservados.
            </div>
            <div className="flex flex-wrap gap-4">
              <a href="#catalogo" className="hover:text-neutral-900">
                Catálogo
              </a>
              <a href="#envios" className="hover:text-neutral-900">
                Envíos
              </a>
              <button onClick={() => setCartOpen(true)} className="hover:text-neutral-900">
                Carrito
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Product modal */}
      <AnimatePresence>
        {activeProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setActiveProduct(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="mx-auto max-w-4xl overflow-hidden rounded-[2.25rem] bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                <div>
                  <div className="text-lg font-semibold">{activeProduct.title}</div>
                  <div className="text-sm text-neutral-600">
                    {formatARS(activeProduct.priceARS)}
                  </div>
                </div>
                <button
                  onClick={() => setActiveProduct(null)}
                  className="rounded-2xl border border-neutral-200 bg-white p-2 hover:bg-neutral-50"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-0 md:grid-cols-2">
                <div className="bg-neutral-50">
                  <div className="bg-neutral-50">
                    <img
                      src={activeProduct.photos[activePhotoIndex]}
                      alt={activeProduct.title}
                      className="h-80 w-full object-cover md:h-full"
                    />

                    {activeProduct.photos.length > 1 && (
                      <div className="flex gap-2 p-3 justify-center bg-white border-t border-neutral-200">
                        {activeProduct.photos.map((photo, idx) => (
                          <button
                            key={photo}
                            onClick={() => setActivePhotoIndex(idx)}
                            className={`h-14 w-14 overflow-hidden rounded-xl border ${
                              idx === activePhotoIndex
                                ? "border-neutral-900"
                                : "border-neutral-200"
                            }`}
                          >
                            <img
                              src={photo}
                              alt={`${activeProduct.title} ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                <div className="p-6">
                  <div className="text-sm text-neutral-600">Detalles</div>
                  <div className="mt-2 grid gap-2 text-sm text-neutral-800">
                    <div>
                      <span className="text-neutral-600">Dimensiones:</span>{" "}
                      {formatDims(activeProduct)}
                    </div>
                    <div>
                      <span className="text-neutral-600">Peso:</span>{" "}
                      {formatWeight(activeProduct)}
                    </div>
                    <div>
                      <span className="text-neutral-600">Stock:</span>{" "}
                      {activeProduct.stock > 0 ? "1 disponible" : "Agotado"}
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-neutral-700">
                    {activeProduct.description}
                  </p>

                  <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                    <div className="font-medium text-neutral-900">Cuidados</div>
                    <div className="mt-1">{activeProduct.care}</div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button
                      onClick={() => addToCart(activeProduct.id, 1)}
                      disabled={activeProduct.stock <= 0}
                      className={classNames(
                        "flex-1 rounded-2xl px-4 py-3 text-sm font-medium",
                        activeProduct.stock > 0
                          ? "bg-neutral-900 text-neutral-50 hover:bg-neutral-800"
                          : "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                      )}
                    >
                      Agregar al carrito
                    </button>
                    <a
                      href={BRAND.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                    >
                      Ver Instagram
                    </a>
                  </div>

                  <div className="mt-4 text-xs text-neutral-600">
                    Consultanos por mas diseños personalizados.
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart drawer */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          >
            <motion.aside
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                  <div className="text-lg font-semibold">Carrito</div>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="rounded-2xl border border-neutral-200 bg-white p-2 hover:bg-neutral-50"
                    aria-label="Cerrar carrito"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-5">
                  {cartItems.length === 0 ? (
                    <div className="rounded-[1.75rem] border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-700">
                      Tu carrito está vacío. Elegí una pieza del catálogo.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cartItems.map((i) => (
                        <div
                          key={i.id}
                          className="flex gap-3 rounded-[1.75rem] border border-neutral-200 bg-white p-3"
                        >
                          <img
                            src={i.thumb}
                            alt={i.title}
                            className="h-20 w-20 rounded-2xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">
                                  {i.title}
                                </div>
                                <div className="text-xs text-neutral-600">
                                  {formatARS(i.priceARS)}
                                </div>
                              </div>
                              <button
                                onClick={() => removeFromCart(i.id)}
                                className="rounded-xl border border-neutral-200 bg-white px-2 py-1 text-xs hover:bg-neutral-50"
                              >
                                Quitar
                              </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <div className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-2 py-1">
                                <button
                                  onClick={() => setItemQty(i.id, i.qty - 1)}
                                  className="rounded-xl bg-white p-1 hover:bg-neutral-50"
                                  aria-label="Disminuir"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <div className="w-8 text-center text-sm font-semibold">
                                  {i.qty}
                                </div>
                                <button
                                  onClick={() => setItemQty(i.id, i.qty + 1)}
                                  className="rounded-xl bg-white p-1 hover:bg-neutral-50"
                                  aria-label="Aumentar"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="text-sm font-semibold">
                                {formatARS(i.priceARS * i.qty)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Checkout */}
                  <div className="mt-8">
                    <div className="text-sm font-semibold">Checkout</div>
                    <div className="mt-3 grid gap-3">
                      <Field label="Zona de envío">
                        <select
                          value={shippingZone}
                          onChange={(e) => setShippingZone(e.target.value)}
                          className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
                        >
                          <option>Córdoba Capital</option>
                          <option>Gran Córdoba</option>
                          <option>Interior Córdoba</option>
                          <option>Buenos Aires</option>
                          <option>Resto del país</option>
                        </select>
                      </Field>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Nombre y apellido">
                          <input
                            value={checkout.fullName}
                            onChange={(e) =>
                              setCheckout((s) => ({
                                ...s,
                                fullName: e.target.value,
                              }))
                            }
                            placeholder="Ej: Aupa"
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
                          />
                        </Field>
                        <Field label="Email">
                          <input
                            value={checkout.email}
                            onChange={(e) =>
                              setCheckout((s) => ({
                                ...s,
                                email: e.target.value,
                              }))
                            }
                            placeholder="tu@email.com"
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
                          />
                        </Field>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Teléfono">
                          <input
                            value={checkout.phone}
                            onChange={(e) =>
                              setCheckout((s) => ({
                                ...s,
                                phone: e.target.value,
                              }))
                            }
                            placeholder="+54 9 ..."
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
                          />
                        </Field>
                        <Field label="Medio de pago">
                          <select
                            value={checkout.payment}
                            onChange={(e) =>
                              setCheckout((s) => ({
                                ...s,
                                payment: e.target.value as CheckoutState["payment"],
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
                          >
                            <option value="transferencia">Transferencia</option>
                            <option value="mercadopago">Mercado Pago</option>
                            <option value="whatsapp">Coordinar por WhatsApp</option>
                          </select>
                        </Field>
                      </div>

                      <Field label="Dirección (para cotizar envío)">
                        <input
                          value={checkout.address}
                          onChange={(e) =>
                            setCheckout((s) => ({
                              ...s,
                              address: e.target.value,
                            }))
                          }
                          placeholder="Calle, número, localidad, provincia"
                          className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
                        />
                      </Field>

                      <Field label="Notas (opcional)">
                        <textarea
                          value={checkout.notes}
                          onChange={(e) =>
                            setCheckout((s) => ({ ...s, notes: e.target.value }))
                          }
                          placeholder="Ej: horario de entrega, factura, etc."
                          rows={3}
                          className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
                        />
                      </Field>
                    </div>

                    <div className="mt-5 rounded-[1.75rem] border border-neutral-200 bg-neutral-50 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-700">Subtotal</span>
                        <span className="font-semibold">{formatARS(subtotal)}</span>
                      </div>
                      <div className="mt-1 text-xs text-neutral-600">
                        El costo de envío se confirma según destino y empaque.
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={classNames(
                          "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium",
                          canCheckout
                            ? "bg-neutral-900 text-neutral-50 hover:bg-neutral-800"
                            : "bg-neutral-200 text-neutral-500 pointer-events-none"
                        )}
                      >
                        Confirmar por WhatsApp
                      </a>

                      <a
                        href={BRAND.mercadoPagoLink}
                        target="_blank"
                        rel="noreferrer"
                        className={classNames(
                          "inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50",
                          canCheckout ? "" : "pointer-events-none opacity-50"
                        )}
                      >
                        Pagar con Mercado Pago (link)
                      </a>

                      <button
                        onClick={() => setCart({})}
                        className={classNames(
                          "rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50",
                          cartItems.length ? "" : "opacity-50 cursor-not-allowed"
                        )}
                        disabled={!cartItems.length}
                      >
                        Vaciar carrito
                      </button>

                      <div className="text-xs text-neutral-600">
                        Para automatizar stock, pagos y envíos, conectá esta UI a una
                        pasarela (Mercado Pago/Stripe) y a un backend.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoPill({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[1.75rem] border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <div className="grid h-9 w-9 place-items-center rounded-2xl bg-neutral-900 text-neutral-50">
        {icon}
      </div>
      <div className="leading-tight">
        <div className="text-xs text-neutral-600">{title}</div>
        <div className="text-sm font-semibold">{text}</div>
      </div>
    </div>
  );
}

function PolicyCard({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-neutral-900 text-neutral-50">
          {icon}
        </div>
        <div className="text-lg font-semibold">{title}</div>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-neutral-700">
        {items.map((it, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-neutral-500" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}
