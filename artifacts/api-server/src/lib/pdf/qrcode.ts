import QRCode from "qrcode";

export async function generateQrDataUrl(url: string): Promise<string> {
  return await QRCode.toDataURL(url, {
    margin: 1,
    width: 240,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
