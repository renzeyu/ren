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
  assert.match(html, />完整族谱</);
  assert.match(html, />默认展开任东风一支</);
  assert.match(html, />全部展开</);
  assert.match(html, />全部收起</);
  assert.match(html, />任东风</);
  assert.match(html, />任欣欣</);
  assert.match(html, />董徽</);
  assert.match(html, />任天弋</);

  assert.match(html, /data-ren-family-tree="true"/);
  assert.match(html, /data-family-interactive-tree="true"/);
  assert.match(html, /data-family-focus-person="ren-dongfeng"/);
  assert.match(html, /data-family-allow-query="true"/);
  assert.match(html, /data-family-root="true"/);
  assert.match(html, /data-family-expand-all="true"/);
  assert.match(html, /data-family-collapse-all="true"/);

  assert.equal(countMatches(html, /<details\b/gi), 25);
  assert.equal(
    countMatches(html, /<details\b[^>]*\sopen(?:=(?:""|''|"open"|'open'))?(?=\s|>)/gi),
    5,
  );

  assert.match(html, /<link[^>]+href="\/family-tree\.css"[^>]*>/i);
  assert.match(html, /<script[^>]+src="\/family-tree\.js"[^>]*data-static-interaction/i);
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

  assert.match(script, /family-tree\.json/);
  assert.match(script, /familyFocusPerson/);
  assert.match(script, /data-ren-family-tree/);
  assert.match(script, /fetch\(/);
  assert.match(css, /\[data-ren-family-tree\]/);
  assert.match(css, /\.family-chart-details/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
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
