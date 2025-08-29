// Copyright (c) me
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from '@jupyter-widgets/base';

import { MODULE_NAME, MODULE_VERSION } from './version';
import * as d3 from 'd3';

// Import the CSS
import '../css/widget.css';

// Interfaces for pathway data
interface PathwayNode {
  ID: string;
  CenterX: number;
  CenterY: number;
  Width: number;
  Height: number;
  TextLabel: string;
  Color: string;
  ShapeType: string;
  FontName?: string;
  FontSize?: number;
  FontWeight?: string;
  FontStyle?: string;
  FontDecoration?: string;
  FontStrikethru?: string;
  GroupRef?: string;
}

interface PathwayPoint {
  X: number;
  Y: number;
  RelX?: number;
  RelY?: number;
  ArrowHead?: string;
}

interface PathwayLink {
  points: PathwayPoint[];
  pointsAfterOffset?: PathwayPoint[];
  Graphics?: {
    ConnectorType?: string;
    LineStyle?: string;
  };
}

interface PathwayGroup {
  GroupId: string;
  Style: string;
}

interface PathwayInfo {
  Name: string;
  'Last-Modified'?: string;
  Organism: string;
}

interface PathwayData {
  nodes: PathwayNode[];
  interactions: PathwayLink[];
  groups: PathwayGroup[];
  shapes: any[];
  pathway: PathwayInfo;
}

export class PathwayD3Model extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: PathwayD3Model.model_name,
      _model_module: PathwayD3Model.model_module,
      _model_module_version: PathwayD3Model.model_module_version,
      _view_name: PathwayD3Model.view_name,
      _view_module: PathwayD3Model.view_module,
      _view_module_version: PathwayD3Model.view_module_version,
      value: [],
      pathway_data: '{}',
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
  };

  static model_name = 'PathwayD3Model';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'PathwayD3View';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;
}

export class PathwayD3View extends DOMWidgetView {
  private nodes: PathwayNode[] = [];
  private selectedNodes: PathwayNode[] = [];
  private svgElement: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null;
  private nodeElements: d3.Selection<SVGRectElement, PathwayNode, SVGElement, unknown> | null = null;
  private nodeTextElements: d3.Selection<SVGTextElement, PathwayNode, SVGElement, unknown> | null = null;
  private readonly defaultFont = `"Liberation Sans", Arial, sans-serif`;
  private readonly defaultFontSize = 12;
  private readonly cellHeight = 700;
  private networkCreationTimer: number | null = null;

  // Selection variables
  private selecting = false;
  private startPoint: [number, number] | null = null;
  private lastTransform: d3.ZoomTransform | null = null;
  private selectionRect: d3.Selection<SVGPathElement, unknown, HTMLElement, any> | null = null;
  private mouseDownPoint: [number, number] | null = null;

  render() {
    this.el.classList.add('pathway-d3-widget');

    // Create container div
    const containerDiv = document.createElement('div');
    containerDiv.id = 'd3DemoDiv';
    this.el.appendChild(containerDiv);

    if (this.networkCreationTimer) {
      clearTimeout(this.networkCreationTimer);
    }

    this.networkCreationTimer = setTimeout(() => {
      this.createNetwork();
      this.addDownloadButton();
    }, 500);
  }

  private createNetwork(): void {
    this.model.on('change:value', this.selectedGeneIdsChanged, this);

    const pathwayDataStr = this.model.get('pathway_data');
    if (!pathwayDataStr || pathwayDataStr === '{}') {
      return;
    }

    const pathwayData: PathwayData = JSON.parse(pathwayDataStr);
    this.nodes = pathwayData.nodes;

    this.createSVG();
    this.setupZoomAndPan();
    this.drawPathway(pathwayData);
    this.zoomToFit();
  }

  private createSVG(): void {
    const container = d3.select('#d3DemoDiv');

    this.svgElement = container
      .append('svg')
      .attr('id', 'svg2')
      .style('width', '100%')
      .style('height', `${this.cellHeight}px`)
      .style('background-color', '#fff');

    this.svgElement.on('contextmenu', (event) => {
      event.preventDefault();
    });

    this.svgElement.on('mousedown', (event) => {
      this.mouseDownPoint = d3.pointer(event, this.svgElement!.node());
    });

    this.svgElement.on('dblclick', () => {
      this.zoomToFit(400);
    });

    // Create selection rectangle
    this.selectionRect = this.svgElement
      .append('path')
      .style('fill', '#ADD8E6')
      .style('stroke', '#ADD8E6')
      .style('fill-opacity', 0.3)
      .style('stroke-opacity', 0.7)
      .style('stroke-width', 2)
      .style('stroke-dasharray', '5, 5')
      .attr('class', 'selection')
      .attr('visibility', 'hidden');
  }

