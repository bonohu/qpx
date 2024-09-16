require.config({
  paths: {
    d3: "https://d3js.org/d3.v4.min",
  },
});

require.undef("pathway_d3_view_widget");

define("pathway_d3_view_widget", ["@jupyter-widgets/base", "d3"], function (
  widgets,
  d3
) {
  const defaultFont = `"Liberation Sans", Arial, sans-serif`;
  const defaultFontSize = 12;
  const cellHeight = 700;
  let nodes = [];
  let selectedNodes = [];
  let view = null;

  function arrowHeadType(gpmlArrowType) {
    switch (gpmlArrowType) {
      case "Arrow":
      case "mim-conversion":
        return "url(#marker-arrow)"; // -▶
      case "mim-catalysis":
        return "url(#marker-circle)"; // -◯
      case "mim-inhibition":
        return "url(#marker-pipe)"; // -|
      case "mim-modification":
        return "url(#marker-open-arrow)"; // ->
    }
    return "";
  }

  function drawGroups(nodes, graphic, groups) {
    let nodeGroups = {}; // A map like { GroupId: {minX, minY, maxX, maxY} }
    nodes.forEach((node) => {
      let groupId = node.GroupRef;
      if (!groupId) {
        return;
      }
      if (nodeGroups[groupId] === undefined) {
        nodeGroups[groupId] = {
          minX: node.CenterX - node.Width / 2,
          minY: node.CenterY - node.Height / 2,
          maxX: node.CenterX + node.Width / 2,
          maxY: node.CenterY + node.Height / 2,
        };
      } else {
        nodeGroups[groupId].minX = Math.min(
          nodeGroups[groupId].minX,
          node.CenterX - node.Width / 2
        );
        nodeGroups[groupId].minY = Math.min(
          nodeGroups[groupId].minY,
          node.CenterY - node.Height / 2
        );
        nodeGroups[groupId].maxX = Math.max(
          nodeGroups[groupId].maxX,
          node.CenterX + node.Width / 2
        );
        nodeGroups[groupId].maxY = Math.max(
          nodeGroups[groupId].maxY,
          node.CenterY + node.Height / 2
        );
      }
    });
    let groupMargin = 10;

    for (let group of groups) {
      if (nodeGroups[group.GroupId]) {
        if (group.Style === "Complex") {
          // Draw octagon
          let range = nodeGroups[group.GroupId];
          let x = range.minX - groupMargin;
          let y = range.minY - groupMargin;
          let width = range.maxX - range.minX + groupMargin * 2;
          let height = range.maxY - range.minY + groupMargin * 2;
          let r = Math.max(10, width / 10, height / 10); // Radius of the corner
          let path = `M ${x + r} ${y} h ${width - r * 2} l ${r} ${r} v ${
            height - r * 2
          } l ${-r} ${r} h ${-width + r * 2} l ${-r} ${-r} v ${
            -height + r * 2
          } l ${r} ${-r} z`;
          graphic
            .append("path")
            .attr("d", path)
            .attr("fill", "#f6f6ee")
            .attr("stroke", "gray")
            .attr("stroke-width", 1);
        } else {
          let range = nodeGroups[group.GroupId];
          graphic
            .append("rect")
            .attr("class", "group-rect")
            .attr("x", range.minX - groupMargin)
            .attr("y", range.minY - groupMargin)
            .attr("width", range.maxX - range.minX + groupMargin * 2)
            .attr("height", range.maxY - range.minY + groupMargin * 2)
            .attr("fill", "#f6f6ee")
            .attr("stroke", "gray")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5");
        }
      }
    }
  }

  function addMarkers(svg, markerBoxSize, refX, refY) {
    svg
      .append("defs")
      .append("marker")
      .attr("id", "marker-arrow")
      .attr("viewBox", [0, 0, markerBoxSize, markerBoxSize])
      .attr("refX", refX)
      .attr("refY", refY)
      .attr("markerWidth", markerBoxSize)
      .attr("markerHeight", markerBoxSize)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr(
        "d",
        `M ${markerBoxSize} ${markerBoxSize / 2} L 0 ${markerBoxSize} L 0 0 z`
      )
      .attr("fill", "#000000");

    const margin = 2; // Margin to avoid cropping by the edge of the marker
    svg
      .append("defs")
      .append("marker")
      .attr("id", "marker-circle")
      .attr("viewBox", [
        -margin / 2,
        -margin / 2,
        markerBoxSize + margin / 2,
        markerBoxSize + margin / 2,
      ])
      .attr("refX", refX)
      .attr("refY", refY)
      .attr("markerWidth", markerBoxSize)
      .attr("markerHeight", markerBoxSize)
      .attr("orient", "auto-start-reverse")
      .append("circle")
      .attr("cx", markerBoxSize / 2)
      .attr("cy", markerBoxSize / 2)
      .attr("r", markerBoxSize / 2 - margin / 2)
      .attr("stroke", "#000000")
      .attr("fill", "white");

    svg
      .append("defs")
      .append("marker")
      .attr("id", "marker-pipe")
      .attr("viewBox", [0, 0, markerBoxSize, markerBoxSize])
      .attr("refX", refX)
      .attr("refY", refY)
      .attr("markerWidth", markerBoxSize)
      .attr("markerHeight", markerBoxSize)
      .attr("orient", "auto-start-reverse")
      .append("line")
      .attr("x1", markerBoxSize)
      .attr("y1", 0)
      .attr("x2", markerBoxSize)
      .attr("y2", markerBoxSize)
      .attr("stroke", "#000000");

    svg
      .append("defs")
      .append("marker")
      .attr("id", "marker-open-arrow")
      .attr("viewBox", [0, 0, markerBoxSize, markerBoxSize])
      .attr("refX", refX)
      .attr("refY", refY)
      .attr("markerWidth", markerBoxSize)
      .attr("markerHeight", markerBoxSize)
      .attr("orient", "auto-start-reverse")
      .append("polyline")
      .attr(
        "points",
        `0,0 ${markerBoxSize},${markerBoxSize / 2} 0,${markerBoxSize}`
      )
      .attr("fill", "transparent")
      .attr("stroke", "#000000");
  }

  function drawLinks(links, svg) {
    const markerBoxSize = 10,
      refXFactor = 1,
      refYFactor = 0.5;
    const arrowPoints = [
      [markerBoxSize, markerBoxSize / 2],
      [0, markerBoxSize],
      [0, 0],
    ];
    const refX = markerBoxSize * refXFactor;
    const refY = markerBoxSize * refYFactor;

    links.forEach((link) => {
      link.pointsAfterOffset = link.points.map((point) => {
        return {
          X: point.X + point.RelX,
          Y: point.Y + point.RelY,
        };
      });
      if (
        link.points[0].ArrowHead === "mim-inhibition" ||
        link.points[link.points.length - 1].ArrowHead === "mim-inhibition"
      ) {
        let length = Math.sqrt(
          Math.pow(
            link.points[link.points.length - 1].X - link.points[0].X,
            2
          ) +
            Math.pow(
              link.points[link.points.length - 1].Y - link.points[0].Y,
              2
            )
        );
        let cosine =
          (link.points[link.points.length - 1].X - link.points[0].X) / length;
        let sine =
          (link.points[link.points.length - 1].Y - link.points[0].Y) / length;

        if (link.points[0].ArrowHead === "mim-inhibition") {
          link.pointsAfterOffset[0].X += (cosine * markerBoxSize) / 2;
          link.pointsAfterOffset[0].Y += (sine * markerBoxSize) / 2;
        } else {
          link.pointsAfterOffset[link.points.length - 1].X -=
            (cosine * markerBoxSize) / 2;
          link.pointsAfterOffset[link.points.length - 1].Y -=
            (sine * markerBoxSize) / 2;
        }
      }
    });

    function connectionSide(relX, relY) {
      if (relX === null && relY === null) {
        return null;
      }
      if (Math.abs(relX) > Math.abs(relY)) {
        if (relX > 0) {
          return "east";
        } else {
          return "west";
        }
      } else {
        if (relY > 0) {
          return "south";
        } else {
          return "north";
        }
      }
    }

    function calculateWayPoints(connectionPoints) {
      let wayPoints = [];
      const SEGMENT_OFFSET = 20; // 中継点のオフセット
      console.log(connectionPoints);
      let previousHorizontal = false;
      for (let i = 0; i < connectionPoints.length - 1; i++) {
        let point1 = connectionPoints[i];
        let point2 = connectionPoints[i + 1];
        let side1 = connectionSide(point1.RelX, point1.RelY);
        let side2 = connectionSide(point2.RelX, point2.RelY);

        let horizontal1 = side1 === "west" || side1 === "east";
        let horizontal2 = side2 === "west" || side2 === "east";
        wayPoints.push(point1);

        if (side1 === null) {
          // RelXやRelYから方向が決定できない場合
          if (!previousHorizontal) {
            // 直前と垂直な方向に曲げる
            wayPoints.push({
              X: point2.X,
              Y: point1.Y,
            });
            previousHorizontal = true;
          } else {
            wayPoints.push({
              X: point1.X,
              Y: point2.Y,
            });
            previousHorizontal = false;
          }
        } else {
          previousHorizontal = horizontal1;
          if ((horizontal1 && horizontal2) || (!horizontal1 && !horizontal2)) {
            // 中継点を挟む場合
            if (horizontal1) {
              wayPoints.push({
                X:
                  point1.X +
                  SEGMENT_OFFSET * (point2.X - point1.X > 0 ? 1 : -1),
                Y: point1.Y,
              });
              wayPoints.push({
                X:
                  point1.X +
                  SEGMENT_OFFSET * (point2.X - point1.X > 0 ? 1 : -1),
                Y: point2.Y,
              });
            } else {
              wayPoints.push({
                X: point1.X,
                Y:
                  point1.Y +
                  SEGMENT_OFFSET * (point2.Y - point1.Y > 0 ? 1 : -1),
              });
              wayPoints.push({
                X: point2.X,
                Y:
                  point1.Y +
                  SEGMENT_OFFSET * (point2.Y - point1.Y > 0 ? 1 : -1),
              });
            }
          } else {
            // シンプルなL字型
            if (horizontal1) {
              wayPoints.push({
                X: point2.X,
                Y: point1.Y,
              });
            } else {
              wayPoints.push({
                X: point1.X,
                Y: point2.Y,
              });
            }
          }
        }
      }
      wayPoints.push(connectionPoints[connectionPoints.length - 1]);
      return wayPoints;
    }

    function drawLine(
      d3Selector,
      point1,
      point2,
      lineStyle,
      startArrowHeadType,
      endArrowHeadType
    ) {
      d3Selector
        .append("line")
        .attr("x1", point1.X)
        .attr("y1", point1.Y)
        .attr("x2", point2.X)
        .attr("y2", point2.Y)
        .attr("stroke", "black")
        .attr("marker-start", startArrowHeadType)
        .attr("marker-end", endArrowHeadType)
        .attr("stroke-dasharray", lineStyle === "Broken" ? "5,5" : null)
        .attr("fill", "none");
    }

    svg
      .selectAll("line")
      .data(links)
      .enter()
      .each(function (d) {
        if (d.Graphics?.ConnectorType === "Elbow") {
          let wayPoints = calculateWayPoints(d.points);
          console.log({ wayPoints });
          for (let i = 0; i < wayPoints.length - 1; i++) {
            drawLine(
              d3.select(this),
              wayPoints[i],
              wayPoints[i + 1],
              d.Graphics?.LineStyle,
              arrowHeadType(wayPoints[i].ArrowHead),
              arrowHeadType(wayPoints[i + 1].ArrowHead)
            );
          }
        } else {
          for (let i = 0; i < d.pointsAfterOffset.length - 1; i++) {
            drawLine(
              d3.select(this),
              d.pointsAfterOffset[i],
              d.pointsAfterOffset[i + 1],
              d.Graphics?.LineStyle,
              arrowHeadType(d.points[i].ArrowHead),
              arrowHeadType(d.points[i + 1].ArrowHead)
            );
          }
        }
      });

    addMarkers(svg, markerBoxSize, refX, refY);
  }

  function drawNodes(nodes, graphic, view) {
    const nodeRoundRadius = 10;
    view.nodes = graphic
      .selectAll("rect.node-rect")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("class", "node-rect")
      .attr("x", (d) => d.CenterX - d.Width / 2)
      .attr("y", (d) => d.CenterY - d.Height / 2)
      .attr("width", (d) => d.Width)
      .attr("height", (d) => d.Height)
      .attr("rx", (d) =>
        d.ShapeType === "RoundRectangle" ? nodeRoundRadius : 0
      )
      .attr("ry", (d) =>
        d.ShapeType === "RoundRectangle" ? nodeRoundRadius : 0
      )
      .attr("fill", "white")
      .style("stroke", (d) => `#${d.Color}`)
      .style("cursor", "pointer")
      .on("click", onNodeClicked);
    // Prevent zooming when double-clicking on a node
    view.nodes.on("dblclick", function () {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    });
  }

  function zoomToFit(nodes, d3Svg, d3Graphic, duration = 0) {
    let bounds = {
      x: Infinity,
      y: Infinity,
      width: -Infinity,
      height: -Infinity,
    };
    for (let node of nodes) {
      let nodeBounds = {
        x: node.CenterX - node.Width / 2,
        y: node.CenterY - node.Height / 2,
        width: node.Width,
        height: node.Height,
      };
      bounds.x = Math.min(bounds.x, nodeBounds.x);
      bounds.y = Math.min(bounds.y, nodeBounds.y);
      bounds.width = Math.max(
        bounds.width,
        nodeBounds.x - bounds.x + nodeBounds.width
      );
      bounds.height = Math.max(
        bounds.height,
        nodeBounds.y - bounds.y + nodeBounds.height
      );
    }
    let svgElement = document.getElementById("svg2");
    let fullWidth = svgElement.clientWidth,
      fullHeight = svgElement.clientHeight;
    let width = bounds.width,
      height = bounds.height;
    let midX = bounds.x + width / 2,
      midY = bounds.y + height / 2;
    if (width <= 0 || height <= 0) return;
    const marginFactor = 0.8;
    let scale = marginFactor / Math.max(width / fullWidth, height / fullHeight);
    let translate = [
      fullWidth / 2 - scale * midX,
      fullHeight / 2 - scale * midY,
    ];
    d3Graphic
      .transition()
      .duration(duration || 0)
      .attr("transform", `translate(${translate}) scale(${scale})`);
    d3Svg.call(
      d3.zoom().transform,
      d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    );
  }

  function drawNodeTexts(nodes, graphic, view) {
    function linebreakText(node) {
      // 改行を含む文字列をtspanで分割して表示する（SVGでは\nが効かないため）
      try {
        if (!node.TextLabel || !node.TextLabel.includes("\n")) {
          return node.TextLabel;
        }
        let textList = node.TextLabel.split("\n");
        let string = "";
        let fontSize = node.FontSize
          ? parseInt(node.FontSize)
          : defaultFontSize;
        textList.forEach((t, i) => {
          string += `<tspan y="${
            (i - (textList.length - 1) / 2) * fontSize + node.CenterY
          }px" x="${node.CenterX}">${t}</tspan>`;
        });
        return string;
      } catch (e) {
        console.error(e);
        return node.TextLabel;
      }
    }

    view.nodeTexts = graphic
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("x", (d) => d.CenterX)
      .attr("y", (d) => d.CenterY)
      .attr("fill", (d) => `#${d.Color}`)
      .attr("stroke-width", "0px")
      .html((d) => linebreakText(d))
      .style("text-anchor", "middle")
      .style("dominant-baseline", "central")
      .style("cursor", "pointer")
      .style("font-family", (d) => d.FontName || defaultFont)
      .style("font-size", (d) => d.FontSize || `${defaultFontSize}px`)
      .style("font-weight", (d) => d.FontWeight || "normal")
      .style("font-style", (d) => d.FontStyle || "normal")
      .style("text-decoration-line", (d) => {
        let decorationString = "";
        if (d.FontDecoration === "Underline") {
          decorationString += " underline";
        }
        if (d.FontStrikethru === "Strikethru") {
          decorationString += " line-through";
        }
        return decorationString;
      })
      .on("click", onNodeClicked)
      // Prevent zooming when double-clicking on a node
      .on("dblclick", function () {
        d3.event.preventDefault();
        d3.event.stopPropagation();
      });
  }

  function drawArcs(graphic, pathway_data) {
    let arcs = pathway_data["shapes"].filter((d) => d.ShapeType == "Arc");

    graphic
      .selectAll("path.arc")
      .data(arcs)
      .enter()
      .append("path")
      .attr("class", "arc")
      // d3のArcでWidthとHeightを指定すると、楕円になるので、scaleで調整する
      .attr("transform", (d) => {
        let scaleWidth = Math.max(d.Width / d.Height, 1);
        let scaleHeight = Math.max(d.Height / d.Width, 1);
        return `translate(${d.CenterX},${d.CenterY}) scale(${scaleWidth},${scaleHeight})`;
      })
      .attr("d", (d) => {
        let width = d.Width;
        let height = d.Height;
        let radius = Math.min(width, height) / 2;
        return d3.arc()({
          innerRadius: radius,
          outerRadius: radius + 1,
          startAngle: -Math.PI / 2,
          endAngle: Math.PI / 2,
        });
      });
  }

  function drawHeader(graphic, pathway) {
    graphic
      .append("text")
      .attr("x", 10)
      .attr("y", 10)
      .attr("class", "pathwayName")
      .attr("fill", "black")
      .attr("font-weight", "bold")
      .text(`Name:${pathway.Name}`);

    graphic
      .append("text")
      .attr("x", 10)
      .attr("y", 10)
      .attr("dy", "1.5em")
      .attr("class", "pathwayVersion")
      .attr("font-weight", "bold")
      .attr("fill", "black")
      .text(`Last Modified: ${pathway["Last-Modified"] || "Unknown"}`);

    graphic
      .append("text")
      .attr("x", 10)
      .attr("y", 10)
      .attr("dy", "3em")
      .attr("class", "pathwayOrganism")
      .attr("font-weight", "bold")
      .attr("fill", "black")
      .text(`Organism:${pathway.Organism}`);
  }

  function updateSvgSize() {
    let svg = document.getElementById("svg2");
    svg.setAttribute("height", cellHeight);
  }

  function propagateChangeOfSelectedNodes(view) {
    const defaultStrokeWidth = 1;
    const selectedStrokeWidth = 3;

    view.model.set(
      "value",
      selectedNodes
        .map((n) => n.ID)
        .filter((n) => n !== null && n.length > 0) // Remove empty strings
        .filter((x, i, self) => self.indexOf(x) === i) // Remove duplicates
    );
    view.touch();
    view.nodes.style("stroke-width", (d) => {
      if (selectedNodes.find((node) => node.ID === d.ID)) {
        return selectedStrokeWidth;
      }
      return defaultStrokeWidth;
    });
    view.nodeTexts.style("font-weight", (d) => {
      if (selectedNodes.find((node) => node.ID === d.ID)) {
        return d.FontWeight || "bold";
      }
      return d.FontWeight || "normal";
    });
  }

  function selectedGeneIdsChanged() {
    let newSelection = this.model.get("value");
    selectedNodes = nodes.filter((n) => newSelection.includes(n.ID));
    propagateChangeOfSelectedNodes(this);
  }

  function onNodeClicked(node) {
    let geneId = node.ID;
    let clickedNodes = nodes.filter((n) => n.ID === geneId);

    if (d3.event.ctrlKey || d3.event.metaKey) {
      selectedNodes = selectedNodes.concat(clickedNodes);
    } else {
      selectedNodes = clickedNodes;
    }
    propagateChangeOfSelectedNodes(view);
  }

  let networkCreationTimer = null;

  let PathwayD3View = widgets.DOMWidgetView.extend({
    createDiv: function () {
      var divstyle = $("<div id='d3DemoDiv'>");
      return divstyle;
    },

    createNetwork: function () {
      this.model.on("change:value", selectedGeneIdsChanged, this);
      let pathway_data = JSON.parse(this.model.get("pathway_data"));
      nodes = pathway_data["nodes"];
      let links = pathway_data["interactions"];
      let pathway = pathway_data["pathway"];
      let groups = pathway_data["groups"];
      view = this;

      let svg = d3.select("#svg2");
      let mouseDownPoint = null;
      if (svg.empty()) {
        svg = d3
          .select("#d3DemoDiv")
          .append("svg")
          .attr("id", "svg2")
          .style("width", "100%")
          .style("height", "100%")
          .style("background-color", "#fff");

        svg.on("contextmenu", function (d, i) {
          // Prevent the default context menu.
          // This is necessary because after contextmenu with ctrl + click, the "start" event of d3.zoom is not fired somehow.
          d3.event.preventDefault();
        });
        svg.on("mousedown", function (d, i) {
          mouseDownPoint = d3.mouse(this);
        });
        svg.on("dblclick", function (event) {
          zoomToFit(nodes, svg, graphic, 400);
        });
      }

      let graphic = d3.select("#graphic-root");

      let titleOffset = 50;
      let selecting = false;
      let lastTransform = null; // A variable to revert the zoom transformation after selection
      let startPoint = null;
      if (graphic.empty()) {
        graphic = svg
          .append("g")
          .attr("id", "graphic-root")
          .attr("transform", "translate(0," + titleOffset + ")");
        const zoom = d3
          .zoom()
          .scaleExtent([0.1, 40])
          .clickDistance(5)
          .filter(() => !d3.event.button)
          .on("zoom", function () {
            if (d3.event.sourceEvent.ctrlKey) {
              d3.event.sourceEvent.preventDefault();
            }
            if (selecting) {
              moveSelection(startPoint, d3.mouse(this));
              return;
            }
            graphic.attr("transform", d3.event.transform);
          })
          .on("start", function () {
            if (d3.event.sourceEvent?.shiftKey) {
              selecting = true;
              startPoint = d3.mouse(this);
              lastTransform = d3.event.transform;
              startSelection(startPoint);
            }
          })
          .on("end", function () {
            let mouseUpPoint = d3.mouse(this);
            if (selecting) {
              selecting = false;
              svg.call(zoom.transform, lastTransform);
              endSelection(startPoint, mouseUpPoint);
              propagateChangeOfSelectedNodes(view);
            } else {
              if (mouseDownPoint) {
                const threshold = 5;
                if (
                  Math.abs(mouseDownPoint[0] - mouseUpPoint[0]) < threshold &&
                  Math.abs(mouseDownPoint[1] - mouseUpPoint[1]) < threshold
                ) {
                  endSelection(mouseDownPoint, mouseUpPoint);
                  propagateChangeOfSelectedNodes(view);
                }
              }
            }
            mouseDownPoint = null;
          });
        svg.call(zoom).on("dblclick.zoom", null);
      }
      let baseLayer = graphic.append("g").attr("id", "baseLayer");
      let secondLayer = graphic.append("g").attr("id", "secondLayer");
      drawGroups(nodes, baseLayer, groups);
      drawLinks(links, secondLayer);
      drawNodes(nodes, secondLayer, this);
      drawArcs(secondLayer, pathway_data);
      drawNodeTexts(nodes, secondLayer, this);

      drawHeader(svg, pathway);
      updateSvgSize();
      zoomToFit(nodes, svg, graphic);

      function rect(x, y, w, h) {
        return (
          "M" + [x, y] + " l" + [w, 0] + " l" + [0, h] + " l" + [-w, 0] + "z"
        );
      }

      let selection = svg
        .append("path")
        .style("fill", "#ADD8E6")
        .style("stroke", "#ADD8E6")
        .style("fill-opacity", 0.3)
        .style("stroke-opacity", 0.7)
        .style("stroke-width", 2)
        .style("stroke-dasharray", "5, 5")
        .attr("class", "selection")
        .attr("visibility", "hidden");

      let startSelection = function (start) {
        selection
          .attr("d", rect(start[0], start[0], 0, 0))
          .attr("visibility", "visible");
      };

      let moveSelection = function (start, moved) {
        selection.attr(
          "d",
          rect(start[0], start[1], moved[0] - start[0], moved[1] - start[1])
        );
      };

      let endSelection = function (start, end) {
        selection.attr("visibility", "hidden");
        let minX = Math.min(start[0], end[0]);
        let minY = Math.min(start[1], end[1]);
        let maxX = Math.max(start[0], end[0]);
        let maxY = Math.max(start[1], end[1]);

        // Fit the coordinates to the zoom transformation
        let transform = d3.zoomTransform(svg.node());
        minX = (minX - transform.x) / transform.k;
        minY = (minY - transform.y) / transform.k;
        maxX = (maxX - transform.x) / transform.k;
        maxY = (maxY - transform.y) / transform.k;

        let intersectingNodes = nodes.filter((node) => {
          return (
            minX <= node.CenterX + node.Width / 2 &&
            node.CenterX - node.Width / 2 <= maxX &&
            minY <= node.CenterY + node.Height / 2 &&
            node.CenterY - node.Height / 2 <= maxY
          );
        });

        if (
          d3.event.metaKey ||
          d3.event.ctrlKey ||
          d3.event.sourceEvent?.metaKey ||
          d3.event.sourceEvent?.ctrlKey
        ) {
          selectedNodes = selectedNodes.concat(intersectingNodes);
        } else {
          selectedNodes = intersectingNodes;
        }
      };
    },

    render: function () {
      let view = this;
      // div要素を追加
      this.$el.append(this.createDiv());
      if (networkCreationTimer) {
        clearTimeout(networkCreationTimer);
      }
      networkCreationTimer = setTimeout(() => {
        view.createNetwork();
        let button = document.createElement("button");
        button.innerHTML = "Download Pathway as SVG";
        button.onclick = function () {
          let svg = document.getElementById("svg2");
          let svgData = new XMLSerializer().serializeToString(svg);
          let svgBlob = new Blob([svgData], { type: "image/svg+xml" });
          let svgUrl = URL.createObjectURL(svgBlob);
          let downloadLink = document.createElement("a");
          downloadLink.href = svgUrl;
          downloadLink.download = "pathway.svg";
          downloadLink.click();
          URL.revokeObjectURL(svgUrl);
        };
        view.$el.append(button);
      }, 500);
    },
  });

  return {
    PathwayD3View,
  };
});
