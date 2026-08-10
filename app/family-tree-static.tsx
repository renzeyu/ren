/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The horizontally scrollable org chart needs a keyboard focus target. */

export type FamilyPerson = {
  id: string;
  relation: string;
  name: string;
  note?: string;
  href?: string;
};

export type FamilyNode = {
  id: string;
  sectionTitle?: string;
  people: FamilyPerson[];
  children?: FamilyNode[];
};

export type FamilyDocument = {
  schemaVersion: number;
  treeId: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  revision?: string;
  defaultFocusPersonId: string;
  root: FamilyNode;
};

function getFamilyLabel(node: FamilyNode) {
  return node.people.map((person) => person.name).join("与");
}

function getExpandedPath(node: FamilyNode, focusPersonId: string) {
  const expandedIds = new Set<string>();

  function visit(candidate: FamilyNode): boolean {
    let containsFocus = candidate.people.some((person) => person.id === focusPersonId);
    candidate.children?.forEach((child) => {
      if (visit(child)) containsFocus = true;
    });
    if (containsFocus && candidate.children?.length) expandedIds.add(candidate.id);
    return containsFocus;
  }

  if (!visit(node) && node.children?.length) expandedIds.add(node.id);
  return expandedIds;
}

function FamilyChartPerson({
  person,
  focusPersonId,
}: {
  person: FamilyPerson;
  focusPersonId: string;
}) {
  const focused = person.id === focusPersonId;
  return (
    <span
      className={`family-chart-person${focused ? " family-chart-person-current" : ""}`}
      data-family-person-id={person.id}
    >
      <span className="family-chart-relation">{person.relation}</span>
      <span className="family-chart-name">
        {person.href ? (
          <a href={person.href}>{person.name}</a>
        ) : (
          person.name
        )}
      </span>
      {person.note ? <span className="family-chart-person-note">{person.note}</span> : null}
    </span>
  );
}

function FamilyChartBranch({
  node,
  expandedIds,
  focusPersonId,
  viewId,
}: {
  node: FamilyNode;
  expandedIds: ReadonlySet<string>;
  focusPersonId: string;
  viewId: string;
}) {
  const familyLabel = getFamilyLabel(node);
  const hasChildren = Boolean(node.children?.length);
  const unitClassName = `family-chart-unit${node.people.length > 1 ? " family-chart-unit-couple" : ""}`;
  const people = (
    <span className="family-chart-people">
      {node.people.map((person) => (
        <FamilyChartPerson person={person} focusPersonId={focusPersonId} key={person.id} />
      ))}
    </span>
  );

  if (!hasChildren) {
    return (
      <li className="family-chart-branch family-chart-branch-leaf" data-family-node-id={node.id}>
        <div className={unitClassName} role="group" aria-label={familyLabel}>
          {people}
        </div>
      </li>
    );
  }

  return (
    <li className="family-chart-branch family-chart-branch-expandable" data-family-node-id={node.id}>
      <details className="family-chart-details" data-family-branch open={expandedIds.has(node.id)}>
        <summary className={`${unitClassName} family-chart-summary`}>
          {people}
          <span className="family-chart-toggle" aria-hidden="true" />
          <span className="family-chart-toggle-label">展开或收起{familyLabel}的后代</span>
        </summary>
        <ol
          className="family-chart-level family-chart-children"
          id={`${viewId}-${node.id}-children`}
          aria-label={`${familyLabel}的后代`}
        >
          {node.children?.map((child) => (
            <FamilyChartBranch
              node={child}
              expandedIds={expandedIds}
              focusPersonId={focusPersonId}
              viewId={viewId}
              key={child.id}
            />
          ))}
        </ol>
      </details>
    </li>
  );
}

export function FamilyTreeWidget({
  document,
  focusPersonId,
  viewId,
}: {
  document: FamilyDocument;
  focusPersonId: string;
  viewId: string;
}) {
  const expandedIds = getExpandedPath(document.root, focusPersonId);
  const treeId = `${viewId}-interactive-tree`;
  const titleId = `${viewId}-chart-title`;
  const noteId = `${viewId}-chart-note`;

  return (
    <div
      className="family-viewer family-interactive-viewer"
      data-family-interactive-tree
      data-ren-family-tree
      data-family-focus-person={focusPersonId}
      data-family-allow-query
    >
      <div className="family-chart-toolbar" role="group" aria-label="族谱展开控制">
        <button className="family-chart-action" type="button" data-family-expand-all aria-controls={treeId}>
          全部展开
        </button>
        <button className="family-chart-action" type="button" data-family-collapse-all aria-controls={treeId}>
          全部收起
        </button>
        <p className="family-chart-status" data-family-tree-status aria-live="polite" aria-atomic="true">
          默认展开任东风一支
        </p>
      </div>

      <div className="family-chart-view family-chart-view-interactive">
        <h2 className="family-panel-title" id={titleId}>
          完整族谱
        </h2>
        <div
          className="family-chart-scroll"
          id={treeId}
          role="region"
          aria-labelledby={titleId}
          aria-describedby={noteId}
          tabIndex={0}
        >
          <ol className="family-chart-level family-chart-root" data-family-root>
            <FamilyChartBranch
              node={document.root}
              expandedIds={expandedIds}
              focusPersonId={focusPersonId}
              viewId={viewId}
            />
          </ol>
        </div>
        <p className="family-chart-note" id={noteId}>
          选择任一家庭可以展开或收起该支。横向排列除文字注明外，不表示长幼顺序。
        </p>
      </div>
      <script src="/family-tree.js" defer data-static-interaction="" />
    </div>
  );
}