  private setupZoomAndPan(): void {
    if (!this.svgElement) return;

    const graphic = this.svgElement
      .append('g')
      .attr('id', 'graphic-root')
      .attr('transform', 'translate(0,50)');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 40])
      .clickDistance(5)
      .filter((event) => !event.button)
      .on('zoom', (event) => {
        if (event.sourceEvent?.ctrlKey) {
          event.sourceEvent.preventDefault();
        }
        if (this.selecting) {
          this.moveSelection(this.startPoint!, d3.pointer(event.sourceEvent, this.svgElement!.node()));
          return;
        }
        graphic.attr('transform', event.transform);
      })
      .on('start', (event) => {
        if (event.sourceEvent?.shiftKey) {
          this.selecting = true;
          this.startPoint = d3.pointer(event.sourceEvent, this.svgElement!.node());
          this.lastTransform = event.transform;
          this.startSelection(this.startPoint);
        }
      })
      .on('end', (event) => {
        if (event.sourceEvent) {
          const mouseUpPoint = d3.pointer(event.sourceEvent, this.svgElement!.node());
          if (this.selecting) {
            this.selecting = false;
            this.svgElement!.call(zoom.transform, this.lastTransform!);
            this.endSelection(this.startPoint!, mouseUpPoint, event.sourceEvent);
            this.propagateChangeOfSelectedNodes();
          } else {
            if (this.mouseDownPoint) {
              const threshold = 5;
              if (
                Math.abs(this.mouseDownPoint[0] - mouseUpPoint[0]) < threshold &&
                Math.abs(this.mouseDownPoint[1] - mouseUpPoint[1]) < threshold
              ) {
                // Only handle empty space clicks, not node clicks
                const target = event.sourceEvent.target as Element;
                if (target === this.svgElement!.node()) {
                  this.endSelection(this.mouseDownPoint, mouseUpPoint, event.sourceEvent);
                  this.propagateChangeOfSelectedNodes();
                }
              }
            }
          }
        }
        this.mouseDownPoint = null;

      });

    this.svgElement.call(zoom).on('dblclick.zoom', null);
  }

  private drawPathway(pathwayData: PathwayData): void {
    if (!this.svgElement) return;

    const graphic = this.svgElement.select('#graphic-root');
    const baseLayer = graphic.append('g').attr('id', 'baseLayer');
    const secondLayer = graphic.append('g').attr('id', 'secondLayer');

    this.drawGroups(this.nodes, baseLayer, pathwayData.groups);
    this.drawLinks(pathwayData.interactions, secondLayer);
    this.drawNodes(this.nodes, secondLayer);
    this.drawArcs(secondLayer, pathwayData);
    this.drawNodeTexts(this.nodes, secondLayer);
    this.drawHeader(this.svgElement, pathwayData.pathway);
  }

  private arrowHeadType(gpmlArrowType?: string): string {
    switch (gpmlArrowType) {
      case 'Arrow':
      case 'mim-conversion':
        return 'url(#marker-arrow)'; // -▶
      case 'mim-catalysis':
        return 'url(#marker-circle)';  // -◯
      case 'mim-inhibition':
        return 'url(#marker-pipe)';  // -┃
      case 'mim-modification':
        return 'url(#marker-open-arrow)';  // ->
      default:
        return '';
    }
  }

  private drawGroups(nodes: PathwayNode[], graphic: d3.Selection<SVGGElement, unknown, HTMLElement, any>, groups: PathwayGroup[]): void {
    const nodeGroups: { [key: string]: { minX: number; minY: number; maxX: number; maxY: number } } = {};

    nodes.forEach((node) => {
      const groupId = node.GroupRef;
      if (!groupId) return;

      const bounds = {
        minX: node.CenterX - node.Width / 2,
        minY: node.CenterY - node.Height / 2,
        maxX: node.CenterX + node.Width / 2,
        maxY: node.CenterY + node.Height / 2,
      };

      if (nodeGroups[groupId] === undefined) {
        nodeGroups[groupId] = bounds;
      } else {
        nodeGroups[groupId].minX = Math.min(nodeGroups[groupId].minX, bounds.minX);
        nodeGroups[groupId].minY = Math.min(nodeGroups[groupId].minY, bounds.minY);
        nodeGroups[groupId].maxX = Math.max(nodeGroups[groupId].maxX, bounds.maxX);
        nodeGroups[groupId].maxY = Math.max(nodeGroups[groupId].maxY, bounds.maxY);
      }
    });

    const groupMargin = 10;

    groups.forEach((group) => {
      const range = nodeGroups[group.GroupId];
      if (!range) return;

      if (group.Style === 'Complex') {
        const x = range.minX - groupMargin;
        const y = range.minY - groupMargin;
        const width = range.maxX - range.minX + groupMargin * 2;
        const height = range.maxY - range.minY + groupMargin * 2;
        const r = Math.max(10, width / 10, height / 10);

        const path = `M ${x + r} ${y} h ${width - r * 2} l ${r} ${r} v ${height - r * 2} l ${-r} ${r} h ${-width + r * 2} l ${-r} ${-r} v ${-height + r * 2} l ${r} ${-r} z`;

        graphic
          .append('path')
          .attr('d', path)
          .attr('fill', '#f6f6ee')
          .attr('stroke', 'gray')
          .attr('stroke-width', 1);
      } else {
        graphic
          .append('rect')
          .attr('class', 'group-rect')
          .attr('x', range.minX - groupMargin)
          .attr('y', range.minY - groupMargin)
          .attr('width', range.maxX - range.minX + groupMargin * 2)
          .attr('height', range.maxY - range.minY + groupMargin * 2)
          .attr('fill', '#f6f6ee')
          .attr('stroke', 'gray')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '5,5');
      }
    });
  }

  private addMarkers(svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>): void {
    const markerBoxSize = 10;
    const refX = markerBoxSize;
    const refY = markerBoxSize / 2;

    const defs = svg.append('defs');

    // Arrow marker
    defs
      .append('marker')
      .attr('id', 'marker-arrow')
      .attr('viewBox', [0, 0, markerBoxSize, markerBoxSize])
      .attr('refX', refX)
      .attr('refY', refY)
      .attr('markerWidth', markerBoxSize)
      .attr('markerHeight', markerBoxSize)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', `M ${markerBoxSize} ${markerBoxSize / 2} L 0 ${markerBoxSize} L 0 0 z`)
      .attr('fill', '#000000');

    // Circle marker
    const margin = 2;
    defs
      .append('marker')
      .attr('id', 'marker-circle')
      .attr('viewBox', [-margin / 2, -margin / 2, markerBoxSize + margin / 2, markerBoxSize + margin / 2])
      .attr('refX', refX)
      .attr('refY', refY)
      .attr('markerWidth', markerBoxSize)
      .attr('markerHeight', markerBoxSize)
      .attr('orient', 'auto-start-reverse')
      .append('circle')
      .attr('cx', markerBoxSize / 2)
      .attr('cy', markerBoxSize / 2)
      .attr('r', markerBoxSize / 2 - margin / 2)
      .attr('stroke', '#000000')
      .attr('fill', 'white');

    // Pipe marker
    defs
      .append('marker')
      .attr('id', 'marker-pipe')
      .attr('viewBox', [0, 0, markerBoxSize, markerBoxSize])
      .attr('refX', refX)
      .attr('refY', refY)
      .attr('markerWidth', markerBoxSize)
      .attr('markerHeight', markerBoxSize)
      .attr('orient', 'auto-start-reverse')
      .append('line')
      .attr('x1', markerBoxSize)
      .attr('y1', 0)
      .attr('x2', markerBoxSize)
      .attr('y2', markerBoxSize)
      .attr('stroke', '#000000');

    // Open arrow marker
    defs
      .append('marker')
      .attr('id', 'marker-open-arrow')
      .attr('viewBox', [0, 0, markerBoxSize, markerBoxSize])
      .attr('refX', refX)
      .attr('refY', refY)
      .attr('markerWidth', markerBoxSize)
      .attr('markerHeight', markerBoxSize)
      .attr('orient', 'auto-start-reverse')
      .append('polyline')
      .attr('points', `0,0 ${markerBoxSize},${markerBoxSize / 2} 0,${markerBoxSize}`)
      .attr('fill', 'transparent')
      .attr('stroke', '#000000');
  }

  private drawLinks(links: PathwayLink[], svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>): void {
    if (!this.svgElement) return;
    const markerBoxSize = 10;

    links.forEach((link) => {
      link.pointsAfterOffset = link.points.map((point) => {
        return {
          X: point.X + (point.RelX || 0),
          Y: point.Y + (point.RelY || 0),
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
          link.pointsAfterOffset![0].X += (cosine * markerBoxSize) / 2;
          link.pointsAfterOffset![0].Y += (sine * markerBoxSize) / 2;
        } else {
          link.pointsAfterOffset![link.points.length - 1].X -=
            (cosine * markerBoxSize) / 2;
          link.pointsAfterOffset![link.points.length - 1].Y -=
            (sine * markerBoxSize) / 2;
        }
      }
    });

    const connectionSide = (relX?: number, relY?: number): string | null => {
      if ((relX === null || relX === undefined) && (relY === null || relY === undefined)) {
        return null;
      }
      if (Math.abs(relX || 0) > Math.abs(relY || 0)) {
        if ((relX || 0) > 0) {
          return "east";
        } else {
          return "west";
        }
      } else {
        if ((relY || 0) > 0) {
          return "south";
        } else {
          return "north";
        }
      }
    };

    const calculateWayPoints = (connectionPoints: PathwayPoint[]): PathwayPoint[] => {
      let wayPoints: PathwayPoint[] = [];
      const SEGMENT_OFFSET = 20; // 中継点のオフセット
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
    };

    const drawLine = (
      d3Selector: any,
      point1: PathwayPoint,
      point2: PathwayPoint,
      lineStyle?: string,
      startArrowHeadType?: string,
      endArrowHeadType?: string
    ): void => {
      d3Selector
        .append("line")
        .attr("x1", point1.X)
        .attr("y1", point1.Y)
        .attr("x2", point2.X)
        .attr("y2", point2.Y)
        .attr("stroke", "black")
        .attr("marker-start", startArrowHeadType || "")
        .attr("marker-end", endArrowHeadType || "")
        .attr("stroke-dasharray", lineStyle === "Broken" ? "5,5" : null)
        .attr("fill", "none");
    };

    const self = this;
    svg
      .selectAll("line")
      .data(links)
      .enter()
      .each(function (d) {
        const currentSelection = d3.select(this as any);
        if (d.Graphics?.ConnectorType === "Elbow") {
          let wayPoints = calculateWayPoints(d.points);
          for (let i = 0; i < wayPoints.length - 1; i++) {
            drawLine(
              currentSelection,
              wayPoints[i],
              wayPoints[i + 1],
              d.Graphics?.LineStyle,
              self.arrowHeadType(wayPoints[i].ArrowHead),
              self.arrowHeadType(wayPoints[i + 1].ArrowHead)
            );
          }
        } else if (d.pointsAfterOffset) {
          for (let i = 0; i < d.pointsAfterOffset.length - 1; i++) {
            drawLine(
              currentSelection,
              d.pointsAfterOffset[i],
              d.pointsAfterOffset[i + 1],
              d.Graphics?.LineStyle,
              self.arrowHeadType(d.points[i].ArrowHead),
              self.arrowHeadType(d.points[i + 1].ArrowHead)
            );
          }
        }
      });

    this.addMarkers(svg);
  }

  private drawNodes(nodes: PathwayNode[], graphic: d3.Selection<SVGGElement, unknown, HTMLElement, any>): void {
    const nodeRoundRadius = 10;

    this.nodeElements = graphic
      .selectAll('rect.node-rect')
      .data(nodes)
      .enter()
      .append('rect')
      .attr('class', 'node-rect')
      .attr('x', (d) => d.CenterX - d.Width / 2)
      .attr('y', (d) => d.CenterY - d.Height / 2)
      .attr('width', (d) => d.Width)
      .attr('height', (d) => d.Height)
      .attr('rx', (d) => d.ShapeType === 'RoundRectangle' ? nodeRoundRadius : 0)
      .attr('ry', (d) => d.ShapeType === 'RoundRectangle' ? nodeRoundRadius : 0)
      .attr('fill', 'white')
      .style('stroke', (d) => `#${d.Color}`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => this.onNodeClicked(d, event))
      .on('dblclick', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
  }

  private drawNodeTexts(nodes: PathwayNode[], graphic: d3.Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.nodeTextElements = graphic
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .attr('x', (d) => d.CenterX)
      .attr('y', (d) => d.CenterY)
      .attr('fill', (d) => `#${d.Color}`)
      .attr('stroke-width', '0px')
      .html((d) => this.linebreakText(d))
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'central')
      .style('cursor', 'pointer')
      .style('font-family', (d) => d.FontName || this.defaultFont)
      .style('font-size', (d) => `${d.FontSize || this.defaultFontSize}px`)
      .style('font-weight', (d) => d.FontWeight || 'normal')
      .style('font-style', (d) => d.FontStyle || 'normal')
      .style('text-decoration-line', (d) => {
        let decorationString = '';
        if (d.FontDecoration === 'Underline') {
          decorationString += ' underline';
        }
        if (d.FontStrikethru === 'Strikethru') {
          decorationString += ' line-through';
        }
        return decorationString;
      })
      .on('click', (event, d) => {
        this.onNodeClicked(d, event);
      })
      .on('dblclick', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
  }

  private linebreakText(node: PathwayNode): string {
    try {
      if (!node.TextLabel || !node.TextLabel.includes('\n')) {
        return node.TextLabel || '';
      }
      const textList = node.TextLabel.split('\n');
      const fontSize = node.FontSize ? parseInt(node.FontSize.toString()) : this.defaultFontSize;
      let string = '';
      textList.forEach((t, i) => {
        string += `<tspan y="${(i - (textList.length - 1) / 2) * fontSize + node.CenterY}px" x="${node.CenterX}">${t}</tspan>`;
      });
      return string;
    } catch (e) {
      console.error(e);
      return node.TextLabel || '';
    }
  }

  private drawArcs(graphic: d3.Selection<SVGGElement, unknown, HTMLElement, any>, pathwayData: PathwayData): void {
    const arcs = pathwayData.shapes.filter((d) => d.ShapeType === 'Arc');

    graphic
      .selectAll('path.arc')
      .data(arcs)
      .enter()
      .append('path')
      .attr('class', 'arc')
      .attr('transform', (d) => {
        const scaleWidth = Math.max(d.Width / d.Height, 1);
        const scaleHeight = Math.max(d.Height / d.Width, 1);
        return `translate(${d.CenterX},${d.CenterY}) scale(${scaleWidth},${scaleHeight})`;
      })
      .attr('d', (d) => {
        const radius = Math.min(d.Width, d.Height) / 2;
        return d3.arc()({
          innerRadius: radius,
          outerRadius: radius + 1,
          startAngle: -Math.PI / 2,
          endAngle: Math.PI / 2,
        });
      });
  }

  private drawHeader(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>, pathway: PathwayInfo): void {
    svg
      .append('text')
      .attr('x', 10)
      .attr('y', 10)
      .attr('class', 'pathwayName')
      .attr('fill', 'black')
      .attr('font-weight', 'bold')
      .text(`Name: ${pathway.Name}`);
    svg
      .append('text')
      .attr('x', 10)
      .attr('y', 10)
      .attr('dy', '1.5em')
      .attr('class', 'pathwayVersion')
      .attr('font-weight', 'bold')
      .attr('fill', 'black')
      .text(`Last Modified: ${pathway['Last-Modified'] || 'Unknown'}`);

    svg
      .append('text')
      .attr('x', 10)
      .attr('y', 10)
      .attr('dy', '3em')
      .attr('class', 'pathwayOrganism')
      .attr('font-weight', 'bold')
      .attr('fill', 'black')
      .text(`Organism: ${pathway.Organism}`);
  }

  private zoomToFit(duration: number = 0): void {
    if (!this.svgElement || this.nodes.length === 0) return;

    let bounds = {
      x: Infinity,
      y: Infinity,
      width: -Infinity,
      height: -Infinity,
    };

    this.nodes.forEach((node) => {
      const nodeBounds = {
        x: node.CenterX - node.Width / 2,
        y: node.CenterY - node.Height / 2,
        width: node.Width,
        height: node.Height,
      };
      bounds.x = Math.min(bounds.x, nodeBounds.x);
      bounds.y = Math.min(bounds.y, nodeBounds.y);
      bounds.width = Math.max(bounds.width, nodeBounds.x - bounds.x + nodeBounds.width);
      bounds.height = Math.max(bounds.height, nodeBounds.y - bounds.y + nodeBounds.height);
    });

    const svgElement = document.getElementById('svg2');
    if (!svgElement) return;

    const fullWidth = svgElement.clientWidth;
    const fullHeight = svgElement.clientHeight;
    const width = bounds.width;
    const height = bounds.height;
    const midX = bounds.x + width / 2;
    const midY = bounds.y + height / 2;

    if (width <= 0 || height <= 0) return;

    const marginFactor = 0.8;
    const scale = marginFactor / Math.max(width / fullWidth, height / fullHeight);
    const translate: [number, number] = [
      fullWidth / 2 - scale * midX,
      fullHeight / 2 - scale * midY,
    ];

    const graphic = this.svgElement.select('#graphic-root');
    graphic
      .transition()
      .duration(duration)
      .attr('transform', `translate(${translate}) scale(${scale})`);

    const zoom = d3.zoom<SVGSVGElement, unknown>();
    this.svgElement.call(
      zoom.transform,
      d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    );
  }

  private onNodeClicked(node: PathwayNode, event: MouseEvent): void {
    // Stop event propagation and prevent default to ensure no other handlers interfere
    event.stopPropagation();
    event.preventDefault();

    const geneId = node.ID;
    const clickedNodes = this.nodes.filter((n) => n.ID === geneId);

    if (event.ctrlKey || event.metaKey) {
      // Check if node is already selected
      const isAlreadySelected = this.selectedNodes.some(n => n.ID === geneId);
      if (isAlreadySelected) {
        // Remove from selection
        this.selectedNodes = this.selectedNodes.filter(n => n.ID !== geneId);
      } else {
        // Add to selection
        this.selectedNodes = this.selectedNodes.concat(clickedNodes);
      }
    } else {
      this.selectedNodes = clickedNodes;
    }
    this.propagateChangeOfSelectedNodes();
  }

  private propagateChangeOfSelectedNodes(): void {
    const defaultStrokeWidth = 1;
    const selectedStrokeWidth = 3;

    const selectedIds = this.selectedNodes
      .map((n) => n.ID)
      .filter((n) => n !== null && n.length > 0)
      .filter((x, i, self) => self.indexOf(x) === i);

    this.model.set('value', selectedIds);
    this.touch();

    if (this.nodeElements) {
      this.nodeElements.style('stroke-width', (d) => {
        return this.selectedNodes.find((node) => node.ID === d.ID)
          ? selectedStrokeWidth
          : defaultStrokeWidth;
      });
    }

    if (this.nodeTextElements) {
      this.nodeTextElements.style('font-weight', (d) => {
        return this.selectedNodes.find((node) => node.ID === d.ID)
          ? d.FontWeight || 'bold'
          : d.FontWeight || 'normal';
      });
    }
  }

  private selectedGeneIdsChanged(): void {
    const newSelection: string[] = this.model.get('value');
    this.selectedNodes = this.nodes.filter((n) => newSelection.indexOf(n.ID) !== -1);
    this.propagateChangeOfSelectedNodes();
  }

  private addDownloadButton(): void {
    const button = document.createElement('button');
    button.innerHTML = 'Download Pathway as SVG';
    button.onclick = () => {
      const svg = document.getElementById('svg2');
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = 'pathway.svg';
      downloadLink.click();
      URL.revokeObjectURL(svgUrl);
    };
    this.el.appendChild(button);
  }

  // Selection methods
  private rect(x: number, y: number, w: number, h: number): string {
    return `M${x},${y} l${w},0 l0,${h} l${-w},0 z`;
  }

  private startSelection(start: [number, number]): void {
    if (!this.selectionRect) return;
    this.selectionRect
      .attr('d', this.rect(start[0], start[1], 0, 0))
      .attr('visibility', 'visible');
  }

  private moveSelection(start: [number, number], moved: [number, number]): void {
    if (!this.selectionRect) return;
    this.selectionRect.attr(
      'd',
      this.rect(start[0], start[1], moved[0] - start[0], moved[1] - start[1])
    );
  }

  private endSelection(start: [number, number], end: [number, number], sourceEvent?: Event): void {
    if (!this.selectionRect || !this.svgElement) return;

    this.selectionRect.attr('visibility', 'hidden');

    const minX = Math.min(start[0], end[0]);
    const minY = Math.min(start[1], end[1]);
    const maxX = Math.max(start[0], end[0]);
    const maxY = Math.max(start[1], end[1]);

    // Fit the coordinates to the zoom transformation
    const transform = d3.zoomTransform(this.svgElement.node()!);
    const adjustedMinX = (minX - transform.x) / transform.k;
    const adjustedMinY = (minY - transform.y) / transform.k;
    const adjustedMaxX = (maxX - transform.x) / transform.k;
    const adjustedMaxY = (maxY - transform.y) / transform.k;

    const intersectingNodes = this.nodes.filter((node) => {
      return (
        adjustedMinX <= node.CenterX + node.Width / 2 &&
        node.CenterX - node.Width / 2 <= adjustedMaxX &&
        adjustedMinY <= node.CenterY + node.Height / 2 &&
        node.CenterY - node.Height / 2 <= adjustedMaxY
      );
    });

    // Check for Ctrl/Cmd key from various possible event sources
    let isCtrlOrCmd = false;
    if (sourceEvent) {
      const event = sourceEvent as any;
      isCtrlOrCmd = event.ctrlKey || event.metaKey ||
        (event.sourceEvent && (event.sourceEvent.ctrlKey || event.sourceEvent.metaKey));
    }

    if (isCtrlOrCmd) {
      this.selectedNodes = this.selectedNodes.concat(intersectingNodes);
    } else {
      this.selectedNodes = intersectingNodes;
    }
  }
}



export class HeatmapModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: HeatmapModel.model_name,
      _model_module: HeatmapModel.model_module,
      _model_module_version: HeatmapModel.model_module_version,
      _view_name: HeatmapModel.view_name,
      _view_module: HeatmapModel.view_module,
      _view_module_version: HeatmapModel.view_module_version,
      value: [],
      expression_data: '',
      expression_columns_index: 4,
      filter_key: 'xref_id',
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
  };

  static model_name = 'HeatmapModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'HeatmapView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;
}

