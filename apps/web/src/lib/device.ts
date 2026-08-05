const getBrowserName = (userAgent: string): string => {
  if (userAgent.includes("Edg/")) {
    return "Microsoft Edge";
  }

  if (userAgent.includes("OPR/") || userAgent.includes("Opera/")) {
    return "Opera";
  }

  if (userAgent.includes("SamsungBrowser/")) {
    return "Samsung Internet";
  }

  if (userAgent.includes("Chrome/") || userAgent.includes("CriOS/")) {
    return "Google Chrome";
  }

  if (userAgent.includes("Firefox/") || userAgent.includes("FxiOS/")) {
    return "Mozilla Firefox";
  }

  if (userAgent.includes("Safari/")) {
    return "Safari";
  }

  return "Browser";
};

const getOperatingSystem = (userAgent: string): string => {
  if (userAgent.includes("Android")) {
    return "Android";
  }

  if (/iPhone|iPad|iPod/.test(userAgent)) {
    return "iOS";
  }

  if (userAgent.includes("Windows NT")) {
    return "Windows";
  }

  if (userAgent.includes("CrOS")) {
    return "ChromeOS";
  }

  if (/Macintosh|Mac OS X/.test(userAgent)) {
    return "macOS";
  }

  if (userAgent.includes("Linux")) {
    return "Linux";
  }

  return "Perangkat web";
};

export function getDeviceName(): string {
  if (typeof navigator === "undefined") {
    return "Perangkat web";
  }

  const userAgent = navigator.userAgent;
  const browserName = getBrowserName(userAgent);
  const operatingSystem = getOperatingSystem(userAgent);

  return `${browserName} di ${operatingSystem}`.slice(0, 100);
}
