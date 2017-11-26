/*
 *
 * Copyright (c) 2017 Jan Pieter Posthuma / DataScenarios
 * 
 * All rights reserved.
 * 
 * MIT License.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    "use strict";
    import DataViewObjectsParser = powerbi.extensibility.utils.dataview.DataViewObjectsParser;

    export class Settings extends DataViewObjectsParser {
        public general: GeneralSettings = new GeneralSettings();
        public margin: MarginSettings = new MarginSettings();
        public colors: ColorSettings = new ColorSettings();
    }

    export class GeneralSettings {
        public js: string = "";
        public css: string = "";

        public iFrame: string = `<iframe id="d3js-sandbox" class="d3js-sandbox" width="#width" height="#height" style="width:#widthpx;height:#heightpx;margin-top:#toppx;margin-left:#leftpx" src="data:text/html,#src" sandbox="allow-scripts"></iframe>`
        public d3Document: string = `<html><head><script src='https://d3js.org/d3.v3.min.js'></script><style id='d3js-css'>#style</style><script>window.addEventListener('message', function (e) {var mainWindow=e.source;try {document.getElementById('chart').innerHTML="";eval(e.data);} catch (ex) {console.log('D3js code threw an exception: ' + ex);} mainWindow.postMessage("",e.origin);});</script></head><body style="margin:0px;"><svg class="chart" id="chart"></svg></body></html>`
        public d3SVG: string = `<svg class="chart" id="chart"></svg>`
        public d3CSS: string = `<style>#style</style>`
        public d3jsError: string = `<div class="d3jsError">#error</div>`
    }

    export class MarginSettings {
        public top: number = 2;
        public bottom: number = 2;
        public left: number = 2;
        public right: number = 2;
    }

    export class ColorSettings {
        public color1: string = "";
        public color2: string = "";
        public color3: string = "";
        public color4: string = "";
        public color5: string = "";
        public color6: string = "";
        public color7: string = "";
        public color8: string = "";
    }
}