export class HeatmapView extends DOMWidgetView {
  private table: any = null;
  private selectedGeneIds: string[] = [];
  private searchColumnIndex: number = 0;
  private maxExpressionValue: number = 0;
  private globalMaxExpressionValue: number = 0;

  render() {
    this.el.classList.add('heatmap-widget');

    // Create table element
    const tableDiv = document.createElement('table');
    tableDiv.id = 'heatmap-div';
    tableDiv.className = 'row-border nowrap';
    this.el.appendChild(tableDiv);

    // Show loading spinner
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loader-text';
    loadingDiv.textContent = 'Loading...';
    this.el.appendChild(loadingDiv);

    // Set up model change listener
    this.model.on('change:value', this.selectedGeneIdsChanged, this);

    // Initialize heatmap after a short delay
    setTimeout(() => {
      this.createHeatmap();
    }, 500);
  }

  private selectedGeneIdsChanged(): void {
    const newSelection: string[] = this.model.get('value');
    if (newSelection === undefined) {
      return;
    }
    this.selectedGeneIds = newSelection;

    if (this.table) {
      if (this.selectedGeneIds.length === 0) {
        this.table.columns(this.searchColumnIndex).search('').draw();
      } else {
        this.table
          .columns(this.searchColumnIndex)
          .search((data: string) => {
            return this.selectedGeneIds
              .map((x) => x.toString() === data)
              .some((x) => x);
          })
          .draw();
      }
    }
  }

