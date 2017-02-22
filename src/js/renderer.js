define(['lodash', './resources'], function(_, Resources) {
    'use strict';

    return {
        renderToView: function (view, Template, data, options) {
            options = options || {};
            options.helpers = _.extend({
                i18n: function (key, options) {
                    return Resources.get(key, options.hash);
                }
            }, options && options.helpers);

            Template.renderToView(view, data, options);
        }
    };
});