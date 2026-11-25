"use client";

import { useSyncExternalStore } from "react";

// Panier gardé dans le navigateur (localStorage). Il ne contient que des références :
// les prix sont toujours relus dans la base au moment de payer.

export type CartItem = { slug: string; color: string; qty: number };

const KEY = "yris-cart";
const EVENT = "yris-cart";
export const MAX_QTY = 20;

let cache: CartItem[] | null = null;
const EMPTY: CartItem[] = [];

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(raw)
      ? raw
          .filter((i) => typeof i?.slug === "string" && typeof i?.color === "string" && Number.isInteger(i?.qty))
          .map((i) => ({ slug: i.slug, color: i.color, qty: Math.min(Math.max(i.qty, 1), MAX_QTY) }))
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Navigation privée stricte : le panier vit le temps de la page.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export const useCart = () => useSyncExternalStore(subscribe, read, () => EMPTY);
export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0);

const same = (a: CartItem, slug: string, color: string) => a.slug === slug && a.color === color;

export function addToCart(slug: string, color: string, qty = 1) {
  const items = read();
  const found = items.find((i) => same(i, slug, color));
  write(
    found
      ? items.map((i) => (i === found ? { ...i, qty: Math.min(i.qty + qty, MAX_QTY) } : i))
      : [...items, { slug, color, qty: Math.min(qty, MAX_QTY) }],
  );
}

export function setQty(slug: string, color: string, qty: number) {
  write(qty <= 0 ? read().filter((i) => !same(i, slug, color)) : read().map((i) => (same(i, slug, color) ? { ...i, qty: Math.min(qty, MAX_QTY) } : i)));
}

export const clearCart = () => write([]);
