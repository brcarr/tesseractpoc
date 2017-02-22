define([], function () {
    'use strict';

return {
        parseOrientationType: function (str) {
            var orientationType = 0;
            switch (str) {
                case 'TOP_LEFT':
                    orientationType = 1;
                    break;
                case 'BOTTOM_RIGHT':
                    orientationType = 2;
                    break;
                case 'RIGHT_TOP':
                    orientationType = 3;
                    break;
                case 'LEFT_BOTTOM':
                    orientationType = 4;
                    break;
            }
            return orientationType;
        },

        parseImageFileType: function (str) {
            var imgFileType = 0;
            switch (str) {
                case 'TIFF':
                    imgFileType = 1;
                    break;
                case 'Bitmap':
                    imgFileType = 2;
                    break;
                case 'PNG Image':
                    imgFileType = 3;
                    break;
                case 'png':
                    imgFileType = 3;
                    break;
                case 'GIF Image':
                    imgFileType = 4;
                    break;
                case 'JPEG':
                    imgFileType = 5;
                    break;
            }
            return imgFileType;
        },

        convertFromArrayBufferToBase64: function (buffer) {
            var binary = '';
            var bytes = new Uint8Array(buffer);
            var len = bytes.byteLength;
            for (var i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        },
    };
});