(function () {
  "use strict";

  if (window.__REN_FAMILY_TREE_RENDERER__) return;
  window.__REN_FAMILY_TREE_RENDERER__ = true;

  const rendererScript = document.currentScript;
  const assetBase = rendererScript?.src
    ? new URL("./", rendererScript.src)
    : new URL("./", window.location.href);

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function safeUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  function assertFamilyDocument(documentData) {
    if (!documentData || documentData.schemaVersion !== 1 || !documentData.root) {
      throw new Error("Unsupported family data");
    }
  }

  function collectPeople(node, people = new Map()) {
    node.people.forEach((person) => people.set(person.id, person));
    node.children?.forEach((child) => collectPeople(child, people));
    return people;
  }

  function expandedPath(root, focusPersonId) {
    const expandedIds = new Set();

    function visit(node) {
      let containsFocus = node.people.some((person) => person.id === focusPersonId);
      node.children?.forEach((child) => {
        if (visit(child)) containsFocus = true;
      });
      if (containsFocus && node.children?.length) expandedIds.add(node.id);
      return containsFocus;
    }

    if (!visit(root) && root.children?.length) expandedIds.add(root.id);
    return expandedIds;
  }

  function expandedSubtree(root, targetNodeId) {
    const expandedIds = new Set();

    function expandDescendants(node) {
      if (!node.children?.length) return;
      expandedIds.add(node.id);
      node.children.forEach(expandDescendants);
    }

    function visit(node) {
      if (node.id === targetNodeId) {
        expandDescendants(node);
        return true;
      }
      for (const child of node.children ?? []) {
        if (visit(child)) {
          if (node.children?.length) expandedIds.add(node.id);
          return true;
        }
      }
      return false;
    }

    return visit(root) ? expandedIds : null;
  }

  function findNode(root, targetNodeId) {
    if (root.id === targetNodeId) return root;
    for (const child of root.children ?? []) {
      const match = findNode(child, targetNodeId);
      if (match) return match;
    }
    return null;
  }

  function renderPerson(person, focusPersonId, markFocusAsCurrentPage, showProfileLinks) {
    const focused = person.id === focusPersonId;
    const personNode = element(
      "span",
      `family-chart-person${focused ? " family-chart-person-current" : ""}`,
    );
    personNode.dataset.familyPersonId = person.id;
    personNode.append(element("span", "family-chart-relation", person.relation));

    const nameNode = element("span", "family-chart-name");
    const href = safeUrl(person.href);
    if (href && showProfileLinks) {
      const link = element("a", "", person.name);
      link.href = href;
      if (focused && markFocusAsCurrentPage) link.setAttribute("aria-current", "page");
      link.addEventListener("click", (event) => event.stopPropagation());
      nameNode.append(link);
    } else {
      nameNode.textContent = person.name;
    }
    personNode.append(nameNode);

    if (person.note) {
      personNode.append(element("span", "family-chart-person-note", person.note));
    }
    return personNode;
  }

  function renderPeople(node, focusPersonId, markFocusAsCurrentPage, showProfileLinks) {
    const peopleNode = element("span", "family-chart-people");
    node.people.forEach((person) =>
      peopleNode.append(
        renderPerson(person, focusPersonId, markFocusAsCurrentPage, showProfileLinks),
      ),
    );
    return peopleNode;
  }

  function renderBranch(
    node,
    expandedIds,
    focusPersonId,
    viewId,
    markFocusAsCurrentPage,
    showProfileLinks,
  ) {
    const hasChildren = Boolean(node.children?.length);
    const familyLabel = node.people.map((person) => person.name).join("与");
    const branch = element(
      "li",
      `family-chart-branch ${hasChildren ? "family-chart-branch-expandable" : "family-chart-branch-leaf"}`,
    );
    branch.dataset.familyNodeId = node.id;
    const unitClassName = `family-chart-unit${node.people.length > 1 ? " family-chart-unit-couple" : ""}`;

    if (!hasChildren) {
      const unit = element("div", unitClassName);
      unit.setAttribute("role", "group");
      unit.setAttribute("aria-label", familyLabel);
      unit.append(renderPeople(node, focusPersonId, markFocusAsCurrentPage, showProfileLinks));
      branch.append(unit);
      return branch;
    }

    const details = element("details", "family-chart-details");
    details.dataset.familyBranch = "";
    details.open = expandedIds.has(node.id);

    const summary = element("summary", `${unitClassName} family-chart-summary`);
    summary.append(renderPeople(node, focusPersonId, markFocusAsCurrentPage, showProfileLinks));
    const toggle = element("span", "family-chart-toggle");
    toggle.setAttribute("aria-hidden", "true");
    summary.append(toggle);
    summary.append(
      element("span", "family-chart-toggle-label", `展开或收起${familyLabel}的后代`),
    );
    details.append(summary);

    const children = element("ol", "family-chart-level family-chart-children");
    children.id = `${viewId}-${node.id}-children`;
    children.setAttribute("aria-label", `${familyLabel}的后代`);
    node.children.forEach((child) =>
      children.append(
        renderBranch(
          child,
          expandedIds,
          focusPersonId,
          viewId,
          markFocusAsCurrentPage,
          showProfileLinks,
        ),
      ),
    );
    details.append(children);
    branch.append(details);
    return branch;
  }

  function enhanceControls(tree, initialDescription) {
    const expandAllButton = tree.querySelector("[data-family-expand-all]");
    const collapseAllButton = tree.querySelector("[data-family-collapse-all]");
    const status = tree.querySelector("[data-family-tree-status]");
    if (!expandAllButton || !collapseAllButton) return;

    const branches = Array.from(tree.querySelectorAll("details[data-family-branch]"));
    let changingAll = false;

    const updateState = (message) => {
      const expandedCount = branches.filter((branch) => branch.open).length;
      expandAllButton.disabled = expandedCount === branches.length;
      collapseAllButton.disabled = expandedCount === 0;
      if (status) {
        status.textContent = message ?? `已展开${expandedCount}个分支，共${branches.length}个。`;
      }
    };

    expandAllButton.onclick = () => {
      changingAll = true;
      branches.forEach((branch) => {
        branch.open = true;
      });
      requestAnimationFrame(() => {
        changingAll = false;
        updateState(`已展开全部${branches.length}个分支。`);
      });
    };

    collapseAllButton.onclick = () => {
      changingAll = true;
      branches.forEach((branch) => {
        branch.open = false;
      });
      requestAnimationFrame(() => {
        changingAll = false;
        updateState("已收起全部分支。");
      });
    };

    branches.forEach((branch) => {
      branch.addEventListener("toggle", () => {
        if (!changingAll) updateState();
      });
    });

    tree.querySelectorAll("summary a").forEach((link) => {
      link.addEventListener("click", (event) => event.stopPropagation());
    });

    tree.dataset.enhanced = "true";
    const expandedCount = branches.filter((branch) => branch.open).length;
    updateState(`${initialDescription}，已打开${expandedCount}个分支。`);
  }

  function maybeLoadSharedStyles(tree) {
    if (!tree.hasAttribute("data-family-load-styles")) return;
    if (document.querySelector("link[data-ren-family-tree-styles]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("family-tree.css", assetBase).href;
    link.dataset.renFamilyTreeStyles = "";
    document.head.append(link);
  }

  function resolveFocusPerson(tree, documentData, people) {
    let focusPersonId = tree.dataset.familyFocusPerson || documentData.defaultFocusPersonId;
    let requestedByQuery = false;
    if (tree.hasAttribute("data-family-allow-query")) {
      const params = new URLSearchParams(window.location.search);
      const requestedFocus = params.get("person") || params.get("focus");
      if (requestedFocus && people.has(requestedFocus)) {
        focusPersonId = requestedFocus;
        requestedByQuery = true;
      }
    }
    return {
      focusPersonId: people.has(focusPersonId)
        ? focusPersonId
        : documentData.defaultFocusPersonId,
      requestedByQuery,
    };
  }

  async function loadFamilyData(tree) {
    const source = tree.dataset.familySource
      ? new URL(tree.dataset.familySource, window.location.href)
      : new URL("family-tree.json", assetBase);
    source.searchParams.set("v", String(Math.floor(Date.now() / 60000)));
    const response = await fetch(source, { cache: "no-store", mode: "cors" });
    if (!response.ok) throw new Error(`Family data returned ${response.status}`);
    return response.json();
  }

  async function enhanceFamilyTree(tree) {
    maybeLoadSharedStyles(tree);
    const staticPeople = new Map();
    tree.querySelectorAll("[data-family-person-id]").forEach((person) => {
      staticPeople.set(person.dataset.familyPersonId, { name: person.textContent.trim() });
    });

    try {
      const documentData = await loadFamilyData(tree);
      assertFamilyDocument(documentData);
      const people = collectPeople(documentData.root);
      const { focusPersonId, requestedByQuery } = resolveFocusPerson(
        tree,
        documentData,
        people,
      );
      const focusPerson = people.get(focusPersonId);
      const root = tree.querySelector("[data-family-root]");
      if (!root) throw new Error("Family tree root is missing");

      const viewId = root.closest("[id]")?.id || documentData.treeId;
      const defaultExpandedNodeId = tree.dataset.familyDefaultExpandedNode;
      const defaultExpandedNode = defaultExpandedNodeId
        ? findNode(documentData.root, defaultExpandedNodeId)
        : null;
      const expandedIds =
        !requestedByQuery && defaultExpandedNodeId
          ? expandedSubtree(documentData.root, defaultExpandedNodeId) ??
            expandedPath(documentData.root, focusPersonId)
          : expandedPath(documentData.root, focusPersonId);
      const markFocusAsCurrentPage = tree.hasAttribute("data-family-profile-page");
      const showProfileLinks = tree.dataset.familyProfileLinks !== "false";
      root.replaceChildren(
        renderBranch(
          documentData.root,
          expandedIds,
          focusPersonId,
          viewId,
          markFocusAsCurrentPage,
          showProfileLinks,
        ),
      );
      tree.dataset.familyRevision = documentData.revision || documentData.updatedAt;

      document.querySelectorAll("[data-family-updated]").forEach((node) => {
        const [year, month, day] = documentData.updatedAt.split("-");
        node.textContent = `${year}年${Number(month)}月${Number(day)}日更新`;
      });
      const initialDescription =
        !requestedByQuery && defaultExpandedNode
          ? `默认展开${defaultExpandedNode.people[0]?.name || "指定人物"}以下全部家人`
          : requestedByQuery
            ? `已定位到${focusPerson?.name || "当前人物"}`
            : `默认展开${focusPerson?.name || "当前人物"}一支`;
      enhanceControls(tree, initialDescription);
      tree.dispatchEvent(
        new CustomEvent("ren-family-tree:ready", {
          bubbles: true,
          detail: { revision: tree.dataset.familyRevision, focusPersonId },
        }),
      );
    } catch (error) {
      const fallbackFocusId = tree.dataset.familyFocusPerson;
      const fallbackName = staticPeople.get(fallbackFocusId)?.name || "当前人物";
      const fallbackDefault = tree.dataset.familyDefaultExpandedNode
        ? "默认展开任之清以下全部家人"
        : `默认展开${fallbackName}一支`;
      enhanceControls(tree, fallbackDefault);
      const status = tree.querySelector("[data-family-tree-status]");
      if (status) status.textContent = "中央族谱暂时无法载入，正在显示页面保存的版本。";
      console.warn("Family tree update failed; using the page snapshot.", error);
    }
  }

  function start() {
    document.querySelectorAll("[data-ren-family-tree]").forEach(enhanceFamilyTree);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
