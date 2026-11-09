"use client";
import QRCode from "qrcode";
import { absoluteUrl } from "@/lib/env";

/** URL encoded in a card's QR code. */
export function cardUrl(token: string) {
  return absoluteUrl(`/card/?t=${encodeURIComponent(token)}`);
}

/** SVG markup for a card's QR code, generated locally from our own URL. */
export function cardQrSvg(token: string) {
  return QRCode.toString(cardUrl(token), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#101827", light: "#F5EEDF" } });
}
