// allow testing of specific renderers via "?renderer=Canvas", etc
    var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
    if (renderer) {
        OpenLayers.Layer.Vector.prototype.renderers = [renderer];
    }

// The map
    var map = new OpenLayers.Map({
        div: 'map',
        layers: [
            new OpenLayers.Layer.WMS('OpenLayers WMS',
            'http://vmap0.tiles.osgeo.org/wms/vmap0?', {layers: 'basic'})
        ]
    });
    map.setCenter(new OpenLayers.LonLat(0, 0), 3);

// The measure controls
    var measureControls = {
        /* NOTE: Should be sure whether projection requires `{geodesic:true}`.
          See: http://dev.openlayers.org/docs/files/OpenLayers/Control/Measure-js.html#OpenLayers.Control.Measure.geodesic
          ""
            Geodesic calculation works the same in both the ScaleLine and Measure
            controls, so it has the same prerequisites. The advice that proj4js
            is needed to make it work is only true to the extent it is with any
            re-projection in OpenLayers: as long as your map is in EPSG:900913,
            you don't need proj4js. As soon as you use a different projection,
            you need it.
          "" (from comment by Andreas Hocevar)
          See: http://osgeo-org.1560.x6.nabble.com/Getting-the-right-results-from-Measure-tool-using-EPSG-3776-td3921884.html#a3921894
        */
        line: new OpenLayers.Control.DynamicMeasure(
                OpenLayers.Handler.Path, {geodesic:true}),
        polygon: new OpenLayers.Control.DynamicMeasure(
                OpenLayers.Handler.Polygon, {geodesic:true})
    };
    map.addControls([
        measureControls.line,
        measureControls.polygon,
        new OpenLayers.Control.LayerSwitcher()
    ]);

// functions used in the form to set the measure control.
    function toggleControl(element) {
        for (var key in measureControls) {
            if (element.value === key && element.checked) {
                measureControls[key].activate();
            } else {
                measureControls[key].deactivate();
            }
        }
    }
    function toggleShowSegments(element) {
        for (var key in measureControls) {
            var control = measureControls[key];
            if (element.checked) {
                // * set `layerSegmentsOptions` at control creation as a object
                //   or undefined to display length of segments.
                delete control.layerSegmentsOptions;
            } else {
                // * set `layerSegmentsOptions` at control creation to null to
                //   not display.
                control.layerSegmentsOptions = null;
            }
            if (control.active) {
                control.deactivate();
                control.activate();
            }
        }
    }
    function toggleShowPerimeter(element) {
        var control = measureControls.polygon;
        if (element.checked) {
            // * set `layerLengthOptions` as a object or undefined to display
            //   length of perimeter.
            delete control.layerLengthOptions;
        } else {
            // * set `layerLengthOptions` to null to not display.
            control.layerLengthOptions = null;
        }
        if (control.active) {
            control.deactivate();
            control.activate();
        }
    }
    function toggleShowHeading(element) {
        for (var key in measureControls) {
            var control = measureControls[key];
            if (element.checked) {
                // * set `layerHeadingOptions` as a object or undefined to
                //   display heading.
                control.layerHeadingOptions = {};
            } else {
                // * set `layerHeadingOptions` to null to not display.
                control.layerHeadingOptions = null;
            }
            if (control.active) {
                control.deactivate();
                control.activate();
            }
        }
    }
    function changeMaxSegments(element) {
        var maxSegments = element.value !== '' ?
                parseInt(element.value, 10) :
                null;
        for (var key in measureControls) {
            measureControls[key].maxSegments = maxSegments;
            measureControls[key].maxHeadings = maxSegments;
        }
    }

// Set current values, needed if form is reloaded with values
    toggleShowSegments(document.getElementById("showSegments"));
    toggleShowPerimeter(document.getElementById("showPerimeter"));
    toggleShowHeading(document.getElementById("showHeading"));
    changeMaxSegments(document.getElementById("maxSegments"));
    toggleControl(document.getElementById("lineToggle"));
    toggleControl(document.getElementById("polygonToggle"));
