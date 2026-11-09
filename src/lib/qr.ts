import "server-only";
import QRCode from "qrcode";
import { siteUrl } from "@/lib/env";

export function cardUrl(token: string) {
  return `${siteUrl()}/card/${token}`;
}

/** SVG markup for a card's QR code (generated locally from our own URL). */
export async function cardQrSvg(token: string, opts: { dark?: string; light?: string } = {}) {
  return QRCode.toString(cardUrl(token), {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: opts.dark ?? "#101827", light: opts.light ?? "#F5EEDF" },
  });
}
