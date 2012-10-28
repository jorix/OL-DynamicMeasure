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
                strokeDashstyle: "solid",
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
            labelOutlineWidth: 2
        };
        this.styleTotalMeasure = {
            fontColor: "#800517",
            fontSize: "11px",
            fontFamily: "Verdana",
            fontWeight: "bold",
            labelAlign: "lb",
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

        this.isPath = (handler.prototype.polygon === undefined); // duck typing
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
            }
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
            var vlayer = new OpenLayers.Layer.Vector("text_segments", {
                displayInLayerSwitcher: false,
                calculateInRange: OpenLayers.Function.True
                // ?? ,wrapDateLine: this.citeCompliant
            });
            var vlayerTotals = new OpenLayers.Layer.Vector("text_totals", {
                displayInLayerSwitcher: false,
                calculateInRange: OpenLayers.Function.True
                // ?? ,wrapDateLine: this.citeCompliant
            });
            this.map.addLayers([vlayer, vlayerTotals]);
            this.dynamicObj = {vlayer: vlayer, vlayerTotals: vlayerTotals};
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
                vlayer = dynamicObj.vlayer,
                vlayerTotals = dynamicObj.vlayerTotals;
            if (vlayer.map != null) {
                vlayer.destroyFeatures();
                vlayer.destroy(false);
            }
            if (vlayerTotals.map != null) {
                vlayerTotals.destroyFeatures();
                vlayerTotals.destroy(false);
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
            dynamicObj.vlayerTotals.destroyFeatures();
        }
        if (!this.handler.freehandMode(this.handler.evt)) {
            if(this.isPath) {
                dynamicObj.fromPointIndex = geometry.components.length -2;
            } else {
                dynamicObj.fromPointIndex = geometry.components[0].components.length -3;
            }
            dynamicObj.freehand = false;
            dynamicObj.countSegments++;
        } else if (!dynamicObj.freehand) {
            // freehand has started
            if(this.isPath) {
                dynamicObj.fromPointIndex = geometry.components.length -2;
            } else {
                dynamicObj.fromPointIndex = geometry.components[0].components.length -3;
            }
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
        if (this.immediate){
            this.measureImmediate(point, feature, drawing)
        }

        var dynamicObj = this.dynamicObj;
        if (dynamicObj.drawing === false) {
           return;
        }

        var line, lineLen;
        if (this.isPath) {
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

        // total measure
        var totalLength = this.getBestLength(line);
        if (!totalLength[0]) {
           return;
        }
        var totalMeasureText;
        if (this.isPath) {
            totalMeasureText =
                this.formatNumber(totalLength[0]) + " " + totalLength[1] + "\n";
        } else {
            var totalArea = this.getBestArea(feature.geometry);
            totalMeasureText =
                (totalArea && totalArea[0] ? 
                    this.formatNumber(totalArea[0]) + " " + 
                            totalArea[1] + "²\n\n": ""
                ) + 
                this.formatNumber(totalLength[0]) + " " + totalLength[1] + "\n";
        }

        var labelTotal = dynamicObj.labelTotal;
        if(!labelTotal){
            labelTotal = new OpenLayers.Feature.Vector(
                                   point.clone(), null, this.styleTotalMeasure);
            labelTotal.style.label = totalMeasureText;
            dynamicObj.labelTotal = labelTotal;
            dynamicObj.vlayerTotals.addFeatures([labelTotal], {silent: true});
        } else {
            labelTotal.geometry.x = point.x; 
            labelTotal.geometry.y = point.y; 
            labelTotal.style.label = totalMeasureText;
            labelTotal.layer.drawFeature(labelTotal);
        }

        // segemnt measure
        var segmentPoints = line.components.slice(
            dynamicObj.fromPointIndex,
            lineLen
        );
        var labelSegmentLen = dynamicObj.labelSegments.length;
        if(labelSegmentLen < dynamicObj.countSegments){
            var done;
            if (!this.isPath && dynamicObj.labelSegments.length === 0) {
                done = this.addSegment([
                    line.components[0],
                    line.components[lineLen-1]
                ]);
                if (!done) return;
                dynamicObj.countSegments++;
            }
            done = this.addSegment(segmentPoints);
            if (!done) return;
        } else {
            this.updateSegment(
                dynamicObj.labelSegments[labelSegmentLen - 1],
                segmentPoints
            );
            if (!this.isPath) {
                this.updateSegment(
                    dynamicObj.labelSegments[0],
                    [line.components[0], line.components[lineLen-1]]
                );
            }
        }
    },

    /**
     * APIFunction: addSegment
     * 
     * Parameters: 
     * points - Array(<OpenLayers.Geometry.Point>)
     *
     * Returns: 
     * {Boolean}
     */
    addSegment: function(points) {
        var segmentLength = this.getBestLength(
                                    new OpenLayers.Geometry.LineString(points));
        if (!segmentLength[0]) {
            return false;
        }
        labelSegment = new OpenLayers.Feature.Vector(
            points[0].clone(),
            null, 
            this.styleOneMeasure
        );
        labelSegment.style.label = 
                   this.formatNumber(segmentLength[0]) + " " + segmentLength[1];
        var dynamicObj = this.dynamicObj;
        dynamicObj.labelSegments.push(labelSegment);
        dynamicObj.vlayer.addFeatures([labelSegment], {silent: true});
        return true;
    },

    /**
     * APIFunction: updateSegment
     * 
     * Parameters: 
     * points - Array(<OpenLayers.Geometry.Point>)
     *
     * Returns: 
     * {Boolean}
     */
    updateSegment: function(labelSegment, points) {
        var segmentLength = this.getBestLength(
                                    new OpenLayers.Geometry.LineString(points));
        var from = points[0];
        var to = points[points.length - 1];
        labelSegment.geometry.x = (from.x + to.x) / 2;
        labelSegment.geometry.y = (from.y + to.y) / 2;
        labelSegment.style.label =
                   this.formatNumber(segmentLength[0]) + " " + segmentLength[1];
        labelSegment.layer.drawFeature(labelSegment);
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
