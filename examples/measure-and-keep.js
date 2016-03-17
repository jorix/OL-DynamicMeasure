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
        vectorLayer,
    ]
});
map.setCenter(new OpenLayers.LonLat(0, 0), 3);

var styleLine = {
    'Point': {
        pointRadius: 4,
        graphicName: 'square',
        fillColor: 'white',
        fillOpacity: 1,
        strokeWidth: 1,
        strokeOpacity: 1,
        strokeColor: '#333333'
    },
    'Line': {
        strokeWidth: 2,
        strokeOpacity: 1,
        strokeColor: '#666666',
        strokeDashstyle: 'dash'
    },
    'Polygon': {
        strokeWidth: 2,
        strokeOpacity: 1,
        strokeColor: '#666666',
        strokeDashstyle: 'solid',
        fillColor: 'white',
        fillOpacity: 0.3
    },
    labelSegments: {
        label: '${measure} ${units}',
        fontSize: '11px',
        fontColor: '#7661AB',
        fontFamily: 'Verdana',
        labelOutlineColor: '#dddddd',
        labelAlign: 'cm',
        labelOutlineWidth: 2
    },
    labelLength: {
        label: '${measure} ${units}\n',
        fontSize: '11px',
        fontWeight: 'bold',
        fontColor: '#800517',
        fontFamily: 'Verdana',
        labelOutlineColor: '#dddddd',
        labelAlign: 'lb',
        labelOutlineWidth: 3
    },
    labelArea: {
        label: '${measure}\n${units}²\n',
        fontSize: '11px',
        fontWeight: 'bold',
        fontColor: '#800517',
        fontFamily: 'Verdana',
        labelOutlineColor: '#dddddd',
        labelAlign: 'cm',
        labelOutlineWidth: 3
    },
    labelHeading: {
        label: '${measure} ${units}',
        fontSize: '11px',
        fontColor: '#800517',
        fontFamily: 'Verdana',
        labelOutlineColor: '#dddddd',
        labelAlign: 'cm',
        labelOutlineWidth: 3
    }
};

// Create the control collection to draw vectorial features.
var controls = {
    line: new OpenLayers.Control.DynamicMeasure(OpenLayers.Handler.Path, {
        persist: true,
        maxSegments: null,
        drawingLayer: vectorLayer,
        geodesic: true, // required by projection "EPSG:4326"
        keep: true
    }),
    polygon: new OpenLayers.Control.DynamicMeasure(OpenLayers.Handler.Polygon, {
        persist: false,
        maxSegments: null,
        drawingLayer: vectorLayer,
        geodesic: true, // required by projection "EPSG:4326"
        keep: true
    })
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

function emptyAllKeeped() {
    controls.line.deactivate();
    controls.line.emptyKeeped();
    controls.polygon.deactivate();
    controls.polygon.emptyKeeped();
}

