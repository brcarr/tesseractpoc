define(['framework-core', 'template!../../content/tesseractToolbarTemplate', '../renderer'], function (Core, TesseractToolbarTemplate, renderer) {
    'use strict';
    
    return Core.View.extend({
        render: function () {
            renderer.renderToView(this, TesseractToolbarTemplate);
        }
    })
})