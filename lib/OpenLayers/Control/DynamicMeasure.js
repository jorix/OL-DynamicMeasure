/* Copyright 2011-2013 Xavier Mamano, http://github.com/jorix/OL-DynamicMeasure
 * Published under MIT license. */

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
OpenLayers.Control.DynamicMeasure = OpenLayers.Class(
                                                   OpenLayers.Control.Measure, {

    /**
     * APIProperty: accuracy
     * {Integer} Digits measurement accuracy, default is 5.
     */
    accuracy: 5,

    /**
     * APIProperty: persist
     * {Boolean} Keep the temporary measurement after the
     *     measurement is complete.  The measurement will persist until a new
     *     measurement is started, the control is deactivated, or <cancel> is
     *     called. Default is true.
     */
    persist: true,

    /**
     * APIProperty: styles
     * {Object} Alterations of styles along the lines of default on
     *     <OpenLayers.Control.DynamicMeasure.styles>, can use keys,   "Point",
     *     "Line", "Polygon", "labelSegments", "labelLength", "labelArea".
     */
    styles: null,

    /**
     * APIProperty: layerSegmentsOptions
     * {Object} Any optional properties to be set on the
     *     layer of <layerSegments> of the lengths of the segments. If set to
     *     null the layer does not act.
     *
     *     If `styleMap` options is set then the key "labelSegments" of the
     *     `styles` option is ignored.
     */
    layerSegmentsOptions: undefined,

    /**
     * APIProperty: layerLengthOptions
     * {Object} Any optional properties to be set on the
     *     layer of <layerLength> of the total length. If set to null the layer
     *     does not act.
     *
     *     If `styleMap` option is set then the key "labelLength" of the
     *     `styles` option is ignored.
     */
    layerLengthOptions: undefined,

    /**
     * APIProperty: layerAreaOptions
     * {Object} Any optional properties to be set on the
     *     layer of <layerArea> of the total area. If set to null the layer does
     *     not act.
     *
     *     If `styleMap` is set then the key "labelArea" of the `styles` option
     *     is ignored.
     */
    layerAreaOptions: undefined,

    /**
     * Property: drawingLayer
     * {<OpenLayers.Layer.Vector>} Drawing layer to store the drawing when
     *     finished.
     */
    drawingLayer: null,

    /**
     * APIProperty: multi
     * {Boolean} Cast features to multi-part geometries before passing to the
     *     drawing layer, only used if declared a <drawingLayer>.
     * Default is false.
     */
    multi: false,

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
     * accuracy - {Integer} Digits measurement accuracy, default is 5.
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
     * drawingLayer {<OpenLayers.Layer.Vector>} Optional drawing layer to store
     *     the drawing when finished.
     * multi {Boolean} Cast features to multi-part geometries before passing to
     *     the drawing layer
     */
    initialize: function(handler, options) {

        // Manage options
        options = options || {};

        // handlerOptions: persist & multi
        options.handlerOptions = OpenLayers.Util.extend(
            {persist: !options.drawingLayer}, options.handlerOptions
        );
        if (options.drawingLayer && !("multi" in options.handlerOptions)) {
            options.handlerOptions.multi = options.multi;
        }

        // * styles option
        if (options.drawingLayer) {
            var sketchStyle = options.drawingLayer.styleMap &&
                                 options.drawingLayer.styleMap.styles.temporary;
            if (sketchStyle) {
                options.handlerOptions
                                  .layerOptions = OpenLayers.Util.applyDefaults(
                    options.handlerOptions.layerOptions, {
                        styleMap: new OpenLayers.StyleMap({
                            "default": sketchStyle
                        })
                    }
                );
            }
        }
        var optionsStyles = options.styles || {};
        options.styles = optionsStyles;
        var defaultStyles = OpenLayers.Control.DynamicMeasure.styles;
        // * * styles for handler layer.
        if (!options.handlerOptions.layerOptions ||
            !options.handlerOptions.layerOptions.styleMap) {
            // use the style option for layerOptions of the handler.
            var style = new OpenLayers.Style(null, {rules: [
                new OpenLayers.Rule({symbolizer: {
                    'Point': OpenLayers.Util.applyDefaults(
                                optionsStyles.Point, defaultStyles.Point),
                    'Line': OpenLayers.Util.applyDefaults(
                                optionsStyles.Line, defaultStyles.Line),
                    'Polygon': OpenLayers.Util.applyDefaults(
                                optionsStyles.Polygon, defaultStyles.Polygon)
                }})
            ]});
            options.handlerOptions = options.handlerOptions || {};
            options.handlerOptions.layerOptions =
                                      options.handlerOptions.layerOptions || {};
            options.handlerOptions.layerOptions.styleMap =
                                    new OpenLayers.StyleMap({'default': style});
        }

        // force some handler options
        options.callbacks = options.callbacks || {};
        if (options.drawingLayer) {
            OpenLayers.Util.applyDefaults(options.callbacks, {
                create: function(vertex, feature) {
                    this.callbackCreate(vertex, feature);
                    this.drawingLayer.events.triggerEvent(
                        "sketchstarted", {vertex: vertex, feature: feature}
                    );
                },
                modify: function(vertex, feature) {
                    this.callbackModify(vertex, feature);
                    this.drawingLayer.events.triggerEvent(
                        "sketchmodified", {vertex: vertex, feature: feature}
                    );
                },
                done: function(geometry) {
                    this.callbackDone(geometry);
                    this.drawFeature(geometry);
                }
            });
        }
        OpenLayers.Util.applyDefaults(options.callbacks, {
            create: this.callbackCreate,
            point: this.callbackPoint,
            cancel: this.callbackCancel,
            done: this.callbackDone,
            modify: this.callbackModify,
            redo: this.callbackRedo,
            undo: this.callbackUndo
        });

        // do a trick with the handler to avoid blue background in freehand.
        var _self = this;
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
                if (OpenLayers.Util.mouseLeft(evt, this.map.viewPortDiv)) {
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
        }, {
            undo: function() {
                var undone = handler.prototype.undo.call(this);
                if (undone) {
                    this.callback('undo',
                                 [this.point.geometry, this.getSketch(), true]);
                }
                return undone;
            },
            redo: function() {
                var redone = handler.prototype.redo.call(this);
                if (redone) {
                    this.callback('redo',
                                 [this.point.geometry, this.getSketch(), true]);
                }
                return redone;
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
                        'default': OpenLayers.Util.applyDefaults(style,
                                                      _defaultStyles[styleName])
                    });
                }
                var layer = new OpenLayers.Layer.Vector(
                                   _self.CLASS_NAME + ' ' + styleName, options);
                _self.map.addLayer(layer);
                return layer;
            };
            this.layerSegments =
                            _create('labelSegments', this.layerSegmentsOptions);
            this.layerLength = _create('labelLength', this.layerLengthOptions);
            if (this.isArea) {
                this.layerArea = _create('labelArea', this.layerAreaOptions);
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
            this.dynamicObj = null;
            this.layerSegments = null;
            this.layerLength = null;
            this.layerArea = null;
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
    callbackCreate: function() {
        var dynamicObj = this.dynamicObj;
        dynamicObj.drawing = false;
        dynamicObj.freehand = false;
        dynamicObj.fromIndex = 0;
        dynamicObj.countSegments = 0;
    },

    /**
     * Method: callbackCancel
     */
    callbackCancel: function() {
        this.destroyLabels();
    },

    /**
     * Method: callbackDone
     * Called when the measurement sketch is done.
     *
     * Parameters:
     * geometry - {<OpenLayers.Geometry>}
     */
    callbackDone: function(geometry) {
        this.measureComplete(geometry);
        if (!this.persist) {
            this.destroyLabels();
        }
    },

    /**
     * Method: drawFeature
     */
    drawFeature: function(geometry) {
        var feature = new OpenLayers.Feature.Vector(geometry);
        var proceed = this.drawingLayer.events.triggerEvent(
            "sketchcomplete", {feature: feature}
        );
        if(proceed !== false) {
            feature.state = OpenLayers.State.INSERT;
            this.drawingLayer.addFeatures([feature]);
            this.featureAdded && this.featureAdded(feature);// for compatibility
            this.events.triggerEvent("featureadded",{feature : feature});
        }
    },

    /**
     * Method: callbackCancel
     */
    destroyLabels: function() {
        this.layerSegments && this.layerSegments.destroyFeatures(
                                                          null, {silent: true});
        this.layerLength && this.layerLength.destroyFeatures(
                                                          null, {silent: true});
        this.layerArea && this.layerArea.destroyFeatures(null, {silent: true});
    },

    /**
     * Method: callbackPoint
     */
    callbackPoint: function(point, geometry) {
        var dynamicObj = this.dynamicObj;
        if (!dynamicObj.drawing) {
            this.destroyLabels();
        }
        if (!this.handler.freehandMode(this.handler.evt)) {
            dynamicObj.fromIndex = this.handler.getCurrentPointIndex() - 1;
            dynamicObj.freehand = false;
            dynamicObj.countSegments++;
        } else if (!dynamicObj.freehand) {
            // freehand has started
            dynamicObj.fromIndex = this.handler.getCurrentPointIndex() - 1;
            dynamicObj.freehand = true;
            dynamicObj.countSegments++;
        }

        this.measurePartial(point, geometry);
        dynamicObj.drawing = true;
    },

    /**
     * Method: callbackUndo
     */
    callbackUndo: function(point, feature) {
        if (this.layerSegments) {
            var lastSegmentIndex = this.layerSegments.features.length - 1,
                lastSegment = this.layerSegments.features[lastSegmentIndex],
                lastSegmentFromIndex = lastSegment.attributes.from,
                lastPointIndex = this.handler.getCurrentPointIndex();
            var dynamicObj = this.dynamicObj;
            if (lastSegmentFromIndex >= lastPointIndex) {
                this.layerSegments.destroyFeatures(lastSegment);
                lastSegmentIndex--;
                lastSegment = this.layerSegments.features[lastSegmentIndex];
                dynamicObj.fromIndex = lastSegment.attributes.from;
                dynamicObj.countSegments--;
            }
        }
        this.callbackModify(point, feature, true);
    },

    /**
     * Method: callbackRedo
     */
    callbackRedo: function(point, feature) {
        var line = this.handler.line.geometry,
            currIndex = this.handler.getCurrentPointIndex();
        var dynamicObj = this.dynamicObj;
        if (this.layerSegments) {
            this.showLabelSegment(
                this.layerSegments,
                dynamicObj.countSegments - 1,
                dynamicObj.fromIndex,
                line.components.slice(
                    dynamicObj.fromIndex,
                    currIndex
                )
            );
        }
        dynamicObj.fromIndex = this.handler.getCurrentPointIndex() - 1;
        dynamicObj.countSegments++;
        this.callbackModify(point, feature, true);
    },

    /**
     * Method: callbackModify
     */
    callbackModify: function(point, feature, drawing) {
        if (this.immediate) {
            this.measureImmediate(point, feature, drawing);
        }

        var dynamicObj = this.dynamicObj;
        if (dynamicObj.drawing === false) {
           return;
        }

        var line = this.handler.line.geometry,
            currIndex = this.handler.getCurrentPointIndex();
        if (!this.handler.freehandMode(this.handler.evt) &&
                                                          dynamicObj.freehand) {
            // freehand has stopped
            dynamicObj.fromIndex = currIndex - 1;
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
        if (this.isArea) {
            if (this.layerArea) {
                var center = feature.geometry.getBounds().clone();
                center.extend(point);
                center = center.getCenterLonLat();
                this.showLabel(this.layerArea, 0, 0,
                    this.getBestArea(feature.geometry), center.lon, center.lat);
            }
            // segemnt measure
            if (this.layerSegments) {
                var created;
                created = this.showLabelSegment(
                    this.layerSegments, 0, 0,
                    [line.components[0], line.components[currIndex]]
                );
                if (created) {
                    dynamicObj.countSegments++;
                }
            }
        }
        if (this.layerSegments) {
            this.showLabelSegment(
                this.layerSegments,
                dynamicObj.countSegments - 1,
                dynamicObj.fromIndex,
                line.components.slice(dynamicObj.fromIndex, currIndex + 1)
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
    showLabelSegment: function(layer, index, fromIndex, points) {
        var from = points[0],
            to = points[points.length - 1];
        return this.showLabel(layer, index, fromIndex,
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
    showLabel: function(layer, index, fromIndex, measure, x, y) {
        var featureLabel;
        if (layer.features.length <= index) {
            if (measure[0] === 0) {
                return false;
            }
            featureLabel = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.Point(x, y),
                {from: fromIndex}
            );
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
                           Number(measure[0].toPrecision(this.accuracy)), null);
        attributes.units = measure[1];
    },

    CLASS_NAME: 'OpenLayers.Control.DynamicMeasure'
});

/**
 * Constant: OpenLayers.Control.DynamicMeasure.styles
 */
OpenLayers.Control.DynamicMeasure.styles = {
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
        fontSize: '10px',
        fontColor: '#800517',
        fontFamily: 'Verdana',
        fontSize: '11px',
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
        fontSize: '11px',
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
        fontSize: '11px',
        labelOutlineColor: '#dddddd',
        labelAlign: 'cm',
        labelOutlineWidth: 3
    }
};
