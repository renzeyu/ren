export type FamilyPlaceCategory = "confirmed" | "likely" | "context";
export type FamilyPlaceLocationStatus = "located" | "reference" | "unlocated";

export type FamilyPlace = {
  id: string;
  name: string;
  mapName?: string;
  manuscriptName?: string;
  category: FamilyPlaceCategory;
  locationStatus: FamilyPlaceLocationStatus;
  confidence?: "high" | "medium" | "low";
  coordinates?: [number, number];
  people: string[];
  story: string;
  evidence: string;
  coordinateNote?: string;
};

export type FamilyMapView = {
  id: string;
  label: string;
  placeIds: string[];
};

export type FamilyPlacesDocument = {
  schemaVersion: number;
  mapId: string;
  title: string;
  updatedAt: string;
  styleUrl: string;
  coordinateSystem: "WGS84";
  researchNote: string;
  views: FamilyMapView[];
  places: FamilyPlace[];
};

const categoryCopy: Record<
  FamilyPlaceCategory,
  { label: string; heading: string; description: string }
> = {
  confirmed: {
    label: "明确对应",
    heading: "手稿与生平明确对应",
    description: "地点名称或人物经历有原始材料直接支持。",
  },
  likely: {
    label: "待核对应",
    heading: "地图辅助辨认，仍待核实",
    description: "这些地点提供了重要线索，但不能据此直接改写手稿。",
  },
  context: {
    label: "生活背景",
    heading: "时代与生活地理",
    description: "地点与家族成员的日常生活有关，不表示具体住宅或事件原址。",
  },
};

function PlaceEntry({ place }: { place: FamilyPlace }) {
  const category = categoryCopy[place.category];
  const sourceName = place.manuscriptName ?? place.mapName;
  const locationLabel =
    place.locationStatus === "unlocated"
      ? "尚待定位"
      : place.locationStatus === "reference"
        ? "方位参照"
        : null;

  return (
    <article
      className="family-place-entry"
      data-family-place-entry={place.id}
      data-family-place-located={place.coordinates ? "true" : "false"}
    >
      <p className="family-place-status">
        <span className={`family-place-dot family-place-dot-${place.category}`} aria-hidden="true" />
        {category.label}
        {locationLabel ? `·${locationLabel}` : null}
        {place.confidence === "low" ? "·低可信候选" : null}
      </p>
      <h4>{place.name}</h4>
      {sourceName ? <p className="family-place-original">{`手稿或地图原名：${sourceName}`}</p> : null}
      <p className="family-place-story">{place.story}</p>
      <p className="family-place-people">{`关联人物：${place.people.join("、")}`}</p>
      <p className="family-place-source">{`依据：${place.evidence}`}</p>
      {place.coordinateNote ? <p className="family-place-coordinate-note">{place.coordinateNote}</p> : null}
      {place.coordinates ? (
        <button className="family-place-focus" type="button" data-family-place-focus={place.id}>
          在地图中查看
        </button>
      ) : (
        <p className="family-place-unlocated">位置尚待确认</p>
      )}
    </article>
  );
}

export function FamilyMap({ document }: { document: FamilyPlacesDocument }) {
  const groupedPlaces = (["confirmed", "likely", "context"] as const).map((category) => ({
    category,
    places: document.places.filter((place) => place.category === category),
  }));

  return (
    <section className="family-map-section" aria-labelledby="family-map-title">
      <header className="family-map-heading">
        <p className="family-map-kicker">家族地理</p>
        <h2 id="family-map-title">一份手稿，落在一张地图上</h2>
        <p>{"这次把检索范围扩展到郭合拉周边及濉溪县其他方向，并重新核对原稿的名称和方位。只有得到相互支持的地点才会落图；未找到唯一对应的地名仍以文字保留，等待家人补充。"}</p>
      </header>

      <div className="family-map-layout">
        <div className="family-map-visual-column">
          <div
            className="family-map-shell"
            data-family-map
            data-family-map-source="/family-places.json"
            data-family-map-id={document.mapId}
          >
            <div className="family-map-view-controls" data-family-map-view-controls aria-label="选择地图范围">
              {document.views.map((view, index) => (
                <button
                  type="button"
                  data-family-map-view={view.id}
                  aria-pressed={index === 0 ? "true" : "false"}
                  key={view.id}
                >
                  {view.label}
                </button>
              ))}
            </div>
            <div
              className="family-map-canvas"
              id="family-map-canvas"
              data-family-map-canvas
              role="region"
              aria-label="郭合拉庄周边家族地点交互地图"
            />
            <p className="family-map-loading" data-family-map-status aria-live="polite" aria-atomic="true">
              正在加载地图。页面中的地点与故事记录可直接阅读。
            </p>
            <p className="visually-hidden" data-family-map-announcement aria-live="polite" aria-atomic="true" />
          </div>

          <div className="family-map-legend" aria-label="地图标记说明">
            <span><i className="family-place-dot family-place-dot-confirmed" aria-hidden="true" />明确对应</span>
            <span><i className="family-place-dot family-place-dot-likely" aria-hidden="true" />待核对应</span>
            <span><i className="family-place-dot family-place-dot-context" aria-hidden="true" />生活背景</span>
          </div>
          <p className="family-map-disclaimer">{`底图来自OpenFreeMap。${document.researchNote}中国地图检索所得坐标已换算为${document.coordinateSystem}后再用于本图，标记不表示任何人的住宅。若底图无法访问，地点记录仍可完整阅读。`}</p>
        </div>

        <div className="family-place-directory" aria-label="家族地点与故事">
          {groupedPlaces.map(({ category, places }) => {
            const copy = categoryCopy[category];
            return (
              <section className="family-place-group" aria-labelledby={`family-place-group-${category}`} key={category}>
                <h3 id={`family-place-group-${category}`}>{copy.heading}</h3>
                <p className="family-place-group-description">{copy.description}</p>
                <div>
                  {places.map((place) => (
                    <PlaceEntry place={place} key={place.id} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <script type="module" src="/family-map.mjs" defer data-static-interaction="" />
    </section>
  );
}
