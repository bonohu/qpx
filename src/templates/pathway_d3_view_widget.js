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

  function drawGroups(nodes, svg, groups, verticalOffset) {
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
        let range = nodeGroups[group.GroupId];
        svg
          .append("rect")
          .attr("class", "group-rect")
          .attr("x", range.minX - groupMargin)
          .attr("y", range.minY - groupMargin + verticalOffset)
          .attr("width", range.maxX - range.minX + groupMargin * 2)
          .attr("height", range.maxY - range.minY + groupMargin * 2)
          .attr("fill", "#f6f6ee")
          .attr("stroke", "gray")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "5,5");
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

    svg
      .append("defs")
      .append("marker")
      .attr("id", "marker-circle")
      .attr("viewBox", [0, 0, markerBoxSize, markerBoxSize])
      .attr("refX", refX)
      .attr("refY", refY)
      .attr("markerWidth", markerBoxSize)
      .attr("markerHeight", markerBoxSize)
      .attr("orient", "auto-start-reverse")
      .append("circle")
      .attr("cx", markerBoxSize / 2)
      .attr("cy", markerBoxSize / 2)
      .attr("r", markerBoxSize / 2)
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
      link.pointsAfterOffset = [
        {
          X: link.points[0].X + link.points[0].RelX,
          Y: link.points[0].Y + link.points[0].RelY,
        },
        {
          X: link.points[1].X + link.points[1].RelX,
          Y: link.points[1].Y + link.points[1].RelY,
        },
      ];
      if (
        link.points[0].ArrowHead === "mim-inhibition" ||
        link.points[1].ArrowHead === "mim-inhibition"
      ) {
        let length = Math.sqrt(
          Math.pow(link.points[1].X - link.points[0].X, 2) +
            Math.pow(link.points[1].Y - link.points[0].Y, 2)
        );
        let cosine = (link.points[1].X - link.points[0].X) / length;
        let sine = (link.points[1].Y - link.points[0].Y) / length;

        if (link.points[0].ArrowHead === "mim-inhibition") {
          link.pointsAfterOffset[0].X += (cosine * markerBoxSize) / 2;
          link.pointsAfterOffset[0].Y += (sine * markerBoxSize) / 2;
        } else {
          link.pointsAfterOffset[1].X -= (cosine * markerBoxSize) / 2;
          link.pointsAfterOffset[1].Y -= (sine * markerBoxSize) / 2;
        }
      }
    });

    svg
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "element-in-body")
      .attr("x1", (d) => d.pointsAfterOffset[0].X)
      .attr("y1", (d) => d.pointsAfterOffset[0].Y)
      .attr("x2", (d) => d.pointsAfterOffset[1].X)
      .attr("y2", (d) => d.pointsAfterOffset[1].Y)
      .attr("stroke", "black")
      .attr("marker-start", (d) => arrowHeadType(d.points[0].ArrowHead))
      .attr("marker-end", (d) => arrowHeadType(d.points[1].ArrowHead))
      .attr("stroke-dasharray", (d) =>
        d.Graphics?.LineStyle === "Broken" ? "5,5" : null
      )
      .attr("fill", "none");

    addMarkers(svg, markerBoxSize, refX, refY);
  }

  function drawNodes(nodes, svg, view) {
    const nodeRoundRadius = 10;
    svg
      .selectAll("rect.node-rect")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("class", "element-in-body node-rect")
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
      .on("click", function (d) {
        onIdClicked(view, d.TextLabel);
      });
  }

  function drawNodeTexts(nodes, svg, view) {
    svg
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("class", "element-in-body")
      .attr("x", (d) => d.CenterX)
      .attr("y", (d) => d.CenterY)
      .attr("stroke", (d) => `#${d.Color}`)
      .text((d) => d.TextLabel)
      .style("text-anchor", "middle")
      .style("dominant-baseline", "central")
      .on("click", function (d) {
        onIdClicked(view, d.TextLabel);
      });
  }

  function drawArcs(svg, pathway_data, verticalOffset) {
    let arcs = pathway_data["shapes"].filter((d) => d.ShapeType == "Arc");

    svg
      .selectAll("path.arc")
      .data(arcs)
      .enter()
      .append("path")
      .attr("class", "arc")
      // d3のArcでWidthとHeightを指定すると、楕円になるので、scaleで調整する
      .attr("transform", (d) => {
        let scaleWidth = Math.max(d.Width / d.Height, 1);
        let scaleHeight = Math.max(d.Height / d.Width, 1);
        return `translate(${d.CenterX},${
          d.CenterY + verticalOffset
        }) scale(${scaleWidth},${scaleHeight})`;
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

  function drawHeader(svg, pathway) {
    svg
      .append("text")
      .attr("x", 10)
      .attr("y", 10)
      .attr("class", "pathwayName")
      .attr("stroke", "black")
      .text(`Name:${pathway.Name}`);

    svg
      .append("text")
      .attr("x", 10)
      .attr("y", 10)
      .attr("dy", "1.5em")
      .attr("class", "pathwayVersion")
      .attr("stroke", "black")
      .text(`Last Modified: ${pathway["Last-Modified"] || "Unknown"}`);

    svg
      .append("text")
      .attr("x", 10)
      .attr("y", 10)
      .attr("dy", "3em")
      .attr("class", "pathwayOrganism")
      .attr("stroke", "black")
      .text(`Organism:${pathway.Organism}`);
  }

  function updateSvgSize() {
    const margin = 50;
    let svg = document.getElementById("svg2");
    let bbox = svg.getBBox();
    svg.setAttribute("width", bbox.x + bbox.width + bbox.x);
    svg.setAttribute("height", bbox.y + bbox.height + bbox.y + margin);
  }

  function onIdClicked(view, geneId) {
    view.model.set("value", geneId);
    view.touch();
  }

  let PathwayD3View = widgets.DOMWidgetView.extend({
    createDiv: function () {
      var divstyle = $("<div id='d3DemoDiv'>");
      return divstyle;
    },

    createNetwork: function () {
      let pathway_data = JSON.parse(this.model.get("pathway_data"));
      let nodes = pathway_data["nodes"];
      let links = pathway_data["interactions"];
      let pathway = pathway_data["pathway"];
      let groups = pathway_data["groups"];
      let width = this.model.get("width");
      let height = this.model.get("height");
      let svg = d3.select("#svg2");
      if (svg.empty()) {
        svg = d3
          .select("#d3DemoDiv")
          .append("svg")
          .attr("id", "svg2")
          .attr("width", width)
          .attr("height", height)
          .style("background-color", "#fff");
      }
      let titleOffset = 50;

      drawGroups(nodes, svg, groups, titleOffset);
      drawLinks(links, svg);
      drawNodes(nodes, svg, this);
      drawArcs(svg, pathway_data, titleOffset);
      drawNodeTexts(nodes, svg, this);

      let contentGroup = svg
        .append("g")
        .attr("class", "content-group")
        .attr("transform", "translate(0," + titleOffset + ")");

      svg.selectAll(".element-in-body").each(function () {
        contentGroup.node().appendChild(this);
      });

      drawHeader(svg, pathway);
      updateSvgSize();
      console.log("createNetwork");
    },

    render: function () {
      let view = this;
      // div要素を追加
      this.$el.append(this.createDiv());
      setTimeout(() => view.createNetwork(), 500);
    },

    set_id: function (d) {
      var view = this;
      view.model.set("value", d);
      view.touch();
    },
  });

  return {
    PathwayD3View,
  };
});