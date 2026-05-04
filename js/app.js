const margin = [20, 120, 20, 180],
  width = 1580 - margin[1] - margin[3],
  height = 800 - margin[0] - margin[2];

let i = 0,
  duration = 1250,
  root;

const tree = d3.tree()
  // .size([height, width]); // substituído por nodeSize abaixo
  .nodeSize([32, 280]); // [vertical, horizontal] — horizontal é sobrescrito por column layout

const diagonal = d3.linkHorizontal()
  .x(d => d.y)
  .y(d => d.x);

const vis = d3.select("#body")
  .append("svg")
  .attr("width", width + margin[1] + margin[3])
  .attr("height", height + margin[0] + margin[2])
  .append("g")
  .attr("transform", `translate(${margin[3]},${margin[0]})`);

/* =========================
   LABEL MEASUREMENT (criado UMA vez, fora do update)
   ========================= */
const measureCanvas = vis.append("g")
  .attr("class", "text-measure")
  .style("visibility", "hidden");

const labelWidthCache = {};
function measureLabel(name) {
  if (labelWidthCache[name] !== undefined) return labelWidthCache[name];
  const tmp = measureCanvas.append("text").text(name);
  const w = tmp.node().getBBox().width;
  tmp.remove();
  labelWidthCache[name] = w;
  return w;
}

const hoverPanel = d3.select("#hover-panel");
let hideTimer = null;

function showPanel(event, d) {
  if (!d || !d.data || !d.data.name) return;

  clearTimeout(hideTimer);

  hoverPanel
    .html(renderPanel(d))
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY + 10) + "px")
    .classed("hidden", false);
}

function movePanel(event) {
  hoverPanel
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY + 10) + "px");
}

function hidePanel() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    hoverPanel.classed("hidden", true);
  }, 300);
}

function renderPanel(d) {
  const hasModelExamples =
    Array.isArray(d.data.model_examples) && d.data.model_examples.length > 0;

  return `
    <h3>${d.data.name}</h3>

    <div class="section">
      ${d.data.short_definition || "N/A"}
    </div>

    ${hasModelExamples ? `
      <div class="section">
        <div class="section-title">Model examples</div>
        <ul>
          ${d.data.model_examples.map(m => `<li>${m}</li>`).join("")}
        </ul>
      </div>
    ` : ""}
  `;
}


function copyHoverContent() {
  const panel = document.getElementById("hover-panel");
  const text = panel.innerText.trim();

  // Monta a referência usando a URL atual (funciona em /, /pt-br/, /es/)
  const siteName = "AI Knowledge Map";
  const siteUrl = window.location.origin + window.location.pathname;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const reference = `\n\nRetrieved from ${siteName} (${siteUrl}), on ${today}.`;

  const textWithReference = text + reference;

  // Clipboard moderno
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textWithReference);
  } else {
    // Fallback
    const textarea = document.createElement("textarea");
    textarea.value = textWithReference;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  // Feedback visual
  panel.classList.add("copied");
  setTimeout(() => {
    panel.classList.remove("copied");
  }, 800);
}

