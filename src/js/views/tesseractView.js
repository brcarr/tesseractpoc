define([
    'jquery',
    'framework-core',
    'framework-controls',
    './tesseractToolbarView',
    'logger',
    '../lib/tesseract',
    'clipboard/dist/clipboard.min',
    'autosize/dist/autosize.min',
    'https://code.responsivevoice.org/responsivevoice.js',
    'template!../../content/tesseractViewTemplate',
    'template!../../content/tesseractToolbarTemplate',
    '../resources',
    '../renderer'
], function ($, Core, Controls, TesseractToolbar, Logger, Tesseract, Clipboard, Autosize, ResponsiveVoice, TesseractViewTemplate, TesseractToolbarTemplate, Resources, renderer) {
    'use strict';
    
    return Core.View.extend({
        tagName: 'div',
        className: 'tesseract-card-interior',
        domEvents: {
            'click #search-button': function () {
                var searchText = $('#search-input');
                this.ocrSearch(searchText.val());
            },
            'click #clear-results-button': 'onClearResults'
        },
        
        initialize: function () {
            this.state = {
                image: null,
                results: null,
                error: null,
                words: '',
                annotationViewerSize: null
            }
            
            this.tessearctToolbar = new TesseractToolbar();
            
            //this.clipboard = new Clipboard('#copy-button');
            var path = "tesseractPOC.tesseractView.tesseractStates.";
            this.tesseractStates = [
                {name: 'loadingCore', messageStatus: 'loading tesseract core', elementId: 'loading-tesseract-core', label: Resources.get(path + 'loadingCore')},
                {name: 'initializingTesseract', messageStatus: 'initializing tesseract', elementId: 'initializing-tesseract', label: Resources.get(path + 'initializingTesseract')},
                {name: 'initializingApi', messageStatus: 'initializing api', elementId: 'initializing-api', label: Resources.get(path + 'initializingApi')},
                {name: 'recognizingText', messageStatus: 'recognizing text', elementId: 'recognizing-text', label: Resources.get(path + 'recognizingText')}
            ];
            
            // Initialize function to copy Tesseract results to the clipboard
            this.clipboard = new Clipboard('.clipboard-btn');
            this.clipboard.on('success', function (e) {
                e.clearSelection();
                var alert = new Controls.Alert({
                    style: 'floating',
                    content: 'The Tesseract results were copied to the clipboard',
                    type: 'success',
                    displayTimeout: 5000,
                    undoLinkText: ''
                });                
                document.getElementById('tesseract-info').appendChild(alert.getElement());
                alert.show();
                Logger.log('The Tesseract results were copied to the clipboard', Logger.VERBOSE, Logger.GENERAL);
            });
            
            this.clipboard.on('error', function (e) {
                var alert = new Controls.Alert({
                    style: 'floating',
                    content: 'There was an error copying the Tesseract results to clipboard',
                    type: 'error',
                    displayTimeout: 5000,
                    undoLinkText: ''
                });
                
                document.getElementById('tesseract-info').appendChild(alert.getElement());
                alert.show();
                Logger.log('There was an error copying the Tesseract results to clipboard', Logger.WARNING, Logger.GENERAL);
            });
        },
        
        onClearResults: function () {
            this.state.annotationsViewer = null;
            var tesseractResults = document.getElementById('tesseract-results-text');
            tesseractResults.childNodes.forEach(function (node) {
                if (node.className === 'wordClass highlight') {
                    node.className = 'wordClass';
                }
            });
            this.trigger('clearResults');
        },
        
        ocrSearch: function (data) {
            console.log(data);
            var texts = this.state.words;
            var string = texts.map(function(item){return item.text}).join(' ')
            var searchTerm = data;
            var resultIndex = string.indexOf(searchTerm)
            var position = 0
            var matchTexts = []
            for(var x = 0; x < texts.length; x++) {
                position+=texts[x].text.length;
                var after = position >= resultIndex
                var tooFar = position > resultIndex+searchTerm.replace(' ', '').length
                if(after && !tooFar) {
                    texts[x].wordIndex = x;
                    matchTexts.push(texts[x]);
                }
                if(tooFar) break;
            }
            //document.body.append(JSON.stringify(matchTexts))
            console.log(matchTexts);
            
            this.highlightResults(matchTexts);
            
        },
        
        highlightResults: function (data) {
            data.forEach(function (e) {
                var highlightIndex = e.wordIndex;
                var divToHighlight = document.getElementById(highlightIndex);
                
                divToHighlight.className += " highlight";
                
                this.renderAnnotation(e);
            }.bind(this));
        },
        
        setAnnotationViewerSize: function (data) {
            this.state.annotationViewerSize = data;
            console.log(this.state.annotationViewerSize);
        },
        
        loadImage: function (data) {
            this.image = data.image;
            this.state = {
                results: null,
                error: null,
                words: null,
                annotationTypes: data.annotationTypes,
                annotationTemplates: data.annotationTemplates,
                annotationsViewer: data.annotationsViewer,
                annotationViewerSize: data.annotationViewerSize
            };
            
            this.renderingIndicator = null;
            
            // Run the Tesseract Job
            this.tesseractJob = Tesseract.recognize(this.image.url);

            // Clear out previous results
            var message = '';
            this.clearResults(message);
            
            // Create a new progress indicator for each Tesseract state
            this.tesseractStates.forEach(function (e, i) {
                e.progressIndicator = new Controls.ProgressIndicator ({
                    style: 'bar',
                    states: [
                        {progress: 0, foregroundColor: '#5a5a64'},  // For values [0, 50)
                        {progress: 50, foregroundColor: '#faa519'}, // For values [50, 80)
                        {progress: 80, foregroundColor: '#00c425'}  // For values [80, maxValue]
                    ]
                });
            }.bind(this));
            
            //Update progress indicators while the job is processing
            this.tesseractJob.progress(function (message) {
                // As Tesseract progresses, update html elements with label and progress indicator
                this.tesseractStates.forEach(function (e, i) {
                    if (message.status === e.messageStatus) {
                        var indicator = document.getElementById(this.tesseractStates[i].elementId);
                        indicator.className = 'bar animated slideInUp';
                        indicator.innerHTML = e.label;
                        indicator.append(e.progressIndicator.getElement());
                        e.progressIndicator.setValue(message.progress * 100);
                    }
                    
                    if (message.status === 'recognizing text' && message.progress === 1) {
                        this.clearProgressIndicators();
                        if (!this.renderingIndicator) {
                            this.renderingIndicator = Controls.ProgressIndicator.show({
                                parent: document.getElementById('tesseract-info'),
                                isModal: true,
                                size: 64
                            });
                        }
                    }
                }.bind(this));
            }.bind(this));
            
            this.tesseractJob.catch(function (err) {
                this.state.error = err.text;
                Logger.log('Tesseract has encountered the following error:' + err.text, Logger.ERROR, Logger.GENERAL);
                document.getElementById('tesseract-progress').innerHTML = '';
                document.getElementById('tesseract-error').innerHTML = this.state.error;
            }.bind(this));
            
            this.tesseractJob.then(function (result) {
                // Clear out the progrss indicators
                this.clearProgressIndicators();
                
                if (this.renderingIndicator) {
                    this.renderingIndicator.close();     
                }
                // Log the success of the Tesseract Job
                Logger.log('Tesseract has completed processing the image with an overall confidence of ' + result.confidence + '%', Logger.INFO, Logger.GENERAL);
                
                this.state.results = result.text;
                this.state.words = result.words;
                
                this.renderToDivs();
            }.bind(this));            
        },
        
        getCoordinates: function (data) {
            var word = {
                location: {
                    startPoint: {
                        x: Number(data.bbox.x0 * this.state.annotationViewerSize.width / this.image.width),
                        y: Number(data.bbox.y0 * this.state.annotationViewerSize.height / this.image.height)
                    },
                    endPoint: {
                        x: Number(data.bbox.x1 * this.state.annotationViewerSize.width /this.image.width),
                        y: Number(data.bbox.y1 * this.state.annotationViewerSize.height / this.image.height)
                    }
                },
                content: data.text
            };
            
            return word;
        },
        
        renderToDivs: function () {
            Logger.log('Rendering Tesseract results into divs', Logger.INFO, Logger.GENERAL);
            var tesseractResults = document.getElementById('tesseract-results-text');
            //tesseractResults.innerHTML = this.state.results;
            
            this.renderResults();
            
            var words = this.state.words;
            words.forEach(function(word, i) {
                var wordDiv = document.createElement('div');
                wordDiv.className = "wordClass";
                wordDiv.id = i;
                //var wordText = document.createTextNode(word.content);
                var wordText = document.createTextNode(word.text);
                wordDiv.appendChild(wordText);
                tesseractResults.appendChild(wordDiv);
                
                wordDiv.addEventListener('click', function() {
                    console.log(wordText);
                    wordDiv.className += " highlight";
                    this.renderAnnotation(word);
                }.bind(this));
            }.bind(this));
            
        },
        
        renderAnnotation: function (data) {
            var coordinates = this.getCoordinates(data);
            this.state.annotationsViewer.createAnnotation('highlight', '321YY3S_000005PQB000009', coordinates);
        },
        
        renderResults: function () {
            // Render the Tesseract results
            var tesseractToolbar = document.getElementById('tesseract-toolbar');
            
            //tesseractToolbar.innerHTML = TesseractToolbarTemplate.render();
            this.tessearctToolbar.render();
            this.$('#tesseract-toolbar').html(this.tessearctToolbar.$element);
            document.getElementById('tesseract-info').style.padding = '10px 0';
            document.getElementById('tesseract-toolbar').style.padding = '0 0 10px 0';
            
            document.getElementById('play-button').disabled = false;
            document.getElementById('resume-button').disabled = true;
            document.getElementById('pause-button').disabled = true;
            document.getElementById('stop-button').disabled = true;
            tesseractToolbar.className = 'animated fadeIn';

            /*var tesseractResults = document.getElementById('tesseract-results-text');
            tesseractResults.innerHTML = this.state.results;
            tesseractResults.value = this.state.results;
            tesseractResults.className = 'animated slideInUp';  */              

            // Listen for clicks on Tesseract toolbar buttons
            this.$element.find('#reload-button').on('click', this.onReload.bind(this));
            this.$element.find('#play-button').on('click', this.onPlay.bind(this));
            this.$element.find('#resume-button').on('click', this.onResume.bind(this));
            this.$element.find('#pause-button').on('click', this.onPause.bind(this));
            this.$element.find('#stop-button').on('click', this.onStop.bind(this));

            this.playButton = document.getElementById('play-button');
            this.resumeButton = document.getElementById('resume-button');
            this.pauseButton = document.getElementById('pause-button');
            this.stopButton = document.getElementById('stop-button');
        },
        
        onPlay: function () {
            if (!responsiveVoice.isPlaying()) {
                responsiveVoice.speak(this.state.results, "US English Female", {
                    onend: function () {
                        this.playButton.disabled = false;
                        this.resumeButton.disabled = true;
                        this.pauseButton.disabled = true;
                        this.stopButton.disabled = true;
                    }.bind(this)
                });
                this.playButton.disabled = true;
                this.resumeButton.disabled = true;
                this.pauseButton.disabled = false;
                this.stopButton.disabled = false;
            } else {
                return;
            }
        },
        
        onResume: function () {
            if (responsiveVoice.isPlaying()) {
                responsiveVoice.resume();
                this.playButton.disabled = true;
                this.resumeButton.disabled = true;
                this.pauseButton.disabled = false;
                this.stopButton.disabled = false;
            } else {
                return;
            }
        },
        
        onPause: function () {
            if (responsiveVoice.isPlaying()) {
                responsiveVoice.pause();
                this.playButton.disabled = true;
                this.resumeButton.disabled = false;
                this.pauseButton.disabled = true;
                this.stopButton.disabled = false;
            } else {
                return;
            }
        },        
        
        onStop: function() {
            if (responsiveVoice.isPlaying()) {
                responsiveVoice.cancel();
                this.playButton.disabled = false;
                this.resumeButton.disabled = true;
                this.pauseButton.disabled = true;
                this.stopButton.disabled = true;
            } else {
                return;
            }
        },
        
        onReload: function () {
            this.loadImage(this);
        },
        
        clearProgressIndicators: function () {
            //document.getElementById('tesseract-results').style.visibility = 'hidden';
            this.tesseractStates.forEach(function (e, i) {
                var indicator = document.getElementById(e.elementId);
                indicator.className = '';
                indicator.innerHTML = '';
            }.bind(this));
            document.getElementById('tesseract-info').style.padding = '0';
            document.getElementById('tesseract-toolbar').style.padding = '0';
        },
        
        clearResults: function (message) {
            document.getElementById('tesseract-message').innerHTML = message;
            if (document.getElementById('tesseract-results-text')) {
                var tesseractToolbar = document.getElementById('tesseract-toolbar');
                tesseractToolbar.innerHTML = '';
                tesseractToolbar.className = '';
                var tesseractResults = document.getElementById('tesseract-results-text');
                tesseractResults.innerHTML = '';
                tesseractResults.className = '';    
            }
        },
        
        render: function (message) {
            if (this.rendered) {
                return;
            }
            renderer.renderToView(this, TesseractViewTemplate);
            this.rendered = true;
        }
    });
});