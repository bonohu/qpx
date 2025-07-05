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
  private nodeElements: d3.Selection<SVGRectElement, PathwayNode, SVGGElement, unknown> | null = null;
  private nodeTextElements: d3.Selection<SVGTextElement, PathwayNode, SVGGElement, unknown> | null = null;
  private readonly defaultFont = `"Liberation Sans", Arial, sans-serif`;
  private readonly defaultFontSize = 12;
  private readonly cellHeight = 700;
  private networkCreationTimer: number | null = null;

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

    this.svgElement.on('dblclick', () => {
      this.zoomToFit(400);
    });
  }

  private setupZoomAndPan(): void {
    if (!this.svgElement) return;

    const graphic = this.svgElement
      .append('g')
      .attr('id', 'graphic-root')
      .attr('transform', 'translate(0,50)');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 40])
      .on('zoom', (event) => {
        graphic.attr('transform', event.transform);
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
        return 'url(#marker-arrow)';
      case 'mim-catalysis':
        return 'url(#marker-circle)';
      case 'mim-inhibition':
        return 'url(#marker-pipe)';
      case 'mim-modification':
        return 'url(#marker-open-arrow)';
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

  private addMarkers(svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>): void {
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

    this.addMarkers(this.svgElement);

    links.forEach((link) => {
      const group = svg.append('g');
      
      for (let i = 0; i < link.points.length - 1; i++) {
        const point1 = link.points[i];
        const point2 = link.points[i + 1];
        
        group
          .append('line')
          .attr('x1', point1.X + (point1.RelX || 0))
          .attr('y1', point1.Y + (point1.RelY || 0))
          .attr('x2', point2.X + (point2.RelX || 0))
          .attr('y2', point2.Y + (point2.RelY || 0))
          .attr('stroke', 'black')
          .attr('marker-start', this.arrowHeadType(point1.ArrowHead))
          .attr('marker-end', this.arrowHeadType(point2.ArrowHead))
          .attr('stroke-dasharray', link.Graphics?.LineStyle === 'Broken' ? '5,5' : null)
          .attr('fill', 'none');
      }
    });
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
    const geneId = node.ID;
    const clickedNodes = this.nodes.filter((n) => n.ID === geneId);

    if (event.ctrlKey || event.metaKey) {
      this.selectedNodes = this.selectedNodes.concat(clickedNodes);
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
}

// Keep the original example classes for compatibility
export class ExampleModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: ExampleModel.model_name,
      _model_module: ExampleModel.model_module,
      _model_module_version: ExampleModel.model_module_version,
      _view_name: ExampleModel.view_name,
      _view_module: ExampleModel.view_module,
      _view_module_version: ExampleModel.view_module_version,
      value: 'Hello World',
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
  };

  static model_name = 'ExampleModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'ExampleView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;
}

export class ExampleView extends DOMWidgetView {
  render() {
    this.el.classList.add('custom-widget');

    this.value_changed();
    this.model.on('change:value', this.value_changed, this);
  }

  value_changed() {
    this.el.textContent = this.model.get('value');
  }
}
