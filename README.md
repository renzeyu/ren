# 郭合拉庄任氏族谱

这是任氏族谱的独立页面，也是任东风及未来家庭成员个人页面共用的族谱数据源。

线上地址：<https://renzeyu.github.io/ren/>

## 更新族谱

族谱唯一数据源是 `public/family-tree.json`。

家族地点、人物关联与故事保存在 `public/family-places.json`。坐标必须使用WGS84并按`[经度,纬度]`书写；来自高德地图的GCJ-02坐标不可直接填入。存疑地点应保留手稿原字、考证状态和定位说明。

每次更新时：

1. 修改人物或关系；已有 `id` 不要改名或复用。
2. 更新顶层 `updatedAt` 和 `revision`。
3. 运行 `npm run validate:data` 和 `npm test`。
4. 重新导出 `docs/` 并发布到 GitHub Pages。

任东风等个人页面会在访问时读取这份中央数据；若中央数据暂时无法载入，个人页面仍会显示其构建时保存的静态版本。

地图使用本地固定版本的MapLibre运行文件和OpenFreeMap底图。OpenFreeMap不可用时，服务器渲染的地点与故事目录仍然可读。

## 接入新的个人页面

页面保留一份静态族谱作为回退，并在最外层族谱容器提供：

```html
<div
  data-ren-family-tree
  data-family-focus-person="人物的稳定 ID"
  data-family-source="https://renzeyu.github.io/ren/family-tree.json"
>
  <!-- 静态族谱 -->
</div>

<script
  defer
  data-static-interaction
  src="https://renzeyu.github.io/ren/family-tree.js"
></script>
```

`data-family-focus-person` 决定页面默认展开哪位家人的一支。需要共用中央样式的新页面，还可以在容器上增加 `data-family-load-styles`。

## 本地验证与 GitHub Pages 导出

```bash
npm install
npm test
npm run start

STATIC_SOURCE_ORIGIN=http://127.0.0.1:3000 \
STATIC_CANONICAL_ORIGIN=https://renzeyu.github.io/ren/ \
STATIC_BASE_PATH=/ren \
npm run export:pages
```

将 `pages-dist/` 同步到 `docs/` 后，从 `main` 分支的 `/docs` 发布。
