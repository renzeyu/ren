export type FamilyPlaceCategory = "confirmed" | "likely" | "context";

export type FamilyPlace = {
  id: string;
  name: string;
  mapName?: string;
  manuscriptName?: string;
  category: FamilyPlaceCategory;
  confidence?: "high" | "medium" | "low";
  coordinates: [number, number];
  people: string[];
  story: string;
  evidence: string;
  coordinateNote?: string;
};

export type FamilyPlacesDocument = {
  schemaVersion: number;
  mapId: string;
  title: string;
  updatedAt: string;
  styleUrl: string;
  initialBounds: [[number, number], [number, number]];
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

  return (
    <article className="family-place-entry" data-family-place-entry={place.id}>
      <p className="family-place-status">
        <span className={`family-place-dot family-place-dot-${place.category}`} aria-hidden="true" />
        {category.label}
        {place.confidence === "low" ? "·低可信候选" : null}
      </p>
      <h4>{place.name}</h4>
      {sourceName ? <p className="family-place-original">{`手稿或地图原名：${sourceName}`}</p> : null}
      <p className="family-place-story">{place.story}</p>
      <p className="family-place-people">{`关联人物：${place.people.join("、")}`}</p>
      <p className="family-place-source">{`依据：${place.evidence}`}</p>
      {place.coordinateNote ? <p className="family-place-coordinate-note">{place.coordinateNote}</p> : null}
      <button className="family-place-focus" type="button" data-family-place-focus={place.id}>
        在地图中查看
      </button>
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
        <p>{"这些村庄、河流与集镇，把手稿中的婚姻、迁徙、求学和劳动重新放回皖北平原。地图中的推断均保留原稿写法与考证状态，等待家人继续补充。"}</p>
      </header>

      <div className="family-map-layout">
        <div className="family-map-visual-column">
          <div
            className="family-map-shell"
            data-family-map
            data-family-map-source="/family-places.json"
            data-family-map-id={document.mapId}
          >
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
          <p className="family-map-disclaimer">{"底图来自OpenFreeMap。村庄标记为聚落中心或截图辅助定位，不表示任何人的住宅；高德地图坐标未直接用于本图。若底图无法访问，页面中的地点记录仍可完整阅读。"}</p>
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
