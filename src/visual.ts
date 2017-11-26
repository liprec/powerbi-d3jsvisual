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
    // untils.interactivity
    import ISelectionHandler = powerbi.extensibility.utils.interactivity.ISelectionHandler;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
    import createInteractivityService = powerbi.extensibility.utils.interactivity.createInteractivityService;
    // utils.svg
    import ClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.ClassAndSelector;
    import createClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.createClassAndSelector;
    import PixelConverter = powerbi.extensibility.utils.type.PixelConverter;
    // d3
    import Selection = d3.Selection;
    
    import MessageBoxType = powerbi.extensibility.utils.MessageBox.MessageBoxType;
    import MessageBoxOptions = powerbi.extensibility.utils.MessageBox.MessageBoxOptions;
    import MessageBox = powerbi.extensibility.utils.MessageBox;

    let visualProperties = {
        d3jsJs: <DataViewObjectPropertyIdentifier>{ objectName: "general", propertyName: "js" },
        d3jsCss: <DataViewObjectPropertyIdentifier>{ objectName: "general", propertyName: "css" },
    }

    export enum D3JSVisualType {
        Js,
        Css,
        Object
    }

    export interface D3JSDataObjects {
        dataObjects: D3JSDataObject[]
    }

    export interface D3JSDataObject {
        columnName : string,
        values: PrimitiveValue[]
    }

    // Types are not updated yet, so manual override
    export interface CompileOutput extends UglifyJS.MinifyOutput {
        error: CompileError;
    }

    export interface CompileError {
        col: number;
        line: number;
        pos: number;
        filename: string;
        message: string;
        stack: string;
    }

    export class D3JSVisual implements IVisual {
        private target: HTMLElement;
        private settings: Settings;
        private host: IVisualHost;
        private telemetry: ITelemetryService;
        private selectionHandler: ISelectionHandler;
        private interactivityService: IInteractivityService;
        private viewport: IViewport;
        private data: D3JSDataObjects;
        private colorPalette: IColorPalette;
        private editContainer: Selection<any>;
        private d3Container: Selection<any>;
        private d3jsFrame: Selection<any>;
        private editor: CodeMirror.EditorFromTextArea;
        private messageBox: Selection<any>;
        private open: D3JSVisualType;
        private isSaved: boolean = true;
        private reload: boolean = false;
        private renderTimeoutId: number;

        private saveWarning: MessageBoxOptions;
        private hideMessageBox: MessageBoxOptions;

        private static EditContainer: ClassAndSelector = createClassAndSelector("editContainer");
        private static D3Container: ClassAndSelector = createClassAndSelector("d3Container");
        private static EditorHeader: ClassAndSelector = createClassAndSelector("editorHeader");
        private static MessageBox: ClassAndSelector = createClassAndSelector("messageBox");
        private static Icon: ClassAndSelector = createClassAndSelector("icon");
        private static New: ClassAndSelector = createClassAndSelector("new");
        private static Save: ClassAndSelector = createClassAndSelector("save");
        private static Reload: ClassAndSelector = createClassAndSelector("reload");
        private static Js: ClassAndSelector = createClassAndSelector("js");
        private static Css: ClassAndSelector = createClassAndSelector("css");
        private static Object: ClassAndSelector = createClassAndSelector("object");
        private static Space: ClassAndSelector = createClassAndSelector("space");
        private static Parse: ClassAndSelector = createClassAndSelector("parse");
        private static Help: ClassAndSelector = createClassAndSelector("help");
        private static D3jsLogo: ClassAndSelector = createClassAndSelector("d3jslogo");
        private static D3jsFrame: ClassAndSelector = createClassAndSelector("d3jsframe");

        // Trace messages
        private traceEvents = {
            init: 'Init method',
            update: 'Update method',
            render: 'Render method'
        }

        // MDL icons
        private IconSet = {
            new: `<svg viewBox="0 0 16 16"><path d="M14 10.5v2h2v1h-2v2h-1v-2h-2v-1h2v-2h1zM10 11.5v2h-2v-13h3v11h-1zM4 13.5v-9h3v9h-3zM0 13.5v-5h3v5h-3zM12 9.5v-5h3v5h-3z"></path></svg>`,
            save: `<svg viewBox="0 0 16 16"><path d="M1.992 1h12q0.406 0 0.711 0.289 0.289 0.305 0.289 0.711v13h-12.211l-1.789-1.797v-11.203q-0.008-0.406 0.289-0.703t0.711-0.297zM10.992 14h3v-12h-1v6h-10v-6h-1v10.789l1.203 1.211h0.797v-4h7v4zM11.992 2h-8v5h8v-5zM6.992 14h3v-3h-5v3h1v-2h1v2z"></path></svg>`,
            reload: `<svg viewBox="0 0 16 16"><path d="M16 7.875q0 2.281-1.078 4.133t-2.914 2.922-4.008 1.070-4.016-1.070-2.914-2.914-1.070-4.023 1.109-4.055 3.031-2.938h-2.141v-1h4v4h-1v-2.32q-1.844 0.891-2.922 2.602t-1.078 3.656q0 1.938 0.938 3.547t2.547 2.563 3.508 0.953 3.523-0.961 2.547-2.539q0.938-1.578 0.938-3.5 0-2.344-1.438-4.234t-3.695-2.508l0.266-0.961q1.273 0.344 2.359 1.086t1.867 1.773 1.211 2.273 0.43 2.445z"></path></svg>`,
            js: `<svg viewBox="0 0 16 16"><path d="M16 4.422q0 1.953-1.328 3.266t-3.172 1.313q-0.336 0-0.727-0.063l-6.297 6.297q-0.766 0.766-1.859 0.766t-1.844-0.773q-0.773-0.758-0.773-1.852t0.766-1.852l6.297-6.297q-0.063-0.398-0.063-0.867 0-1.070 0.617-2.125 0.961-1.609 2.117-1.922t1.844-0.313 1.289 0.219 1.414 0.703l-3.078 3.078 0.797 0.797 3.078-3.078q0.484 0.813 0.703 1.414t0.219 1.289zM11.641 8q0.563 0 1.203-0.273t1.125-0.758q1.031-1.031 1.031-2.469 0-0.578-0.188-1.102l-2.813 2.805-2.203-2.203 2.805-2.813q-0.531-0.188-1.172-0.188-0.633 0-1.273 0.273t-1.125 0.758q-1.031 1.031-1.031 2.469 0 0.422 0.156 1.047l-6.68 6.688q-0.477 0.469-0.477 1.141t0.477 1.148 1.148 0.477 1.141-0.477l6.688-6.68q0.625 0.156 1.188 0.156z"></path></svg>`,
            css: `<svg viewBox="0 0 16 16"><path d="M4.5 3q1.359 0 2.5 0.758v-2.758h9v9h-3.273l2.891 5h-10.969l2.086-3.617q-1.063 0.617-2.109 0.617t-1.859-0.344-1.445-0.977q-0.633-0.625-0.977-1.445-0.344-0.813-0.344-2.203t1.32-2.711 3.18-1.32zM15 9v-7h-7v2.711q0.984 1.211 1 2.758l1.133-1.969 2.016 3.5h2.852zM8 7.5q0-1.43-1.023-2.469-1.039-1.031-2.477-1.031t-2.469 1.031-1.031 2.477 1.023 2.469 2.477 1.023 2.477-1.031q1.023-1.039 1.023-2.469zM8.258 10.75q-1.055 1.836-1.875 3.25h7.5q-0.82-1.414-1.875-3.25t-1.875-3.25q-0.82 1.414-1.875 3.25z"></path></svg>`,
            help: `<svg viewBox="0 0 16 16"><path d="M7.492 0q1.867 0 3.18 1.313t1.32 3.055q0.008 1.734-0.758 2.563t-1.242 1.273l-0.164 0.148q-0.875 0.828-1.195 1.266-0.641 0.883-0.641 1.883v1.5h-1v-1.5q0-1.617 0.758-2.43t1.242-1.266l0.117-0.109q0.922-0.859 1.242-1.305 0.641-0.898 0.641-1.75-0.008-0.852-0.273-1.492-0.266-0.648-1.016-1.398t-2.203-0.75-2.484 1.031-1.023 2.469h-1q0.008-1.844 1.32-3.172t3.18-1.328zM7.992 16h-1v-1h1v1z"></path></svg>`,
            space: `<svg viewBox="0 0 4 16"><path d="M3.429 11.143v1.714q0 0.357-0.25 0.607t-0.607 0.25h-1.714q-0.357 0-0.607-0.25t-0.25-0.607v-1.714q0-0.357 0.25-0.607t0.607-0.25h1.714q0.357 0 0.607 0.25t0.25 0.607zM3.429 6.571v1.714q0 0.357-0.25 0.607t-0.607 0.25h-1.714q-0.357 0-0.607-0.25t-0.25-0.607v-1.714q0-0.357 0.25-0.607t0.607-0.25h1.714q0.357 0 0.607 0.25t0.25 0.607zM3.429 2v1.714q0 0.357-0.25 0.607t-0.607 0.25h-1.714q-0.357 0-0.607-0.25t-0.25-0.607v-1.714q0-0.357 0.25-0.607t0.607-0.25h1.714q0.357 0 0.607 0.25t0.25 0.607z"></path></svg>`,
            object: `<svg viewBox="0 0 16 16"><path d="M12 13.93l2.992-1.5v-4.375l-2.992 1.492v4.383zM8.008 8.055l-0.008 4.383 3 1.492v-4.383zM5 10.43l2.008-0.992v-2.5l0.992-0.492-0.008-1.891-2.992 1.492v4.383zM1.008 4.555l-0.008 4.383 3 1.492v-4.383zM7.375 3.742l-2.875-1.43-2.875 1.43 2.875 1.438zM14.375 7.242l-2.875-1.43-2.875 1.43 2.875 1.438zM11.5 4.688l4.492 2.25v6.109l-4.492 2.25-4.5-2.234v-2.508l-2.5 1.242-4.5-2.234 0.008-6.125 4.492-2.25 4.492 2.25 0.008 2.508z"></path></svg>`,
            parse: `<svg viewBox="0 0 16 16"><path d="M5 2.922v10.156l7.258-5.078zM4 1l10 7-10 7v-14z"></path></svg>`,
            d3js: `<svg width="#widthpx" viewBox="0 0 256 243" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient x1="-82.6367258%" y1="-92.819878%" x2="103.767353%" y2="106.041826%" id="linearGradient-1">
                    <stop stop-color="#F9A03C" offset="0%"></stop>
                    <stop stop-color="#F7974E" offset="100%"></stop>
                </linearGradient>
                <linearGradient x1="-258.923825%" y1="-248.970263%" x2="97.6202479%" y2="98.7684937%" id="linearGradient-2">
                    <stop stop-color="#F9A03C" offset="0%"></stop>
                    <stop stop-color="#F7974E" offset="100%"></stop>
                </linearGradient>
                <linearGradient x1="-223.162629%" y1="-261.967947%" x2="94.0283377%" y2="101.690818%" id="linearGradient-3">
                    <stop stop-color="#F9A03C" offset="0%"></stop>
                    <stop stop-color="#F7974E" offset="100%"></stop>
                </linearGradient>
                <linearGradient x1="11.3387123%" y1="-1.82169774%" x2="82.496193%" y2="92.1067478%" id="linearGradient-4">
                    <stop stop-color="#F26D58" offset="0%"></stop>
                    <stop stop-color="#F9A03C" offset="100%"></stop>
                </linearGradient>
                <linearGradient x1="15.8436473%" y1="3.85803114%" x2="120.126091%" y2="72.3802579%" id="linearGradient-5">
                    <stop stop-color="#B84E51" offset="0%"></stop>
                    <stop stop-color="#F68E48" offset="100%"></stop>
                </linearGradient>
                <linearGradient x1="46.9841705%" y1="23.4664325%" x2="51.881003%" y2="147.391179%" id="linearGradient-6">
                    <stop stop-color="#F9A03C" offset="0%"></stop>
                    <stop stop-color="#F7974E" offset="100%"></stop>
                </linearGradient>
            </defs>
            <g>
                <path d="M255.52,175.618667 C255.634667,174.504 255.717333,173.378667 255.781333,172.248 C255.858667,170.909333 175.218667,94.3973333 175.218667,94.3973333 L173.290667,94.3973333 C173.290667,94.3973333 255.026667,180.613333 255.52,175.618667 L255.52,175.618667 L255.52,175.618667 Z" fill="url(#linearGradient-1)"></path>
                <path d="M83.472,149.077333 C83.3653333,149.312 83.2586667,149.546667 83.1493333,149.781333 C83.0346667,150.026667 82.9173333,150.272 82.8,150.514667 C80.2293333,155.874667 118.786667,193.568 121.888,188.989333 C122.029333,188.786667 122.170667,188.573333 122.312,188.370667 C122.469333,188.130667 122.624,187.901333 122.778667,187.661333 C125.258667,183.896 84.5733333,146.629333 83.472,149.077333 L83.472,149.077333 L83.472,149.077333 Z" fill="url(#linearGradient-2)"></path>
                <path d="M137.957333,202.082667 C137.848,202.322667 137.072,203.634667 136.362667,204.328 C136.242667,204.568 174.002667,242.016 174.002667,242.016 L177.402667,242.016 C177.405333,242.016 141.957333,203.666667 137.957333,202.082667 L137.957333,202.082667 L137.957333,202.082667 Z" fill="url(#linearGradient-3)"></path>
                <path d="M255.834667,171.568 C254.069333,210.714667 221.682667,242.016 182.114667,242.016 L176.765333,242.016 L137.250667,203.088 C140.501333,198.504 143.522667,193.754667 146.213333,188.802667 L182.114667,188.802667 C193.469333,188.802667 202.709333,179.568 202.709333,168.208 C202.709333,156.853333 193.469333,147.613333 182.114667,147.613333 L160.869333,147.613333 C162.488,139.056 163.373333,130.232 163.373333,121.205333 C163.373333,112.04 162.472,103.090667 160.794667,94.3973333 L173.992,94.3973333 L255.602667,174.810667 C255.698667,173.733333 255.776,172.656 255.834667,171.568 L255.834667,171.568 L255.834667,171.568 Z M21.4666667,0 L0,0 L0,53.2133333 L21.4666667,53.2133333 C58.96,53.2133333 89.4666667,83.712 89.4666667,121.205333 C89.4666667,131.405333 87.192,141.088 83.1493333,149.781333 L122.312,188.370667 C135.170667,169.130667 142.688,146.032 142.688,121.205333 C142.688,54.3733333 88.3066667,0 21.4666667,0 L21.4666667,0 L21.4666667,0 Z" fill="url(#linearGradient-4)"></path>
                <path d="M182.114667,0 L95.1866667,0 C116.418667,12.9626667 134,31.344 145.978667,53.2133333 L182.114667,53.2133333 C193.469333,53.2133333 202.709333,62.448 202.709333,73.808 C202.709333,85.1653333 193.469333,94.4 182.114667,94.4 L173.994667,94.4 L255.605333,174.813333 C255.797333,172.632 255.917333,170.437333 255.917333,168.208 C255.917333,150.269333 249.48,133.813333 238.792,121.005333 C249.48,108.202667 255.917333,91.744 255.917333,73.808 C255.917333,33.112 222.813333,0 182.114667,0 L182.114667,0 L182.114667,0 Z" fill="url(#linearGradient-5)"></path>
                <path d="M176.765333,242.016 L95.808,242.016 C112.104,231.952 126.192,218.666667 137.250667,203.088 L176.765333,242.016 L176.765333,242.016 Z M122.312,188.370667 L83.152,149.781333 C72.3333333,173.032 48.7573333,189.202667 21.4666667,189.202667 L0,189.202667 L0,242.410667 L21.4666667,242.410667 C63.4773333,242.410667 100.557333,220.922667 122.312,188.370667 L122.312,188.370667 L122.312,188.370667 Z" fill="url(#linearGradient-6)"></path>
            </g>
        </svg>`
        }

        constructor(options: VisualConstructorOptions) {
            this.target = options.element;
            this.host = options.host;
            this.telemetry = options.host.telemetry;
            this.interactivityService = createInteractivityService(options.host);
            this.colorPalette = options.host.colorPalette;
        }

        public init(options: VisualUpdateOptions) {
            this.telemetry.trace(VisualEventType.Trace, this.traceEvents.init);
            const editorIcons = [
                {title: "New", class: D3JSVisual.New.className, icon: this.IconSet.new, selected: false },
                {title: "Save", class: D3JSVisual.Save.className, icon: this.IconSet.save, selected: false },
                {title: "Reload", class: D3JSVisual.Reload.className, icon: this.IconSet.reload, selected: false },
                {title: "", class: D3JSVisual.Space.className, icon: this.IconSet.space, selected: false },
                {title: "JavaScript", class: D3JSVisual.Js.className, icon: this.IconSet.js, selected: true },
                {title: "Style", class: D3JSVisual.Css.className, icon: this.IconSet.css, selected: false },
                {title: "", class: D3JSVisual.Space.className, icon: this.IconSet.space, selected: false },
                {title: "Parse", class: D3JSVisual.Parse.className, icon: this.IconSet.parse, selected: false },
                {title: "Help", class: D3JSVisual.Help.className, icon: this.IconSet.help, selected: false }
            ]

            this.viewport = options.viewport;

            this.editContainer = d3.select(this.target)
                .append("div")
                .classed(D3JSVisual.EditContainer.className, true);
            
            let editorHeader = this.editContainer
                .append("div")
                .classed(D3JSVisual.EditorHeader.className, true);
            
            editorHeader.selectAll(D3JSVisual.Icon.selectorName)
                .data(editorIcons)
                .enter()
                .append("div")
                .classed(D3JSVisual.Icon.className, true)
                .classed("selected", function (d) { return d.selected })
                .attr("tooltip", (d) => d.title)
                .each(function (d) { this.classList.add(d.class); })
                .on("mouseover", function (d) { d3.select(this).style("color", "#a6a6a6"); })
                .on("mouseout", function (d) { d3.select(this).style("color", "#4a4a4a"); })
                .html((d) => d.icon);

            this.messageBox = editorHeader
                .append("div")
                .classed(D3JSVisual.MessageBox.className, true)
                .style("display", "none");

            let editor = this.editContainer
                .append("textarea");             
            
            this.d3Container = d3.select(this.target)
                .append("div")
                .classed(D3JSVisual.D3Container.className, true);

            this.d3jsFrame = this.d3Container
                .append("div")
                .classed(D3JSVisual.D3jsFrame.className, true)

            this.open = D3JSVisualType.Js; // Open Javascript code by defaults

            this.hideMessageBox = {
                type: MessageBoxType.None,
                base: this.messageBox
            };
            this.saveWarning = {
                type: MessageBoxType.Warning,
                base: this.messageBox,
                text: "Warning: File is not saved. Press save button."
            }
            this.telemetry.trace(VisualEventType.Trace, this.traceEvents.init);
        }

        public update(options: VisualUpdateOptions) {
            this.telemetry.trace(VisualEventType.Trace, this.traceEvents.update);
            if (!this.viewport) {
                this.viewport = options.viewport;
                this.init(options);
            }
            this.viewport = options.viewport;
            
            this.editContainer.style("display", options.editMode===EditMode.Advanced ? "inline" : "none");
            this.d3Container.style("display", options.editMode===EditMode.Advanced ? "none" : "inline");
            let settings = this.settings = D3JSVisual.parseSettings(options && options.dataViews && options.dataViews[0]);
            this.parseColors();
            
            if (options.editMode===EditMode.Advanced) {
                // Edit mode
                this.renderEdit(this);
            } else {
                // Render mode
                const d3Icon = [{title: "D3.js logo: (c) Mike Bostock", class: D3JSVisual.D3jsLogo.className, icon: this.IconSet.d3js }]
                
                let width = (this.viewport.width - this.settings.margin.left - this.settings.margin.right);
                let height = (this.viewport.height - this.settings.margin.top - this.settings.margin.bottom);
                let logoWidth = width > 100 ? 100 : width;
                this.d3Container.selectAll(D3JSVisual.D3jsLogo.selectorName).remove();
                let d3logo = this.d3Container
                    .selectAll(D3JSVisual.D3jsLogo.selectorName)
                    .data(d3Icon);
                d3logo
                    .enter()
                    .append("div")
                    .attr("tooltip", (d) => d.title)
                    .each(function (d) { this.classList.add(d.class); })
                    .style("top", PixelConverter.toString((height - (logoWidth / 2)) / 2))
                    .style("left", PixelConverter.toString((width - (logoWidth / 2)) / 2))
                    .html((d) => d.icon
                        .replace(/#width/g, logoWidth.toString())
                    );
                d3logo.exit().remove();
                // Check if we have custom code and render the custom d3js
                if (this.settings.general.js!="") {
                    // Animate the D3.js logo
                    d3logo.classed("fading", true);
                    this.renderD3js(options, height, width);
                }
            }
            this.telemetry.trace(VisualEventType.Trace, this.traceEvents.update);
        }

        private renderEdit(__this) {
            let viewport = this.viewport;
            let textarea = this.editContainer.select("textarea");
            let textareaElement = undefined;
            let mode;
            switch (this.open) {
                case D3JSVisualType.Css:
                    textarea.text(this.settings.general.css);
                    mode = "css";
                    break;  
                case D3JSVisualType.Js:
                default:
                    textarea.text(this.settings.general.js);
                    mode = "javascript";
                    break;
            }
            textarea
                .each(function (d) {
                    textareaElement = this; // Convert to HTMLTextAreaElement
                });
            this.editor = CodeMirror.fromTextArea(textareaElement, {
                lineNumbers: true,
                mode: mode
            });
            this.editor.setSize(viewport.width, viewport.height- 24);
            this.editor.on("change", function() {
                // use __this as 'this' context is altered by CodeMirror
                MessageBox.MessageBox.setMessageBox(__this.hideMessageBox);
                if (__this.reload) {
                    __this.isSaved = true;
                    __this.reload = false;
                } else {
                    __this.isSaved = false;
                }
                __this.editor.save();
            });
            this.registerEvents(textarea);
        }

        private renderD3js(options: VisualUpdateOptions, height: number, width: number) {
            this.telemetry.trace(VisualEventType.Trace, this.traceEvents.render);
            let __this = this;
            // Create data object
            let data = this.data = this.convert(options.dataViews[0]); 
            let d3jsCode = this.createHeader(data, height, width);
            d3jsCode += this.settings.general.js;

            // Designed sandbox mode only working in Edge :-(
            // Create IFrame and html document woth injected code/css
            //let d3Document = this.settings.general.d3Document;
            //d3Document = d3Document.replace("#style", this.settings.general.css);
            //d3Document = d3Document.replace("#script", d3jsCode);
            //d3Document = d3Document.replace(/"/g, "&quot;");
            //let iFrame = this.settings.general.iFrame;
            //iFrame = iFrame.replace(/#width/g, width.toString());
            //iFrame = iFrame.replace(/#height/g, height.toString());
            //iFrame = iFrame.replace(/#top/g, this.settings.margin.top.toString());
            //iFrame = iFrame.replace(/#left/g, this.settings.margin.left.toString());
            //iFrame = iFrame.replace("#src", d3Document);
            //$(D3JSVisual.D3jsFrame.selectorName).html(iFrame);
            // Inject javascript code into iFrame
            // $(document).ready(() => {
            //     let frame = $('#d3js-sandbox')[0] as HTMLIFrameElement
            //     frame.contentWindow.postMessage(d3jsCode, '*');
            //     window.addEventListener('message', function (e) {
            //         //if (e.origin === "data://") {
            //              let logo = $(D3JSVisual.D3jsLogo.selectorName).remove();
            //         //    __this.telemetry.trace(VisualEventType.Trace, __this.traceEvents.render);
            //         //}
            //     });
            // });
            this.d3jsFrame
                .style("heigth", PixelConverter.toString(height))
                .style("width", PixelConverter.toString(width))
                .style("padding-top", PixelConverter.toString(this.settings.margin.top))
                .style("padding-left", PixelConverter.toString(this.settings.margin.left))
            let iHtml = this.settings.general.d3CSS
            iHtml = iHtml.replace("#style", this.settings.general.css);
            iHtml += this.settings.general.d3SVG
            $(D3JSVisual.D3jsFrame.selectorName).html(iHtml); // Inject code via jQuery
            try {
                eval(d3jsCode);
            } catch (ex) {
                console.log(`Error during D3js code evauation: ${ex.description}`);
            }
            let logo = $(D3JSVisual.D3jsLogo.selectorName).remove();
        }

        private createHeader(data: D3JSDataObjects, height: number, width: number): string {
            let d3jsCode = "var pbi = {";
            // Add visual dimensions to the scripts
            d3jsCode += 'width:' + width + ",";
            d3jsCode += 'height:' + height + ",";
            d3jsCode += 'colors:["'
                + this.settings.colors.color1 + '","'
                + this.settings.colors.color2 + '","'
                + this.settings.colors.color3 + '","'
                + this.settings.colors.color4 + '","'
                + this.settings.colors.color5 + '","'
                + this.settings.colors.color6 + '","'
                + this.settings.colors.color7 + '","'
                + this.settings.colors.color8 + '"'
            + '],';
            d3jsCode += "dsv:function(callback){data=[";
            for (let v = 0; v < data.dataObjects[0].values.length; v++) {
                d3jsCode += "{" ;
                for (let c = 0; c < data.dataObjects.length; c++) {
                    let columnName = data.dataObjects[c].columnName.toLowerCase();
                    let value = data.dataObjects[c].values[v].valueOf() as number;
                    d3jsCode += `${columnName}:'${value}',`;
                }
                d3jsCode += "},";
            }
            d3jsCode += '];callback(data);}};';
            return d3jsCode;
        }

        private convert(dataView: DataView) : D3JSDataObjects {
            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.categories) {
                return {
                    dataObjects: []
                }
            }

            let categories = dataView.categorical.categories;
            let dataObjects = [];
            for (let i = 0; i < categories.length; i++) {
                let category = categories[i];
                let dataObject: D3JSDataObject = {
                    columnName: category.source.displayName,
                    values: category.values
                }
                dataObjects.push(dataObject);
            }
            
            return {
                dataObjects: dataObjects
            }
        }

        private parseColors() {
            if (this.settings.colors.color1 === "") {
                this.settings.colors.color1 = this.colorPalette.getColor("1").value;
            }
            if (this.settings.colors.color2 === "") {
                this.settings.colors.color2 = this.colorPalette.getColor("2").value;
            }
            if (this.settings.colors.color3 === "") {
                this.settings.colors.color3 = this.colorPalette.getColor("3").value;
            }
            if (this.settings.colors.color4 === "") {
                this.settings.colors.color4 = this.colorPalette.getColor("4").value;
            }
            if (this.settings.colors.color5 === "") {
                this.settings.colors.color5 = this.colorPalette.getColor("5").value;
            }
            if (this.settings.colors.color6 === "") {
                this.settings.colors.color6 = this.colorPalette.getColor("6").value;
            }
            if (this.settings.colors.color7 === "") {
                this.settings.colors.color7 = this.colorPalette.getColor("7").value;
            }
            if (this.settings.colors.color8 === "") {
                this.settings.colors.color8 = this.colorPalette.getColor("8").value;
            }
        }

        private persist(code: string, type: D3JSVisualType) {
            let properties: { [propertyName: string]: DataViewPropertyValue } = {};
            let objectName = "";

            switch (type) {
                case D3JSVisualType.Object:
                    return;
                case D3JSVisualType.Css:
                    objectName = visualProperties.d3jsCss.objectName;
                    properties[visualProperties.d3jsCss.propertyName] = code;
                    break;
                case D3JSVisualType.Js:
                default:
                    objectName = visualProperties.d3jsJs.objectName;
                    properties[visualProperties.d3jsJs.propertyName] = code;
                    break;
            }
            let objects: VisualObjectInstancesToPersist = {
                merge: [
                    <VisualObjectInstance>{
                        objectName: objectName,
                        selector: null,
                        properties: properties,
                    }]
            };
            this.host.persistProperties(objects);
        }

        private registerEvents(textarea: Selection<any>) {
            this.editContainer.select(D3JSVisual.New.selectorName)
                .on("click", () => {
                    this.reload = true;
                    this.persist("", D3JSVisualType.Js);
                    this.persist("", D3JSVisualType.Css);
                    this.editor.setValue("");
                    this.editor.refresh();
                });
            this.editContainer.select(D3JSVisual.Save.selectorName)
                .on("click", () => {
                    MessageBox.MessageBox.setMessageBox(this.hideMessageBox);
                    if (this.parseCode(this.editor, this.open)) {
                        this.isSaved = true;
                        this.persist(this.editor.getValue(), this.open);
                    }
                });
            this.editContainer.select(D3JSVisual.Js.selectorName)
                .on("click", () => {
                    MessageBox.MessageBox.setMessageBox(this.hideMessageBox);
                    if (this.parseCode(this.editor, this.open)) {
                        if (this.isSaved) {
                            // Switch to Code
                            this.open = D3JSVisualType.Js;
                            this.reload = true;
                            this.switchIcons(D3JSVisualType.Js);
                            textarea.text(this.settings.general.js);
                            this.editor.setValue(this.settings.general.js);
                            this.editor.setOption("mode", "javascript");
                            this.editor.refresh();
                        } else {
                            MessageBox.MessageBox.setMessageBox(this.saveWarning);
                        }
                    }
                });
            this.editContainer.select(D3JSVisual.Css.selectorName)
                .on("click", () => {
                    MessageBox.MessageBox.setMessageBox(this.hideMessageBox);
                    if (this.parseCode(this.editor, this.open)) {
                        if (this.isSaved) {                        
                            // Switch to CSS
                            this.open = D3JSVisualType.Css;
                            this.reload = true;
                            this.switchIcons(D3JSVisualType.Css);
                            textarea.text(this.settings.general.css);
                            this.editor.setValue(this.settings.general.css);
                            this.editor.setOption("mode", "css");
                            this.editor.refresh();
                        } else {
                            MessageBox.MessageBox.setMessageBox(this.saveWarning);
                        }
                    }
                });
            this.editContainer.select(D3JSVisual.Parse.selectorName)
                .on("click", () => {
                    MessageBox.MessageBox.setMessageBox(this.hideMessageBox);
                    this.parseCode(this.editor, this.open);
                });
            this.editContainer.select(D3JSVisual.Reload.selectorName)
                .on("click", () => {
                    switch (this.open) {
                        case D3JSVisualType.Js:
                            this.reload = true;
                            textarea.text(this.settings.general.js);
                            this.editor.setValue(this.settings.general.js);
                            this.editor.refresh();
                            break;
                        case D3JSVisualType.Css:
                            this.reload = true;
                            textarea.text(this.settings.general.css);
                            this.editor.setValue(this.settings.general.css);
                            this.editor.refresh();
                            break;
                        default:
                    }
                });
        }

        private parseCode(editor: CodeMirror.EditorFromTextArea, type: D3JSVisualType): boolean {
            let selectLength = 1;
            let minifyOptions = {
                compress: false,
                mangle: false,
            };
            if (type!==D3JSVisualType.Js) { return true }
            let result = UglifyJS.minify(editor.getValue(), minifyOptions) as CompileOutput;
            let search = editor.getDoc().getSearchCursor('d3.select("svg")');
            if (search.findNext()) {
                result.error = {
                    message: `Replace 'd3.select("svg")' with 'd3.select("#chart")'`,
                    line: search.from().line + 1,
                    col: search.from().ch,
                    pos: 0,
                    filename: "",
                    stack: ""
                };
                selectLength = search.to().ch - search.from().ch;
            }
            if (result.error !== undefined) {
                let msg = result.error.message, line = result.error.line, col = result.error.col;
                let errorMsg: MessageBoxOptions = {
                    type: MessageBoxType.Error,
                    base: this.messageBox,
                    text: `Parse error: ${msg} at (${line}:${col})`
                };
                MessageBox.MessageBox.setMessageBox(errorMsg);
                editor.getDoc().setSelection({ line: line - 1, ch: col }, { line: line - 1, ch: col + selectLength });
                editor.focus();
                return false;
            } else {
                return true;
            }
        }

        private switchIcons(type: D3JSVisualType) {
            this.editContainer.select(D3JSVisual.Js.selectorName)
                .classed("selected", type===D3JSVisualType.Js);
            this.editContainer.select(D3JSVisual.Css.selectorName)
                .classed("selected", type===D3JSVisualType.Css);
            this.editContainer.select(D3JSVisual.Object.selectorName)
                .classed("selected", type===D3JSVisualType.Object);
        }

        private static parseSettings(dataView: DataView): Settings {
            return Settings.parse(dataView) as Settings;
        }

        /** 
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the 
         * objects and properties you want to expose to the users in the property pane.
         * 
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
            let settings: Settings = (this.settings || Settings.getDefault()) as Settings;
            

            const instanceEnumeration: VisualObjectInstanceEnumeration = Settings.enumerateObjectInstances(
                settings,
                options);

            switch (options.objectName) {
                case "general" :
                    // ignore rendering general settings ( it include only hidden properties )
                    return;
            }
            return instanceEnumeration;
        }
    }
}