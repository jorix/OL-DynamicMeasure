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
     * APIProperty: accuracy
     * {Integer} Digits measurement accuracy, default is 5.
     */
    accuracy: 5,

    /**
     * APIProperty: persist
     * {Boolean} Keep the temporary measurement sketch drawn after the
     *     measurement is complete.  The geometry will persist until a new
     *     measurement is started, the control is deactivated, default is true.
     */
    persist: true,

    /**
     * APIProperty: immediate
     * {Boolean} Activates the immediate measurement so that the "measurepartial"
     *     event is also fired once the measurement sketch is modified.
     *     Default is true.
     */
    immediate: true,

    /**
     * APIProperty: dynamicObj
     * {Object} Internal use.
     */
    dynamicObj: null,

    /**
     * Constructor: OpenLayers.Control.Measure
     * 
     * Parameters:
     * handler - {<OpenLayers.Handler>} 
     * options - {Object} 
     */
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
        this.styleOneMeasure = {
            fontColor: "#800517",
            fontSize: "10px",
            fontFamily: "Verdana",
            labelAlign: "cm",
            labelOutlineColor: "#dddddd",
            labelOutlineWidth: 3
        };
        this.styleTotalMeasure = {
            fontColor: "#800517",
            fontSize: "12px",
            fontFamily: "Verdana",
            fontWeight: "bold",
            labelAlign: "cb",
            labelOutlineColor: "#dddddd",
            labelOutlineWidth: 3
        };
        var style = new OpenLayers.Style(null, {rules: [
            new OpenLayers.Rule({symbolizer: sketchSymbolizers})
        ]});
        this.handlerOptions = {
            layerOptions: {
                styleMap: new OpenLayers.StyleMap({"default": style})
            }
        };

        // force some options
        options = options || {};
        options.immediate = true;
        var callbacks = {
            create: this.callbackCreate,
            point: this.callbackPoint,
            cancel: this.callbackCancel,
            modify: this.callbackModify
        };
        options.callbacks = OpenLayers.Util.extend(
                                                  callbacks, options.callbacks);

        // do a trick to avoid blue background in freehand mode.
        var oldOnselectstart = document.onselectstart ?
                              document.onselectstart : OpenLayers.Function.True;
         var handlerTuned = OpenLayers.Class(handler, {
            down: function(evt) {
                document.onselectstart = OpenLayers.Function.False;
                return handler.prototype.down.apply(this, arguments);
            },
            up: function(evt) {
                document.onselectstart = oldOnselectstart;
                return handler.prototype.up.apply(this, arguments);
            },
            move: function(evt) {
                if (!this.mouseDown) {
                    document.onselectstart = oldOnselectstart;
                }
                return handler.prototype.move.apply(this, arguments);
            },
            mouseout: function(evt) {
                if(OpenLayers.Util.mouseLeft(evt, this.map.viewPortDiv)) {
                    if (this.mouseDown) {
                        document.onselectstart = oldOnselectstart;
                    }
                }
                return handler.prototype.mouseout.apply(this, arguments);
            },
            finalize: function() {
                document.onselectstart = oldOnselectstart;
                handler.prototype.finalize.apply(this, arguments);
            },
        });
        OpenLayers.Control.Measure.prototype.initialize.call(
                                                   this, handlerTuned, options);
    },

    /**
     * Method: draw
     * This control does not have HTML component, so this method should
     *     be empty.
     */
    draw: function() {},

    /**
     * APIMethod: activate
     */
    activate: function() {
        var response = OpenLayers.Control.Measure.prototype.activate.apply(
                                                               this, arguments);
        if (response) {
            var vlayer = new OpenLayers.Layer.Vector("text_measures", {
                displayInLayerSwitcher: false,
                calculateInRange: OpenLayers.Function.True
                // ?? ,wrapDateLine: this.citeCompliant
            });
            this.map.addLayer(vlayer);
            this.dynamicObj = {vlayer: vlayer};
        }
        return response;
    },

    /**
     * APIMethod: deactivate
     */
    deactivate: function() {
        var response = OpenLayers.Control.Measure.prototype.deactivate.apply(
                                                               this, arguments);
        if (response) {
            var dynamicObj = this.dynamicObj,
                vlayer= dynamicObj.vlayer;
            if (vlayer.map != null) {
                vlayer.destroyFeatures();
                vlayer.destroy(false);
            }
            dynamicObj = null;
        }
        return response;
    },

    /**
     * APIMethod: setImmediate
     * Sets the <immediate> property. Changes the activity of immediate
     * measurement.
     */
    setImmediate: function(immediate) {
        this.immediate = immediate;
    },

    /**
     * Method: callbackCreate
     */
    callbackCreate: function(){
        var dynamicObj = this.dynamicObj;
        dynamicObj.drawing = false; 
        dynamicObj.freehand = false;
        dynamicObj.fromPointIndex = 0;
        dynamicObj.countSegments = 0;
        dynamicObj.labelSegments = [];
        dynamicObj.labelTotal = null;
    }, 

    /**
     * Method: callbackPoint
     */
    callbackPoint: function(point, geometry) {
        var dynamicObj = this.dynamicObj;
        if (!dynamicObj.drawing) {
            dynamicObj.vlayer.destroyFeatures();
        }
        if (!this.handler.freehandMode(this.handler.evt)) {
            dynamicObj.fromPointIndex = geometry.components.length -2;
            dynamicObj.freehand = false;
            dynamicObj.countSegments++;
        } else if (!dynamicObj.freehand) {
            // freehand has started
            dynamicObj.fromPointIndex = geometry.components.length -2;
            dynamicObj.freehand = true;
            dynamicObj.countSegments++;
        }
        
        // move to measurePartial

        this.measurePartial(point, geometry);
        dynamicObj.drawing = true;
    },

    /**
     * Method: callbackModify
     */
    callbackModify: function(point, feature, drawing) {
        var dynamicObj = this.dynamicObj;
        if (dynamicObj.drawing === false) { 
           return; 
        }
        var vlayer = dynamicObj.vlayer;

        if (this.immediate){
            this.measureImmediate(point, feature, drawing)
        }

        var line, lineLen;
        if(feature.geometry.CLASS_NAME.indexOf('LineString') > -1) {
            line = feature.geometry;
            lineLen = line.components.length;
        } else {
            line = feature.geometry.components[0];
            lineLen = line.components.length - 1;
        }

        if (!this.handler.freehandMode(this.handler.evt) && 
                                                          dynamicObj.freehand) {
            // freehand has stopped
            dynamicObj.fromPointIndex = lineLen -2;
            dynamicObj.freehand = false;
            dynamicObj.countSegments++;
        }

        var segment = new OpenLayers.Geometry.LineString(
            line.components.slice(
                dynamicObj.fromPointIndex,
                lineLen
            )
        );
        var segmentLength = this.getBestLength(segment);
        if (!segmentLength[0]) {
            return;
        }
        var totalLength = this.getBestLength(line);

        var segmentLengthText =
                this.formatNumber(segmentLength[0]) + " " + segmentLength[1],
            totalLengthText =
                this.formatNumber(totalLength[0]) + " " + totalLength[1] + "\n";

        var labelTotal = dynamicObj.labelTotal;
        if(!labelTotal){
            labelTotal = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.Point(point.x, point.y),
                null,
                this.styleTotalMeasure
            );
            labelTotal.style.label = totalLengthText;
            dynamicObj.labelTotal = labelTotal;
            vlayer.addFeatures([labelTotal], {silent: true});
        } else {
            labelTotal.geometry.x = point.x; 
            labelTotal.geometry.y = point.y; 
            labelTotal.style.label = totalLengthText;
        }

        var labelSegment =
                  dynamicObj.labelSegments[dynamicObj.countSegments -1] || null; 
        if(!labelSegment){ 
            var c = segment.getCentroid(); 
            labelSegment = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.Point(c.x, c.y),
                null, 
                this.styleOneMeasure
            );
            labelSegment.style.label = segmentLengthText;
            dynamicObj.labelSegments.push(labelSegment);
            vlayer.removeFeatures([labelTotal], {silent: true});
            vlayer.addFeatures([labelSegment, labelTotal], {silent: true});
        } else {
            var from = line.components[dynamicObj.fromPointIndex];
            var to = line.components[lineLen-1];
            labelSegment.geometry.x = (from.x + to.x) / 2;
            labelSegment.geometry.y = (from.y + to.y) / 2;
            labelSegment.style.label = segmentLengthText;
            vlayer.drawFeature(labelSegment);
            vlayer.drawFeature(labelTotal);
        }
    },

    /**
     * APIFunction: formatNumber
     * Format a measure number with digits of <accuracy>. Could internationalize the
     *     format customizing <OpenLayers.Number.thousandsSeparator> and
     *     <OpenLayers.Number.decimalSeparator>.
     * 
     * Parameters: 
     * number - {Float} Number to format.
     *
     * Returns: 
     * {String}
     */
    formatNumber: function(number) {
        //Use `OpenLayers.Number.format` to internationalize the number format.
        return OpenLayers.Number.format( 
                                Number(number.toPrecision(this.accuracy)),null);
    },
    
    CLASS_NAME: "OpenLayers.Control.DynamicMeasure"
});
