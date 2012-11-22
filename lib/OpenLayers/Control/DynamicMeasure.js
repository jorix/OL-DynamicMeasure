/* Copyright 2011-2012 Xavier Mamano, http://github.com/jorix/OL-DynamicMeasure
 * Published under MIT license. All rights reserved. */

/**
 * @requires OpenLayers/Control/Measure.js
 * @requires OpenLayers/Rule.js
 * @requires OpenLayers/StyleMap.js
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
     * Property: styles
     * {Object} Alterations of styles along the lines of default on
     *     <OpenLayers.Control.DynamicMeasure.styles>, can use keys,   "Point",
     *     "Line", "Polygon", "labelSegments", "labelLength", "labelArea".
     */
    styles: null,

    /**
     * Property: layerSegmentsOptions
     * {Object} Any optional properties to be set on the
     *     layer of <layerSegments> of the lengths of the segments. If
     *     `styleMap` is set then the key "labelSegments" of the `styles` option
     *     is ignored. If set to null the layer does not act.
     */
    layerSegmentsOptions: undefined,

    /**
     * Property: layerLengthOptions
     * {Object} Any optional properties to be set on the
     *     layer of <layerLength> of the total length. If
     *     `styleMap` is set then the key "labelLength" of the `styles` option
     *     is ignored. If set to null the layer does not act.
     */
    layerLengthOptions: undefined,

    /**
     * Property: layerAreaOptions
     * {Object} Any optional properties to be set on the
     *     layer of <layerArea> of the total area. If
     *     `styleMap` is set then the key "labelArea" of the `styles` option
     *     is ignored. If set to null the layer does not act.
     */
    layerAreaOptions: undefined,

    /**
     * Property: layerSegments
     * {<OpenLayers.Layer.Vector>} The temporary drawing layer to show the
     *     length of the segments.
     */
    layerSegments: null,

    /**
     * Property: layerLength
     * {<OpenLayers.Layer.Vector>} The temporary drawing layer to show total
     *     length.
     */
    layerLength: null,

    /**
     * Property: layerArea
     * {<OpenLayers.Layer.Vector>} The temporary drawing layer to show total
     *     area.
     */
    layerArea: null,

    /**
     * Property: dynamicObj
     * {Object} Internal use.
     */
    dynamicObj: null,

    /**
     * Property: isArea
     * {Boolean} Internal use.
     */
    isArea: null,

    /**
     * Constructor: OpenLayers.Control.Measure
     * 
     * Parameters:
     * handler - {<OpenLayers.Handler>} 
     * options - {Object}
     *
     * Valid options:
     * styles - {Object} Alterations of styles along the lines of default on
     *     <OpenLayers.Control.DynamicMeasure.styles>, can use keys,   "Point",
     *     "Line", "Polygon", "labelSegments", "labelLength", "labelArea".
     * handlerOptions - {Object} Used to set non-default properties on the
     *     control's handler. If `layerOptions["styleMap"]` is set then the
     *     keys: "Point", "Line" and "Polygon" of the `styles` option
     *     are ignored.
     * layerSegmentsOptions - {Object} Any optional properties to be set on the
     *     layer of <layerSegments> of the lengths of the segments. If
     *     `styleMap` is set then the key "labelSegments" of the `styles` option
     *     is ignored. If set to null the layer does not act.
     * layerLengthOptions - {Object} Any optional properties to be set on the
     *     layer of <layerLength> of the total length. If
     *     `styleMap` is set then the key "labelLength" of the `styles` option
     *     is ignored. If set to null the layer does not act.
     * layerAreaOptions - {Object} Any optional properties to be set on the
     *     layer of <layerArea> of the total area. If
     *     `styleMap` is set then the key "labelArea" of the `styles` option
     *     is ignored. If set to null the layer does not act.
     */
    initialize: function(handler, options) {

        // Manage options
        options = options || {};

        // * styles option
        var optionsStyles = options.styles || {};
        options.styles = optionsStyles;
        var defaultStyles = OpenLayers.Control.DynamicMeasure.styles;
        // * * styles for handler layer.
        if (!options.handlerOptions ||
            !options.handlerOptions.layerOptions ||
            !options.handlerOptions.layerOptions.styleMap) {
            // use the style option for layerOptions of the handler.
            var style = new OpenLayers.Style(null, {rules: [
                new OpenLayers.Rule({symbolizer: {
                    "Point": OpenLayers.Util.applyDefaults(
                                optionsStyles.Point, defaultStyles.Point),
                    "Line": OpenLayers.Util.applyDefaults(
                                optionsStyles.Line, defaultStyles.Line),
                    "Polygon": OpenLayers.Util.applyDefaults(
                                optionsStyles.Polygon, defaultStyles.Polygon)
                }})
            ]});
            options.handlerOptions = options.handlerOptions || {};
            options.handlerOptions.layerOptions =
                                      options.handlerOptions.layerOptions || {};
            options.handlerOptions.layerOptions.styleMap =
                                    new OpenLayers.StyleMap({"default": style});
        }

        // force some handler options
        options.callbacks = OpenLayers.Util.applyDefaults(options.callbacks, {
            create: this.callbackCreate,
            point: this.callbackPoint,
            cancel: this.callbackCancel,
            modify: this.callbackModify
        });
        // do a trick with the handler to avoid blue background in freehand.
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
            }
        });
        // ... and call the constructor
        OpenLayers.Control.Measure.prototype.initialize.call(
                                                   this, handlerTuned, options);

        this.isArea = handler.prototype.polygon !== undefined; // duck typing
    },

    /**
     * APIMethod: destroy
     */
    destroy: function() {
        this.deactivate();
        this.dynamicObj = null;
        this.layerSegments = null;
        this.layerLength = null;
        this.layerArea = null;
        OpenLayers.Control.Measure.prototype.destroy.apply(this, arguments);
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
            // Create dynamicObj
            this.dynamicObj = {};
            // Create layers
            var _optionsStyles = this.styles || {},
                _defaultStyles = OpenLayers.Control.DynamicMeasure.styles,
                _self = this;
            var _create = function(styleName, initialOptions) {
                if (initialOptions === null) {
                    return null;
                }
                var options = OpenLayers.Util.extend({
                    displayInLayerSwitcher: false,
                    calculateInRange: OpenLayers.Function.True
                    // ?? ,wrapDateLine: this.citeCompliant
                }, initialOptions);
                if (!options.styleMap) {
                    var style = _optionsStyles[styleName];
                    
                    options.styleMap = new OpenLayers.StyleMap({
                        "default": OpenLayers.Util.applyDefaults(style,
                                                      _defaultStyles[styleName])
                    });
                } 
                var layer =  new OpenLayers.Layer.Vector(
                                   _self.CLASS_NAME + ' ' + styleName, options);
                _self.map.addLayer(layer);
                return layer;
            };
            this.layerSegments =
                            _create("labelSegments", this.layerSegmentsOptions);
            this.layerLength = _create("labelLength", this.layerLengthOptions);
            if (this.isArea) {
                this.layerArea = _create("labelArea", this.layerAreaOptions);
            }
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
            this.layerSegments && this.layerSegments.destroy();
            this.layerLength && this.layerLength.destroy();
            this.layerArea && this.layerArea.destroy();
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
    }, 

    /**
     * Method: callbackPoint
     */
    callbackPoint: function(point, geometry) {
        var dynamicObj = this.dynamicObj;
        if (!dynamicObj.drawing) {
            this.layerSegments && this.layerSegments.destroyFeatures(
                                                          null, {silent: true});
            this.layerLength && this.layerLength.destroyFeatures(
                                                          null, {silent: true});
            this.layerArea && this.layerArea.destroyFeatures(
                                                          null, {silent: true});
        }
        if (!this.handler.freehandMode(this.handler.evt)) {
            if(this.isArea) {
                dynamicObj.fromPointIndex = geometry.components[0]
                                                    .components.length -3;
            } else {
                dynamicObj.fromPointIndex = geometry.components.length -2;
            }
            dynamicObj.freehand = false;
            dynamicObj.countSegments++;
        } else if (!dynamicObj.freehand) {
            // freehand has started
            if (this.isArea) {
                dynamicObj.fromPointIndex = geometry.components[0]
                                                    .components.length -3;
            } else {
                dynamicObj.fromPointIndex = geometry.components.length -2;
            }
            dynamicObj.freehand = true;
            dynamicObj.countSegments++;
        }

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
        if (this.isArea) {
            line = feature.geometry.components[0];
            lineLen = line.components.length - 1;
        } else {
            line = feature.geometry;
            lineLen = line.components.length;
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
        var labelTotal,
            layer = this.layerLength;
        if (layer) {
            if (layer.features.length === 0) {
                labelTotal = new OpenLayers.Feature.Vector(point.clone());
                this.setMesureAttributes(labelTotal.attributes, totalLength);
                layer.addFeatures([labelTotal]);
            } else {
                labelTotal = layer.features[0];
                labelTotal.geometry.x = point.x; 
                labelTotal.geometry.y = point.y; 
                this.setMesureAttributes(labelTotal.attributes, totalLength);
                labelTotal.layer.drawFeature(labelTotal);
            }
        }
        if (this.isArea && this.layerArea) {
            var center = feature.geometry.getBounds().clone();
            center.extend(point);
            center = center.getCenterLonLat();
            this.showLabel(this.layerArea, 0, this.getBestArea(feature.geometry), center.lon, center.lat);
        }

        // segemnt measure
        if (this.isArea && this.layerSegments) {
            var created;
            created = this.showLabelSegment(
                this.layerSegments, 0, 
                [
                    line.components[0],
                    line.components[lineLen-1]
                ]
            );
            if (created) {
                dynamicObj.countSegments++;
            }
        }
        if (this.layerSegments) {
            this.showLabelSegment(
                this.layerSegments, 
                dynamicObj.countSegments-1, 
                line.components.slice(
                    dynamicObj.fromPointIndex,
                    lineLen
                )
            );
        }
    },

    /**
     * Function: showLabelSegment
     * 
     * Parameters: 
     * layer - <OpenLayers.Layer.Vector>
     * points - Array(<OpenLayers.Geometry.Point>)
     *
     * Returns: 
     * {Boolean}
     */
    showLabelSegment: function(layer, index, points) {
        var from = points[0],
            to = points[points.length - 1];
        return this.showLabel(layer, index,
            this.getBestLength(new OpenLayers.Geometry.LineString(points)),
            (from.x + to.x) / 2,
            (from.y + to.y) / 2
        );
    },

    /**
     * Function: showLabel
     * 
     * Parameters: 
     * points - Array(<OpenLayers.Geometry.Point>)
     *
     * Returns: 
     * {Boolean}
     */
    showLabel: function(layer, index, measure, x, y) {
        var featureLabel;
        if (layer.features.length <= index) { 
            if (measure[0] === 0) {
                return false;
            }
            featureLabel = new OpenLayers.Feature.Vector(
                                           new OpenLayers.Geometry.Point(x, y));
            this.setMesureAttributes(featureLabel.attributes, measure);
            layer.addFeatures([featureLabel]);
            return true;
        } else {
            featureLabel = layer.features[index];
            featureLabel.geometry.x = x; 
            featureLabel.geometry.y = y; 
            this.setMesureAttributes(featureLabel.attributes, measure);
            layer.drawFeature(featureLabel);
            return false;
        }
    },
    
    /**
     * Method: setMesureAttributes
     * Format measure[0] with digits of <accuracy>. Could internationalize the
     *     format customizing <OpenLayers.Number.thousandsSeparator> and
     *     <OpenLayers.Number.decimalSeparator>
     *
     * Parameters: 
     * attributes - {object} Target attributes.
     * measure - Array({*})
     */
    setMesureAttributes: function(attributes, measure) {
        attributes.measure = OpenLayers.Number.format( 
                            Number(measure[0].toPrecision(this.accuracy)),null);
        attributes.units = measure[1];
    },

    CLASS_NAME: "OpenLayers.Control.DynamicMeasure"
});

/**
 * Constant: OpenLayers.Control.DynamicMeasure.styles
 */
OpenLayers.Control.DynamicMeasure.styles = {
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
    },
    labelSegments: {
        label: "${measure} ${units}",
        fontSize: "10px",
        fontColor: "#800517",
        fontFamily: "Verdana",
        fontSize: "11px",
        labelOutlineColor: "#dddddd",
        labelAlign: "cm",
        labelOutlineWidth: 2
    },
    labelLength: {
        label: "${measure} ${units}\n",
        fontSize: "11px",
        fontWeight: "bold",
        fontColor: "#800517",
        fontFamily: "Verdana",
        fontSize: "11px",
        labelOutlineColor: "#dddddd",
        labelAlign: "lb",
        labelOutlineWidth: 3
    },
    labelArea: {
        label: "${measure}\n${units}²\n",
        fontSize: "11px",
        fontWeight: "bold",
        fontColor: "#800517",
        fontFamily: "Verdana",
        fontSize: "11px",
        labelOutlineColor: "#dddddd",
        labelAlign: "cm",
        labelOutlineWidth: 3
    }
};
