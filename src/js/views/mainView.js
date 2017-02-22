define([
    'framework-core',
    'framework-controls',
    'template!../../content/mainViewTemplate',
    './viewportView',
    './tesseractView',
    '../renderer'
], function (Core, Controls, MainViewTemplate, ViewportView, TesseractView, renderer) {
    'use strict';
    
    return Core.View.extend({
        //tagName: 'div',
        //className: 'main-view',
        domEvents: {},
        
        initialize: function () {
            this.state = {
                progressIndicator: null,
                isImage: null,
                image: null
            };
            
            this.viewportView = new ViewportView();
            this.tesseractView = new TesseractView();
            
            // create listener for 'imageLoaded' event and call Tesseract
            this.listenTo(this.viewportView, 'imageLoaded', function (data) {
                //this.state = data.state;
                this.tesseractView.loadImage(data);
            }.bind(this));
            
            this.listenTo(this.viewportView, 'clearSelected', function () {
                var message = 'The Tesseract results will be displayed here.'
                this.tesseractView.clearResults(message)
            });
            
            this.listenTo(this.viewportView, 'zoomChanged', function (data) {
                var viewerSize = data;
                this.tesseractView.setAnnotationViewerSize(viewerSize);
            });
            
            this.listenTo(this.tesseractView, 'clearResults', function () {
                console.log('Main - clear the results');
                this.viewportView.clearAnnotationViewer();
            });
        },
        
        render: function () {
            //MainViewTemplate.renderToView(this);
            
            // Adding 'renderer' support for i18n
            renderer.renderToView(this, MainViewTemplate);
            
            this.viewportView.render();
            this.tesseractView.render();
            this.$('.viewport-card').html(this.viewportView.$element);
            this.$('.tesseract-card').html(this.tesseractView.$element);
        }
    });
});