define([
    'lodash',
    'jquery',
    'framework-core',
    'framework-controls',
    'lesrdl-framework-capturemanager',
    'lesrdl-content-viewport',
    'lesrdl-content-annotations',
    'lesrdl-content-annotationsviewer',
    './viewportToolbarView',
    'template!../../content/zeroState',
    'template!../../content/viewportTemplate',
    'template!../../content/eventLogTemplate',
    'template!../../content/tesseractViewTemplate',
    'logger',
    '../resources',
    '../renderer',
    '../util'
], function (_, $, Core, Controls, CaptureManager, Viewport, Annotations, AnnotationsViewer, ViewportToolbarView, ZeroStateTemplate, ViewportTemplate, EventLogTemplate, TesseractViewTemplate, Logger, Resources, renderer, Util) {
    'use strict';
    
    return Core.View.extend({
        tagName: 'div',
        className: 'viewport-card-interior',
        domEvents: {
            'click #capture-file-button' : 'onCaptureFile',
            'click #capture-scanner-button' : 'onCaptureScanner',
            'click #clear-button' : 'onClear',
            //'click #annotate-button' : 'onAnnotate',
            'click #ocr-button': 'onLoad'
        },
        
        initialize: function () {
            this.image = {
                url: null,
                filePageNumber: null,
                fileType: null,
                height: null,
                width: null,
                xResolution: 300,
                yResolution: 300,
                orientation: 'TOP_LEFT',
                isPreRotated: true
            };
            
            // Get Annotation Types and Templates from server
            this.annotationTypes = {};
            
            this.annotationTemplates = {};
            
            var annotationTemplates = new Annotations.Models.TemplateResultSetIntegrationServer();
            annotationTemplates.fetch({
                error: function () {
                    console.log('Error retrieving templates!');
                },

                success: function (resultSet) {
                    this.annotationTemplates = annotationTemplates;
                }.bind(this)
            });
            
            
            this.viewportToolbar = new ViewportToolbarView();

            /*this.viewport = new Viewport.ImageView({
                showToolbar: true
            });*/
            
            this.captureManager = new CaptureManager.Manager();
            
            // Set up event logging
            this.eventLog = '';
            this.eventCount = 0;
            var me = this;
            
            /*_.each(Viewport.Event, function (event) {
                me.listenTo(this.viewport, event, _.bind(me.onEvent, me, event));
            }.bind(this));*/
            
        },
        
        onZoom: function () {
            this.annotationViewerSize = this.getViewerSize();
            
            this.trigger('zoomChanged', this.annotationViewerSize);
        },
        
        onLoad: function () {
            // Here is where I need to trigger an event and pass the imageSrc, then listen for that event in tesseractView then make the appropriate calls.
            this.annotationViewerSize = this.getViewerSize();
            
            this.trigger('imageLoaded', this);
            
        },
        
        getViewerSize: function () {
            var viewerSize = {
                width: this.$('.annotation-container-view').width(),
                height: this.$('.annotation-container-view').height()
            };
            /*this.annotationViewerSize = {
            };*/
            return viewerSize;
        },
        
        onAnnotate: function () {
            Logger.log('Tesseract is temporarily disabled', Logger.WARNING, Logger.GENERAL);
            
            var orgCoordinates = {
                location: {
                    startPoint: {
                        x: 211,
                        y: 139
                    },
                    endPoint: {
                        x: 389,
                        y: 188
                    }
                }
            };
            
            var annotationViewerSize = {
                width: this.$('.annotation-container-view').width(),
                height: this.$('.annotation-container-view').height()
            };
            
            var imageSize = {
                width: this.image.width,
                height: this.image.height
            };
            console.log(imageSize);
            
            var newCoordinates = {
                location: {
                    startPoint: {
                        x: (orgCoordinates.location.startPoint.x * annotationViewerSize.width) / imageSize.width,
                        y: (orgCoordinates.location.startPoint.y * annotationViewerSize.height) / imageSize.height
                    },
                    endPoint: {
                        x: (orgCoordinates.location.endPoint.x * annotationViewerSize.width) / imageSize.width,
                        y: (orgCoordinates.location.endPoint.y * annotationViewerSize.height) / imageSize.height
                    }
                }
            }
            
            Logger.log('Drawing highlight at: ' + newCoordinates.location.startPoint.x + ', ' + newCoordinates.location.startPoint.y, Logger.INFO, Logger.GENERAL);
            this.annotationsViewer.createAnnotation('highlight', '321YY3S_000005PQB000009', newCoordinates);
        },
        
        onClear: function () {
            this.imageControls = null;
            this.render();            
            
            this.trigger('clearSelected');
            document.getElementById('clear-button').style.visibility = 'hidden';
        },        
       
        onCapture: function (data) {
            //this.viewport.setSource(null);
            this.annotationsView = null;
            this.captureManager.capture({
                source: data,
                fileTypes: ['image/png', 'image/jpg']
            }).then(function(images) {
                images[0].getWidthHeight()
                    .then(function (i) {
                    //console.log(i);
                    this.image.height = i.height;
                    this.image.width = i.width;
                }.bind(this));
                images[0].getImageAsUrl()
                    .then(function (img) {
                    this.image.url = img.url;
                    this.image.imageSource = img.url;
                    this.image.fileType = Util.parseImageFileType(img.extension);
                    //Sthis.viewport.setSource(img.url);
                    document.getElementById('clear-button').style.visibility = 'visible';
                    //document.getElementById('annotate-button').style.visibility = 'visible';
                    document.getElementById('ocr-button').style.visibility = 'visible';
                    
                    this.loadAnnotationViewer();
                    
                }.bind(this))
                .catch(function (err) {
                    Logger.log(err, Logger.ERROR, Logger.GENERAL);
                    return;
                });
            }.bind(this));
        },
        
        loadAnnotationViewer: function () {
            this.image.filePageNumber = 1;
            this.image.orientation = Util.parseOrientationType(this.image.orientation);
            
            if (this.image.url) {
                this.imageSource = this.image.url;
            } else {
                this.imageSource = null;
            }
            
            var annotationTemplatePromise = this.getAnnotationTemplates();
            var annotationsPromise = this.requestAnnotations();
            
            annotationTemplatePromise.then(function (annotationTemplates) {
                //this.annotationTemplates = annotationTemplates;
                console.log('fulfill getAnnotationTempaltes promise');
            }.bind(this))
            .catch(function (error) {
                console.log(error);
            });
            
            annotationsPromise.then(function (annotationsInfo) {
                this.annotationsInfo = annotationsInfo;                
            }.bind(this))
            .catch(function (error) {
                console.log(error);
            });            
            
            Promise.all([annotationTemplatePromise, annotationsPromise]).then(function () {
                var annotationsViewerPromise = this.annotationsViewerRender();
            
                annotationsViewerPromise.then(function (annotationsViewer) {
                    console.log('fulfill annotationsViewer promise');
                }.bind(this))
                .catch(function (error) {
                    console.log(error);
                });
                
                /*Promise.all([annotationsViewerPromise]).then(function () {
                    //this.onLoad();
                }.bind(this));*/
                
            }.bind(this));
        },
        
        annotationsViewerRender: function () {
            var promise = new Promise(function (resolve, reject) {
                this.annotationsInfo.templates = this.annotationTemplates;
                this.annotationsInfo.imageInformation = this.image;
                
                this.annotationsViewer = new AnnotationsViewer.ContentAnnotationsView({
                    imageSource: this.imageSource,
                    annotationsInfo: this.annotationsInfo
                });
                
                this.annotationsViewer.render();
                this.$('.viewport-view-container').html(this.annotationsViewer.getElement());
                
                if (!this.imageControls) {
                    this.$('.image-controls').append(this.annotationsViewer.getImageControls().element);
                    this.imageControls = true;
                }

                this.listenTo(this.annotationsViewer, AnnotationsViewer.Events.ANNOTATION_EVENT, function (eventInfo) {
                    console.log(eventInfo.annotationEvent + '\n' + eventInfo.eventArguments);
                });
                
                //this.listenTo(this.annotationsViewer, AnnotationsViewer.Events.IMAGE_ZOOM_CHANGED, function (eventInfo) {
                this.listenTo(this.annotationsViewer, AnnotationsViewer.Events.VIEWPORT_EVENT, function (eventInfo) {
                    if (eventInfo.viewportEvent === "lesrdl-content-viewport:imageZoomChanged") {
                        this.onZoom();
                    }
                });
                
                resolve(this.annotationsViewer);
            }.bind(this));
            
            return promise;
        },
        
        clearAnnotationViewer: function () {
            this.annotationsViewer = null;
            this.$('.image-controls').empty();
            this.imageControls = null;
            
            var annotationsViewerPromise = this.annotationsViewerRender();
            
            annotationsViewerPromise.then(function (annotationsViewer) {
                console.log('fulfill annotationsViewer promise');
                this.annotationViewerSize = this.getViewerSize();
            }.bind(this))
            .catch(function (error) {
                console.log(error);
            });
            
        },
        
        requestAnnotations: function () {
            var sampleViewer = this;
            var promise = new Promise(function (resolve, reject) {
                this.annotationResults = new Annotations.Models.ResultSetIntegrationServer(null, { docID: 'blah', pageID: 'blah' });
                this.annotationResults.fetch({
                    error: function () {
                        //reject('Annotation retrieval error');   
                    }
                });
                
                //debugger;
                var annotationsInfo = {
                    views: this.annotationResults.getSupportedViews(),
                    results: this.annotationResults,
                    templates: this.annotationTemplates,
                    //imageInformation: imageInfo,
                    getTransform: '',
                    newAnnotationExtendedOptions: function() {
                        return { docID: 'blah', pageID: 'blah' };
                    }.bind(this),
                    externalDisplay: false
                };

                resolve(annotationsInfo);
                
            }.bind(this));

            return promise;
        },
        
        getAnnotationTemplates: function () {
            var promise = new Promise(function (resolve, reject) {
                resolve('hello world');
            })
            
            return promise;
            
        },
                
        getSource: function () {
            var test = this.captureManager.getSourceList();
            test.forEach(function (e) {
                if (e.name === "Scanner") {
                    this.scannerSource = e;
                } else if (e.name === "File") {
                    this.fileSource = e;
                }
            }.bind(this));
        },
        
        onCaptureFile: function () {
            //this.viewport.setSource(null);
            this.getSource();
            this.onCapture(this.fileSource);
        },
        
        onCaptureScanner: function () {
            //this.viewport.setSource(null);
            this.getSource();
            this.onCapture(this.scannerSource);
        },
        
        render: function () {
            if (this.rendered){
                return;
            }
            
            renderer.renderToView(this, ViewportTemplate);
            
            this.viewportToolbar.render();
            this.$('.viewport-toolbar').html(this.viewportToolbar.$element);
            
            //this.loadAnnotationViewer();
                        
            //this.$('.viewport-view-container').append(this.viewport.$element);   
            this.$('.viewport-view-container').append(ZeroStateTemplate.render());   
            //this.element.innerHTML = ZeroStateTemplate.render();   
        }
    });
});