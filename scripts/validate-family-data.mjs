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
  !placesData.places.some((place) => ["小逯家", "小郜庄", "郭平沟", "任李村", "四里庄"].includes(place.name)),
  "rejected map matches must not return as place records",
);

console.log(
  `Family places valid: ${placeIds.size} records, ${mappedPlaceIds.size} mapped, ${placeIds.size - mappedPlaceIds.size} awaiting location.`,
);