function update(source) {

  const treeData = tree(root);
  const nodes = treeData.descendants().reverse();
  const links = treeData.links();

  /* === 1. Posicionamento horizontal dinâmico por depth === */
  const widthLeftByDepth  = {};
  const widthRightByDepth = {};
  nodes.forEach(d => {
    const w = measureLabel(d.data.name);
    const goesLeft = !!(d.children || d._children);
    const bucket = goesLeft ? widthLeftByDepth : widthRightByDepth;
    bucket[d.depth] = Math.max(bucket[d.depth] || 0, w);
  });

  const padding = 40;
  const maxDepth = d3.max(nodes, d => d.depth);
  const columnX = { 0: 0 };
  for (let depth = 1; depth <= maxDepth; depth++) {
    const rightSide = widthRightByDepth[depth - 1] || 0;
    const leftSide  = widthLeftByDepth[depth]      || 0;
    columnX[depth] = columnX[depth - 1] + rightSide + leftSide + padding;
  }
  nodes.forEach(d => { d.y = columnX[d.depth]; });

  /* === 2. Extent vertical e redimensionamento do SVG === */
  let x0 = Infinity, x1 = -Infinity;
  nodes.forEach(d => {
    if (d.x < x0) x0 = d.x;
    if (d.x > x1) x1 = d.x;
  });

  const treeHeight = x1 - x0;
  const minHeight  = 600;
  const svgHeight  = Math.max(treeHeight + margin[0] + margin[2], minHeight);
  const yOffset    = (svgHeight - treeHeight) / 2 - x0;

  const lastColRight = widthRightByDepth[maxDepth] || widthLeftByDepth[maxDepth] || 0;
  const treeWidth    = columnX[maxDepth] + lastColRight;
  const svgWidth     = treeWidth + margin[1] + margin[3];

  d3.select("#body svg")
    .transition().duration(duration)
    .attr("height", svgHeight)
    .attr("width",  svgWidth);

  vis.transition().duration(duration)
    .attr("transform", `translate(${margin[3]}, ${yOffset})`);

  /* === 3. Render nodes/links === */
  const node = vis.selectAll("g.node")
    .data(nodes, d => d.id || (d.id = ++i));

  const nodeEnter = node.enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", `translate(${source.y0},${source.x0})`)
    .on("click", (event, d) => {
      toggle(d);
      update(d);
    })
    .on("mouseover", (event, d) => showPanel(event, d))
    .on("mousemove", (event) => movePanel(event))
    .on("mouseout", () => hidePanel());

  nodeEnter.append("circle")
    .attr("r", 1e-6)
    .style("fill", d => d._children ? "lightsteelblue" : "#fff");

  nodeEnter.append("a")
    .attr("target", "_blank")
    .attr("href", d => d.data.url)
    .append("text")
    .attr("x", d => d.children || d._children ? -15 : 15)
    .attr("dy", ".35em")
    .attr("text-anchor", d => d.children || d._children ? "end" : "start")
    .text(d => d.data.name)
    //.style("fill", d => d.data.free ? "black" : "#999")
    .style("fill-opacity", 1e-6);

  nodeEnter.append("title")
    .text(d => d.data.description);

  const nodeUpdate = node.merge(nodeEnter)
    .transition()
    .duration(duration)
    .attr("transform", d => `translate(${d.y},${d.x})`);

  nodeUpdate.select("circle")
    .attr("r", 8)
    .style("fill", d => d._children ? "lightsteelblue" : "#fff");

  nodeUpdate.select("text")
    .style("fill-opacity", 1);

  const nodeExit = node.exit()
    .transition()
    .duration(duration)
    .attr("transform", `translate(${source.y},${source.x})`)
    .remove();

  nodeExit.select("circle")
    .attr("r", 1e-6);

  nodeExit.select("text")
    .style("fill-opacity", 1e-6);

  const link = vis.selectAll("path.link")
    .data(links, d => d.target.id);

  const linkEnter = link.enter()
    .insert("path", "g")
    .attr("class", "link")
    .attr("d", () => {
      const o = { x: source.x0, y: source.y0 };
      return diagonal({ source: o, target: o });
    });

  linkEnter.merge(link)
    .transition()
    .duration(duration)
    .attr("d", diagonal);

  link.exit()
    .transition()
    .duration(duration)
    .attr("d", () => {
      const o = { x: source.x, y: source.y };
      return diagonal({ source: o, target: o });
    })
    .remove();

  nodes.forEach(d => {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

function toggle(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
}

function goDark() {
  document.body.classList.toggle("dark-Mode");
}

document.querySelector(".btn-toggle").addEventListener("click", goDark);

d3.json("data.json").then(data => {
  root = d3.hierarchy(data);
  root.x0 = height / 2;
  root.y0 = 0;

  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }

  if (root.children) {
    root.children.forEach(collapse);
  }

  update(root);
});

/* =========================
   HOVER PANEL EVENTS
   ========================= */

hoverPanel
  .on("mouseenter", () => {
    clearTimeout(hideTimer);
  })
  .on("mouseleave", hidePanel)
  .on("mousedown", (event) => {
    event.preventDefault();      // impede seleção
    copyHoverContent();          // copia tudo
  });
