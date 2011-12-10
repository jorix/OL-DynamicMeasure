Proposal to implement dynamic measure in OpenLayers 2.11 
========================================================

According [**Yus's question in DEV**](http://osgeo-org.1803224.n2.nabble.com/Adding-Segment-Length-to-Path-tc7029815.html).
---------------------

After changes in callsbacks due to [pan while drawing (#3052)](http://trac.osgeo.org/openlayers/ticket/3052) must rethink the implementation in OpenLayers 2.10 exposed by Yus.

Problems:
    * Labels do not remain at the end of measure.
    * Using the freehand the map is dirtied by the labels.
    * Layer of the labels (`vlayer`) should be on top of the drawing layer.
    * Allow the use of immediate measure (new in 2.11) 
      * NOTE: In the proposal `immediate` is `true` but `setImmediate` does not work.

See the [proposal dynamic measure for 2.11](http://jorix.github.com/OL-DynamicMeasure/examples/measure-dynamic.html) (a clone adapted from [examples/measure.html](http://www.openlayers.org/dev/examples/measure.html))
