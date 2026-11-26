"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cart";

// Paiement fait : le panier enregistré dans le navigateur est vidé.
export default function ClearCart() {
  useEffect(() => clearCart(), []);
  return null;
}
