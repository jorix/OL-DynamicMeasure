// allow testing of specific renderers via "?renderer=Canvas", etc
    var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
    if (renderer) {
        OpenLayers.Layer.Vector.prototype.renderers = [renderer];
    }

// The map
    var map = new OpenLayers.Map({
        div: 'map',
        layers: [
            new OpenLayers.Layer.WMS( "OpenLayers WMS", 
            "http://vmap0.tiles.osgeo.org/wms/vmap0?", {layers: 'basic'})
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
        for(var key in measureControls) {
            if(element.value === key && element.checked) {
                measureControls[key].activate();
            } else {
                measureControls[key].deactivate();
            }
        }
    }
    function toggleDisplaySegments(element) {
        for(var key in measureControls) {
            measureControls[key].layerSegments.setVisibility(element.checked);
        }
    }