  private async createHeatmap(): Promise<void> {
    // Load required libraries dynamically
    const Papa = await this.loadPapaParse();
    const html2canvas = await this.loadHtml2Canvas();
    const DataTable = await this.loadDataTables();

    setTimeout(() => {
      const expressionDataStr = this.model.get('expression_data');
      const expressionData = Papa.parse(expressionDataStr, {
        skipEmptyLines: true,
      }).data;

      const headers = expressionData[0];
      const data = expressionData.slice(1);
      const filterKey = this.model.get('filter_key');
      const expressionColumnsIndex = parseInt(this.model.get('expression_columns_index')) || 4;

      this.maxExpressionValue = 0;
      this.globalMaxExpressionValue = 0;

      // Process data and find max expression value
      for (const row of data) {
        for (let i = expressionColumnsIndex; i < row.length; i++) {
          const val = parseFloat(row[i]);
          if (!Number.isNaN(val)) {
            row[i] = val;
            this.maxExpressionValue = Math.max(this.maxExpressionValue, val);
          }
        }
      }

      this.globalMaxExpressionValue = this.maxExpressionValue;
      this.searchColumnIndex = headers.indexOf(filterKey);
      if (this.searchColumnIndex === -1) this.searchColumnIndex = 0;

      const targets = Array.from(
        { length: headers.length - expressionColumnsIndex },
        (_, i) => i + expressionColumnsIndex
      );

      const highlightColor = [131, 146, 219];
      const defaultColor = [250, 250, 255];

      // Initialize DataTable
      this.table = new DataTable('#heatmap-div', {
        data: data,
        columns: headers.map((x: string) => ({ title: x })),
        columnDefs: [
          {
            targets: targets,
            createdCell: (td: HTMLElement, cellData: any) => {
              if (Number.isFinite(cellData)) {
                const strength = cellData / this.maxExpressionValue;
                const color = highlightColor
                  .map((x, i) => x * strength + defaultColor[i] * (1 - strength))
                  .join(',');
                (td as HTMLElement).style.backgroundColor = `rgb(${color})`;
              }
            },
          },
        ],
        buttons: [
          {
            text: 'Download Table as PNG',
            action: () => {
              html2canvas(document.getElementById('heatmap-div')!, {
                scale: 2,
              }).then((canvas: HTMLCanvasElement) => {
                const img = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = img;
                a.download = 'heatmap_table.png';
                a.click();
              });
            },
          },
        ],
        layout: {
          bottomStart: 'buttons',
        },
      });

      this.table.on('search.dt', () => {
        const searchedRows = this.table.rows({ search: 'applied' }).data();
        const noSearchApplied = searchedRows.length === this.table.rows().data().length;

        if (noSearchApplied) {
          this.maxExpressionValue = this.globalMaxExpressionValue;
          return;
        }

        // Recompute maxExpressionValue for filtered data
        this.maxExpressionValue = 0;
        for (let j = 0; j < searchedRows.length; j++) {
          const row = searchedRows[j];
          for (let i = expressionColumnsIndex; i < row.length; i++) {
            const val = parseFloat(row[i]);
            if (!Number.isNaN(val)) {
              this.maxExpressionValue = Math.max(this.maxExpressionValue, val);
            }
          }
        }
      });

      // Hide loading spinner
      const loadingElement = this.el.querySelector('.loader-text');
      if (loadingElement) {
        loadingElement.remove();
      }
    }, 10);
  }

