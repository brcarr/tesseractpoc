define([
    'framework-core',
    'framework-home',
    './views/mainView',
    './resources'
], function (Core, Home, MainView, Resources) {
    'use strict';

    return Core.Module.extend({
        initialize: function() {
            Home.apps.add(this);
        },
        
        path: 'tesseract',

        icon: 'icon icon-flash',
        //title: 'Tesseract POC',
        title: Resources.get("tesseractPOC.title"),

        routes: {
            '': 'home'
        },

        home: function() {
            if (!this.mainView) {
                this.mainView = new MainView();
                this.mainView.render();
                this.$element.html(this.mainView.$element);                
            }
        }
    });
});