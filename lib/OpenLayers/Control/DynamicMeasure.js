/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the Clear BSD license.  
 * See http://svn.openlayers.org/trunk/openlayers/license.txt for the
 * full text of the license. */

/**
 * @requires OpenLayers/Control/Measure.js
 */

/**
 * Class: OpenLayers.Control.DynamicMeasure
 * Allows for drawing of features for measurements.
 *
 * Inherits from:
 *  - <OpenLayers.Control.Measure>
 */
OpenLayers.Control.DynamicMeasure = OpenLayers.Class(OpenLayers.Control.Measure, {
    
    /**
     * APIProperty: immediate
     * {Boolean} Activates the immediate measurement so that the "measurepartial"
     *     event is also fired once the measurement sketch is modified.
     *     Default is true.
     */
    immediate: true,
    persist: true,
    textNodes: null, 
    dynamicObj: null,
    
    initialize: function(handler, options) {
        // style the sketch fancy
        var sketchSymbolizers = {
            "Point": {
                pointRadius: 4,
                graphicName: "square",
                fillColor: "white",
                fillOpacity: 1,
                strokeWidth: 1,
                strokeOpacity: 1,
                strokeColor: "#333333"
            },
            "Line": {
                strokeWidth: 2,
                strokeOpacity: 1,
                strokeColor: "#666666",
                strokeDashstyle: "dash"
            },
            "Polygon": {
                strokeWidth: 2,
                strokeOpacity: 1,
                strokeColor: "#666666",
                strokeDashstyle: "dash",
                fillColor: "white",
                fillOpacity: 0.3
            }
        };
        var style = new OpenLayers.Style();
        style.addRules([
            new OpenLayers.Rule({symbolizer: sketchSymbolizers})
        ]);
        var styleMap = new OpenLayers.StyleMap({"default": style});
        this.handlerOptions = {
            layerOptions: {
                styleMap: styleMap
            }
        };
        OpenLayers.Control.Measure.prototype.initialize.apply(this, arguments);
    },
    setImmediate:function() {}, //"control.setImmediate" does not work
    activate: function() {
        var response = OpenLayers.Control.Measure.prototype.activate.apply(this, arguments);
        if (response) {
            this.dynamicObj = {};
            var dynamicObj = this.dynamicObj;
            dynamicObj.vlayer = new OpenLayers.Layer.Vector("text_measures", {
                displayInLayerSwitcher: false
            });
            this.map.addLayer(dynamicObj.vlayer);
        }
        return response;
    },

    deactivate: function() {
        var response = OpenLayers.Control.Measure.prototype.deactivate.apply(this, arguments);
        if (response) {
            var dynamicObj = this.dynamicObj;
            if (dynamicObj.vlayer.map != null) {
                dynamicObj.vlayer.destroyFeatures();
                dynamicObj.vlayer.destroy(false);
            }
            dynamicObj.vlayer = null;
            dynamicObj = null;
        }
        return response;
    },
    callbacks:{
        create: function(){ 
            var dynamicObj = this.dynamicObj;
            dynamicObj.textNodes = [];
            dynamicObj.drawing = false; 
            dynamicObj.textCount = 0;
            dynamicObj.fromPointIndex = 0;
            dynamicObj.freehand = false;
        }, 
        point: function(point, geometry){
            var dynamicObj = this.dynamicObj;
            if (!dynamicObj.drawing) {
                dynamicObj.vlayer.destroyFeatures();
            }
            if (!this.handler.freehandMode(this.handler.evt)) {
                dynamicObj.fromPointIndex = geometry.components.length -2;
                dynamicObj.freehand = false;
                dynamicObj.textCount++;
            } else if (!dynamicObj.freehand) {
                // freehand has started
                dynamicObj.fromPointIndex = geometry.components.length -2;
                dynamicObj.freehand = true;
                dynamicObj.textCount++;
            }
            this.measurePartial(point, geometry);
            dynamicObj.drawing = true;
        },
        modify: function(point, feature, drawing){
            if (this.immediate){
                this.measureImmediate(point, feature, drawing)
            }
            var dynamicObj = this.dynamicObj;
            if (dynamicObj.drawing === false) { 
               return; 
            }
            var line, lineLen;
            if(feature.geometry.CLASS_NAME.indexOf('LineString') > -1) {
                line = feature.geometry;
                lineLen = line.components.length;
            } else {
                line = feature.geometry.components[0];
                lineLen = line.components.length - 1;
            }
            
            
            if (!this.handler.freehandMode(this.handler.evt) && dynamicObj.freehand) {
                // freehand has stopped
                dynamicObj.fromPointIndex = lineLen -2;
                dynamicObj.freehand = false;
                dynamicObj.textCount++;
            } 
            
            var ls = new OpenLayers.Geometry.LineString(
                line.components.slice(
                    dynamicObj.fromPointIndex, 
                    lineLen 
                )
            ); 
            var dist = this.getBestLength(ls); 
            if(!dist[0]){ 
                return; 
            } 
            var total = this.getBestLength(line); 
            var label = dist[0].toFixed(3) + " " + dist[1]; 
            
            var textNode = dynamicObj.textNodes[dynamicObj.textCount -1] || null; 
            if(!textNode){ 
                var c = ls.getCentroid(); 
                textNode = new OpenLayers.Feature.Vector( 
                new OpenLayers.Geometry.Point(c.x, c.y), {}, { 
                    label: label, 
                    fontColor: "#800517", 
                    fontSize: "12px", 
                    fontFamily: "Tahoma", 
                    fontWeight: "bold", 
                    labelAlign: "cm" 
                }); 
                dynamicObj.textNodes.push(textNode); 
                dynamicObj.vlayer.addFeatures([textNode]); 
            } else {
                var from = line.components[dynamicObj.fromPointIndex];
                var to = line.components[lineLen-1]; 
                textNode.geometry.x = (from.x + to.x) / 2; 
                textNode.geometry.y = (from.y + to.y) / 2; 
                textNode.style.label = label; 
                textNode.layer.drawFeature(textNode); 
            }
            // this.events.triggerEvent("measuredynamic", { 
                // measure: dist[0], 
                // total: total[0], 
                // units: dist[1], 
                // order: 1, 
                // geometry: ls 
            // }); 
        } 
    },
    CLASS_NAME: "OpenLayers.Control.DynamicMeasure"
});
