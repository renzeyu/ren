import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dataPath = new URL("../public/family-tree.json", import.meta.url);
const documentData = JSON.parse(await readFile(dataPath, "utf8"));

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
