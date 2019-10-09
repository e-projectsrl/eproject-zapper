'use strict';

define( ["qlik", "text!./template.html", "css!./style.css", "./epjAbout"],	function ( qlik, template, style, epjAbout) {

	let xrfkey = "1234567890abcdef";

	function validate(layout){
		if(!layout.visualizations || layout.visualizations.length == 0){
			return {valid: false, errMsg: "You must add at least one visualization to the list"};
		}

		for(let idx = 0; idx < layout.visualizations.length; idx++) {
			let vis = layout.visualizations[idx];
			if(!vis.visId){
				return {valid: false, errMsg: `No visualization selected for item ${idx + 1}`};
			}			
		}

		return {valid: true};
	}

	function injectCss(layout){
		try {
			let styleId = "dynamicCss-" + layout.qInfo.qId;
			let stripSize = layout.style.stripHeight !== undefined ? layout.style.stripHeight : 20;
			let mainSize = 100 - stripSize;
			let stripMargin = layout.style.stripMargin !== undefined ? layout.style.stripMargin : 8;
			let outerContainerRule;
			let mainContainerRule; 
			let previewContainerRule;
			let previewSquareRule; 
			let firstPreviewSquareRule;

			if(layout.style.layoutFlow === "vertical"){
				mainContainerRule = `	height: ${mainSize}%;
									margin-left: ${stripMargin}px;
									  margin-right: ${stripMargin}px; `;
				previewContainerRule = `height: ${stripSize}%; 
										flex-direction: row`;
				previewSquareRule = `margin-right: ${stripMargin}px; 
									 margin-bottom: ${stripMargin}px;
									 margin-top: ${stripMargin}px;`;
				firstPreviewSquareRule = `margin-left: ${stripMargin}px; `;

				if(layout.style.layoutOrder === "mainFirst"){
					outerContainerRule = "flex-direction: column; ";
					mainContainerRule += `margin-top: ${stripMargin}px;`;
				} 
				else{
					outerContainerRule = "flex-direction: column-reverse; ";
					mainContainerRule += `margin-bottom: ${stripMargin}px;`;
				}
			} else{
				mainContainerRule = `width: ${mainSize}%;
									 margin-top: ${stripMargin}px;
									 margin-bottom: ${stripMargin}px; `;
				previewContainerRule = `width: ${stripSize}%; 
										flex-direction: column`;
				previewSquareRule = `margin-bottom: ${stripMargin}px; 
									 margin-left: ${stripMargin}px;
									 margin-right: ${stripMargin}px;`;
				firstPreviewSquareRule = `margin-top: ${stripMargin}px; `;

				if(layout.style.layoutOrder === "mainFirst"){
					outerContainerRule = "flex-direction: row; ";
					mainContainerRule += `margin-left: ${stripMargin}px;`;
				} 
				else{
					outerContainerRule = "flex-direction: row-reverse; ";
					mainContainerRule += `margin-right: ${stripMargin}px;`;
				}
			}

			let enableShadows = layout.style.shadows !== undefined ? layout.style.shadows : true;
			let enableRounding = layout.style.rounding !== undefined ? layout.style.rounding : true;

			let styleTag = `<style id="${styleId}">
				.qv-object-EProject-Zapper .outer-container{
					${outerContainerRule}
				}
				.qv-object-EProject-Zapper .preview-container{
					${previewContainerRule}
				}
				.qv-object-EProject-Zapper .main-container{
					${mainContainerRule}
				}
				.qv-object-EProject-Zapper .preview-square{
					${previewSquareRule}
				}
				.qv-object-EProject-Zapper .preview-square-first{
					${firstPreviewSquareRule}
				}
				.qv-object-EProject-Zapper .boxed{
					${enableRounding ? "border-radius: 10px 10px 10px 10px;" : ""}
				}
				
				.qv-object-EProject-Zapper .shadowed{
					${enableShadows ? "box-shadow: 2px 2px 6px 1px rgba(0,0,0,0.75);" : "border: 1px solid rgba(0,0,0,0.25);"}
				}				
			</style>`;
	
			$('#' + styleId).remove();
			$('head').append(styleTag);			
		} catch (error) {
			console.error("errory applying style", error);
		}
	}

	function getMasterObjectsList(){
		return new Promise((resolve, reject) => {
			qlik.currApp().getList('masterobject', (objsList) => {
				let result = [];
				objsList.qAppObjectList.qItems.forEach(masterObj => {
					let id = masterObj.qInfo.qId;
					let title = masterObj.qMeta.title;
					if(!title){
						title = `NO TITLE <id: ${id}, type: ${masterObj.qData.visualization}>`;
					}
					result.push({label: title, value: id});
				});
				result.sort((a, b) => (a.label > b.label) ? 1 : -1)
				resolve(result);
			});
		});
	}

	function buildPreviews($element, layout){
		return new Promise((resolve, reject) => {
			try {
				let pending = []
				let app = qlik.currApp();
				for(let idx = 0; idx < layout.visualizations.length; idx++) {
					let vis = layout.visualizations[idx];
					pending.push(
						app.visualization.get(vis.visId)
					);
				}
				Promise.all(pending).then(visObjs => {
					for(let idx = 0; idx < visObjs.length; idx++) {
						let vis = layout.visualizations[idx];
						let visObj = visObjs[idx];
						visObj.setOptions({
							showTitles: vis.showTitles === true
						});
						let elem = $element.find(`.vis-preview[data-vis-id='${vis.visId}']`)[0];
						visObj.show(elem, {
							noInteraction: true
						});

						let zoomFactor = vis.zoomFactor !== undefined ? vis.zoomFactor : 1;
						$(elem).css('zoom', zoomFactor);
					}
					resolve();
				});
			} catch (error) {
				console.error(error);
				reject(error);
			}
		});
	}

	function switchVis($element, layout, visIdx){
		return new Promise((resolve, reject) => {
			try {
				let app = qlik.currApp();
				let vis = layout.visualizations[visIdx];
				app.visualization.get(vis.visId).then((visObj) =>{
					visObj.setOptions({
						showTitles: vis.showTitles === true
					});
					let elem = $element.find(`.main-container`)[0];
					visObj.show(elem).then(resolve());
				});
			} catch (error) {
				console.error(error);
				reject(error);
			}
		});
	}

	return {
		template: template,
		support: {
			snapshot: true,
			export: true,
			exportData: false
		},
		resize: function(){

		},
		paint: function ($element, layout) {
			injectCss(layout);

			this.$scope.validation = validate(layout);
			if(this.$scope.validation.valid){				
				//Hook switch method
				this.$scope.switch = (visIdx) => {
					this.$scope.activeVis = visIdx;
					switchVis($element, layout, visIdx);
				}

				//Set initially active visualization
				this.$scope.activeVis = layout.defaultVis;
				if(!this.$scope.activeVis || this.$scope.activeVis >= layout.visualizations.length){
					this.$scope.activeVis = 0;
				}			
				
				//Draw initially active main visualization
				switchVis($element, layout, this.$scope.activeVis);

				//Draw visualizations strip
				buildPreviews($element, layout);
			}

			return qlik.Promise.resolve();
		},
		controller: ['$scope', function ( $scope ) {
			//add your rendering code here
		}],
		definition : {
			type : "items",
			component : "accordion",
			items : {
				settings : {
					uses : "settings"
				},
				Visualizations: {
					type: "array",
					ref: "visualizations",
					label: "Visualizations",
					itemTitleRef: "title",
					allowAdd: true,
					allowRemove: true,
					addTranslation: "Add visualization",
					items: {
						Title: {
							type: "string",
							ref: "title",
							label: "Title",
							expression: "optional",
							defaultValue: "My Visualization"
						},
						VisId: {
							type: "string",
							component: "dropdown",
							label: "Visualization",
							ref: "visId",
							options: getMasterObjectsList
						},
						ShowTitles: {
							type: "boolean",
							label: "Show titles/footnotes",
							ref: "showTitles",
							defaultValue: true
						},
						ZoomFactor: {
							type: "number",
							label: "Preview scaling factor",
							ref: "zoomFactor",
							defaultValue: 1.0
						},
						ZoomFactorWarning: {
							label:"WARNING: scaling is not officially supported by Qlik Sense. Values different from \"1\" may cause visual glitches",
							component: "text",
							show: (vis) => vis.zoomFactor !== undefined && vis.zoomFactor !== 1
						}
					}
				},
				zappingSettings:{
					type: "items",
					component: "expandable-items",
					label: "Zapper settings",
					items: {
						BehaviorConfig:{
							type: "items",
							label: "Behavior",
							items:{
								DefaultVis:{
									type: "number",
									component: "dropdown",
									label: "Default visualization",
									ref: "defaultVis",
									defaultValue: 0,
									options: (layout) =>{
										let result = [];
										if(layout.visualizations){
											for(let idx = 0; idx < layout.visualizations.length; idx++) {
												let vis = layout.visualizations[idx];
												result.push({label: vis.title ? vis.title : "Visualization " + (idx +1), value: idx});
											}
										}
										return result;
									}
								}
							}
						},
						StyleConfig:{
							type: "items",
							label: "Appearence & style",
							items:{
								LayoutFlow: {
									type: "string",
									component: "dropdown",
									label: "Layout direction",
									ref: "style.layoutFlow",
									defaultValue: "vertical",
									options:[
										{label: "Vertical", value: "vertical"},
										{label: "Horizontal", value: "horizontal"}
									]
								},
								LayoutOrder: {
									type: "string",
									component: "dropdown",
									label: "Layout order",
									ref: "style.layoutOrder",
									defaultValue: "mainFirst",
									options:[
										{label: "Main visualization first", value: "mainFirst"},
										{label: "Preview squares first", value: "stripFirst"}
									]
								},
								StripHeight: {
									type: "number",
									expression: "optional",
									label: "Preview squares size (percent)",
									ref: "style.stripHeight",
									defaultValue: "20"
								},
								StripMargin: {
									type: "number",
									expression: "optional",
									label: "Spacing between elements (pixels)",
									ref: "style.stripMargin",
									defaultValue: "8"
								},
								Shadows: {
									type: "boolean",
									label: "Enable shadows",
									ref: "style.shadows",
									defaultValue: true
								},
								Rounding:{
									type: "boolean",
									label: "Rounded corners",
									ref: "style.rounding",
									defaultValue: true
								}
							}
						}
					}
				},
				AboutSection: {
					label: "About",
					type: "items",
					items:{
						EpInfo: epjAbout,
						EnableLogging: {
							show: false,
							type: "boolean",
							defaultValue: false,
							label: "Enable debug logging to console",
							ref: "enableLogging"
						}
					}
				}
			}
		}
	};

} );

