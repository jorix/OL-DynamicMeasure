Control for OpenLayers to measure and shows measurements at the cursor
======================================================================

Based on `OpenLayers.Control.Measure`, the **DynamicMeasure** control shows
measurements on labels that follow the cursor. This avoids having to worry
about preparing a DOM item to display measurements.

The control also has preset styles to show lines and labels, so the only thing
to do is add it to the map.

Control allows displaying lengths and headings of the segments that form a polyline or a polygon.

Examples:
---------
 * [measure-dynamic.html](http://jorix.github.com/OL-DynamicMeasure/examples/measure-dynamic.html) (adapted from "measure.html" OpenLayers example)

Operation:
---------

Example:

```javascript
    ...
    // to mesure length
    var cMeasure = new OpenLayers.Control.DynamicMeasure(OpenLayers.Handler.Path);
    map.addControl(cMeasure);
    ...
    // ... and to start measuring
    cMeasure.activate();
    ...
    // ... and to stop it
    cMeasure.deactivate();
    ...
```

This control is now adapted to handle the methods *undo* *redo* and *cancel* of drawing handlers.

See the example [measure-dynamic-dev.html](http://jorix.github.com/OL-DynamicMeasure/examples/measure-dynamic-dev.html) (allows choose whether to use the patch posted on [OL-Ragbag](https://github.com/jorix/OL-Ragbag/blob/gh-pages/README.md#the-components))

The control can use it as a `DrawFeature` control, see example [measure-and-draw.html](http://jorix.github.com/OL-DynamicMeasure/examples/measure-and-draw.html)

Documentation:
--------------
 * [API for users](http://jorix.github.com/OL-DynamicMeasure/doc/DynamicMeasure/api)
 * For developers
   * [all `DynamicMeasure` elements](http://jorix.github.com/OL-DynamicMeasure/doc/DynamicMeasure/all)

Compatibility with OpenLayers releases:
---------------------------------------
The `DynamicMeasure` control works correctly with release 2.11 or higher
including the development version.

Background
----------
According [**Yus's question in DEV**](http://osgeo-org.1803224.n2.nabble.com/Adding-Segment-Length-to-Path-tc7029815.html)
some adjustments are made to solve some problems: 
labels do not remain at the end of measure,
using the freehand the map is dirtied by the labels,
layer of the labels (`vlayer`) should be on top of the drawing layer,
allow use of immediate measure (new in 2.11) 
