(() => {
  "use strict";

  const canvas = document.getElementById("home-canvas");
  const landing = document.getElementById("landing-step");
  const context = canvas.getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const scene = new Image();
  let frame = 0, lastFrame = 0, width = 0, height = 0, density = 0;
  let targetX = 0, targetY = 0, offsetX = 0, offsetY = 0;

  function isVisible() {
    return !document.hidden && !landing.hidden && !document.getElementById("home-screen").hidden;
  }

  function paint(now) {
    frame = 0;
    if (!isVisible() || !scene.naturalWidth) return;
    if (now - lastFrame < 1000 / 30 && !reducedMotion.matches) {
      frame = requestAnimationFrame(paint);
      return;
    }
    lastFrame = now;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const nextDensity = Math.min(devicePixelRatio || 1, 2);
    if (width !== bounds.width || height !== bounds.height || density !== nextDensity) {
      width = bounds.width;
      height = bounds.height;
      density = nextDensity;
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
    }

    const still = reducedMotion.matches;
    const zoom = still ? 1 : 1.012 + Math.sin(now / 10000) * 0.002;
    const scale = Math.max(width / scene.naturalWidth, height / scene.naturalHeight) * zoom;
    const imageWidth = scene.naturalWidth * scale;
    const imageHeight = scene.naturalHeight * scale;
    const travelX = Math.min(3, Math.max(0, (imageWidth - width) / 2));
    const travelY = Math.min(2, Math.max(0, (imageHeight - height) / 2));
    offsetX += (targetX - offsetX) * 0.045;
    offsetY += (targetY - offsetY) * 0.045;
    context.setTransform(density, 0, 0, density, 0, 0);
    context.drawImage(scene,
      (width - imageWidth) / 2 + (still ? 0 : offsetX * travelX),
      (height - imageHeight) / 2 + (still ? 0 : offsetY * travelY),
      imageWidth, imageHeight);

    if (!still) frame = requestAnimationFrame(paint);
  }

  function wake() {
    if (!frame && isVisible() && scene.naturalWidth) frame = requestAnimationFrame(paint);
  }

  landing.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse" || reducedMotion.matches) return;
    const bounds = landing.getBoundingClientRect();
    targetX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
    targetY = (event.clientY - bounds.top) / bounds.height * 2 - 1;
  }, { passive: true });
  landing.addEventListener("pointerleave", () => { targetX = 0; targetY = 0; });
  new ResizeObserver(wake).observe(canvas);
  new MutationObserver(wake).observe(document.getElementById("home-screen"), {
    attributes: true, subtree: true, attributeFilter: ["hidden"]
  });
  document.addEventListener("visibilitychange", wake);
  reducedMotion.addEventListener("change", wake);
  scene.addEventListener("load", wake, { once: true });
  scene.src = new URL("assets/home/sanctuary-v1.webp", document.baseURI).href;
})();
