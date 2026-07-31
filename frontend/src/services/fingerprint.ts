import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<any> | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  try {
    if (!fpPromise) {
      fpPromise = FingerprintJS.load();
    }
    const fp = await fpPromise;
    const result = await fp.get();
    return result.visitorId;
  } catch (e) {
    // Fallback device hash from browser info
    const nav = window.navigator;
    const screen = window.screen;
    const str = `${nav.userAgent}-${nav.language}-${screen.colorDepth}-${screen.width}x${screen.height}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return 'fp_' + Math.abs(hash).toString(16);
  }
}