  private async loadPapaParse(): Promise<any> {
    return new Promise((resolve) => {
      if ((window as any).Papa) {
        resolve((window as any).Papa);
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js';
        script.onload = () => resolve((window as any).Papa);
        document.head.appendChild(script);
      }
    });
  }

  private async loadHtml2Canvas(): Promise<any> {
    return new Promise((resolve) => {
      if ((window as any).html2canvas) {
        resolve((window as any).html2canvas);
      } else {
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.onload = () => resolve((window as any).html2canvas);
        document.head.appendChild(script);
      }
    });
  }

  private async loadDataTables(): Promise<any> {
    return new Promise((resolve) => {
      if ((window as any).DataTable) {
        resolve((window as any).DataTable);
      } else {
        // Load CSS first
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.datatables.net/2.1.5/css/dataTables.dataTables.min.css';
        document.head.appendChild(cssLink);

        // Load DataTables CSS for buttons
        const buttonsCssLink = document.createElement('link');
        buttonsCssLink.rel = 'stylesheet';
        buttonsCssLink.href = 'https://cdn.datatables.net/buttons/3.1.2/css/buttons.dataTables.min.css';
        document.head.appendChild(buttonsCssLink);

        // Load jQuery first
        const jqueryScript = document.createElement('script');
        jqueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
        jqueryScript.onload = () => {
          // Load DataTables
          const dtScript = document.createElement('script');
          dtScript.src = 'https://cdn.datatables.net/2.1.5/js/dataTables.min.js';
          dtScript.onload = () => {
            // Load DataTables buttons
            const buttonsScript = document.createElement('script');
            buttonsScript.src = 'https://cdn.datatables.net/buttons/3.1.2/js/dataTables.buttons.min.js';
            buttonsScript.onload = () => {
              resolve((window as any).DataTable);
            };
            document.head.appendChild(buttonsScript);
          };
          document.head.appendChild(dtScript);
        };
        document.head.appendChild(jqueryScript);
      }
    });
  }
}

