import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dataPath = new URL("../public/family-tree.json", import.meta.url);
const placesPath = new URL("../public/family-places.json", import.meta.url);
const documentData = JSON.parse(await readFile(dataPath, "utf8"));
const placesData = JSON.parse(await readFile(placesPath, "utf8"));

assert.equal(documentData.schemaVersion, 1, "schemaVersion must be 1");
assert.match(documentData.treeId, /^[a-z0-9][a-z0-9-]*$/, "treeId is invalid");
assert.match(documentData.updatedAt, /^\d{4}-\d{2}-\d{2}$/, "updatedAt must use YYYY-MM-DD");
assert.ok(documentData.root, "root is required");

const nodeIds = new Set();
const personIds = new Set();
let expandableCount = 0;
let personCount = 0;

function validateUrl(value, label) {
  if (!value) return;
  const url = new URL(value);
  assert.ok(url.protocol === "https:" || url.protocol === "http:", `${label} must be HTTP(S)`);
}

function visit(node) {
  assert.match(node.id, /^[a-z0-9][a-z0-9-]*$/, `invalid node id: ${node.id}`);
  assert.ok(!nodeIds.has(node.id), `duplicate node id: ${node.id}`);
  nodeIds.add(node.id);
  assert.ok(Array.isArray(node.people) && node.people.length > 0, `${node.id} needs people`);

  node.people.forEach((person) => {
    assert.match(person.id, /^[a-z0-9][a-z0-9-]*$/, `invalid person id: ${person.id}`);
    assert.ok(!personIds.has(person.id), `duplicate person id: ${person.id}`);
    personIds.add(person.id);
    personCount += 1;
    assert.ok(person.name?.trim(), `${person.id} needs a name`);
    assert.ok(person.relation?.trim(), `${person.id} needs a relation`);
    assert.equal(person.current, undefined, `${person.id} must not store page-specific current state`);
    validateUrl(person.href, `${person.id}.href`);
  });

  if (node.children?.length) {
    expandableCount += 1;
    node.children.forEach(visit);
  }
}

visit(documentData.root);
assert.ok(
  personIds.has(documentData.defaultFocusPersonId),
  `default focus person is missing: ${documentData.defaultFocusPersonId}`,
);

function findNode(node, id) {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const match = findNode(child, id);
    if (match) return match;
  }
  return undefined;
}

const familyText = JSON.stringify(documentData);
for (const name of ["任之清", "任百智", "郜氏", "马胡彪", "马茹", "刘长轩", "任世美", "郜李俊"]) {
  assert.ok(familyText.includes(name), `confirmed family name is missing: ${name}`);
}
assert.ok(
  !/任之常|任百安|刘兴祥|任士美|郭李俊/.test(familyText),
  "superseded family names must not remain in the central tree",
);
assert.equal(nodeIds.size, 70, "unexpected family node count");
assert.equal(personCount, 113, "unexpected person count");
assert.equal(expandableCount, 27, "unexpected expandable branch count");

const zhiqingFamily = findNode(documentData.root, "ren-zhichang-family");
assert.equal(zhiqingFamily?.people[0]?.name, "任之清", "the grandfather node must be 任之清");
const baizhiFamily = findNode(documentData.root, "ren-baian-family");
assert.deepEqual(
  baizhiFamily?.people.map(({ relation, name, note }) => ({ relation, name, note })),
  [
    { relation: "长子", name: "任百智", note: "家人口述确认" },
    { relation: "配偶", name: "郜氏", note: "郜桥人" },
  ],
  "the 任百智 household is incorrect",
);
const baimeiFamily = findNode(documentData.root, "ren-baimei-family");
assert.equal(baimeiFamily?.children?.[0]?.people?.[0]?.name, "马胡彪", "任百美之子应为马胡彪");
const mahubiaoFamily = findNode(documentData.root, "ma-hubiao");
assert.deepEqual(
  mahubiaoFamily?.children?.[0]?.people?.[0],
  {
    relation: "女儿",
    name: "马茹",
    note: "家人口述补名",
    id: "ma-ru--person-1",
  },
  "马胡彪之女应为马茹",
);
const shirongFamily = findNode(documentData.root, "ren-shirong-family");
assert.equal(shirongFamily?.people?.[1]?.name, "刘长轩", "任世荣配偶应为刘长轩");
const shimeiFamily = findNode(documentData.root, "ren-shimei-family");
assert.equal(shimeiFamily?.people?.[0]?.name, "任世美", "手稿中的“世”字必须保留");
assert.equal(shimeiFamily?.people?.[1]?.name, "郜李俊", "任世美配偶应为郜李俊");
assert.match(shimeiFamily?.people?.[1]?.note ?? "", /育一女两男/, "任世美子女人数不完整");

console.log(
  `Family data valid: ${nodeIds.size} family nodes, ${personCount} people, ${expandableCount} expandable branches.`,
);

