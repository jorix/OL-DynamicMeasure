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
        line: new OpenLayers.Control.DynamicMeasure(OpenLayers.Handler.Path),
        polygon: new OpenLayers.Control.DynamicMeasure(
                                                    OpenLayers.Handler.Polygon)
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
                //   or not defined to display length of segments.
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
                // * set `layerHeadingOptions` as a object to display heading.
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
