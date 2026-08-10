import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
} from "./maplibre-gl.mjs";

const CATEGORY_LABELS = {
  confirmed: "明确对应",
  likely: "待核对应",
  context: "生活背景",
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function element(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function dataUrlFor(root) {
  const configured = root.dataset.familyMapSource;
  if (configured && /^https?:\/\//i.test(configured)) return new URL(configured);
  return new URL("./family-places.json", import.meta.url);
}

function assertPlacesDocument(documentData) {
  if (!documentData || documentData.schemaVersion !== 1 || !Array.isArray(documentData.places)) {
    throw new Error("Unsupported family places data");
  }
  const styleUrl = new URL(documentData.styleUrl);
  if (styleUrl.protocol !== "https:") throw new Error("Map style must use HTTPS");

  documentData.places.forEach((place) => {
    if (!place.id || !place.name || !CATEGORY_LABELS[place.category]) {
      throw new Error("Invalid family place");
    }
    if (
      !Array.isArray(place.coordinates) ||
      place.coordinates.length !== 2 ||
      !place.coordinates.every(Number.isFinite)
    ) {
      throw new Error(`Invalid coordinates for ${place.id}`);
    }
  });
}

function popupContent(place) {
  const content = element("article", "family-map-popup-content");
  content.append(
    element("p", `family-map-popup-status family-map-popup-status-${place.category}`, CATEGORY_LABELS[place.category]),
    element("h3", "family-map-popup-title", place.name),
  );
  if (place.manuscriptName || place.mapName) {
    content.append(
      element(
        "p",
        "family-map-popup-original",
        `手稿或地图原名：${place.manuscriptName ?? place.mapName}`,
      ),
    );
  }
  content.append(
    element("p", "family-map-popup-story", place.story),
    element("p", "family-map-popup-people", `关联人物：${place.people.join("、")}`),
    element("p", "family-map-popup-source", `依据：${place.evidence}`),
  );
  if (place.coordinateNote) {
    content.append(element("p", "family-map-popup-note", place.coordinateNote));
  }
  return content;
}

function markerElement(place) {
  const marker = element("button", `family-map-marker family-map-marker-${place.category}`);
  marker.type = "button";
  marker.setAttribute("aria-label", `查看${place.name}的家族记录`);
  marker.dataset.familyMapMarker = place.id;
  marker.append(
    element("span", "family-map-marker-dot"),
    element("span", "family-map-marker-label", place.name),
  );
  return marker;
}

function mapPadding(canvas) {
  return canvas.clientWidth < 620
    ? { top: 58, right: 28, bottom: 44, left: 28 }
    : { top: 72, right: 48, bottom: 56, left: 48 };
}

async function enhanceFamilyMap(root) {
  if (root.dataset.mapInitialized === "true") return;
  root.dataset.mapInitialized = "true";
  root.dataset.mapState = "loading";

  const canvas = root.querySelector("[data-family-map-canvas]");
  const status = root.querySelector("[data-family-map-status]");
  const announcement = root.querySelector("[data-family-map-announcement]");
  const section = root.closest(".family-map-section");
  if (!(canvas instanceof HTMLElement) || !(status instanceof HTMLElement)) return;

  try {
    const response = await fetch(dataUrlFor(root), { cache: "no-store" });
    if (!response.ok) throw new Error(`Family places returned ${response.status}`);
    const documentData = await response.json();
    assertPlacesDocument(documentData);

    const map = new MapLibreMap({
      container: canvas,
      style: documentData.styleUrl,
      center: [116.756, 33.552],
      zoom: 12,
      attributionControl: true,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      locale: {
        "CooperativeGesturesHandler.WindowsHelpText": "按住Ctrl键并滚动可缩放地图",
        "CooperativeGesturesHandler.MacHelpText": "按住⌘键并滚动可缩放地图",
        "CooperativeGesturesHandler.MobileHelpText": "用两根手指移动地图",
      },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const markers = new Map();
    const placesById = new Map(documentData.places.map((place) => [place.id, place]));
    const popup = new Popup({ closeButton: true, closeOnClick: true, maxWidth: "330px", offset: 18 });
    let activeMarker = null;
    let ready = false;

    function setActivePlace(placeId, { move = true, focusMarker = false } = {}) {
      const place = placesById.get(placeId);
      const marker = markers.get(placeId);
      if (!place || !marker) return;

      activeMarker?.classList.remove("family-map-marker-active");
      marker.classList.add("family-map-marker-active");
      activeMarker = marker;
      popup.setLngLat(place.coordinates).setDOMContent(popupContent(place)).addTo(map);

      if (move) {
        map.easeTo({
          center: place.coordinates,
          zoom: Math.max(map.getZoom(), 13.7),
          duration: reducedMotion.matches ? 0 : 420,
        });
      }
      if (focusMarker) {
        marker.focus({ preventScroll: true });
        canvas.scrollIntoView({
          block: "center",
          behavior: reducedMotion.matches ? "auto" : "smooth",
        });
      }
      if (announcement instanceof HTMLElement) {
        announcement.textContent = `已在地图中定位至${place.name}`;
      }
    }

    const loadTimeout = window.setTimeout(() => {
      if (ready) return;
      root.dataset.mapState = "error";
      status.textContent = "底图暂时无法加载。地点与故事记录仍可完整阅读。";
    }, 12000);

    map.once("load", () => {
      ready = true;
      window.clearTimeout(loadTimeout);
      root.dataset.mapState = "ready";
      if (section instanceof HTMLElement) section.dataset.familyMapReady = "true";
      status.textContent = "地图已加载";

      documentData.places.forEach((place) => {
        const marker = markerElement(place);
        marker.addEventListener("click", (event) => {
          event.stopPropagation();
          setActivePlace(place.id, { move: true });
        });
        new Marker({ element: marker, anchor: "left" }).setLngLat(place.coordinates).addTo(map);
        markers.set(place.id, marker);
      });

      const bounds = new LngLatBounds(documentData.initialBounds[0], documentData.initialBounds[1]);
      map.fitBounds(bounds, {
        padding: mapPadding(canvas),
        maxZoom: 13.6,
        duration: 0,
      });

      document.querySelectorAll("[data-family-place-focus]").forEach((button) => {
        const placeId = button.getAttribute("data-family-place-focus");
        if (!(button instanceof HTMLButtonElement) || !placeId || !placesById.has(placeId)) return;
        button.addEventListener("click", () => {
          setActivePlace(placeId, { move: true, focusMarker: true });
        });
      });
    });

    popup.on("close", () => {
      activeMarker?.classList.remove("family-map-marker-active");
      activeMarker = null;
    });
  } catch (error) {
    root.dataset.mapState = "error";
    status.textContent = "底图暂时无法加载。地点与故事记录仍可完整阅读。";
    console.error("Family map failed to initialize", error);
  }
}

function initializeMaps() {
  window.setTimeout(() => {
    document.querySelectorAll("[data-family-map]").forEach((root) => {
      if (root instanceof HTMLElement) void enhanceFamilyMap(root);
    });
  }, 0);
}

if (document.readyState === "complete") {
  initializeMaps();
} else {
  window.addEventListener("load", initializeMaps, { once: true });
}
