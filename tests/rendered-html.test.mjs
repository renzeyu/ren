import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const publicRoot = new URL("../public/", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

function countMatches(value, pattern) {
  return value.match(pattern)?.length ?? 0;
}

test("server-renders the standalone Ren family tree", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="zh-CN"/i);
  assert.match(html, /<title>郭合拉庄任氏族谱<\/title>/);
  assert.match(html, /安徽濉溪·郭合拉庄/);
  assert.match(html, /依据任百全1999年所写《郭合拉庄任氏家族简记》/);
  assert.match(html, />家族地理</);
  assert.match(html, />一份手稿，落在一张地图上</);
  assert.match(html, />郭合拉庄</);
  assert.match(html, />郜桥村</);
  assert.match(html, />小田家</);
  assert.match(html, />田寺庄</);
  assert.match(html, />小陆家</);
  assert.match(html, /南边小陆家庄/);
  assert.match(html, />郜松林</);
  assert.match(html, />郭平沟</);
  assert.match(html, />王圩村</);
  assert.match(html, />曹元庄</);
  assert.match(html, />双堆集镇</);
  assert.doesNotMatch(html, /临涣小陆家庄/);
  assert.match(html, />位置尚待确认</);
  assert.match(html, />郭合拉周边</);
  assert.match(html, />全部已定位地点</);
  assert.match(html, />浍河</);
  assert.match(html, /data-family-map(?:="")?/);
  assert.match(html, /data-family-map-canvas(?:="")?/);
  assert.match(html, /data-family-map-source="\/family-places\.json"/);
  assert.match(html, /data-family-map-view="local"/);
  assert.match(html, /data-family-map-view="all"/);
  assert.doesNotMatch(html, /<h4>小逯家<\/h4>|<h4>小郜庄<\/h4>/);
  assert.match(html, />完整族谱</);
  assert.match(html, />默认展开任东风一支</);
  assert.match(html, />全部展开</);
  assert.match(html, />全部收起</);
  assert.ok(
    html.indexOf(">完整族谱<") < html.indexOf(">一份手稿，落在一张地图上<"),
    "the family tree must appear before the map",
  );
  assert.match(html, />任东风</);
  assert.match(html, />任欣欣</);
  assert.match(html, />董徽</);
  assert.match(html, />任天弋</);
  assert.match(html, />任之清</);
  assert.match(html, />任百智</);
  assert.match(html, />郜氏</);
  assert.match(html, />马胡彪</);
  assert.match(html, />刘长轩</);
  assert.match(html, />任世美</);
  assert.match(html, />郜李俊</);
  assert.match(html, /育一女两男/);
  assert.doesNotMatch(html, /任之常|任百安|刘兴祥|任士美|郭李俊/);

  assert.match(html, /data-ren-family-tree="true"/);
  assert.match(html, /data-family-interactive-tree="true"/);
  assert.match(html, /data-family-focus-person="ren-dongfeng"/);
  assert.match(html, /data-family-allow-query="true"/);
  assert.match(html, /data-family-root="true"/);
  assert.match(html, /data-family-expand-all="true"/);
  assert.match(html, /data-family-collapse-all="true"/);

  assert.equal(countMatches(html, /<details\b/gi), 26);
  assert.equal(
    countMatches(html, /<details\b[^>]*\sopen(?:=(?:""|''|"open"|'open'))?(?=\s|>)/gi),
    5,
  );

  assert.match(html, /<link[^>]+href="\/family-tree\.css"[^>]*>/i);
  assert.match(html, /<link[^>]+href="\/maplibre-gl\.css"[^>]*>/i);
  assert.match(html, /<script[^>]+src="\/family-tree\.js"[^>]*data-static-interaction/i);
  assert.match(html, /<script[^>]+type="module"[^>]+src="\/family-map\.mjs"[^>]*data-static-interaction/i);
  assert.match(html, /<link[^>]+rel="canonical"[^>]+href="https:\/\/renzeyu\.github\.io\/ren\/"/i);
});

