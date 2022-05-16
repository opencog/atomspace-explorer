/*
 * VisualizerComponent
 *
 * Description: D3 Directed Force Graph for AtomSpace data.
 *
 * 11/13/17 - tsadik: Created from Atom Space Explorer.
 * 12/28/17 - sshermz: Merged latest features and fixes from Atom Space Explorer.
 *
 */
import { Component, OnInit, AfterViewInit, OnDestroy, ViewEncapsulation, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Graph } from '../models/graph';
import { AtomService, AtomServiceData } from '../atom.service';
import { VisualizerService } from './visualizer.service';
import { TranslateConfig } from './../translate/translate-config';
import { TranslateService } from './../translate/translate.service';
// import * as d3 from 'd3';

/*
 * ## Interfaces ##
 */
interface Menus {
  mainMenu: any;
  nodeMenu: any;
}

/*
 * ## Consts ##
 */
const version = 'VisualizerComponent 0.14.05 Beta (June-17-2018)';

// Force Simulation
// const simForceStrengthNormal = -80, simForceStrengthFast = -120, simForceStrengthSlow = -20;
const simForceStrengthNormal = -60, simForceStrengthFast = -100, simForceStrengthSlow = -20;
const simForceStrength = simForceStrengthNormal;
const simForceStrengthHighNodeCharge = -2000;
const reheatFactorMax = 6;

// Node & Link related consts
const isNodesConstrainedToClientArea = false;
const isPruneFilteredNodes = true;  // Remove filtered nodes from DOM. Provides performance benefit when filtered.
const isXtraLevelNeighbors = true;
const dyLinkLabel = '0.38em';
const radiusNodeNameless = 6;
const radiusNode = 12;
const opacityNode = 0.85;
const opacityNodeLabel = 0.85;
const opacityHidden = 0;
// const opacityHidden =  0.08;  // For Development only.
const opacityLink = 0.8;
const opacityLinkLabel = 1;
const opacityLinkLabelHidden = isPruneFilteredNodes ? 0 : 0.75;
const strokeWidthLink = 1;
const strokeWidthHoverLink = 4; // 2;
const strokeWidthLabelShadow = 3;
const strokeWidthNode = 1.5;
const strokeWidthSelectedNode = 3;
const strokeWidthHoverNode = 3;
const colorSelectedNode = '#00B5AD';
const colorHoverNode = '#BFECE9';
const colorHoverLink = '#BFECE9';
const colorMarker = '#000';
const fontLink = 'normal 6px arial';
const fontfamilyNode = 'arial';
const fontweightNode = 'bold';
const maxfontsizeNode = 18;
const maxNodeLabelLength = 9;
const maxTooltipInOutLength = 100;
const nodeLabelPadding = 0.80;  // Padding factor for text within node circle.
const nodePositionMargin = 30;  // Margin within D3 rect, in px.
const maxNodeFilterSize = 25;
const maxLinkFilterSize = 25;

// Node radius scaling
const radiusScaleFactorPct = 50;  // 0 to disable.
const isScaleRadiusTippingPoint = true;  // true for fixed larger size with tipping point approach, false for scaled approach.
const radiusScaleMinVal = 10;  // For tipping point approach only.

// Other
const defaultTransitionDuration = 1000;
const versionIE = GetIEVersion();
const isDetailedTTKey = 'asv-detailed-tt';

/*
 * ## Globals ##
 */
declare var $: any;
declare var d3: any;
let simulation: any = null;
let isSimulationRunning = false;
let reheatFactor = 1;
let widthView = 0;
let heightView = 0;
let filterMenuInitialized = false;
let salientProcessingColor = {};
let salientProcessingLinkNames = {};
let previousNumberOfAtoms = 0;

/*
 * IE Detection utility function
 */
function GetIEVersion() {
  const sAgent = window.navigator.userAgent;
  const Idx = sAgent.indexOf('MSIE');
  // If IE, return version number
  if (Idx > 0) {
    return parseInt(sAgent.substring(Idx + 5, sAgent.indexOf('.', Idx)), 10);
  } else {
    if (!!navigator.userAgent.match(/Trident\/7\./)) {
      // If updated user agent string matches, then IE11
      return 11;
    } else {
      return 0;  // Not IE.
    }
  }
}

/*
 * Class VisualizerComponent
 */
@Component({
  // tslint:disable-next-line:component-selector
  selector: 'cog-visualizer',
  templateUrl: './visualizer.component.html',
  encapsulation: ViewEncapsulation.None,  // Disable CSS encapsulation.
  styleUrls: ['./visualizer.component.css']
})
export class VisualizerComponent implements AfterViewInit, OnInit, OnDestroy, OnChanges {
  // Inputs
  @Input() atoms: any = null;
  @Input() unordered_linktypes: string[];
  @Input() custom_style: string;
  @Input() language: string;
  @Input() numAtoms: number;

  // Other Class members
  public isInitialLoad = true;
  public isSelectedNode = false;   // Variable to show/hide the selected node properties box.
  public selectedNodeData = null;  // Selected node data.
  public isDrilledNodes = false;   // Variable to show/hide the Show All Data button on dblclick of node.
  public isDetailedTooltips = false;
  public d3zoom = d3.zoom();  // zoom behaviour.
  public zoomScale = 1;  // variable to control the scale of zoom.
  public svg: any;
  public parsedJson: Graph = <Graph>{};
  public node: any;
  public link: any;
  public nodeTypes = [];
  public linkTypes = [];
  public nodeLabel: any;
  public linkLabel: any;
  public linkLabelShadow: any;
  public textPath: any;
  public menus: Menus;
  public divTooltip = null;
  public isSuppressTooltip = true;
  public marginTT = 30;

  // tslint:disable-next-line:member-ordering
  static ___this;
  static this() { return this.___this; }

  /*
  * scaleRadius - Calculate radius for Nodes
  */
  static scaleRadius(originalRadius: number, scaleVal: number) {
    if (isScaleRadiusTippingPoint) {
      // Tipping point approach - Increase radius by radiusScaleFactorPct iff
      // input scaling factor is >= tipping point value radiusScaleMinVal
      if (scaleVal >= radiusScaleMinVal) {
        return originalRadius * (1 + (radiusScaleFactorPct / 100));
      } else {
        return originalRadius;
      }
    } else {
      // Percentage approach
      // Note that algorithm is sqrt-based as human visual perception relates relative value differences to area, not radius
      return originalRadius + (Math.sqrt(scaleVal) * 2 *  (radiusScaleFactorPct / 100));
    }
  }

  /*
   * Constructor
   */
  constructor(public visualizerService: VisualizerService, public atomService: AtomService, public _translate: TranslateService) {
    console.log('Constructor called');
    this.atomService.editItem
      .subscribe(res => {
        const as_data: AtomServiceData = res;

        // Incoming data: Atoms
        const atoms: any = as_data.atoms ? as_data.atoms : null;

        if (atoms !== null && atoms.result.atoms.length > 0) {
              this.atoms = as_data.atoms;
              console.log('VisualizerComponent atoms=' + as_data.atoms);
              console.log('atoms.result.atoms.length =',atoms.result.atoms.length);
        }

        // Incoming data: numAtoms
        // const numAtoms: any = as_data.numAtoms ? as_data.numAtoms : 0;
        this.numAtoms = as_data.numAtoms;

        // Incoming data: Unordered Link Types
        const uolinktypes: any = as_data.unordered_linktypes ? as_data.unordered_linktypes : null;
        if (uolinktypes !== null && uolinktypes.length > 0) {
          this.unordered_linktypes = as_data.unordered_linktypes;
          // console.log('VisualizerComponent unordered_linktypes=' + this.unordered_linktypes);
        }

        // Incoming data: Custom Style
        const custstyle: any = as_data.custom_style ? as_data.custom_style : null;
        if (custstyle !== null && custstyle.length > 0) {
          this.custom_style = as_data.custom_style;
          // console.log('VisualizerComponent custom_style=' + as_data.custom_style);
        }

        // Incoming data: Language key
        const lang: any = as_data.language ? as_data.language : null;
        if (lang !== null && lang.length === 2) {
          this.language = as_data.language;
          this.selectLang(this.language);
          // console.log('VisualizerComponent language key=' + as_data.language);
        }
      });
  }

  /*
   * Init
   */
  ngOnInit(): void {
    // console.log('VisualizerComponent.ngOnInit() atoms=' + this.atoms + ', unordered_linktypes=' + this.unordered_linktypes +
    //   ', custom style=' + this.custom_style + ', language=' + this.language);
    // if (versionIE > 0) { console.log('This is IE ' + versionIE); } else { console.log('Not IE ' + versionIE); }

    VisualizerComponent.___this = this;

    // Initialize menus
    this.menus = this.initContextMenus();

    // Define div for the tooltip
    if (this.divTooltip === null) {
      // this.divTooltip = d3.select('.visualizer-screen').append('div').attr('class', 'tooltip').style('opacity', 0);
      this.divTooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);
    }

