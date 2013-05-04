// Alter default OpenLayers options
// --------------------------------

// Allow testing of specific renderers via "?renderer=Canvas", etc
var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
OpenLayers.Layer.Vector.prototype.renderers = renderer ?
                                    [renderer] :
                                    OpenLayers.Layer.Vector.prototype.renderers;

OpenLayers.Feature.Vector.style['default']['strokeWidth'] = '3';

// Create Objects
// --------------

// To report draw modify and delete events
var reportEvent;
if (window.console && window.console.log) {
    reportEvent = function(event) {
        console.log(event.type,
                    event.feature ? event.feature.id : event.components);
    };
} else {
    reportEvent = function() {};
}

// Create the vectorial layer
var vectorLayer = new OpenLayers.Layer.Vector('Vector Layer');
vectorLayer.events.on({
    'beforefeaturemodified': reportEvent,
    'featuremodified': function(e) {
        e.feature.state = OpenLayers.State.UPDATE;
        reportEvent(e);
    },
    'afterfeaturemodified': reportEvent,
    'beforefeatureremoved': reportEvent,
    'featureremoved': reportEvent,
    'vertexmodified': reportEvent,
    'sketchmodified': reportEvent,
    'sketchstarted': reportEvent,
    'sketchcomplete': reportEvent
});

// Create and show the map
var map = new OpenLayers.Map({
    div: 'map',
    layers: [
        new OpenLayers.Layer.WMS('osgeo WMS',
                  'http://vmap0.tiles.osgeo.org/wms/vmap0?', {layers: 'basic'}),
        vectorLayer
    ]
});
map.setCenter(new OpenLayers.LonLat(0, 0), 3);

// Create the control collection to draw vectorial features.
var controls = {
    line: new OpenLayers.Control.DynamicMeasure(
                OpenLayers.Handler.Path, {drawingLayer: vectorLayer}),
    polygon: new OpenLayers.Control.DynamicMeasure(
                OpenLayers.Handler.Polygon, {drawingLayer: vectorLayer})
};
// add this controls to the map
for (var key in controls) {
    map.addControl(controls[key]);
}

// Functions called from the form fields to choose the desired control to test.
// ----------------------------------------------------------------------------

// Function to toggle the active control
function toggleControl(element) {
    for (key in controls) {
        var control = controls[key];
        if (element.value === key && element.checked) {
            control.activate();
        } else {
            control.deactivate();
        }
    }
}