// DataTable Widget Models and Views
export class DataTableModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: DataTableModel.model_name,
      _model_module: DataTableModel.model_module,
      _model_module_version: DataTableModel.model_module_version,
      _view_name: DataTableModel.view_name,
      _view_module: DataTableModel.view_module,
      _view_module_version: DataTableModel.view_module_version,
      data: {},
      columns: [],
      mapping_key_column: '',
      selected_row_id: '',
      search_query: '',
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
  };

  static model_name = 'DataTableModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'DataTableView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;
}

export class DataTableView extends DOMWidgetView {
  private tableContainer: HTMLDivElement | null = null;

  render() {
    this.el.classList.add('data-table-widget');

    // Create container
    this.tableContainer = document.createElement('div');
    this.tableContainer.className = 'datatable-container';
    this.el.appendChild(this.tableContainer);

    // Create search input
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Enter gene name...';
    searchInput.className = 'gene-search-input';
    searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      this.model.set('search_query', query);
      this.touch();
      this.updateTable();
    });

    searchContainer.appendChild(searchInput);
    this.el.appendChild(searchContainer);

    // Create table element
    const tableElement = document.createElement('table');
    tableElement.id = 'gene-data-table';
    tableElement.className = 'display compact clickable';
    this.tableContainer.appendChild(tableElement);

    // Listen for model changes
    this.model.on('change:data', this.updateTable, this);
    this.model.on('change:search_query', this.updateTable, this);

    // Add CSS styles
    this.addStyles();

    // Initialize table after short delay
    setTimeout(() => {
      this.initializeTable();
    }, 100);
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .data-table-widget {
        margin: 20px 0;
      }
      
      .search-container {
        margin-bottom: 10px;
      }
      
      .gene-search-input {
        width: 300px;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .gene-search-input:focus {
        outline: none;
        border-color: #4CAF50;
        box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
      }
      
      .datatable-container {
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      
      .clickable tbody tr {
        cursor: pointer;
      }
      
      .clickable tbody tr:hover {
        background-color: #f5f5f5;
      }
      
      .clickable tbody tr.selected {
        background-color: #e3f2fd;
      }
      
      .mapping-key {
        font-weight: bold;
      }
      
      #gene-data-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      #gene-data-table th,
      #gene-data-table td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      #gene-data-table th {
        background-color: #f8f9fa;
        font-weight: bold;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      
      #gene-data-table tbody tr:nth-child(even) {
        background-color: #f9f9f9;
      }
    `;
    document.head.appendChild(style);
  }

  private async initializeTable() {
    // Initialize with current data
    this.updateTable();
  }

  private updateTable() {
    const data = this.model.get('data');
    const columns = this.model.get('columns');
    const mappingKeyColumn = this.model.get('mapping_key_column');

    if (!data || !data.rows || !columns || columns.length === 0) {
      return;
    }

    // Clear existing table
    const tableElement = document.getElementById('gene-data-table');
    if (!tableElement) return;

    tableElement.innerHTML = '';

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    columns.forEach((column: any) => {
      const th = document.createElement('th');
      th.textContent = column.name;
      if (column.key === mappingKeyColumn) {
        th.className = 'mapping-key';
      }
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    tableElement.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');

    data.rows.forEach((row: any, rowIndex: number) => {
      const tr = document.createElement('tr');
      tr.dataset.rowIndex = rowIndex.toString();

      columns.forEach((column: any) => {
        const td = document.createElement('td');
        const cellValue = row[column.key] || '';
        td.textContent = cellValue;
        td.title = cellValue; // Tooltip for truncated text

        if (column.key === mappingKeyColumn) {
          td.className = 'mapping-key';
        }

        tr.appendChild(td);
      });

      // Add click handler
      tr.addEventListener('click', () => {
        // Remove previous selection
        tbody.querySelectorAll('tr.selected').forEach(selectedTr => {
          selectedTr.classList.remove('selected');
        });

        // Add selection to clicked row
        tr.classList.add('selected');

        // Get the mapping key value
        const mappingKeyIndex = columns.findIndex((col: any) => col.key === mappingKeyColumn);
        if (mappingKeyIndex >= 0) {
          const mappingKeyValue = row[mappingKeyColumn];
          this.model.set('selected_row_id', mappingKeyValue);
          this.touch();
        }
      });

      tbody.appendChild(tr);
    });

    tableElement.appendChild(tbody);

    // Update info display
    this.updateInfoDisplay(data.rows.length, data.total_rows || data.rows.length);
  }

  private updateInfoDisplay(filteredCount: number, totalCount: number) {
    // Remove existing info display
    const existingInfo = this.el.querySelector('.table-info');
    if (existingInfo) {
      existingInfo.remove();
    }

    // Create new info display
    const infoDiv = document.createElement('div');
    infoDiv.className = 'table-info';
    infoDiv.style.margin = '10px 0';
    infoDiv.style.fontSize = '14px';
    infoDiv.style.color = '#666';

    if (filteredCount === totalCount) {
      infoDiv.textContent = `Showing ${totalCount} entries`;
    } else {
      infoDiv.textContent = `Showing ${filteredCount} of ${totalCount} entries (filtered)`;
    }

    this.el.appendChild(infoDiv);
  }
}
