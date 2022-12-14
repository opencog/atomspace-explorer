# AtomSpace Explorer

The AtomSpace Explorer is a visualization tool for
[Atoms](https://wiki.opencog.org/w/Atom) in the
[AtomSpace](https://github.com/opencog/atomspace).
[Atomese](https://wiki.opencog.org/w/Atomese) is fetched from the
AtomSpace, then displayed as a two dimensional graph in the browser.

![AtomSpace Explorer](src/assets/img/AtomSpace-Explorer.jpg)

## Prerequisites and Issues
The AtomSpace Explorer needs ... an AtomSpace to explore. This is
provided by the [CogServer](https://github.com/opencog/cogserver).

There's only one problem: The code in this repo uses an obsolete
JSON API that no longer exists.  It needs to be replaced by the API
demoed in the
[AtomSpace TypeScript](https://github.com/opencog/atomspace-typescript)
git repo.  This shouldn't be hard, but someone needs to do it.


## Install and Setup

``` bash
sh                                  # Inside the root directory of this file
npm install                         # Install all dependencies.
npm start                           # Start the app on the default AngularJS port 4200.

npm start -- --port=[port-number]   # Start the app at [port-number].
npm start -- --port=8080            # Example with port number 8080.

Alternatively, you can permanently change the default port by inserting the following to angular-cli.json, at the top of the "defaults" block:
  "defaults": {                     #    Existing line.
    "serve": {                      # <- Insert line.
      "port": 8080                  # <- Insert line. Example port 8080. Set port number as desired.
    },                              # <- Insert line.
    "styleExt": "css",              #    Existing line.

```

## Usage

1. Navigate to [http://localhost:4200/](http://localhost:4200/)
1. Click on Fetch in the Navbar. A 'Fetch AtomSpace Results' prompt
   is displayed. Then do any of the following options:
   - Fetch from CogServer:  Enter a valid CogServer URL in the
     App URL box.
     *e.g.* <ws://localhost:18080/json> or <ws://my_cogserver:18080/json>,
     then click on the Fetch button to graph the data.
   - Load built-in sample data:  Click on 'Load Sample Data'. See next
     section regarding configuring sample data.
   - Load non-default built-in sample data: Enter the path, in the form
     of 'assets/{file-name}' to any of the bundled sample data json files
     in the App URL box. I.E. 'assets/atoms.humans.json' (enter it
     without quotes). Then click on the Fetch button.

    __\* Note: Do not append '/api/v1.1/atoms', as was required for
    earlier versions of AtomSpace Explorer.__

## Sample Data

- Sample data files reside in [src/assets/](src/assets).
- Configure which sample data file is utilized via config setting
  `sample\_data\_file` in `./src/app/app.config.ts`. Then recompile
  `(ng serve)`.
- Provided sample files (these all use the now-obsolete json file
  format, these need to be converted to either the new-style JSON
  or to Atomese.)
  - `atoms.sample1.json`: Original built-in sample.
  - `atoms.sample1a.json`: Same as previous, with some non-zero STI values.
  - `atoms.sample1b.json`: Same as previous, plus two additional
     three-node-clusters.
  - `atoms.sample2.json`: Original external sample.
  - `atoms.sample2a.json`: Subset of original external sample. Has
     several double-linked nodes.
  - `atoms.sample2b.json`: Subset of original external sample. Has
     several double-linked nodes. Plus a triple-linked node.
  - `atoms.humans.json`: From humans.scm.
  - `atoms.oovc\_ensemble.json`: From oovc_ensemble.scm.
  - `atoms.oovc\_ensemble\_sti.json`: Same as previous, with
    non-zero STI values. <== *Configured as default sample*

## Dependencies

- As of Jan-13-2018, the D3 Atomspace charting code from this app has
  been moved into the reusable NPMJS
  [ng2-atomspace-visualizer](https://www.npmjs.com/package/ng2-atomspace-visualizer)
  package. From now on, enhancement requests and issues that are
  specifically related to D3 Atomspace charting functionality should
  be logged against ng2-atomspace-visualizer, not this app.
- For now, "@angular/cli" in the "devDependencies" must remain at
  version 1.4.7. Later versions have stricter Typescript compliance
  enforcement, and ng2-atomspace-visualizer is not currently compatible.

## TODO -- Known Issues

- Convert all old-style json to new-style json or to Atomese. Why?
  (1) The old-style json format no longer exists in the codebase.
  (2) The Atomese format is slightly more efficient than the new-style
  json. For may apps, this won't matter; both will work.

- Stop showing Handle and Incoming in the GUI -- these are dynamically
  assigned garbage values that have no meaning.
- Change popup to show all Values, and not just Attention and Truth
  Vaues. In particular, show the count of a CountTruthValue.

- Filtering capability is preliminary and needs to be developed further.
  Filtering is the ability to show only the relevant parts of the
  AtomSpace. When an AtomSpace contains millions of Atoms, this is
  crucial.

- D3 graphs are generated by building all of the individual elements in
  the DOM. Consequently, there are limits to the number of nodes and links
  that are performant. Remediations are TBD.
  - Recommendations: Use smaller datasets for visualization. FF can get
    slow when it has lots of plug-ins running and/or a lot of memory
    allocated. If it's behaving poorly, try closing all browser
    instances and reopening a new one. I've had good luck with Chrome,
    so you may want to try using Chrome.

## Features

- Fetch data from user provided AtomSpace WebSocket.
- Visualize the AtomSpace data with D3.js Force Directed graph.
- Links display link-type as inline labels.
- Node names are shown within Nodes with auto-sizing text. Also, the
  Node name is auto-truncated with ellipsis if necessary.
- Node diameter is weighted per Attention Value - Short Term Interest (STI).
  (Caution: AttentionValues are semi-obsolete, and should be removed)
- Click on a Node to view it's properties. Use close icon ('X') to
  dismiss properties. Or reclick same Node again to dismiss the
  properties box.
- Double click on a Node to drill to that Node, along with two
  levels of neighboring Nodes.
- Buttons to Pause / Play / Restart Force Simulation and to
  Zoom In, Zoom Out, and Reset Zoom.
- Keyboard shortcuts for all of the above buttons are indicated
  in the corresponding button tooltips.
- A Filtering dropdown appears when a Node is selected or double-clicked.
- D3 client area and Node context (right-click) menus.
- Individual Nodes are pinnable into fixed location. Ctrl-click,
  Ctrl-double-click, Ctrl-drag, or use right-click menu to Pin/Unpin
  a Node. Right-click the D3 client area to access a menu command
  to Unpin all Nodes.
- Increased Force Simulation Charge can be applied to individual
  Nodes. Shift-click, Shift-double-click, Shift-drag, or use
  right-click menu to apply/remove high charge force to/from a
  Node. Right-click the client area to access a menu command to
  remove high charge from all Nodes. With suitable data, like
  single Nodes with many children subtrees, this is nice for
  spreading (repulsing) out neighboring nodes more forcefully
  in a radial fashion from that central, highly-charged Node.
- D3 Graph client area and SVG canvas is dynamically-sized
  relative to the browser window size, including auto-resize
  of Force Simulation. Scrollbars are avoided within limits of
  minimum width, height, and width-to-height ratios.
- Tooltips for all Navbar and Visualizer command buttons.
- Tooltips for Nodes and Links. Node and Link tooltip verbosity
  is controlled via the 'Detailed Tooltips' toggle checkbox. In
  verbose mode, the Node detail level is the same as the selected Node
  properties table. Both methods can be used together, which provides a
  convenient way to compare details between a baseline selected Node, and
  other Nodes via hovering over them. The 'Detailed Tooltips' toggle
  checkbox also affects Link tooltip verbosity in a similar manner. Tips:
  - The Force Simulation can optionally be paused to make it easier to
    hover over Nodes and Links to show details via tooltips. However,
    tooltips do also work while the simulation is running.
  - For Link tooltips, hover over the text label of a Link, as that's
    easier than hovering over the link line itself, which is quite
    thin.
- Localized to English, Chinese, French, German, Italian, Japanese and
  Spanish via the Languages dropdown menu item.

The AtomSpace Explorer app was based upon the Mozi Visualizer Demo app
(which was in turn based on the Glimpse visualizer).

As the initial commit of the AtomSpace Explorer has substantial changes,
there's a more detailed list of the changes and new additions in the
[ChangeLog](ChangeLog.md).
