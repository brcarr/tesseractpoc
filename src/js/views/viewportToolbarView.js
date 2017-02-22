define(['framework-core', 'template!../../content/viewportToolbarTemplate', '../renderer'], function (Core, ViewportToolbarTemplate, renderer) {
    'use strict';
    
    return Core.View.extend({
        render: function () {
            renderer.renderToView(this, ViewportToolbarTemplate);
            
        }
        
    });
});