    // Check if isDetailedTT state has been persisted
    const isDtlTT = window.localStorage.getItem(isDetailedTTKey);
    // console.log('ngOnInit(): ' + isDetailedTTKey + '=' + isDtlTT);
    if (isDtlTT !== null) {
      this.isDetailedTooltips = isDtlTT === 'true' ? true : false;
      if (this.isDetailedTooltips) {
        // console.log('ngOnInit(): setting toggle to checked');
        $('.detailed-tt-toggle').prop('checked', true);
      }
    }
  }

  /*
   * Cleanup
   */
  ngOnDestroy(): void {
    // console.log('ngOnDestroy()');
    this.pauseSimulation();

    if (this.divTooltip) {
      this.divTooltip = null;
    }
  }

   // Function to extract salient features of an atomspace based on incoming/outgoing number of links
   salientIncomingOutgoingLinks() {

        const numberOfNodesToShow = 20;
        var sumInOut = new Array();
        var sum = 0;

        if (this.atoms) {
            var tempParsedJson = this.parsedJson;
            console.log('tempParsedJson\n', tempParsedJson);
            console.log(tempParsedJson.nodes);
            console.log(tempParsedJson.nodes.length);
            console.log(tempParsedJson.links);
            console.log(tempParsedJson.links.length);
            console.log(typeof tempParsedJson.nodes);
            console.log(typeof tempParsedJson.links);

            // Save color of nodes/links for later
            // let tempParsedJson2 = this.visualizerService.getParsedJson(this.atoms.result.atoms);
            console.log('this.parsedJson\n', this.parsedJson);

            for (let i = 0; i < this.parsedJson.nodes.length; i++) {
                salientProcessingColor[this.parsedJson.nodes[i]["id"]]=this.parsedJson.nodes[i]["color"];
            }

            // console.log('salientProcessingColor\n',salientProcessingColor);

            // Sort nodes by number of incoming + outgoing

            for (let i = 0; i < tempParsedJson.nodes.length; i++) {
                sum = tempParsedJson.nodes[i].incoming.length + tempParsedJson.nodes[i].outgoing.length;
                sumInOut[i] = [i,sum];
            }
            sumInOut.sort((first,second) => {return second[1]-first[1]});
            // console.log('SumInOut\n',sumInOut)

            let iTempNode = 0;
            for (let i = 0; i < sumInOut.length; i++) {

                if(tempParsedJson.nodes[sumInOut[i][0]]["type"] == "TimeNode" || tempParsedJson.nodes[sumInOut[i][0]]["type"] == "NumberNode") {
                    // console.log('In first if');
                    tempParsedJson.nodes[sumInOut[i][0]]["color"] = "#C0C0C0";
                    continue;
                }

                if (iTempNode < numberOfNodesToShow){
                        // console.log('In if sumInOut[i][0] =', sumInOut[i][0]);
                        tempParsedJson.nodes[sumInOut[i][0]]["color"] = "#146EB4";
                        iTempNode = iTempNode + 1;
                    }
                else {
                    // console.log('In else sumInOut[i][0] =', sumInOut[i][0]);
                    tempParsedJson.nodes[sumInOut[i][0]]["color"] = "#C0C0C0";
                }
            }


            // Save name of links for later

            console.log('tempParsedJson.links\n',tempParsedJson.links);

            for (let i = 0; i < this.parsedJson.links.length; i++) {
                salientProcessingLinkNames[this.parsedJson.links[i]['index']]=this.parsedJson.links[i]['name'];
            }

            console.log('salientProcessingLinkNames\n',salientProcessingLinkNames);

            //  Empty name field of links

            for (let i = 0; i < tempParsedJson.links.length; i++) {

                 tempParsedJson.links[i]['name'] = '';

            }


            return tempParsedJson;
        }
   }

   // Function to preprocess atoms that are returned from calling visualizerService
   preprocessAtoms() {

   //Replace instances of back with null string for now till fix is done on opencog code
      for (let i = 0; i < this.atoms.result.atoms.length; i++) {
            this.atoms.result.atoms[i]["name"] = this.atoms.result.atoms[i]["name"].replace(/back-/ig,"");
            this.atoms.result.atoms[i]["name"] = this.atoms.result.atoms[i]["name"].replace(/back/ig,"");
            this.atoms.result.atoms[i]["type"] = this.atoms.result.atoms[i]["type"].replace(/back-/ig,"");
            this.atoms.result.atoms[i]["type"] = this.atoms.result.atoms[i]["type"].replace(/back/ig,"");
      }


   }

   // Function to replace some links with symbols
   replaceLinkNames() {

   //Replace link names
   /*   for (let i = 0; i < this.atoms.result.atoms.length; i++) {
            this.atoms.result.atoms[i]["name"] = this.atoms.result.atoms[i]["name"].replace(/back-/ig,"");
            this.atoms.result.atoms[i]["name"] = this.atoms.result.atoms[i]["name"].replace(/back/ig,"");
            this.atoms.result.atoms[i]["type"] = this.atoms.result.atoms[i]["type"].replace(/back-/ig,"");
            this.atoms.result.atoms[i]["type"] = this.atoms.result.atoms[i]["type"].replace(/back/ig,"");
      }*/


   }

  /*
   * Post-Init
   */
  ngAfterViewInit() {
    if (this.atoms) {

      this.preprocessAtoms();

      this.parsedJson = this.visualizerService.getParsedJson(this.atoms.result.atoms);
      // this.parsedJson = this.salientIncomingOutgoingLinks();
      if (this.atoms.result.atoms.length) {
        let resultStr = 'Loaded ' + this.atoms.result.atoms.length + ' atoms';
        if (typeof this.atoms.result.complete !== 'undefined') { resultStr += ', complete=' + this.atoms.result.complete; }
        if (typeof this.atoms.result.skipped !== 'undefined') { resultStr += ', skipped=' + this.atoms.result.skipped; }
        this.getFilters(this.parsedJson);
        console.log(resultStr);
      }
      this.draw_graph();
      isSimulationRunning = true;
      this.isInitialLoad = false;

      this.parsedJson = this.salientIncomingOutgoingLinks();

      // Calling draw_graph twice (along with setting flags, etc) might be a less than ideal hack.
      // Redrawing simulation in draw_graph might be a good solution.
      this.draw_graph();
      isSimulationRunning = true;
      this.isInitialLoad = false;
      // Calling draw_graph twice ends

    }

    setInterval(() => {
	    this.update();
	}, 3000);
	console.log('setInterval called from visualizer component');

  }

   update() {

        try {

                    if(previousNumberOfAtoms != this.atoms.result.atoms.length){
                        previousNumberOfAtoms = this.atoms.result.atoms.length;
                        this.ngAfterViewInit();
                    }

            }
            catch (error) {
                console.log(error);
            }


            if (this.numAtoms == 0 && previousNumberOfAtoms !=0){

                  previousNumberOfAtoms = 0;
                  this.parsedJson = this.visualizerService.getParsedJson([]);

                  this.draw_graph();
                  isSimulationRunning = true;
                  this.isInitialLoad = false;

                  console.log('In if (this.numAtoms == 0 && previousNumberOfAtoms !=0)');

            }



  }

  /*
   * On changes
   */
  ngOnChanges(changes: SimpleChanges) {
    // console.log("ngOnChanges()");
    if (!changes.atoms.isFirstChange()) {
    // if (!changes.atoms.isFirstChange() && !changes.unordered_linktypes.isFirstChange() && !changes.language.isFirstChange() ) {
      this.ngAfterViewInit();
    }
  }

  /*
   * panToCenter() - Reset panning to center.
   */
  panToCenter() {
    const scale = this.zoomScale;
    let x = -((scale - 1) / 2) * widthView;
    const y = -((scale - 1) / 2) * heightView;
    x *= 0.70193340494092373791621911922664;
    // console.log('panToCenter(): transform: ' + x + ', ' + y + ', ' + scale);

    const __this = this;
    const view = d3.select('svg');
    // console.log('panToCenter(): transform(before)=' + d3.zoomTransform(view.node()));
    view.transition()
      .attr('transform', 'translate(' + x + ',' + y + ').scale(' + scale + ')')
      .on('end', function () {
        view.call(__this.d3zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
        // console.log('panToCenter(): transform(after)=' + d3.zoomTransform(view.node()));
      });
  }

  /*
   * panNodeToCenter() - Center the specified node in the D3 client rectangle.
   */
  panNodeToCenter(d) {
    const scale = this.zoomScale;
    const x = (widthView / 2) - (d.x * scale);
    const y = (heightView / 2) - (d.y * scale);
    // console.log('panNodeToCenter(): transform: ' + x + ', ' + y + ', ' + scale);

    const __this = this;
    const view = d3.select('svg');
    // console.log('panNodeToCenter(): transform(before)=' + d3.zoomTransform(view.node()));
    view.transition()
      .attr('transform', 'translate(' + x + ',' + y + ').scale(' + scale + ')')
      .on('end', function () {
        view.call(__this.d3zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
        // console.log('panNodeToCenter(): transform(after)=' + d3.zoomTransform(view.node()));
      });
  }

  /*
   * removeNodeDecorators() - Remove all decorator indications on Node.
   */
  removeNodeDecorators() {
    // Undo Selection indication
    d3.selectAll('circle')
      .style('r', function (d) {
        let r = d.name === '' ? radiusNodeNameless : radiusNode;
        r = VisualizerComponent.scaleRadius(r, d.av.sti);  // Node Weighting by STI.
        return r;
      }).style('stroke', '#fff');
  }

  /*
   * Click Handler: Pause Force Simulation
   */
  pauseSimulation() {
    if (simulation) {
      simulation.stop();
      isSimulationRunning = false;
      reheatFactor = 1;
    }
  }

  /*
   * Click Handler: Continue (paused) Force Simulation. Or if already running, add some heat.
   */
  playSimulation() {
    if (simulation) {
      if (!isSimulationRunning) {  // Not running
        simulation.restart();
        isSimulationRunning = true;
      } else {  // Already running
        reheatFactor = Math.min(reheatFactorMax, reheatFactor + 1);  // Pump up the volume, within limits.
        // console.log('reheatFactor=', reheatFactor);

        simulation
          .alpha(1)
          .alphaTarget(0.1 * reheatFactor)
          .force('charge', d3.forceManyBody().strength(simForceStrength * reheatFactor).distanceMax(400))
          .restart();
      }
    }
  }

  /*
   * Click Handler: Completely Restart Force Simulation anew
   */
  restartSimulation() {
    this.pauseSimulation();
    this.closeSelectedNodeProps();
    this.isDrilledNodes = false;
    filterMenuInitialized = false;

    // Reset to original data, just in case data has been pruned
    this.parsedJson = this.visualizerService.getParsedJson(this.atoms.result.atoms);

    // Draw graph
    this.draw_graph();
    isSimulationRunning = true;

    this.parsedJson = this.salientIncomingOutgoingLinks();

    // Calling draw_graph twice (along with setting flags, etc) might be a less than ideal hack.
    // Redrawing simulation in draw_graph might be a good solution.
    this.draw_graph();
    isSimulationRunning = true;
    // Calling draw_graph twice ends
  }

  /*
   * Click Handler: Zoom In
   */
  zoomIn(duration: number) {
    // Adjust scale variable within constraints
    if (this.zoomScale < 1) {
      this.zoomScale = 1;
    } else if (this.zoomScale < 4) {
      this.zoomScale += 1;
    }
    const view = d3.select('svg');
    view.transition().duration(duration).call(this.d3zoom.scaleTo, this.zoomScale);
    // console.log('zoomIn(): Changed scale from ' + currZoomScale + ' to ' + this.scale);
  }

  /*
   * Click Handler: Zoom Out
   */
  zoomOut(duration: number) {
    // Adjust scale variable within constraints
    if (this.zoomScale === 1) {
      this.zoomScale = 0.5;
    } else if (this.zoomScale > 1) {
      this.zoomScale -= 1;
    }
    const view = d3.select('svg');
    view.transition().duration(duration).call(this.d3zoom.scaleTo, this.zoomScale);
    // console.log('zoomOut(): Changed scale from ' + currZoomScale + ' to ' + this.scale);
  }

  /*
   * Click Handler: Restore default Zoom level
   */
  zoomReset(duration: number) {
    this.zoomScale = 1;  // variable to control the scale of zoom.
    const view = d3.select('svg');
    view.transition().duration(duration).call(this.d3zoom.scaleTo, this.zoomScale);
    this.panToCenter.call(this);
  }

  /*
   * Click Handler: Toggle detailed tooltips on and off
   */
  toggleTooltips() {
    // console.log('toggleTooltips(): Detailed Tooltips checkbox clicked');
    this.isDetailedTooltips = !this.isDetailedTooltips;
    window.localStorage.setItem(isDetailedTTKey, this.isDetailedTooltips ? 'true' : 'false');
  }

  /*
   * Click Handler: Hide the Popup Selected Node Information Table
   */
  closeSelectedNodeProps() {
    // Node selection
    this.isSelectedNode = false;
    this.selectedNodeData = null;

    // Node filtering
    filterMenuInitialized = false;
    this.clearFilters();

    // Undo Selection indication
    this.removeNodeDecorators();
  }

  /*
   * onLoadFiltering() - Load Filtering menu
   */
  onLoadFiltering(event) {
    // console.log('onloadFiltering() ' + event);
    if (filterMenuInitialized) { return; }
    // console.log('onloadFiltering() - building menu ' + event);

    // Build Filter menu
    const strUnfiltered = this._translate.instant('Unfiltered');
    const strFilterOnSelection = this._translate.instant('FilterOnSelection');
    $('#filtermenu').empty();
    $('#filtermenu').append('<div class=\'header\'><i class=\'tags icon\'></i><span>' + strFilterOnSelection +
      '</span></div><div class=\'divider\'></div>');
    this.nodeTypes.forEach(type => { $('#filtermenu').append('<div class=\'item\'><span>' + type + '</span></div>'); });
    $('#filtermenu').append('<div class=\'divider\'></div>');
    this.linkTypes.forEach(type => { $('#filtermenu').append('<div class=\'item\'><span>' + type + '</span></div>'); });
    // $('#filtermenu').append('<div class=\'divider\'></div><div class=\'item\'><span>' +
    //   '<i class=\'remove icon\' id=\'removeicon\'></i>' + strUnfiltered + '</span></div>');
    $('#filtermenu').append('<div class=\'divider\'></div><div class=\'item\'><span>' + strUnfiltered + '</span></div>');

    filterMenuInitialized = true;
  }

  /*
   * onClickFiltering() - Click Handler for Filtering menu
   */
  onClickFiltering(event) {
    // console.log('onClickFiltering() ' + event);
    if (event.target.innerText) {
      VisualizerComponent.this().filterByNode(event.target.innerText);

      // if (event.target.innerText === this._translate.instant('Unfiltered')) {
      //   d3.select('#filtermenu').select('#removeicon').remove();
      // }
    }
  }

  /*
   * Click Handler: Filter by Node
   *
   * Description: Show or Hide nodes with links as per whether they are currently filtered or not.
   */
  filterByNode(type) {
    // console.log('filterByNode(type): ' + type);

    const filterTypeAll =  this._translate.instant('Unfiltered');

    // Clear Filter
    if (type === filterTypeAll) {
      // this.showAll();
      this.clearFilters();
      return;
    }

    // Build link map
    const linkedByIndex = {};
    this.link.each(function (d) {
      linkedByIndex[d.source.index + ',' + d.target.index] = true;
      linkedByIndex[d.target.index + ',' + d.source.index] = true;
    });

    // Function for testing if neighbor against link map
    function neighboring(a, b) {
      return linkedByIndex[a.index + ',' + b.index];
    }

    // Show/hide neighboring Nodes
    this.node.style('opacity', (d) => {
      return (neighboring(d, this.selectedNodeData) && d.type === type) ||
        // return (neighboring(d, this.selectedNodeData) && (d.type === type || type === filterTypeAll)) ||
        d.id === this.selectedNodeData.id ? opacityNode : opacityHidden;
    });

    // Show/hide neighboring Node Labels
    this.nodeLabel.style('opacity', (d) => {
      return (neighboring(d, this.selectedNodeData) && d.type === type) ||
        // return (neighboring(d, this.selectedNodeData) && (d.type === type || type === filterTypeAll)) ||
        d.id === this.selectedNodeData.id ? opacityNodeLabel : opacityHidden;
    });

    // Show/hide Links
    this.link.style('opacity', (d) => {
      // return (d.source === this.selectedNodeData || d.target === this.selectedNodeData) ? 1 : 0;
      if ((d.source === this.selectedNodeData) && d.target.type === type) {
        // if ((d.source === this.selectedNodeData) && (d.target.type === type || type === filterTypeAll)) {
        return opacityLink;
      } else if ((d.target === this.selectedNodeData) && d.source.type === type) {
        // } else if ((d.target === this.selectedNodeData) && (d.source.type === type || type === filterTypeAll)) {
        return opacityLink;
      } else {
        return opacityHidden;
      }
    });
    this.textPath.style('opacity', (d) => {
        // return (d.source === this.selectedNodeData || d.target === this.selectedNodeData) ? 1 : 0;
      if ((d.source === this.selectedNodeData) && d.target.type === type) {
        // if ((d.source === this.selectedNodeData) && (d.target.type === type || type === filterTypeAll)) {
        return opacityLink;
      } else if ((d.target === this.selectedNodeData) && d.source.type === type) {
        // } else if ((d.target === this.selectedNodeData) && (d.source.type === type || type === filterTypeAll)) {
        return opacityLink;
      } else {
        return opacityHidden;
      }
    });

    // Show/hide Link Shadow text
    this.linkLabelShadow.style('opacity', (d) => {
      // return (d.source === this.selectedNodeData || d.target === this.selectedNodeData) ? 1 : 0;
      if ((d.source === this.selectedNodeData) && d.target.type === type) {
        // if ((d.source === this.selectedNodeData) && (d.target.type === type || type === filterTypeAll)) {
        return opacityLinkLabel;
      } else if ((d.target === this.selectedNodeData) && d.source.type === type) {
        // } else if ((d.target === this.selectedNodeData) && (d.source.type === type || type === filterTypeAll)) {
        return opacityLinkLabel;
      } else {
        return opacityLinkLabelHidden;
      }
    });

    // Show/hide Link text
    this.linkLabel.style('opacity', (d) => {
      // return (d.source === this.selectedNodeData || d.target === this.selectedNodeData) ? 1 : 0;
      if ((d.source === this.selectedNodeData) && d.target.type === type) {
        //  if ((d.source === this.selectedNodeData) && (d.target.type === type || type === filterTypeAll)) {
        return opacityLinkLabel;
      } else if ((d.target === this.selectedNodeData) && d.source.type === type) {
        // } else if ((d.target === this.selectedNodeData) && (d.source.type === type || type === filterTypeAll)) {
        return opacityLinkLabel;
      } else {
        return opacityHidden;
      }
    });
  }
  /* End Filter by Node */

  /*
   * Click Handler: Show all data
   */
  showAll() {
    // console.log('showAll()');

    if (isSimulationRunning) { simulation.stop(); }

    this.preprocessAtoms();

    // Get Data
    this.parsedJson = this.visualizerService.getParsedJson(this.atoms.result.atoms);
    // console.log(this.parsedJson);

    this.closeSelectedNodeProps();
    this.isDrilledNodes = false;
    filterMenuInitialized = false;

    this.draw_graph();

    this.parsedJson = this.salientIncomingOutgoingLinks();

    // Calling draw_graph twice (along with setting flags, etc) might be a less than ideal hack.
    // Redrawing simulation in draw_graph might be a good solution.
    this.closeSelectedNodeProps();
    this.isDrilledNodes = false;
    filterMenuInitialized = false;

    this.draw_graph();
    // Calling draw_graph twice ends


    if (isSimulationRunning) { simulation.restart(); }
  }

 /*
  * getFilters() - Extract unique Node types and Link types from AtomSpace data for dynamically constructed filtering menu
  */
  public getFilters(parsedJson) {
    // Nodes
    parsedJson.nodes.forEach(elem => {
      if (elem.name !== '') {
        if (this.nodeTypes.indexOf(elem.type) === -1) {
          if (this.nodeTypes.length < maxNodeFilterSize) {
            this.nodeTypes.push(elem.type);
          } else {
            console.log('Dropping Node filter for \'' + elem.type + '\' because exceeded maxNodeFilterSize (' + maxNodeFilterSize + ')');
          }
          // console.log('Node type push(' + elem.type + ')');
        }
      }
    });
    // Links
    parsedJson.links.forEach(elem => {
      if (elem.name !== '') {
        if (this.linkTypes.indexOf(elem.name) === -1) {
          if (this.linkTypes.length < maxLinkFilterSize) {
            this.linkTypes.push(elem.name);
          } else {
            console.log('Dropping Link filter for \'' + elem.name + '\' because exceeded maxLinkFilterSize (' + maxLinkFilterSize + ')');
          }
          // console.log('Link type push(' + elem.name + ')');
        }
      }
    });
    this.nodeTypes.sort();
    this.linkTypes.sort();
  }

  /*
   * Clear filters (unhide hidden nodes and links)
   *
   * TODO: Doesn't work if not in isPruneFilteredNodes mode.
   */
  public clearFilters() {
    // console.log('clearFilters()');

    // Unpin and reset charge of all nodes
    this.node.each(function (d) { d.fx = d.fy = null; });
    simulation.force('charge', d3.forceManyBody().strength(function (d) {
      d.charge = simForceStrength;
      return simForceStrength;
    }));
    if (isSimulationRunning) { simulation.restart(); }

    // Set properties to their original form...

    // Links
    this.link.style('stroke-width', strokeWidthLink).style('opacity', opacityLink);
    // Text Path
    this.textPath.style('opacity', opacityLink);

    // Nodes
    this.node.style('opacity', opacityNode).style('stroke', '#fff');

    // Opacity of all text
    d3.selectAll('text.node-labels').style('opacity', opacityNodeLabel);
    d3.selectAll('text.edgelabel').style('opacity', opacityLinkLabel);
    d3.selectAll('text.edgelabelshadow').style('opacity', opacityLinkLabel);

    // Link Label shadow text size and text spacing from link line
    d3.selectAll('.edgelabelshadow').style('font', fontLink).attr('dy', dyLinkLabel);

    // Link Label text size and text spacing from link line
    d3.selectAll('.edgelabel').style('font', fontLink).attr('dy', dyLinkLabel);

    // If there's a selected node, restore it's selection indication
    const __this = this;
    if (this.isSelectedNode) {
      this.node.each(function (d) {
        if (d.id === __this.selectedNodeData.id) {
          d3.select(this).style('stroke-width', strokeWidthSelectedNode);
          d3.select(this).style('stroke', colorSelectedNode);
        }
      });
    }
  }

  /*
   * draw_graph() - Main D3 Graph rendering function
   */
  public draw_graph() {
    // console.log('draw_graph()');

    // Map of outgoing links for identifying multiple links between nodes
    const linkedByOutgoing = {};

    // Clear everything out of the DOM
    this.svg = d3.select('svg');
    this.svg.selectAll('*').remove();
    this.isSuppressTooltip = true;
    filterMenuInitialized = false;

    // Get SVG element width and height
    widthView = document.getElementById('svgcanvas').clientWidth;
    heightView = document.getElementById('svgcanvas').clientHeight;
    if (widthView === 0 && heightView === 0) {  // Firefox
      const rect = document.getElementById('svgcanvas').getBoundingClientRect();
      widthView = rect.width;
      heightView = rect.height;
    }

    // Node color scheme
    const colorScheme = d3.scaleOrdinal(d3.schemeCategory20);

    // Set up Force Simulation
    const defaultAlphaDecay = 1 - Math.pow(0.001, 1 / 300);  // ~0.0228.
    const alphaDecay = this.atoms.result.atoms.length < 50 ? 0.008 : defaultAlphaDecay;

    if (simulation) { simulation.stop(); }  // Make sure simulation is stopped, else get nodes "explosion" effect.
    simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(function (d) { return d.id; }).distance(100))  // .strength(1))
      .force('charge', d3.forceManyBody().strength(simForceStrength).distanceMax(250))
      // .force('charge', d3.forceManyBody().theta(0.8))
      .force('center', d3.forceCenter(widthView / 2, heightView / 2))
      .force('collide', d3.forceCollide().radius(function (d) {
        let r = (d.name === '') ? radiusNodeNameless : radiusNode;
        r = VisualizerComponent.scaleRadius(r, d.av.sti);  // Node Weighting by STI.
        return r;
      }))
      .alphaDecay(alphaDecay);

    // Set up Rect within SVG window
    this.svg.append('rect')
      .attr('width', widthView)
      .attr('height', heightView)
      .style('fill', 'none')
      .style('pointer-events', 'all');

    // Add group under svg element
    const g = this.svg.append('g').attr('class', 'svg-grp');

    // Set up zooming for this element
    function zoomHandler() {
      // console.log('zoomHandler() scale before=' + this.zoomScale);
      this.zoomScale = d3.event.transform.k;  // Keep zoomScale in sync.
      g.attr('transform', d3.event.transform);
      // console.log('zoomHandler() scale after=' + this.zoomScale);
    }

    // Set up main context menu on svg client area
    this.svg.on('contextmenu', d3.contextMenu(this.menus.mainMenu));

    // Build up the graph elements in the DOM...

    // Define arrowheads for lines
    g.append('svg:defs')
      .selectAll('marker')
      .data(['marker'])
      .enter()
      .append('svg:marker')
      .attr('id', 'markerEnd')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('markerUnits', 'userSpaceOnUse')  // Do not scale up marker size per path's stroke width.
      .attr('orient', 'auto')
      .append('svg:path')
      // .attr('d', 'M0,-5L10,0L0,5')
      .attr('d', 'M0,-3.5L10,0L0,3.5')
      .style('fill', colorMarker)
      .style('stroke', 'none');
    g.append('svg:defs')
      .selectAll('marker')
      .data(['marker'])
      .enter()
      .append('svg:marker')
      .attr('id', 'markerStart')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 2)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('markerUnits', 'userSpaceOnUse')  // Do not scale up marker size per path's stroke width.
      .attr('orient', 'auto')
      .append('svg:path')
      // .attr('d', 'M0,0L10,-5L10,5Z')
      .attr('d', 'M0,0L10,-3.5L10,3.5Z')
      .style('fill', colorMarker)
      .style('stroke', 'none');
    // Links
    const __this = this;
    this.link = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(this.parsedJson.links)
      .enter()
      .append('path')
      .attr('class', 'lines')
      .style('fill', 'none')  // Else if path is arc'd, the concave side will be filled in.
      .style('stroke-width', strokeWidthLink)
      .style('stroke-linecap', 'round')
      .attr('marker-end', 'url(#markerEnd)')  // Arrow to show incoming direction.
      /*.attr('marker-start', function(d) {  // Also add outgoing arrow for unordered (symmetric links)
        for (let i = 0; __this.unordered_linktypes && i < __this.unordered_linktypes.length; i++) {
          if (d.name === __this.unordered_linktypes[i]) { return 'url(#markerStart)'; }
        }
        return '';
      })*/;
      /* Mouseover/out over link lines no longer works after converting from lines to paths (including arcs). Was hard
       * for users to trigger over the narrow link lines anyway, so just leaving link labels as the mouseover target
      .on('mouseover', (d) => linkMouseOver.call(this, d))
      .on('mouseout', (d) => linkMouseOut.call(this, d));
      */

    // Link edgepath
    this.textPath = g.append('g')
      .attr('class', 'edgepath-grp')
      .selectAll('.edgepath')
      .data(this.parsedJson.links)
      .enter()
      .append('path')
      .attr('class', 'edgepath')
      .style('fill', 'none')  // Else if path is an arc, the concave side will be filled in.
      .style('stroke', 'black')
      .attr('id', function (d, i) {
        return 'edgepath' + i;
      })
      .style('user-select', 'none');

    // Link Label Shadows
    this.linkLabelShadow = g.append('g')
      .attr('class', 'edgelabelshadow-grp')
      .selectAll('.edgelabel')
      .data(this.parsedJson.links)
      .enter()
      .append('text')
      .style('user-select', 'none')
      .style('font', fontLink)
      .style('line-height', '150%')
      .style('stroke-width', strokeWidthLabelShadow)
      .attr('class', 'edgelabelshadow')
      .attr('dy', dyLinkLabel)  // Adjust position of text vs link line.
      .attr('id', function (d, i) {
        return 'edgelabelshadow' + i;
      });

    // Link Labels
    this.linkLabel = g.append('g')
      .attr('class', 'edgelabel-grp')
      .selectAll('.edgelabel')
      .data(this.parsedJson.links)
      .enter()
      .append('text')
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('font', fontLink)
      .style('line-height', '150%')
      // .style("fill", "white")  // Text color
      .attr('class', 'edgelabel')
      .attr('dy', dyLinkLabel)  // Adjust position of text vs link line.
      .attr('id', function (d, i) {
        return 'edgelabel' + i;
      });

    // Position label shadow midway along the link
    this.linkLabelShadow.append('textPath')
      .attr('xlink:xlink:href', function (d, i) {
        return '#edgepath' + i;
      })
      .style('text-anchor', 'middle')
      .style('user-select', 'none')
      .attr('startOffset', '50%')
      .text(function (d) {
        return d.name;
      })
      // Hover over link label for tooltip (using label shadows because they're a slightly larger target than the labels themselves)
      .on('mouseover', (d) => linkMouseOver.call(this, d))
      .on('mouseout', (d) => linkMouseOut.call(this, d));

    // Position label midway along the link
    this.linkLabel.append('textPath')
      .attr('xlink:xlink:href', function (d, i) {
        return '#edgepath' + i;
      })
      .style('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .attr('startOffset', '50%')
      .text(function (d) {
        return d.name;
      });

    // Nodes
    this.node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(this.parsedJson.nodes)
      .enter().append('circle')
      .on('contextmenu', d3.contextMenu(this.menus.nodeMenu))
      .attr('r', (d) => {
        let r = (d.name === '') ? radiusNodeNameless : radiusNode;
        r = VisualizerComponent.scaleRadius(r, d.av.sti);  // Node Weighting by STI.
        // console.log('Appending circle \'' + d.name + '\' radius=' + r);
        return r;
      })
      .style('fill', function (d) {
        // If node already has color, use it. Else get from color scheme
        d.color = d.color ? d.color : colorScheme(d.group);
        return d.color;
      })
      .style('opacity', opacityNode)
      // Handle tooltips
      .on('mouseover', (d) => nodeMouseOver.call(this, d))
      .on('mouseout', (d) => nodeMouseOut.call(this, d))
      // Enable node dragging
      .call(d3.drag().subject((d) => d)
        .on('start', (d) => nodeDragStarted.call(this, d))
        .on('drag', (d) => nodeDragging.call(this, d))
        .on('end', (d) => nodeDragEnded.call(this, d)));

    // Node Text
    this.nodeLabel = g.append('g')
      .attr('class', 'nodelabel-grp')
      .selectAll('.mytext')
      .data(this.parsedJson.nodes)
      .enter()
      .append('text')

      // Size font per node radius, including to truncate text with ellipsis if too long
      .text(function (d) {
        const len = d.name.length;
        if (len === 0) {
          return '';
        } else if (len > maxNodeLabelLength) {
          return d.name.substr(0, maxNodeLabelLength - 3) + '...';
        } else { return d.name; }
      })
      .style('font-family', fontfamilyNode)
      .style('font-weight', fontweightNode)
      .style('font-size', '1px')
      .each(getSizeNodeLabel)
      .style('font-size', function () {
        return Math.min(d3.select(this).attr('data-scale'), maxfontsizeNode) + 'px';
      })
      // .style('font-size', function(d) { return Math.min(2 * d.r, (2 * d.r - 8) / this.getComputedTextLength() * 24) + 'px'; })
      .attr('class', 'node-labels')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('fill', '#fff')  // Text color inside nodes.
      .style('opacity', opacityNodeLabel);


    // Setup Node and D3 client area handlers
    this.node.on('click', (d) => nodeSingleClick.call(this, d));
    this.node.on('dblclick', (d) => nodeDoubleClick.call(this, d));
    d3.select(window).on('resize', () => graphResize.call(this));
    d3.select(window).on('keydown', () => graphKeydown.call(this));
    d3.select(window).on('mousemove', () => graphMousemove.call(this));

    // Set up zooming after all elements are added to svg group, else those elements
    // won't stay in sync during certain operations like programmatic panning transforms
    this.svg.call(this.d3zoom
      .scaleExtent([1 / 2, 4])
      .duration(defaultTransitionDuration)
      .on('zoom', () => zoomHandler.call(this)))
      .on('dblclick.zoom', null);  // Dbl-click zoom causes problems when drill down to node and it's neighbors.

    // Reapply scale if it has been changed from default
    if (this.zoomScale !== 1) {
      const view = d3.select('svg');
      view.transition().duration(defaultTransitionDuration).call(this.d3zoom.scaleTo, this.zoomScale);
    }

    /*
     * Force Simulation
     */
    simulation
      .nodes(this.parsedJson.nodes)
      // .on('tick', () => graphTick.call(this));
      .stop();

    // Simulation Links
    simulation.force('link')
      .links(this.parsedJson.links);
    // Build map of outgoing links for identifying multiple links between nodes
    this.link.each(function (d) {
      if (linkedByOutgoing[d.source.id + ',' + d.target.id]) {
        linkedByOutgoing[d.source.id + ',' + d.target.id] += ',' + d.id;
      } else {
        linkedByOutgoing[d.source.id + ',' + d.target.id] = d.id.toString();
      }
      if (linkedByOutgoing[d.target.id + ',' + d.source.id]) {
        linkedByOutgoing[d.target.id + ',' + d.source.id] += ',' + d.id;
      } else {
        linkedByOutgoing[d.target.id + ',' + d.source.id] = d.id.toString();
      }
    });
    // console.log(linkedByOutgoing);
    for (var i = 0; i < 300; ++i) {
        simulation.tick();
    }

    graphTick.call(this)

    // This will enable the nodes to be draggable once the graph is drawn without running simulation the first time
    simulation.on('tick', () => graphTick.call(this));
    simulation.restart();


    /*
     * Node Drag implementation
     */
    function nodeDragStarted(d) {  // Note that this gets invoked by drags or clicks.
      // console.log('nodeDragStarted(): d3.event.active=\'' + d3.event.active + '\'' );

      // Set alphaTarget during layout update so that node positions will update smoothly
      if (!d3.event.active) { simulation.alphaTarget(0.3).restart(); }

      d.fx = d.x;
      d.fy = d.y;

      d3.event.sourceEvent.stopPropagation();
    }
    function nodeDragging(d) {  // Note that this gets invoked by drags or clicks.
      // console.log('nodeDragging(): d3.event.active=\'' + d3.event.active + '\'' );
      // console.log('  d3.event.sourceEvent.movementX=\'' + d3.event.sourceEvent.movementX + '\'' );
      // console.log('  d3.event.sourceEvent.movementY=\'' + d3.event.sourceEvent.movementY + '\'' );
      // console.log('  w=' + widthView + ', h=' + heightView);

      if (isNodesConstrainedToClientArea) {
        d.fx = Math.max(nodePositionMargin, Math.min(widthView - nodePositionMargin, d3.event.x));
        d.fy = Math.max(nodePositionMargin, Math.min(heightView - nodePositionMargin, d3.event.y));
      } else {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      }
    }
    function nodeDragEnded(d) {  // Note that this gets invoked by drags or clicks.
      // console.log('nodeDragEnded(): d3.event.active=\'' + d3.event.active + '\'' );

      // Let simulation cool back down
      if (!d3.event.active) { simulation.alphaTarget(0); }

      // If simulation already paused, keep it paused
      if (isSimulationRunning === false) { this.pauseSimulation(); }

      // Leave node pinned if dragged (or clicked or double-clicked) w/CTRL key
      if (!d3.event.sourceEvent.ctrlKey) {
        d.fx = d.fy = null;  // Only unpin if not w/CTRL key.
      }

      // Apply high charge to node if dragged (or clicked or double-clicked) w/Shift key
      if (d3.event.sourceEvent.shiftKey) {
        simulation.force('charge', d3.forceManyBody().strength(function (o) {
          return d.id === o.id ? simForceStrengthHighNodeCharge : simForceStrength;
        }));
        d.charge = simForceStrengthHighNodeCharge;
        if (isSimulationRunning) { simulation.restart(); }
      }
    }

    /*
     * ## draw_graph() Functions ##
     */

    /*
     * graphTick.() - Adjust positions of all the Force Simulation elements
     */
    function graphTick() {
      // console.log('graphTick(): Simulation Force alpha: ' +
      //   simulation.alpha());  // Simulation stops automatically when alpha drops below 0.001.

      // Work around for IE (version 10, 11, ??). Without this workaround, SVG markers cause severe rendering problems on IE
      // https://stackoverflow.com/questions/15588478/internet-explorer-10-not-showing-svg-path-d3-js-graph
      if (versionIE > 0) {
        // The workaround is to iterate over all the links on every tick of the animation, re-adding
        // them to the DOM. This causes IE to re-render them, bypassing the IE rendering problems
        this.link.each(function() { this.parentNode.insertBefore(this, this); } );
      }
      // Update Link and Link Label positions
      //
      // Multiple link handling:
      //  - 1 or more links, with odd quantity: 1st link is straight. Next pair (2 & 3) are arc-pathed links. Next pair (4 & 5) are
      //    arc-pathed with a larger radius. #6 and beyond not supported for now. They'll be drawn straight, overlapping each other.
      // - 2 or more links, with even quantity: 1st pair (1 & 2) are arc-pathed links. Next pair (3 & 4) are arc-pathed with a larger
      //   radius. #5 and beyond not supported for now. They'll be drawn straight, overlapping each other.
      const offsetRadsL1 = 0.13, offsetRadsL2 = 0.26, offsetRadsL3 = 0.39,
            radiusFactorL1 = 1.75, radiusFactorL2 = 1.0, radiusFactorL3 = 0.70;
      this.link.attr('d', function(d) {
        const arrOutLinks = getOutgoingLinks(d);
        if (arrOutLinks.length % 2) {  // Odd # of links
          switch (d.id) {
            case arrOutLinks[0]: return straightPath(d, true);
            case arrOutLinks[1]: return arcPath(d, true, offsetRadsL1, radiusFactorL1, true);
            case arrOutLinks[2]: return arcPath(d, true, offsetRadsL1, radiusFactorL1, false);
            case arrOutLinks[3]: return arcPath(d, true, offsetRadsL2, radiusFactorL2, true);
            case arrOutLinks[4]: return arcPath(d, true, offsetRadsL2, radiusFactorL2, false);
            case arrOutLinks[5]: return arcPath(d, true, offsetRadsL3, radiusFactorL3, true);
            case arrOutLinks[6]: return arcPath(d, true, offsetRadsL3, radiusFactorL3, false);
            default: return straightPath(d, true);  // More links not supported yet. Overwrite central link for now.
          }
        } else {  // Even # of links
          switch (d.id) {
            case arrOutLinks[0]: return arcPath(d, true, offsetRadsL1, radiusFactorL1, true);
            case arrOutLinks[1]: return arcPath(d, true, offsetRadsL1, radiusFactorL1, false);
            case arrOutLinks[2]: return arcPath(d, true, offsetRadsL2, radiusFactorL2, true);
            case arrOutLinks[3]: return arcPath(d, true, offsetRadsL2, radiusFactorL2, false);
            case arrOutLinks[4]: return arcPath(d, true, offsetRadsL3, radiusFactorL3, true);
            case arrOutLinks[5]: return arcPath(d, true, offsetRadsL3, radiusFactorL3, false);
            default: return straightPath(d, true);  // More links not supported yet. Overwrite central link for now.
          }
        }
      });
      this.textPath.attr('d', function(d) {
        const isLeftHand = d.source.x < d.target.x;
        const arrOutLinks = getOutgoingLinks(d);
        if (arrOutLinks.length % 2) {  // Odd # of links
          switch (d.id) {
            case arrOutLinks[0]: return straightPath(d, isLeftHand);
            case arrOutLinks[1]: return arcPath(d, isLeftHand, offsetRadsL1, radiusFactorL1, true);
            case arrOutLinks[2]: return arcPath(d, isLeftHand, offsetRadsL1, radiusFactorL1, false);
            case arrOutLinks[3]: return arcPath(d, isLeftHand, offsetRadsL2, radiusFactorL2, true);
            case arrOutLinks[4]: return arcPath(d, isLeftHand, offsetRadsL2, radiusFactorL2, false);
            case arrOutLinks[5]: return arcPath(d, isLeftHand, offsetRadsL3, radiusFactorL3, true);
            case arrOutLinks[6]: return arcPath(d, isLeftHand, offsetRadsL3, radiusFactorL3, false);
            default: return straightPath(d, isLeftHand);  // More links not supported yet. Overwrite central link for now.
          }
        } else {  // Even # of links
          switch (d.id) {
            case arrOutLinks[0]: return arcPath(d, isLeftHand, offsetRadsL1, radiusFactorL1, true);
            case arrOutLinks[1]: return arcPath(d, isLeftHand, offsetRadsL1, radiusFactorL1, false);
            case arrOutLinks[2]: return arcPath(d, isLeftHand, offsetRadsL2, radiusFactorL2, true);
            case arrOutLinks[3]: return arcPath(d, isLeftHand, offsetRadsL2, radiusFactorL2, false);
            case arrOutLinks[4]: return arcPath(d, isLeftHand, offsetRadsL3, radiusFactorL3, true);
            case arrOutLinks[5]: return arcPath(d, isLeftHand, offsetRadsL3, radiusFactorL3, false);
            default: return straightPath(d, isLeftHand);  // More links not supported yet. Overwrite central link for now.
          }
        }
      });

      // Update Node position
      this.node
        .attr('cx', function (d) {
          if (isNodesConstrainedToClientArea) {
            return d.x = Math.max(nodePositionMargin, Math.min(widthView - nodePositionMargin, d.x));
          } else {
            return d.x;
          }
        })
        .attr('cy', function (d) {
          if (isNodesConstrainedToClientArea) {
            return d.y = Math.max(nodePositionMargin, Math.min(heightView - nodePositionMargin, d.y));
          } else {
            return d.y;
          }
        });

      // Update Node Label position
      this.nodeLabel
        .attr('x', function (d) { return d.x; })
        .attr('y', function (d) { return d.y; })
        .attr('dy', '0.35em');
    }
    /* End Simulation On-Tick function */

    /*
     * Node Mouse In/Out implementation
     */
    function nodeMouseOver(d) {
      // Hide tooltip when dragging
      if (d3.event.buttons !== 0) {
        // console.log('mouseover node, dragging');
        this.divTooltip.transition().duration(0).style('opacity', 0);
        return;
      }

      // Check for active tooltip transition
      if (this.isSuppressTooltip) { return; }

      // Also make sure Node is visible
      if (d3.select(d3.event.currentTarget).style('opacity') === 0) { return; }

      // Else show tooltip
      this.divTooltip.html(buildNodeTooltip(d, this.isDetailedTooltips));
      const evt = d3.event, wTT = this.divTooltip.node().firstChild.clientWidth, hTT = this.divTooltip.node().firstChild.clientHeight;
      const xTT = evt.pageX < (window.innerWidth - wTT) - this.marginTT ? evt.pageX + 12 : (evt.pageX - 12) - wTT;
      const yTT = evt.pageY < window.innerHeight - hTT ? evt.pageY - 12 : (evt.pageY + 12) - hTT;
      this.divTooltip.style('left', xTT + 'px').style('top', yTT + 'px');  // To avoid easing from previous position which is distracting.
      this.divTooltip.transition()
        // .delay(100)
        // .duration(100)
        .style('opacity', 0.90)
        .style('left', xTT + 'px')
        .style('top', yTT + 'px');

      drawNodeDecorators.call(this, d, true);
    }
    function nodeMouseOut(d) {
      // Hide tooltip when mouse out from Node
      this.divTooltip.transition().duration(0).style('opacity', 0);

      drawNodeDecorators.call(this, d, false);
    }

    /*
     * Link Mouse In/Out implementation
     */
    function linkMouseOver(d) {
      // Hide tooltip when dragging
      if (d3.event.buttons !== 0) {
        // console.log('mouseover link, dragging');
        this.divTooltip.transition().duration(0).style('opacity', 0);
        return;
      }

      // Check for active tooltip transition
      if (this.isSuppressTooltip) { return; }

      // Also make sure Link is visible
      if (d3.select(d3.event.currentTarget).style('opacity') === 0) { return; }

      // Else show tooltip
      this.divTooltip.html(buildLinkTooltip(d, this.isDetailedTooltips));
      const evt = d3.event, wTT = this.divTooltip.node().firstChild.clientWidth, hTT = this.divTooltip.node().firstChild.clientHeight;
      const xTT = evt.pageX < (window.innerWidth - wTT) - this.marginTT ? evt.pageX + 12 : (evt.pageX - 12) - wTT;
      const yTT = evt.pageY < window.innerHeight - hTT ? evt.pageY - 12 : (evt.pageY + 12) - hTT;
      this.divTooltip.style('left', xTT + 'px').style('top', yTT + 'px');  // To avoid easing from previous position which is distracting.
      this.divTooltip.transition()
        // .delay(100)
        // .duration(100)
        .style('opacity', 0.90)
        .style('left', xTT + 'px')
        .style('top', yTT + 'px');

      drawLinkDecorators.call(this, d, true);
    }
    function linkMouseOut(d) {
      // Hide tooltip when mouse out from Node
      this.divTooltip.transition().duration(0).style('opacity', 0);

      drawLinkDecorators.call(this, d, false);
    }

    /*
     * Node On-Single-Click function
     */
    function nodeSingleClick(d) {
      // console.log('Click: ', d);

      // Hide tooltip in case visible
      this.divTooltip.transition().duration(0).style('opacity', 0);

      // If this node already selected, then unselect
      if (this.isSelectedNode === true && this.selectedNodeData === d) {
        this.removeNodeDecorators();

        this.isSelectedNode = false;
        this.selectedNodeData = null;
        filterMenuInitialized = false;

        // If simulation already paused, keep it paused
        if (isSimulationRunning === false) { this.pauseSimulation(); }

        return;
      }

      // Display node info popup
      this.selectedNodeData = d;
      this.isSelectedNode = true;

      drawNodeDecorators.call(this, d, false);

      // If simulation already paused, keep it paused
      if (isSimulationRunning === false) { this.pauseSimulation(); }
    }
    /* End Node On-Single-Click function */

    /*
     * Node On-Double-Click function
     */
    function nodeDoubleClick(d) {
      // console.log('Doubleclick: ', d);

      // Apply previously saved attributes like color, link names

      for (let i = 0; i < this.parsedJson.nodes.length; i++) {
        this.parsedJson.nodes[i]["color"] = salientProcessingColor[i];
      }

      for (let i = 0; i < this.parsedJson.links.length; i++) {
        this.parsedJson.links[i]["name"] = salientProcessingLinkNames[i];
      }

      this.isDrilledNodes = true;
      this.selectedNodeData = d;
      this.isSelectedNode = true;

      // Build link map
      const linkedByIndex = {};
      this.link.each(function (k) {
        linkedByIndex[k.source.index + ',' + k.target.index] = true;
        linkedByIndex[k.target.index + ',' + k.source.index] = true;
      });

      // Additional level of links
      const neighbourLinks = [];
      const neighlink = [];
      const neigh = [];
      if (isXtraLevelNeighbors) {
        this.node.each(function (k) {
          if (neighboring(d, k) && k.name === '') {
            neighbourLinks.push(k);
          }
        });
        neighbourLinks.forEach((elem, i) => {
          neighlink.push(neighbourLinks[i].id);
          this.node.each(function (l) {
            if (neighboring(neighbourLinks[i], l)) {
              neigh.push(l.id);
            }
          });
        });
      }

      // Function for testing if neighbor against link map
      function neighboring(a, b) {
        return linkedByIndex[a.index + ',' + b.index];
      }

      // Node
      this.node.style('opacity', function (o) {
        if (isXtraLevelNeighbors) {
          return neighboring(d, o) || (d.id === o.id) || (neigh.indexOf(o.id) !== -1) ? opacityNode : opacityHidden;
        } else {
          return neighboring(d, o) || (d.id === o.id) ? opacityNode : opacityHidden;
        }
      });
      // console.log(neigh);

      // Node Label
      this.nodeLabel.style('opacity', function (o) {
        if (isXtraLevelNeighbors) {
          return neighboring(d, o) || (d.id === o.id) || (neigh.indexOf(o.id) !== -1) ? opacityNodeLabel : opacityHidden;
        } else {
          return neighboring(d, o) || (d.id === o.id) ? opacityNodeLabel : opacityHidden;
        }
      });

      // Link
      this.link.style('opacity', function (o) {
        if (isXtraLevelNeighbors) {
          return o.source === d || o.target === d || ((neigh.indexOf(o.target.id) !== -1) &&
            (neighlink.indexOf(o.source.id) !== -1)) || ((neigh.indexOf(o.source.id) !== -1) &&
              (neighlink.indexOf(o.target.id) !== -1)) ? opacityLink : opacityHidden;
        } else {
          return o.source === d || o.target === d ? opacityLink : opacityHidden;
        }
      });

      // Text Path
      this.textPath.style('opacity', function (o) {
        if (isXtraLevelNeighbors) {
          return o.source === d || o.target === d || ((neigh.indexOf(o.target.id) !== -1) &&
            (neighlink.indexOf(o.source.id) !== -1)) || ((neigh.indexOf(o.source.id) !== -1) &&
              (neighlink.indexOf(o.target.id) !== -1)) ? opacityLink : opacityHidden;
        } else {
          return o.source === d || o.target === d ? opacityLink : opacityHidden;
        }
      });
      // Link Text Shadow
      this.linkLabelShadow.style('opacity', function (o) {
        if (isXtraLevelNeighbors) {
          return o.source === d || o.target === d || ((neigh.indexOf(o.target.id) !== -1) &&
            (neighlink.indexOf(o.source.id) !== -1)) || ((neigh.indexOf(o.source.id) !== -1) &&
              (neighlink.indexOf(o.target.id) !== -1)) ? 1 : opacityLinkLabelHidden;
        } else {
          return o.source === d || o.target === d ? 1 : opacityLinkLabelHidden;
        }
      });

      // Link Text
      this.linkLabel.style('opacity', function (o) {
        if (isXtraLevelNeighbors) {
          return o.source === d || o.target === d || ((neigh.indexOf(o.target.id) !== -1) &&
            (neighlink.indexOf(o.source.id) !== -1)) || ((neigh.indexOf(o.source.id) !== -1) &&
              (neighlink.indexOf(o.target.id) !== -1)) ? opacityLinkLabel : opacityHidden;
        } else {
          return o.source === d || o.target === d ? opacityLinkLabel : opacityHidden;
        }
      });

      // If enabled, remove hidden nodes from DOM. Provides better user-experience with larger data sets
      if (isPruneFilteredNodes) {
        const nodesFiltered = [], linksFiltered = [];
        const isRunning = isSimulationRunning;

        this.node.each(function (o) {
          if (d3.select(this).style('opacity') === opacityHidden.toString()) {
            // console.log('Node ' + o.name + ' is hidden');
          } else {
            nodesFiltered.push(o);
          }

        });
        this.link.each(function (o) {
          if (d3.select(this).style('opacity') === opacityHidden.toString()) {
            // console.log('Link ' + o.name + ' is hidden');
          } else {
            linksFiltered.push(o);
          }
        });
        // console.log('nodesFiltered: ' + nodesFiltered);
        // console.log('linksFiltered: ' + linksFiltered);

        // this.parsedJson.nodes = this.parsedJson.nodes.filter(function(d) { return !.d.hidden;});
        this.parsedJson.nodes = nodesFiltered;
        this.parsedJson.links = linksFiltered;

        this.draw_graph();
        drawNodeDecorators.call(this, d, false);

        // If double-clicked w/Shift key, apply high charge force to this node
        if (d3.event.shiftKey) {
          simulation.force('charge', d3.forceManyBody().strength(function (o) {
            return d.id === o.id ? simForceStrengthHighNodeCharge : simForceStrength;
          }));
          d.charge = simForceStrengthHighNodeCharge;
          if (isRunning) { simulation.restart(); }
        }
      } else {
        // TODO: Try removing charge from all hidden nodes?
      }  /* End isPruneFilteredNodes block */

      // this.panNodeToCenter.call(this, d);
      // d3.event.stopPropagation();  // Else double-click interferes with panning. TODO: But causes jumpiness.
    }
    /* End Node On-Double-Click function */

    /*
     * graphResize() - On-Resize function
     */
    function graphResize() {
      // console.log('Resize (before): w=' + widthView + ', h=' + heightView);

      if (document.getElementById('svgcanvas') === null) { return; }

      // Resize the D3 rect to the new SVG window size
      const view = d3.select('rect');
      widthView = document.getElementById('svgcanvas').clientWidth;
      heightView = document.getElementById('svgcanvas').clientHeight;
      if (widthView === 0 && heightView === 0) {  // Firefox
        const rect = document.getElementById('svgcanvas').getBoundingClientRect();
        widthView = rect.width;
        heightView = rect.height;
      }

      view.attr('width', widthView).attr('height', heightView);
      // console.log('Resize (after): w=' + widthView + ', h=' + heightView);

      // Recenter Force Simulation within new window size
      if (isSimulationRunning === true) {
        simulation.force('center', d3.forceCenter(widthView / 2, heightView / 2));
      } else {
        this.playSimulation();

        simulation.force('center', d3.forceCenter(widthView / 2, heightView / 2));

        // Workaround: Commented out because if don't leave simulation running, recentering simulation not working during resize
        // this.pauseSimulation();
      }
    }

    /*
     * graphKeydown() - On-Keydown function
     */
    function graphKeydown() {
      const e = d3.event;

      // Canvas empty like if doing a Fetch after visualizing at least once?
      if (document.getElementById('svgcanvas') === null) { return; }

      switch (e.keyCode) {
        // Cancel menu: ESC key
        case 27:
          this.divTooltip.transition().duration(0).style('opacity', 0);  // Hide tooltip.
          d3.select('.d3-context-menu').style('display', 'none');  // Close menu.
          break;
        // Pause/Play/Restart: Pause (Break) key
        case 19:
          if (!simulation) { break; }
          if (e.shiftKey) {
            // With Shift key to restart
            this.restartSimulation();
          } else {
            // Else Play or Pause
            if (isSimulationRunning === true) {
              this.pauseSimulation();
            } else {
              this.playSimulation();
            }
          }
          break;
        // Zoom in: + key
        case 107:
          this.zoomIn(defaultTransitionDuration);
          break;
        // Zoom out: - key
        case 109:
          this.zoomOut(defaultTransitionDuration);
          break;
        // Reset zoom: * key
        case 106:
          this.zoomReset(defaultTransitionDuration);
          break;
        // Stealth version number: Ctrl-Alt-v key
        case 86:
          if (e.altKey && e.ctrlKey) {
            alert('Version ' + version);
          }
          break;
      }
    }

    /*
     * graphMousemove() - On-Mouse-Move function
     */
    function graphMousemove() {
      // Tooltips are initially suppressed to avoid possible immediate tooltip popup if node or link slides under cursor after a data fetch
      this.isSuppressTooltip = false;
    }

    /*
     * drawNodeDecorators() - Draw applicable decorator indications on Node.
     */
    function drawNodeDecorators(d, isOver) {
      // tslint:disable-next-line:no-shadowed-variable
      const __this = this;
      d3.selectAll('circle')
        .style('stroke-width', function (o) {
          if (isOver) {
            if (o.id === d.id) {
              return strokeWidthHoverNode;  // Mouse-over Node.
            } else if (__this.isSelectedNode && (o.id === __this.selectedNodeData.id)) {
              return strokeWidthSelectedNode;  // Selected Node.
            } else {
              return strokeWidthNode;  // Usual style.
            }
          } else {
            if (__this.isSelectedNode && (o.id === __this.selectedNodeData.id)) {
              return strokeWidthSelectedNode;  // Selected Node.
            } else {
              return strokeWidthNode;  // Usual style.
            }
          }})
        .style('stroke', function (o) {
          if (isOver) {
            if (o.id === d.id) {
              return colorHoverNode;  // Mouse-over Node.
            } else if (__this.isSelectedNode && (o.id === __this.selectedNodeData.id)) {
              return colorSelectedNode;  // Selected Node.
            } else {
              return '#fff';  // Usual style.
            }
          } else {
            if (__this.isSelectedNode && (o.id === __this.selectedNodeData.id)) {
              return colorSelectedNode;  // Selected Node.
            } else {
              return '#fff';  // Usual style.
            }
          }
        });
    }

    /*
     * drawLinkDecorators() - Draw applicable decorator indications on Link.
     */
    function drawLinkDecorators(d, isOver) {
      d3.selectAll('.lines')
        .style('stroke-width', function (o: any) {
          if (isOver) {
            return o.id === d.id ? strokeWidthHoverLink : strokeWidthLink;
          } else {
            return strokeWidthLink;
          }})
        .style('stroke', function (o) {
          if (isOver) {
            if (o.id === d.id) {
              return colorHoverLink;  // Mouse-over Link.
            } else {
              return '#000';  // Usual style.
            }
          } else {
            return '#000';  // Usual style.
          }
        });
    }

    /*
    * buildNodeTooltip - Construct html for tooltips
    */
    function buildNodeTooltip(d, verbose) {
      let headText = '';
      if (verbose) {
        headText = (d.name === '') ? d.type : d.type + '<hr>' + d.name;
      } else {
        headText = (d.name === '') ? d.type + ' (' + d.id + ')' : d.type + ' (' + d.id + ')' + '<hr>' + d.name;
      }
      return getTooltipHTML(d, headText, verbose);
    }

    /*
    * buildLinkTooltip - Construct html for tooltips
    */
    function buildLinkTooltip(d, verbose) {
      const headText = verbose ? d.name : d.name + ' (' + d.id + ')';
      return getTooltipHTML(d, headText, verbose);
    }

    /*
    * getTooltipHTML - Get the html for tooltips
    */
   function getTooltipHTML(d, headText, verbose) {
      if (verbose) {
        const translate = VisualizerComponent.this()._translate;
        let incoming = d.incoming && d.incoming.length ? d.incoming.join(', ') : '';
        if (incoming.length > maxTooltipInOutLength) { incoming = incoming.substr(0, maxTooltipInOutLength - 3) + '...'; }
        let outgoing = d.outgoing && d.outgoing.length ? d.outgoing.join(', ') : '';
        if (outgoing.length > maxTooltipInOutLength) { outgoing = outgoing.substr(0, maxTooltipInOutLength - 3) + '...'; }
        return '<div class=\'html-detailed-tooltip\'> <table class=\'ui celled striped table\'> <thead> <tr> <th colspan=\'2\'>' +
          headText + '</th> </tr> </thead> <tbody> <tr> <td class=\'collapsing\'> <span>' + translate.instant('Handle') +
          '</span> </td> <td>' + d.id + '</td> </tr> <tr> <td> <span>' + translate.instant('Incoming') + '</span> </td> <td>' +
          incoming + '</td> </tr> <tr> <td> <span>' + translate.instant('Outgoing') + '</span> </td> <td>' + outgoing +
          '</td> </tr> <tr> <td> <span>LTI</span> </td> <td>' + d.av.lti + '</td> </tr> <tr> <td> <span>STI</span> </td> <td>' +
          d.av.sti + '</td> </tr> <tr> <td> <span>VLTI</span> </td> <td>' + d.av.vlti + '</td> </tr> <tr> <td> <span>' +
          translate.instant('Confidence') + '</span> </td> <td>' + d.tv.details.confidence + '</td> </tr> <tr> <td> <span>' +
          translate.instant('Strength') + '</span> </td> <td>' + d.tv.details.strength + '</td> </tr> </tbody> </table> </div>';
      } else {
        return '<div class=\'html-tooltip\'> <table class=\'ui celled striped table\'> <tbody> <tr> <td nowrap>' + headText +
          '</td> </tr> </tbody> </table> </div>';
      }
    }
    /*
     * getOutgoingLinks() - Return outgoing links.
     */
    function getOutgoingLinks(d) {
      const strOutLinks: string = linkedByOutgoing[d.target.id + ',' + d.source.id];
      const arrOutLinks = [];
      if (strOutLinks) {
        arrOutLinks.push.apply(arrOutLinks, strOutLinks.split(',').map(function (str) { return Number(str); }));
      }
      return arrOutLinks;
    }
    /*
     * getSourceNodeCircumPt() - Helper function for adjusting Link line start point so that it's outside of the Node radius.
     */
    function getSourceNodeCircumPt(d, offsetRads, isDefaultSweep) {
      const r = d.source.name === '' ? radiusNodeNameless : radiusNode;
      const radius = VisualizerComponent.scaleRadius(r, d.source.av.sti) + strokeWidthNode + 1;
      const dx = d.source.x - d.target.x;
      const dy = d.source.y - d.target.y;
      const offset = isDefaultSweep ? offsetRads : -offsetRads;
      const gamma = Math.atan2(dy, dx) + offset;  // Math.atan2 returns the angle in the correct quadrant as opposed to Math.atan.
      const tx = d.source.x - (Math.cos(gamma) * radius);
      const ty = d.source.y - (Math.sin(gamma) * radius);
      return [tx, ty];
    }
    /*
     * getTargetNodeCircumPt() - Helper function for adjusting Link line end point so that it's outside of the Node radius.
     */
    function getTargetNodeCircumPt(d, offsetRads, isDefaultSweep) {
      const r = d.target.name === '' ? radiusNodeNameless : radiusNode;
      const radius = VisualizerComponent.scaleRadius(r, d.target.av.sti) + strokeWidthNode + 1;
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const offset = isDefaultSweep ? -offsetRads : offsetRads;
      const gamma = Math.atan2(dy, dx) + offset;  // Math.atan2 returns the angle in the correct quadrant as opposed to Math.atan.
      const tx = d.target.x - (Math.cos(gamma) * radius);
      const ty = d.target.y - (Math.sin(gamma) * radius);
      return [tx, ty];
    }
    /*
     * arcPath() - Generate arc path.
     */
    function arcPath(d, isLeftHand, offsetRads, radiusFactor, isDefaultSweep) {
      const start = isLeftHand ? { x: getSourceNodeCircumPt(d, offsetRads, isDefaultSweep)[0],
                                   y: getSourceNodeCircumPt(d, offsetRads, isDefaultSweep)[1] } :
                                 { x: getTargetNodeCircumPt(d, offsetRads, isDefaultSweep)[0],
                                   y: getTargetNodeCircumPt(d, offsetRads, isDefaultSweep)[1] };
      const end = isLeftHand ? { x: getTargetNodeCircumPt(d, offsetRads, isDefaultSweep)[0],
                                 y: getTargetNodeCircumPt(d, offsetRads, isDefaultSweep)[1] } :
                               { x: getSourceNodeCircumPt(d, offsetRads, isDefaultSweep)[0],
                                 y: getSourceNodeCircumPt(d, offsetRads, isDefaultSweep)[1] };
      const dx = end.x - start.x,
            dy = end.y - start.y,
            dr = Math.sqrt(dx * dx + dy * dy) * radiusFactor;
      let sweep = isLeftHand ? 0 : 1;
      if (!isDefaultSweep) {
        sweep = isLeftHand ? 1 : 0;
      }
      return 'M' + start.x + ',' + start.y + 'A' + dr + ',' + dr + ' 0 0,' + sweep + ' ' + end.x + ',' + end.y;
    }
    /*
     * straightPath() - Generate straight path.
     */
    function straightPath(d, isLeftHand) {
      const start = isLeftHand ? { x: getSourceNodeCircumPt(d, 0, true)[0], y: getSourceNodeCircumPt(d, 0, true)[1] } :
                                 { x: getTargetNodeCircumPt(d, 0, true)[0], y: getTargetNodeCircumPt(d, 0, true)[1] };
      const end = isLeftHand ? { x: getTargetNodeCircumPt(d, 0, true)[0], y: getTargetNodeCircumPt(d, 0, true)[1] } :
                               { x: getSourceNodeCircumPt(d, 0, true)[0], y: getSourceNodeCircumPt(d, 0, true)[1] };
      const dx = end.x - start.x,
            dy = end.y - start.y,
            sweep = isLeftHand ? 1 : 0;
      return 'M ' + start.x + ' ' + start.y + ' L ' + end.x + ' ' + end.y;
    }

    /*
     * getSizeNodeLabel() - Calculate text size against attentionvalue.sti, and sets data-scale attribute.
     */
    function getSizeNodeLabel(d) {
      if (d.name === '') { return; }
      const d3text = d3.select(this);

      // TODO
      // let radius = Number(?circ?.attr("r"));  // Retrieve Node radius.

      // Workaround
      let radius = radiusNode;
      // console.log('getSizeNodeLabel() ' + d.name + ': radius before scaling=' + radius);
      radius = VisualizerComponent.scaleRadius(radius, d.av.sti);  // Node Weighting by STI.

      const offset = Number(d3text.attr('dy'));
      const textWidth = this.getComputedTextLength();
      const availWidth = radius * 2 * nodeLabelPadding;
      const dataScale = availWidth / textWidth;
      // console.log('getSizeNodeLabel() ' + d.name + ': radius=' + radius + ', data-scale=' + dataScale);
      d3text.attr('data-scale', dataScale);  // Sets the data attribute, which is read in the next step.
    }
  }  /* End draw_graph() */

  /*
   * initContextMenus()
   */
  public initContextMenus() {
    const __this = this;

    // Main context menu
    const mainMenu = [{
      title: function (d) {
        if (!__this.isSelectedNode) {
          return __this._translate.instant('RecenterPanning');
        } else {
          const menutext = __this._translate.instant('PanNodeToCenter');
          // menutext += __this.selectedNodeData.name ? ': \'' + __this.selectedNodeData.name + '\'' : '';
          return menutext;
        }
      },
      action: function(elm, d, i) {
        if (!__this.isSelectedNode) {
          __this.panToCenter.call(__this);
        } else {
          // However, if a Node is selected, center that Node
          __this.panNodeToCenter.call(__this, __this.selectedNodeData);
        }
      }
    },
    {
      title: __this._translate.instant('UnpinAll'),
      action: function (elm, d, i) {
        __this.node.each(function (o) {
          o.fx = null;
          o.fy = null;
        });
      }
    }, {
      title: __this._translate.instant('ResetChargeAll'),
      action: function (elm, d, i) {
        simulation.force('charge', d3.forceManyBody().strength(function (o) {
          o.charge = simForceStrength;
          return simForceStrength;
        }));
        if (isSimulationRunning) {
          simulation.restart();
        }
      }
    }];
    // Node context menu
    const nodeMenu = [
      {
        // Pin/Unpin Command
        title: function (d) {
          __this.divTooltip.style('opacity', 0); // Hide tooltip.
          if (d.fx == null) {
            return __this._translate.instant('Pin');
          } else {
            return __this._translate.instant('Unpin');
          }
        },
        action: function (elm, d, i) {
          if (d.fx == null) {
            d.fx = d.x;
            d.fy = d.y;
            // If Pinned w/Shift key, also apply high charge force to this node
            if (d3.event.shiftKey) {
              simulation.force('charge', d3.forceManyBody().strength(function (o) {
                return d.id === o.id ? simForceStrengthHighNodeCharge : simForceStrength;
              }));
              d.charge = simForceStrengthHighNodeCharge;
              // if (isSimulationRunning) { simulation.restart(); }
            }
            simulation.alphaTarget(0.1).restart();
          } else {
            d.fx = d.fy = null;
          }
        }
      }, {
        // Apply High Charge / Restore Normal Charge Command
        title: function (d) {
          __this.divTooltip.style('opacity', 0); // Hide tooltip.
          if (d.charge && d.charge === simForceStrengthHighNodeCharge) {
            return __this._translate.instant('RestoreCharge');
          } else {
            return __this._translate.instant('ApplyHighCharge');
          }
        },
        action: function (elm, d, i) {
          if (d.charge && d.charge === simForceStrengthHighNodeCharge) {
            simulation.force('charge', d3.forceManyBody().strength(function (o) {
              return simForceStrength;
            }));
            d.charge = simForceStrength;
            if (isSimulationRunning) {
              simulation.restart();
            }
          } else {
            simulation.force('charge', d3.forceManyBody().strength(function (o) {
              return d.id === o.id ? simForceStrengthHighNodeCharge : simForceStrength;
            }));
            d.charge = simForceStrengthHighNodeCharge;
            // If CTRL key, also pin this node
            if (d3.event.ctrlKey) {
              d.fx = d.x;
              d.fy = d.y;
            }
            // if (isSimulationRunning) { simulation.restart(); }
            simulation.alphaTarget(0.1).restart();
          }
        }
      },
      {
        title: __this._translate.instant('PanToCenter'),
        action: function(elm, d, i) {
          __this.panNodeToCenter.call(__this, d);
        },
      }
    ];
    return { mainMenu, nodeMenu };
  } /* End initContextMenus() */

  /*
   * Reinitialize / Load context menus. Use when language is changed.
   */
  public reinitContextMenus() {
    if (this.menus) { this.menus = this.initContextMenus(); }
    if (this.svg) { this.svg.on('contextmenu', d3.contextMenu(this.menus.mainMenu)); }
    if (this.node) { this.node.on('contextmenu', d3.contextMenu(this.menus.nodeMenu)); }
  }

  /*
   * Translation support
   */
  public isCurrentLang(lang: string) {
    return lang === this._translate.currentLang;
  }
  public selectLang(lang: string) {
    this._translate.use(lang);
    TranslateConfig.setCurrentLang(lang);

    // Reinitialize menus
    if (this.menus) { this.reinitContextMenus(); }
  }
  public setLanguage(lang) {
    const key = lang.value.value;
    this.selectLang(key);
  }
}
/* End Class VisualizerComponent */
