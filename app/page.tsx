import familyDataJson from "../public/family-tree.json";
import familyPlacesJson from "../public/family-places.json";
import {
  FamilyMap,
  type FamilyPlacesDocument,
} from "./family-map-static";
import {
  FamilyTreeWidget,
  type FamilyDocument,
} from "./family-tree-static";

const familyData = familyDataJson as FamilyDocument;
const familyPlaces = familyPlacesJson as FamilyPlacesDocument;

function formatUpdatedAt(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日更新`;
}

export default function Home() {
  return (
    <main id="top">
      <header className="site-header">
        <p className="site-location">安徽濉溪·郭合拉庄</p>
        <h1>{familyData.title}</h1>
        <p className="site-deck">
          依据任百全1999年所写《郭合拉庄任氏家族简记》与家人口述整理，并随家人提供的新资料持续补充。
        </p>
        <p className="site-updated" data-family-updated>
          {formatUpdatedAt(familyData.updatedAt)}
        </p>
      </header>

      <FamilyMap document={familyPlaces} />

      <section className="tree-section" aria-labelledby="ren-family-chart-title">
        <FamilyTreeWidget
          document={familyData}
          focusPersonId={familyData.defaultFocusPersonId}
          viewId="ren-family"
        />
      </section>

      <footer>
        <p>姓名与关系仍有待核之处，后续以家人确认和原始资料为准。</p>
      </footer>
    </main>
  );
}
