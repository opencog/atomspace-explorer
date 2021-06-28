# ng2-atomspace-visualizer

This module is a design of a visualizer for the [opencog atomspace] (https://github.com/opencog/atomspace).

![ng2-atomspace-visualizer](https://raw.githubusercontent.com/opencog/external-tools/master/AtomSpaceExplorer/src/assets/img/ng2-atomspace-visualizer.jpg)

## Features

- D3.js-based Force Directed graph for visualizing AtomSpace data.
- Links display link-type as inline labels.
- Node names are shown within Nodes with auto-sizing text. Also, the Node name is auto-truncated with ellipsis if necessary.
- Node diameter is weighted per Attention Value - Short Term Interest (STI).
- Click on a Node to view it's properties. Use close icon ('X') to dismiss properties. Or reclick same Node again to dismiss the properties box.
- Double click on a Node to drill to that Node, along with two levels of neighboring Nodes.
- Buttons to Pause / Play / Restart Force Simulation and  to Zoom In, Zoom Out, and Reset Zoom.
- Keyboard shortcuts for all of the above buttons are indicated in the corresponding button tooltips.
- A Filtering dropdown appears when a Node is selected or double-clicked.
- D3 client area and Node context (right-click) menus.
- Individual Nodes are pinnable into fixed location. Ctrl-click, Ctrl-double-click, Ctrl-drag, or use right-click menu to Pin/Unpin a Node. Right-click the D3 client area to access a menu command to Unpin all Nodes.
- Increased Force Simulation Charge can be applied to individual Nodes. Shift-click, Shift-double-click, Shift-drag, or use right-click menu to apply/remove high charge force to/from a Node. Right-click the client area to access a menu command to remove high charge from all Nodes. With suitable data, like single Nodes with many children subtrees, this is nice for spreading (repulsing) out neighboring nodes more forcefully in a radial fashion from that central, highly-charged Node.
- Tooltips for Nodes and Links. Node and Link tooltip verbosity is controlled via the 'Detailed Tooltips' toggle checkbox. In verbose mode, the Node detail level is the same as the selected Node properties table. Both methods can be used together, which provides a convenient way to compare details between a baseline selected Node, and other Nodes via hovering over them. The 'Detailed Tooltips' toggle checkbox also affects Link tooltip verbosity in a similar manner. Tips:
  - The Force Simulation can optionally be paused to make it easier to hover over Nodes and Links to show details via tooltips. However, tooltips do also work while the simulation is running.
  - For Link tooltips, hover over the text label of a Link, as that's easier than hovering over the link line itself, which is quite thin.
- Localized to English, Chinese, French, German, Italian, Japanese and Spanish. Translations were done with Google Translate, so please excuse any translation mistakes.

## Setup

``` bash
npm install ng2-atomspace-visualizer --save
```

## Configuration

### Input Parameters

- **atoms**: Atoms to visualize in AtomSpace json format.
- **unordered_linktypes**: Unordered linktypes are rendered with bidirectional arrows. Can get at RT via scheme commands
  - (use-modules (opencog pln))            ;; Optional: Include NLP types.
  - (cog-get-all-subtypes 'UnorderedLink)  ;; Note: This cmd was added in Jan '18 per github.com/opencog/atomspace/pull/1516.
- **custom_style**: Custom style which operates on directives/CSS in visualizer.component.html/css.
- **language**: Language key 'en', 'cn', 'de', 'es', 'fr', 'it' or 'jp'

There are 2 methods of passing the input parameter. Via '@input' databound variables or via the AtomService Subscriber. Examples for each method follows.

### Simple example 1 using '@input' databound variables to pass parameters

#### Example 1 app.module.ts

``` javascript
    import {AtomspaceVisualizerModule} from 'ng2-atomspace-visualizer';
    @NgModule({
      imports: [
        CommonModule,
        AtomspaceVisualizerModule.forRoot()
      ],
      declarations: [AppComponent],
      providers: []
    })
    export class AppModule { }
```

#### Example 1 app.component.ts

``` javascript
    import { Component } from '@angular/core';

    @Component({
      selector: 'app-root',
      templateUrl: './app.component.html',
      styleUrls: ['./app.component.css']
    })
    export class AppComponent {
      private atoms: object = null;
      private unordered_linktypes: string[] = null;
      private custom_style: string = null;
      private language: string = null;

      constructor() {
        this.atoms = /** atoms to visualize in json format **/

        // Optional
        this.unordered_linktypes = /** unordered types **/
        this.custom_style = /** custom style **/
        this.language = /** language key **/
      }
    }
```

#### Example 1 app.component.html

``` html
   <cog-visualizer [atoms]="atoms"></cog-visualizer>

   Or like this to utilize all parameters

   <cog-visualizer [atoms]="atoms" [unordered_linktypes]="unordered_linktypes" [custom_style]="custom_style" [language]="language">></cog-visualizer>
```

### Simple example 2 using the AtomService Subscriber to pass parameters

#### Example 2 app.module.ts

``` javascript
    import { AtomspaceVisualizerModule } from 'ng2-atomspace-visualizer';
    import { APP_ROUTES } from './app.routes';  // If using Angular router_outlet directive.

    @NgModule({
      imports: [
        CommonModule,
        AtomspaceVisualizerModule.forRoot(),
        RouterModule.forRoot(APP_ROUTES, {useHash: true})  // If using Angular router_outlet directive.
      ],
      declarations: [AppComponent],
      providers: []
    })
    export class AppModule { }
```

#### Example 2 app.component.ts

``` javascript
    import { Component } from '@angular/core';
    import { AtomService, AtomServiceData } from 'ng2-atomspace-visualizer';

    @Component({
      selector: 'app-root',
      templateUrl: './app.component.html',
      styleUrls: ['./app.component.css']
    })
    export class AppComponent {
      private atoms: object = null;
      private unordered_linktypes: string[] = null;
      private custom_style: string = null;
      private language: string = null;

      constructor() {
        const as_data: AtomServiceData = {
          atoms: /** atoms to visualize in json format **/,
          unordered_linktypes: /** Optional: unordered link types **/,
          custom_style: /** Optional: custom style **/
          language: /** Optional: language key: 'en', 'cn', 'de', 'es', 'fr', 'it' or 'jp' **/
        };

        atomsService.changeItem(as_data);
      }
    }
```

#### Example 2 app.component.html

``` html
  <cog-visualizer></cog-visualizer>
```

  or if using Angular router-outlet directive

``` html
  <router-outlet></router-outlet>
```

#### Example 2 app.routes.ts (only if using router-outlet)

``` javascript
  import { RouterOutlet } from '@angular/router';

  export const APP_ROUTES: Routes = [
  {
    path: '',
      component: MainContainer,
      children: [
        { path: 'cog-visualizer', component: VisualizerComponent },
        { path: 'path2', component: MyComponent2Component },
        { path: 'path3', component: MyComponent3Component }
      ]
  }];
```

------------

## TODO

- TBD.

------------

## Troubleshooting

------------

## License

Refer to ./LICENSE.

------------

## Credits

- Mikyas Damtew
- Kaleab Yitbarek
- Tsadkan Yitbarek
- Stephen Sherman

------------

## Revision History

### June-17-2018 - sshermz - Updated contributors

- Updated contributors in visualizer package.json and added Credits section to this readme.

### May-15-2018 - tsadkan - Refactor code to build for production with aot & update package version

### May-12-2018 - tsadkan - Refactor code to build for production with aot

### Feb-26-2018 - sshermz - Handle atoms input data changes and localization fixes

- Handle atoms input data changes via ngOnChanges. Authored by tsadkan.
- Fixed bugs with new localization feature.

### Feb-25-2018 - sshermz - Language support

- Added localizations for Chinese, French, German, Italian, Japanese and Spanish.

### Jan-21-2018 - sshermz - Input parameter methods updates plus minor fixes

- Now supporting two input parameter options for each of the three input parameters. Method 1 is via '@input' databound variables, and method 2 is via the AtomService Subscriber. Updated this README with examples for each method. Note: renamed input parameter 'style' to 'custom_style'.
- Tweaks to detailed tooltips. Truncate incoming and outgoing handle lists with '...' if excessively long. Added min and max detailed tooltip rect widths.
- A few minor resiliency improvements.

### Jan-17-2018 - sshermz - Various fixes and tweaks

- Added persistence to detailed tooltips toggle state.
- Fixed tools-div (div containing command buttons) eating pointer events bug.
- Updated default unordered links and fixed bug in unordered link determination logic.
- Minor refactoring in visualizer.component.ts.
- README.md and license updates.

### Jan-13-2018 - sshermz - Compatibility fixes for Atomspace Explorer

- Refactored external json sample data handling. Enables container app to configure built-in sample data.
- Conditional input variable "style" for custom style/layouts like "15col_red" for ICL.
- Fixed position of the input checkbox element of the Detailed Tooltips toggle. It was being offset when hosted in Atomspace Explorer.
- Fixed incorrect type of zoom method invocations from visualizer component html.

### Jan-3-2018 - sshermz - Sync to latest ASE features and fixes

- Added arrowheads to link lines. Ordered (asymmetric) link types now have a single arrowhead to show "incoming set" direction. And unordered (symmetric) link types now have arrowheads on both ends.
- Added incoming and outgoing handle lists to selected node properties box, and also to detailed-mode tooltips.
- Now handling multiple links between a pair of nodes. Link paths are drawn with arcs as necessary.
- Fixed bug with extraction of link types from atomspace data, which is used for dynamically constructed filter menu. Was not retrieving all link types.
- Fixed bug where double-click on nodes to drill didn't work in the region covered by the selected node properties table, even when the table was hidden. Bonus with this fix is that you can now drag nodes even if they are behind the visible selected node properties table.

### Jan-3-2018 - tsadkan - change visualizer column and add border color

### Dec-30-2017 - tsadkan - fix directory issue

- move the sample json files from src/assets to atomspace-visualizer/assets folder.

### Dec-28-2017 - sshermz - Merged in latest ASE code, and fixes

- Merged in latest features and bug fixes from opencog/external-tools AtomSpace Explorer (ASE).
- Adapted code as necessary, including to fix regressions.
- Refactored sample data handling.
- Fixed some preexisting ASE issues like scale sync when zoom by wheel or dbl-click.

### Dec-18-2017 - tsadkan - correct git url, mini syntax error fix

### Nov-14-2017 - tsadkan - Integrate visualization functionalities, write installation instructions and example code for usage, configure script dependency and edit readme

### Nov-8-2017 - tsadkan - initial commit from @angular/cli, publish to npm test