assert.equal(placesData.schemaVersion, 1, "places schemaVersion must be 1");
assert.match(placesData.mapId, /^[a-z0-9][a-z0-9-]*$/, "mapId is invalid");
assert.match(placesData.updatedAt, /^\d{4}-\d{2}-\d{2}$/, "places updatedAt must use YYYY-MM-DD");
assert.equal(new URL(placesData.styleUrl).protocol, "https:", "map style must use HTTPS");
assert.equal(placesData.coordinateSystem, "WGS84", "map coordinates must use WGS84");
assert.ok(placesData.researchNote?.trim(), "researchNote is required");
assert.ok(Array.isArray(placesData.places) && placesData.places.length > 0, "places are required");
assert.ok(Array.isArray(placesData.views) && placesData.views.length > 0, "map views are required");

const placeIds = new Set();
const placeCategories = new Set(["confirmed", "likely", "context"]);
const locationStatuses = new Set(["located", "reference", "unlocated"]);
const mappedPlaceIds = new Set();

function validateCoordinates(value, label) {
  assert.ok(Array.isArray(value) && value.length === 2, `${label} must be [longitude, latitude]`);
  assert.ok(value.every(Number.isFinite), `${label} must contain finite numbers`);
  assert.ok(value[0] >= -180 && value[0] <= 180, `${label} longitude is invalid`);
  assert.ok(value[1] >= -90 && value[1] <= 90, `${label} latitude is invalid`);
}

placesData.places.forEach((place) => {
  assert.match(place.id, /^[a-z0-9][a-z0-9-]*$/, `invalid place id: ${place.id}`);
  assert.ok(!placeIds.has(place.id), `duplicate place id: ${place.id}`);
  placeIds.add(place.id);
  assert.ok(place.name?.trim(), `${place.id} needs a name`);
  assert.ok(placeCategories.has(place.category), `${place.id} has an invalid category`);
  assert.ok(locationStatuses.has(place.locationStatus), `${place.id} has an invalid locationStatus`);
  if (place.locationStatus === "unlocated") {
    assert.equal(place.coordinates, undefined, `${place.id} must not map an unresolved location`);
  } else {
    validateCoordinates(place.coordinates, `${place.id}.coordinates`);
    mappedPlaceIds.add(place.id);
  }
  assert.ok(Array.isArray(place.people) && place.people.length > 0, `${place.id} needs people`);
  assert.ok(place.people.every((name) => name?.trim()), `${place.id} has an empty person name`);
  assert.ok(place.story?.trim(), `${place.id} needs a story`);
  assert.ok(place.evidence?.trim(), `${place.id} needs evidence`);
});

const viewIds = new Set();
placesData.views.forEach((view) => {
  assert.match(view.id, /^[a-z0-9][a-z0-9-]*$/, `invalid map view id: ${view.id}`);
  assert.ok(!viewIds.has(view.id), `duplicate map view id: ${view.id}`);
  viewIds.add(view.id);
  assert.ok(view.label?.trim(), `${view.id} needs a label`);
  assert.ok(Array.isArray(view.placeIds) && view.placeIds.length > 1, `${view.id} needs mapped places`);
  assert.equal(new Set(view.placeIds).size, view.placeIds.length, `${view.id} has duplicate places`);
  assert.ok(
    view.placeIds.every((placeId) => mappedPlaceIds.has(placeId)),
    `${view.id} contains an unknown or unlocated place`,
  );
});

assert.ok(
  !placesData.places.some((place) => ["小逯家", "小郜庄", "任李村", "四里庄"].includes(place.name)),
  "rejected map matches must not return as place records",
);
assert.ok(
  !JSON.stringify(placesData).includes("临涣小陆家庄") &&
    !JSON.stringify(documentData).includes("临涣小陆家庄"),
  "the rejected 临涣 reading must not return",
);
assert.ok(
  JSON.stringify(placesData).includes("南边小陆家庄") &&
    JSON.stringify(documentData).includes("南边小陆家庄"),
  "the corrected 南边 reading is required",
);
for (const id of ["gaosonglin", "guopinggou", "xiaolujia-south", "wangwei", "shuangdui"]) {
  const place = placesData.places.find((item) => item.id === id);
  assert.ok(place, `missing confirmed place: ${id}`);
  assert.equal(place.category, "confirmed", `${id} must preserve the family confirmation`);
  assert.equal(place.locationStatus, "located", `${id} needs a mapped location`);
}
const caoyuanzhuang = placesData.places.find((place) => place.id === "caoyuanzhuang");
assert.ok(caoyuanzhuang, "曹元庄 must remain a separate place record");
assert.equal(caoyuanzhuang.category, "confirmed", "曹元庄 is confirmed by family testimony");
assert.equal(caoyuanzhuang.locationStatus, "unlocated", "曹元庄 must not receive a guessed coordinate");
assert.ok(
  !/山西郭松林|王圩孜|小陆家（南边候选）|郭西沟/.test(JSON.stringify(placesData)),
  "superseded map readings must not return",
);

console.log(
  `Family places valid: ${placeIds.size} records, ${mappedPlaceIds.size} mapped, ${placeIds.size - mappedPlaceIds.size} awaiting location.`,
);