test("ships the central data, renderer, and scoped tree stylesheet", async () => {
  const dataUrl = new URL("family-tree.json", publicRoot);
  const scriptUrl = new URL("family-tree.js", publicRoot);
  const cssUrl = new URL("family-tree.css", publicRoot);

  await Promise.all([access(dataUrl), access(scriptUrl), access(cssUrl)]);
  const [dataSource, script, css] = await Promise.all([
    readFile(dataUrl, "utf8"),
    readFile(scriptUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  const data = JSON.parse(dataSource);

  assert.equal(data.schemaVersion, 1);
  assert.equal(data.treeId, "guohela-ren-family");
  assert.equal(data.title, "郭合拉庄任氏族谱");
  assert.equal(data.defaultFocusPersonId, "ren-dongfeng");
  assert.ok(data.updatedAt);
  assert.ok(data.root);
  assert.match(dataSource, /任之清/);
  assert.match(dataSource, /任百智/);
  assert.match(dataSource, /郜氏/);
  assert.match(dataSource, /马胡彪/);
  assert.match(dataSource, /刘长轩/);
  assert.match(dataSource, /任世美/);
  assert.match(dataSource, /郜李俊/);
  assert.doesNotMatch(dataSource, /任之常|任百安|刘兴祥|任士美|郭李俊/);

  const findNode = (node, id) =>
    node.id === id
      ? node
      : (node.children ?? []).map((child) => findNode(child, id)).find(Boolean);
  assert.equal(findNode(data.root, "ren-zhichang-family")?.people[0]?.name, "任之清");
  assert.deepEqual(
    findNode(data.root, "ren-baian-family")?.people.map((person) => person.name),
    ["任百智", "郜氏"],
  );
  assert.equal(findNode(data.root, "ren-baimei-family")?.children?.[0]?.people?.[0]?.name, "马胡彪");
  assert.equal(findNode(data.root, "ren-shirong-family")?.people?.[1]?.name, "刘长轩");
  assert.deepEqual(
    findNode(data.root, "ren-shimei-family")?.people.map((person) => person.name),
    ["任世美", "郜李俊"],
  );

  assert.match(script, /family-tree\.json/);
  assert.match(script, /familyFocusPerson/);
  assert.match(script, /data-ren-family-tree/);
  assert.match(script, /fetch\(/);
  assert.match(css, /\[data-ren-family-tree\]/);
  assert.match(css, /\.family-chart-details/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(
    css,
    /family-chart-person-current[^}]*text-decoration-color:\s*var\(--family-accent\)/s,
  );
});

test("ships the family geography data and local MapLibre runtime", async () => {
  const placesUrl = new URL("family-places.json", publicRoot);
  const mapScriptUrl = new URL("family-map.mjs", publicRoot);
  const mapLibreUrl = new URL("maplibre-gl.mjs", publicRoot);
  const mapLibreSharedUrl = new URL("maplibre-gl-shared.mjs", publicRoot);
  const mapLibreWorkerUrl = new URL("maplibre-gl-worker.mjs", publicRoot);
  const mapLibreCssUrl = new URL("maplibre-gl.css", publicRoot);
  const licenseUrl = new URL("maplibre-license.txt", publicRoot);

  await Promise.all([
    access(placesUrl),
    access(mapScriptUrl),
    access(mapLibreUrl),
    access(mapLibreSharedUrl),
    access(mapLibreWorkerUrl),
    access(mapLibreCssUrl),
    access(licenseUrl),
  ]);

  const [placesSource, mapScript] = await Promise.all([
    readFile(placesUrl, "utf8"),
    readFile(mapScriptUrl, "utf8"),
  ]);
  const places = JSON.parse(placesSource);

  assert.equal(places.schemaVersion, 1);
  assert.equal(places.mapId, "guohela-family-geography");
  assert.equal(places.styleUrl, "https://tiles.openfreemap.org/styles/positron");
  assert.equal(places.coordinateSystem, "WGS84");
  assert.ok(places.views.length >= 2);
  assert.ok(places.places.length >= 18);
  assert.ok(places.places.filter((place) => place.coordinates).length >= 10);
  assert.ok(places.places.filter((place) => place.locationStatus === "unlocated").length >= 5);
  assert.ok(places.places.some((place) => place.id === "xiaotianjia"));
  assert.ok(places.places.some((place) => place.id === "xiaolujia-south"));
  assert.ok(places.places.some((place) => place.id === "tiansizhuang"));
  assert.ok(places.places.some((place) => place.id === "xiaoningjia"));
  for (const id of ["gaosonglin", "guopinggou", "xiaolujia-south", "wangwei", "shuangdui"]) {
    const place = places.places.find((item) => item.id === id);
    assert.ok(place, `missing confirmed place: ${id}`);
    assert.equal(place.category, "confirmed");
    assert.equal(place.locationStatus, "located");
    assert.equal(place.coordinates.length, 2);
  }
  const caoyuanzhuang = places.places.find((place) => place.id === "caoyuanzhuang");
  assert.ok(caoyuanzhuang);
  assert.equal(caoyuanzhuang.category, "confirmed");
  assert.equal(caoyuanzhuang.locationStatus, "unlocated");
  assert.equal(caoyuanzhuang.coordinates, undefined);
  assert.match(placesSource, /南边小陆家庄/);
  assert.doesNotMatch(placesSource, /临涣小陆家庄/);
  assert.doesNotMatch(placesSource, /山西郭松林|王圩孜|小陆家（南边候选）|郭西沟/);
  const unresolvedAggregate = places.places.find((place) => place.id === "other-unlocated-places");
  assert.ok(unresolvedAggregate);
  assert.doesNotMatch(unresolvedAggregate.manuscriptName, /曹元庄|郭西沟/);
  assert.ok(places.places.every((place) => place.coordinateNote));
  assert.ok(
    places.places
      .filter((place) => place.locationStatus === "unlocated")
      .every((place) => place.coordinates === undefined),
  );
  assert.ok(
    places.places.every(
      (place) => !["小逯家", "小郜庄", "任李村", "四里庄"].includes(place.name),
    ),
  );

  assert.match(mapScript, /from "\.\/maplibre-gl\.mjs"/);
  assert.match(mapScript, /family-places\.json/);
  assert.match(mapScript, /ScaleControl/);
  assert.match(mapScript, /showView/);
  assert.match(mapScript, /locationStatus === "unlocated"/);
  assert.match(mapScript, /setDOMContent/);
  assert.doesNotMatch(mapScript, /setHTML\(/);
  assert.doesNotMatch(mapScript, /unpkg|jsdelivr/i);
});

test("contains no starter preview or loading-skeleton remnants", async () => {
  const response = await render();
  const html = await response.text();
  const [page, layout, packageSource] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageSource);

  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/i);
  assert.doesNotMatch(html, /react-loading-skeleton/i);
  assert.doesNotMatch(page, /SkeletonPreview|_sites-preview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.equal(packageJson.dependencies?.["react-loading-skeleton"], undefined);

  await assert.rejects(access(new URL("app/_sites-preview/", projectRoot)));
});
