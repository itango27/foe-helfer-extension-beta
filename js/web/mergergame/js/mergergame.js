/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('MergerGameService', 'all', (data, postData) => {
	
	if (data.requestMethod != "getOverview" && data.requestMethod != "resetBoard") return;
	//Do not show window if deactivated in settings
	if(!Settings.GetSetting('ShowEventChest')){
		return;
	}
	mergerGame.event = data.responseData.context.replace("_event","")
	mergerGame.cells = data.responseData.cells;
	mergerGame.levelValues = data.responseData?.lookup?.pieceConfig[0]?.grandPrizeProgress || {1:1,2:2,3:3,4:4};
	mergerGame.keyValues = {3:data.responseData?.lookup?.keyConversion[0]?.amount || 1,4:data.responseData?.lookup?.keyConversion[1]?.amount|| 3};
	mergerGame.spawnCost = data.responseData?.cells[1]?.spawnCost?.resources[`${mergerGame.event}_energy`] || 10;
	mergerGame.state["maxProgress"]= 0;
	mergerGame.state["energyUsed"]= 0;
	mergerGame.state["progress"]= 0;
	mergerGame.state["keys"]= 0;
	mergerGame.colors = mergerGame.eventData[mergerGame.event].colors;
	mergerGame.types = mergerGame.eventData[mergerGame.event].types;
	for (let x of mergerGame.cells) {
		if (x.isFixed) mergerGame.state.maxProgress += mergerGame.levelValues[x.level];
	};
	for (let x of mergerGame.cells[1].spawnChances) {
		if (!x) continue;
		if (!mergerGame.spawnChances[x.type.value]) mergerGame.spawnChances[x.type.value] = {}
		mergerGame.spawnChances[x.type.value][x.level] = x.spawnChance;
	}
	mergerGame.updateTable();
	
	if (data.requestMethod == "getOverview") {
		mergerGame.checkSave();
		mergerGame.ShowDialog();
	} else { //resetBoard
		mergerGame.state.energyUsed +=  mergerGame.resetCost;
		mergerGame.saveState();
		mergerGame.updateDialog();
	}
	if (mergerGame.state.progress == mergerGame.state.maxProgress) {
		mergerGame.resetCost = 0;
	} else {
		mergerGame.resetCost = data.responseData.resetCost?.resources[mergerGame.eventData[mergerGame.event].currency] || 0;
	}
	
});


FoEproxy.addHandler('MergerGameService', 'spawnPieces', (data, postData) => {
	// Don't handle when module not open
    if ($('#mergerGameDialog').length === 0) {
		return;
	}
	
	mergerGame.cells.push(data.responseData[0])
	mergerGame.state.energyUsed += mergerGame.spawnCost;
	mergerGame.updateTable();
	mergerGame.saveState();
	mergerGame.updateDialog();
});

FoEproxy.addHandler('MergerGameService', 'mergePieces', (data, postData) => {
	// Don't handle when module not open
    if ($('#mergerGameDialog').length === 0) {
		return;
	}
	
	let t_id = data.responseData.id;
	let o_id = postData[0].requestData[1];
	if (o_id==t_id) o_id = postData[0].requestData[2];

	let target = mergerGame.cells.findIndex((e) => e.id == t_id);
	let origin = mergerGame.cells.findIndex((e) => e.id == o_id);

	if (mergerGame.cells[target].isFixed) mergerGame.state.progress += mergerGame.levelValues[mergerGame.cells[target].level];
	if (mergerGame.state.progress == mergerGame.state.maxProgress) mergerGame.resetCost = 0;

	mergerGame.cells[target] = data.responseData;
	mergerGame.cells.splice(origin,1);

	mergerGame.updateTable();
	mergerGame.saveState();

	mergerGame.updateDialog();

});

FoEproxy.addHandler('MergerGameService', 'convertPiece', (data, postData) => {
	// Don't handle when module not open
    if ($('#mergerGameDialog').length === 0) {
		return;
	}
	
	target = mergerGame.cells.findIndex((e) => e.id == postData[0].requestData[1]);
	
	mergerGame.state.keys += mergerGame.keyValues[mergerGame.cells[target].level];
	mergerGame.cells.splice(target,1);

	mergerGame.updateTable();
	mergerGame.saveState();

	mergerGame.updateDialog();
});

let mergerGame = {
	/*event:"anniversary",
	colors: ["white","yellow","blue"],
	types: ["top","bottom","full"],
	spawnCost: 10,*/
	event:"soccer",
	colors: ["attacker","midfielder","defender"],
	types: ["left","right","full"],
	spawnCost: 5,
	cells:[],
	spawnChances:{white:{1:14,2:8,3:5,4:3},blue:{1:14,2:8,3:5,4:3},yellow:{1:19,2:10,3:7,4:4},defender:{1:14,2:8,3:5,4:3},attacker:{1:14,2:8,3:5,4:3},midfielder:{1:19,2:10,3:7,4:4}},
	state: {
		maxProgress: 0,
		energyUsed:0,
		progress:0,
		keys: 0
	},
	resetCost: 0,
	levelValues: {1:1,2:1,3:1,4:2},
	keyValues: {3:1, 4:3},
	settings: JSON.parse(localStorage.getItem("MergerGameSettings") || '{"keyValue":1.3,"targetProgress":3750,"availableCurrency":11000,"hideOverlay":true}'),
	eventData:{
		anniversary: {
			progress:"/shared/seasonalevents/league/league_anniversary_icon_progress.png",
			energy:"/shared/seasonalevents/anniversary/event/anniversary_energy.png",
			keyfile:"/shared/seasonalevents/anniversary/event/anniversay_icon_key_",
			colors: ["white","yellow","blue"],
			CSScolors: {white:"#7fecba",yellow:"#e14709",blue:"#08a9f7"},
			types: ["top","bottom","full"],
			partname:"key",
			tile:"gem",
			currency:`anniversary_energy`,
			solverOut:{top:"tip",bottom:"handle"}
		},
		soccer:{
			progress:"/shared/icons/reward_icons/reward_icon_soccer_trophy.png",
			energy:"/shared/seasonalevents/soccer/event/soccer_football.png",
			keyfile:"/shared/seasonalevents/soccer/event/soccer_icon_badge_",
			colors: ["attacker","midfielder","defender"],
			types: ["left","right","full"],
			CSScolors: {attacker:"#ec673a",midfielder:"#e7d20a",defender:"#44d3e2"},
			partname:"badge",
			tile:"player",
			currency:`soccer_football`,
			solverOut:{left:"right",right:"left"}
		}
	},
	solved: {keys:0,progress:0},
	simulation: {},
	simResult:null,

	updateTable: () => {
		let table = {},
			unlocked = {};
		for (x of mergerGame.colors) {
			table[x]={}
			unlocked[x]={}
			for (l of [1,2,3,4]) {
				table[x][l]={}
				unlocked[x][l]={}
				for (t of mergerGame.types) {
					table[x][l][t]=0;
					unlocked[x][l][t]=0;
				}
				unlocked[x][l]["none"]=0;
			}
		}
		for (let x of mergerGame.cells) {
			if (! x.id || x.id<0) continue;
			if (!x.keyType?.value) continue;
			if (x.keyType.value !="none") {
				table[x.type.value][x.level][x.keyType.value]++;
			}
			if (!x.isFixed) {
				unlocked[x.type.value][x.level][x.keyType.value]++;
			}
		};
		mergerGame.state["table"] = table;
		mergerGame.state["unlocked"] = unlocked;
		mergerGame.solve();
	},

	checkSave: () => {
		let x = localStorage.getItem("mergerGameState");
		if (!x) return;
		let oldState=JSON.parse(x);
		let oldTable=JSON.stringify(oldState.table);
		let newTable=JSON.stringify(mergerGame.state.table);
		if (oldTable==newTable) {
			mergerGame.state.maxProgress = oldState.maxProgress;
			mergerGame.state.progress = oldState.progress;
			mergerGame.state.energyUsed = oldState.energyUsed;
			mergerGame.state.keys = oldState.keys;
		}
	},
	
	saveState:() => {
		localStorage.setItem("mergerGameState",JSON.stringify(mergerGame.state))
	},

	keySum:() => {
		let sum = 0;
		for (let x of mergerGame.cells) {
			if (x.keyType?.value == "full") sum += mergerGame.keyValues[x.level];
		}
		if (sum>0 && !($('#mergerGameDialog.closed').length > 0 && mergerGame.settings.hideOverlay)) {
			if ($('#mergerGameResetBlocker').length === 0) {
				let blocker = document.createElement("img");
				blocker.id = 'mergerGameResetBlocker';
				blocker.src = srcLinks.get("/city/gui/great_building_bonus_icons/great_building_bonus_plunder_repel.png", true);
				blocker.title = i18n("Boxes.MergerGame.KeysLeft."+mergerGame.event);
				$('#game_body')[0].append(blocker);
				$('#mergerGameResetBlocker').on("click",()=>{$('#mergerGameResetBlocker').remove()});
			} 
		} else {
			$('#mergerGameResetBlocker').remove()
		}
		return mergerGame.state.keys + sum;
	},

    /**
     * Shows a User Box with the current production stats
     *
     * @constructor
     */
    ShowDialog: () => {
        
		// Don't create a new box while another one is still open
		if ($('#mergerGameDialog').length === 0) {
			HTML.AddCssFile('mergergame');
			
			HTML.Box({
				id: 'mergerGameDialog',
				title: 'Merger Game',
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize : true,
				ask: i18n('Boxes.MergerGame.HelpLink'),
				settings: 'mergerGame.ShowSettingsButton()'
			});

			$('#mergerGameDialogclose').on("click",()=>{$('#mergerGameResetBlocker').remove()});
			$('#mergerGameDialogButtons .window-minimize').on("click",()=>{
				if (mergerGame.settings.hideOverlay) $('#mergerGameResetBlocker').remove()
			});
		}
		
		mergerGame.updateDialog();
    },
	
	updateDialog: () => {
		let type1 = mergerGame.types[1],
			type2 = mergerGame.types[0];
		if ($('#mergerGameDialog').length === 0) {
			return;
		}
		htmltext=``
		
		let table = mergerGame.state.table
	
		let remainingProgress = mergerGame.state.maxProgress - mergerGame.state.progress|0;
		let keys = mergerGame.keySum()|0;
		let totalValue = mergerGame.state.progress + keys*mergerGame.settings.keyValue|0;
		let efficiency = (totalValue / mergerGame.state.energyUsed).toFixed(2)|0;
		let simEff = Math.round((mergerGame.state.progress + mergerGame.solved.progress + (mergerGame.state.keys + mergerGame.solved.keys)*mergerGame.settings.keyValue)/mergerGame.state.energyUsed*100)/100||0
		
		let simMinEff = Math.round((simEff * mergerGame.state.energyUsed + mergerGame.simResult.value.min)/(mergerGame.state.energyUsed + mergerGame.spawnCost)*100)/100
		let simMaxEff = Math.round((simEff * mergerGame.state.energyUsed + mergerGame.simResult.value.max)/(mergerGame.state.energyUsed + mergerGame.spawnCost)*100)/100
		let simAvgEff = Math.round((simEff * mergerGame.state.energyUsed + mergerGame.simResult.value.average)/(mergerGame.state.energyUsed + mergerGame.spawnCost)*100)/100

		let totalPieces = {}
		for (x of mergerGame.colors) {
			totalPieces[x]={}
			for (t of mergerGame.types) {
				totalPieces[x][t]=0;
			}
		}
		let maxKeys= 0;
		for (let i of mergerGame.colors) {
			for (let t of mergerGame.types) {
				totalPieces[i][t] = table[i][1][t] + table[i][2][t] + table[i][3][t] + table[i][4][t];
			}
			totalPieces[i]["min"] = Math.min(totalPieces[i][type1],totalPieces[i][type2]);
			maxKeys+=totalPieces[i]["min"]*mergerGame.keyValues[4];
		}

		let targetEfficiency = mergerGame.settings.targetProgress/mergerGame.settings.availableCurrency;
		html = `<table class="foe-table"><tr><th colspan="2" title="${i18n("Boxes.MergerGame.Status.Title")}">${i18n("Boxes.MergerGame.Status")}</th>`
		html += `<th style="border-left: 1px solid var(--border-tab)" title="${i18n("Boxes.MergerGame.Simulation.Title")}">${i18n("Boxes.MergerGame.Simulation")}</th>`
		html += `<th colspan="2" style="border-left: 1px solid var(--border-tab)" title="${i18n("Boxes.MergerGame.NextSpawn.Title")}">${i18n("Boxes.MergerGame.NextSpawn")}</th></tr>`
		//Energy/fooballs
		html += `<tr><td title="${i18n("Boxes.MergerGame.Energy."+mergerGame.event)}">`
		html += `<img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].energy,true)}"></td>`
		html += `<td title="${i18n("Boxes.MergerGame.EfficiencyTargetProgress."+mergerGame.event)+Math.floor(totalValue)+"/"+Math.floor(mergerGame.state.energyUsed*targetEfficiency)|0}">${mergerGame.state.energyUsed} </td>`
		html += `<td style="border-left: 1px solid var(--border-tab);" onclick="mergerGame.ShowSolution()">${LinkIcon}</td>`
		html += `<td colspan="2" style="border-left: 1px solid var(--border-tab)">${mergerGame.spawnCost}</td></tr>`
		//Progress
		html += `<tr><td title="${i18n("Boxes.MergerGame.ProgressCollected")}">`
		html += `<img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].progress,true)}"></td>`
		html += `<td>${mergerGame.state.progress} / ${mergerGame.state.maxProgress} </td>`
		html += `<td style="border-left: 1px solid var(--border-tab)">${mergerGame.state.progress + mergerGame.solved.progress}</td>`
		html += `<td title="min - max (avg)" style="border-left: 1px solid var(--border-tab); text-align:right">${mergerGame.simResult.progress.min} - ${mergerGame.simResult.progress.max}</td>`
		html += `<td title="min - max (avg)" style="text-align:left">(${Math.round(mergerGame.simResult.progress.average*10)/10})</td></tr>`
		//html += `<td title="${mergerGame.simResult.progress.min} - ${mergerGame.simResult.progress.max}">${Math.round(mergerGame.simResult.progress.average*10)/10}</td></tr>`
		//Keys/badges
		html += `<tr><td title="${i18n("Boxes.MergerGame.Keys."+mergerGame.event)}">`
		html += `<img ${mergerGame.event=="soccer"?'class="toprightcorner"':''} src="${srcLinks.get(`${mergerGame.eventData[mergerGame.event].keyfile}full_${mergerGame.colors[2]}.png`,true)}">`
		html += `<img ${mergerGame.event=="soccer"?'class="toprightcorner" style="margin-left: -24px"':'style="margin-left: -15px" '} src="${srcLinks.get(`${mergerGame.eventData[mergerGame.event].keyfile}full_${mergerGame.colors[1]}.png`,true)}">`
		html += `<img ${mergerGame.event=="soccer"?'class="toprightcorner" style="margin-left: -18px"':'style="margin-left: -15px"'} src="${srcLinks.get(`${mergerGame.eventData[mergerGame.event].keyfile}full_${mergerGame.colors[0]}.png`,true)}"></td>`
		html += `<td>${keys} / ${maxKeys}</td>`
		html += `<td style="border-left: 1px solid var(--border-tab)">${mergerGame.state.keys + mergerGame.solved.keys}</td>`
		html += `<td title="min - max (avg)" style="border-left: 1px solid var(--border-tab); text-align:right">${mergerGame.simResult.keys.min} - ${mergerGame.simResult.keys.max}</td>`
		html += `<td title="min - max (avg)" style="text-align:left">(${Math.round(mergerGame.simResult.keys.average*10)/10})</td></tr>`
		//html += `<td title="${mergerGame.simResult.keys.min} - ${mergerGame.simResult.keys.max}">${Math.round(mergerGame.simResult.keys.average*10)/10}</td></tr>`
		//Efficiency
		html += `<tr><td title="${i18n("Boxes.MergerGame.Efficiency."+mergerGame.event)}">`
		html += `<img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].progress,true)}">/<img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].energy,true)}"></td>`
		html += `<td style="font-weight:bold; color: ${efficiency > targetEfficiency*1.15 ? 'var(--text-success)' : efficiency > targetEfficiency*1 ? 'yellow' : efficiency < targetEfficiency * 0.95 ? 'red' : 'var(--text-bright)'}" title="${i18n("Boxes.MergerGame.EfficiencyTotalProgress") + Math.floor(efficiency*mergerGame.settings.availableCurrency)}">${efficiency} </td>`
		html += `<td style="border-left: 1px solid var(--border-tab); color: ${simEff > targetEfficiency*1.15 ? 'var(--text-success)' : simEff > targetEfficiency*1.05 ? 'yellow' : simEff > targetEfficiency * 0.95 ? 'var(--text-bright)' : 'red'}">${simEff}</td>`
		html += `<td title="min - max (avg)" style="border-left: 1px solid var(--border-tab); text-align:right"><span style="color: ${simMinEff > targetEfficiency*1.15 ? 'var(--text-success)' : simMinEff > targetEfficiency*1.05 ? 'yellow' : simMinEff > targetEfficiency * 0.95 ? 'red' : 'var(--text-bright)'}">${simMinEff}</span> - <span style="color: ${simMaxEff > targetEfficiency*1.15 ? 'var(--text-success)' : simMaxEff > targetEfficiency*1 ? 'yellow' : simMaxEff > targetEfficiency * 0.95 ? 'var(--text-bright)' : 'red'}">${simMaxEff}</span></td>`
		html += `<td title="min - max (avg)" style="text-align:left;color: ${simAvgEff > targetEfficiency*1.15 ? 'var(--text-success)' : simAvgEff > targetEfficiency*1.05 ? 'yellow' : simAvgEff > targetEfficiency * 0.95 ? 'var(--text-bright)' : 'red' }">(${simAvgEff})</td></tr>`
		//html += `<td title="min - max (avg)" style="border-left: 1px solid var(--border-tab); text-align:right"><span style="color: ${simMinEff > targetEfficiency*1.15 ? 'var(--text-success)' : simMinEff > targetEfficiency*1.05 ? 'yellow' : simMinEff < targetEfficiency * 0.95 ? 'red' : 'var(--text-bright)'}">${Math.round(mergerGame.simResult.value.min/mergerGame.spawnCost*100)/100}</span> - <span style="color: ${simMaxEff > targetEfficiency*1.15 ? 'var(--text-success)' : simMaxEff > targetEfficiency*1 ? 'yellow' : simMaxEff < targetEfficiency * 0.95 ? 'red' : 'var(--text-bright)'}">${Math.round(mergerGame.simResult.value.max/mergerGame.spawnCost*100)/100}</span></td>`
		//html += `<td title="min - max (avg)" style="text-align:left;color: ${simAvgEff > targetEfficiency*1.15 ? 'var(--text-success)' : simAvgEff > targetEfficiency*1.05 ? 'yellow' : simAvgEff < targetEfficiency * 0.95 ? 'red' : 'var(--text-bright)'}">(${Math.round(mergerGame.simResult.value.average/mergerGame.spawnCost*100)/100})</td></tr>`
		//html += `<td title="${Math.round(mergerGame.simResult.value.min/mergerGame.spawnCost*100)/100} - ${Math.round(mergerGame.simResult.value.max/mergerGame.spawnCost*100)/100}">${Math.round(mergerGame.simResult.value.average/mergerGame.spawnCost*100)/100}</td></tr>`
		
		html += `</table>`

		for (let i of mergerGame.colors) {
			html += `<table class="foe-table"><tr><th></th>`
			for (let lev = 4; lev>0; lev--) {
				html += `<th>${mergerGame.state.unlocked[i][lev].none}<img src="${srcLinks.get(`/shared/seasonalevents/${mergerGame.event}/event/${mergerGame.event}_${mergerGame.eventData[mergerGame.event].tile}_${i}_${lev}.png`,true)}" title="${mergerGame.spawnChances[i][lev]}%"></th>`
			}
			for (let o of mergerGame.types) {
				let m = totalPieces[i].min;
				let t = totalPieces[i][o];
				html += `</tr><tr><td ${((t==m && o != "full") || (0==m && o == "full") ) ? 'style="font-weight:bold"' : ''}>${t}${(o == "full") ? '/'+ (t+m) : ''}`;
				html += `<img ${mergerGame.event=="soccer"?'class="toprightcorner"':''} src="${srcLinks.get(`${mergerGame.eventData[mergerGame.event].keyfile}${o}_${i}.png`,true)}"></td>`
				for (let lev = 4; lev>0; lev--) {
					val = table[i][lev][o];
					if (val==0) val = "-";
					html += `<td style="${val != "-" ? 'font-weight:bold;' : ''}${(o=="full" && lev==3 && table[i][lev][o]>1)?' color:red"': ''}">${val}</td>`
				}
			}
			html += `</tr></table>`
		}
		
		$('#mergerGameDialogBody').html(html);
	},

	ShowSettingsButton: () => {
        let h = [];
		h.push(`<table class="foe-table"><tr><td>`)
        h.push(`${i18n('Boxes.MergerGame.KeyValue.'+mergerGame.event)}</td><td>`);
        h.push(`<input type="Number" id="MGkeyValue" oninput="mergerGame.SaveSettings()" value="${mergerGame.settings.keyValue}"></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.MergerGame.availableCurrency.'+mergerGame.event)}</td><td>`);
        h.push(`<input type="Number" id="MGavailableCurrency" oninput="mergerGame.SaveSettings()" value="${mergerGame.settings.availableCurrency}"></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.MergerGame.targetProgress')}</td><td>`);
        h.push(`<input type="Number" id="MGtargetProgress" oninput="mergerGame.SaveSettings()" value="${mergerGame.settings.targetProgress}"></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.MergerGame.hideOverlay')}</td><td>`);
        h.push(`<input type="checkbox" id="MGhideOverlay" oninput="mergerGame.SaveSettings()"${mergerGame.settings.hideOverlay ? ' checked' : ''}></td></tr></table>`);
        
		$('#mergerGameDialogSettingsBox').html(h.join(''));
		$("#mergerGameDialogSettingsBox input").keyup(function(event) {
			if (event.keyCode === 13) {
				$("#mergerGameDialogButtons .window-settings").trigger("click");
			}
		});
    },
	
	updateSolution:(solved=null)=>{
		if (solved) {
			let out = []
			out.push(`<div>There may be configurations, where the proposed solution is not ideal!`)
			out.push(`<table class="foe-table">`)
			for (c of Object.keys(solved)) {
				for (x of solved[c].solution) {
					out.push(`<tr><td ${x.css ? `style="${x.css}"`: ``}>${x.css ? x.text: x}</td></tr>`)
				}
			}
			out.push(`</table>`)
			mergerGame.Solution = out.join('');
		}
		if ($('#mergerGameSolution').length > 0) $('#mergerGameSolutionBody').html(mergerGame.Solution||"")
	},
	ShowSolution: () => {
        
		// Don't create a new box while another one is still open
		if ($('#mergerGameSolution').length === 0) {
			
			HTML.Box({
				id: 'mergerGameSolution',
				title: 'Merger Game Solution',
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize : true,
			});
		}
		mergerGame.updateSolution();
    },
	
    SaveSettings: () => {
        mergerGame.settings.keyValue = Number($('#MGkeyValue').val()) || 1;
		mergerGame.settings.targetProgress = Number($('#MGtargetProgress').val()) || 3250;
		mergerGame.settings.availableCurrency = Number($('#MGavailableCurrency').val()) || 10500;
		mergerGame.settings.hideOverlay = $('#MGhideOverlay')[0].checked;
		localStorage.setItem('MergerGameSettings', JSON.stringify(mergerGame.settings));
        mergerGame.updateDialog();
    },

	simStart:(j=1000)=> {
		let jstart=j;
		mergerGame.cells = [0];
		mergerGame.state.energyUsed=0;
		
		for (let i=1;i<=32;i++) {
			let color= mergerGame.colors[Math.floor(Math.random()*3)];
			let level=Math.floor(Math.random()*4)+1;
			let type= mergerGame.types[Math.floor(Math.random()*2)]
			mergerGame.cells.push({id:i,keyType:{value:type},type:{value:color},level:level,isFixed:true})
		}
		mergerGame.state.maxProgress=0;
		for (let x of mergerGame.cells) {
			if (x.isFixed) mergerGame.state.maxProgress += mergerGame.levelValues[x.level];
		};

		mergerGame.updateTable();
		mergerGame.ShowDialog();
		while (j>0) {
			mergerGame.simSpawn()
			j--;
			if (mergerGame.simResult.progress.max==0) break
		}
	},
	simSpawn:()=> {
		let x={}
		x["id"] = mergerGame.cells.length;
		x["isFixed"] = false;
		x["keyType"]={value:"none"}
		let c=Math.floor(Math.random()*100);
		if (c<14) {
			x["type"]={value:mergerGame.colors[2]};
			x["level"]=1;
		} else if (c<22) {
			x["type"]={value:mergerGame.colors[2]};
			x["level"]=2;
		} else if (c<27) {
			x["type"]={value:mergerGame.colors[2]};
			x["level"]=3;
		} else if (c<30) {
			x["type"]={value:mergerGame.colors[2]};
			x["level"]=4;
		} else if (c<44) {
			x["type"]={value:mergerGame.colors[0]};
			x["level"]=1;
		} else if (c<52) {
			x["type"]={value:mergerGame.colors[0]};
			x["level"]=2;
		} else if (c<57) {
			x["type"]={value:mergerGame.colors[0]};
			x["level"]=3;
		} else if (c<60) {
			x["type"]={value:mergerGame.colors[0]};
			x["level"]=4;
		} else if (c<79) {
			x["type"]={value:mergerGame.colors[1]};
			x["level"]=1;
		} else if (c<89) {
			x["type"]={value:mergerGame.colors[1]};
			x["level"]=2;
		} else if (c<96) {
			x["type"]={value:mergerGame.colors[1]};
			x["level"]=3;
		} else {
			x["type"]={value:mergerGame.colors[1]};
			x["level"]=4;
		}
		mergerGame.cells.push(x);
		mergerGame.state.energyUsed+=mergerGame.spawnCost;
		mergerGame.updateTable();
		mergerGame.ShowDialog();
	},

	solve:() => {
		let type1 = mergerGame.types[1],
			type2 = mergerGame.types[0];
		
		let solved = {}
		
		for (let c of mergerGame.colors) {
			let locked= {}
			locked[type1]=[]
			locked[type2]=[]
			let free = {full:[], none:[]}
			free[type1]=[]
			free[type2]=[]
			for (let t of mergerGame.types.concat(["none"])) {
				for (let l of [1,2,3,4]) {
					free[t].push(mergerGame.state.unlocked[c][l][t])
					if (t=="full"||t=="none") continue
					locked[t].push(mergerGame.state.table[c][l][t]-mergerGame.state.unlocked[c][l][t]);
					
				}
			}
			solved[c] = mergerGame.solver(locked,free,c,true);
		}

		let progress = 0
		for (let c of mergerGame.colors) {
			progress += solved[c].progress;
		}
		mergerGame.solved.progress = progress;
		//keys
		let keys = 0
		for (let c of mergerGame.colors) {
			keys += solved[c].keys;
		}
		mergerGame.solved.keys = keys;
		mergerGame.simResult = mergerGame.simulateNextSpawn(solved);
		mergerGame.updateSolution(solved)
	},
	simulateNextSpawn:(solved) => {
		let keys = {min:10,max:0,average:0};
		let progress = {min:100,max:0,average:0};
		let value = {min:100,max:0,average:0}
		for (let c of mergerGame.colors) {
			for (let l of [1,2,3,4]) {
					let free = window.structuredClone(solved[c].free)
					free["none"][l-1] += 1
					let simulated = mergerGame.solver(window.structuredClone(solved[c].locked),window.structuredClone(free),c,true)
					let addKeys = simulated.keys - solved[c].keys;
					let addProgress = simulated.progress - solved[c].progress;
					let addValue = simulated.keys*mergerGame.settings.keyValue + simulated.progress - solved[c].progress - solved[c].keys*mergerGame.settings.keyValue;
					if (addKeys<keys.min) keys.min = addKeys;
					if (addKeys>keys.max) keys.max = addKeys;
					keys.average += mergerGame.spawnChances[c][l]/100*addKeys;
					if (addProgress<progress.min) progress.min = addProgress;
					if (addProgress>progress.max) progress.max = addProgress;
					progress.average += mergerGame.spawnChances[c][l]/100*addProgress;
					if (addValue<value.min) value.min = addValue;
					if (addValue>value.max) value.max = addValue;
					value.average += mergerGame.spawnChances[c][l]/100*addValue;
			}
		}
		return {keys:keys,progress:progress,value:value}
	}, 

	checkInconsistencies:(solved,c) => {
		let best = window.structuredClone(solved);
		for (let l of [1,2,3,4]) {
			if (solved.free.none[l-1] == 0) continue 
			let free = window.structuredClone(solved.free),
				locked=window.structuredClone(solved.locked);
			free["none"][l-1] -= 1;
			let simulated = mergerGame.solver(locked,free,c);
			if (simulated.keys*mergerGame.settings.keyValue+simulated.progress>best.keys*mergerGame.settings.keyValue+best.progress) best = window.structuredClone(simulated);
		}
		if (solved.progress>best.progress) {
			best.solution.push({text:"CHECK FOR REMAINING MERGES - solution might have ignored a piece", css:"background:red,color:black"})
			best.progress = solved.progress;
		}
		return best
	}, 

	solver: (locked,free, color,sim=false) =>{
		let result1 = mergerGame.solver1(window.structuredClone(locked),window.structuredClone(free),color);
		let result2 = mergerGame.solver2(window.structuredClone(locked),window.structuredClone(free),color);
		let result = null

		if (result1.keys*mergerGame.settings.keyValue+result1.progress>result2.keys*mergerGame.settings.keyValue+result2.progress) 
			result = result1
		else
			result = result2;
		
		if (sim) {
			result = mergerGame.checkInconsistencies(result,color)
		}
		
		return result;
		
	},

	solver1:(locked,free, color)=>{ //modified version of Moos solver - generally better but also has some oddities
		let lockedO = window.structuredClone(locked),
			freeO = window.structuredClone(free),
			type1 = mergerGame.types[0],
			type2 = mergerGame.types[1],
			total1_ = locked[type1].reduce((a, b) => a + b, 0)+free[type1].reduce((a, b) => a + b, 0),
			total2_ = locked[type2].reduce((a, b) => a + b, 0)+free[type2].reduce((a, b) => a + b, 0),
			total1_2 = total1_ - locked[type1][0],
			total2_2 = total2_ - locked[type2][0],
			startProgress = 0,
			Solution=[],
			out = (type) => mergerGame.eventData[mergerGame.event].solverOut[type];

		//Progress:
		for (let t of [type1,type2]) {
			for (let l of [1,2,3,4]) {
				startProgress += locked[t][l-1]*mergerGame.levelValues[l]
			}
		}
		
		Solution.push ({text:"=======Modified Solver=======",css: "color:"+mergerGame.eventData[mergerGame.event].CSScolors[color]})
		//Solution.push ("==Level 1 Merges==")
		while (true) {
			if (free.none[0] == 0) break;
			
			if (locked[type2][0] == 0 && locked[type1][0] == 0) {
				if (free.none[0] >= 2) {
					free.none[0] -= 2
					free.none[1] += 1
					Solution.push ("Free L1 + Free L1")
					continue;
				} else break;
			}
			let pick = null
			if (total2_2 == total1_2) {
				if (locked[type1][0] > locked[type2][0])
					pick = type1
				else
					pick = type2
			} else if (total2_2 > total1_2) {
				if (locked[type1][0] > 0)
					pick = type1
				else
					pick = type2
			} else {
				if (locked[type2][0] > 0)
					pick = type2
				else
					pick = type1
			}        
			if (pick == type1) {
				free.none[0] -= 1
				free[type1][1] += 1
				locked[type1][0] -= 1
				total1_2 += 1
				Solution.push (`Free L1 + Locked L1 ${out(type1)}`)
			} else {
				free.none[0] -= 1
				free[type2][1] += 1
				locked[type2][0] -= 1
				total2_2 += 1
				Solution.push (`Free L1 + Locked L1 ${out(type2)}`)
			}
		}

		//Level 4 + 3 easy cleanup
		while (true) {
			if (free.none[3] > 0 && locked[type2][3] > 0 && locked[type1][3] > 0) {
				free.none[3] -= 1
				locked[type1][3] -= 1
				locked[type2][3] -= 1
				free.full[3] += 1
				Solution.push (`Free L4 + Locked L4 ${out(type1)} + Locked L4 ${out(type2)}`)
			} else if (free[type1][3] > 0 && locked[type2][3]>0) {
				free[type1][3] -= 1
				locked[type2][3] -= 1
				free.full[3] += 1
				Solution.push (`Free L4 ${out(type1)} + Locked L4 ${out(type2)}`)
			} else if (free[type2][3] > 0 && locked[type1][3]>0) {
				free[type2][3] -= 1
				locked[type1][3] -= 1
				free.full[3] += 1
				Solution.push (`Free L4 ${out(type2)} + Locked L4 ${out(type1)}`)
			} else if (free.none[2] >= locked[type2][3] + locked[type1][3] && 
						locked[type2][3] > 0 && locked[type1][2]>0) {
				locked[type2][3] -= 1
				locked[type1][2] -= 1
				free.none[2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 + Locked L3 ${out(type1)} + Locked L4 ${out(type2)}`)
			} else if (free.none[2] >= locked[type2][3] + locked[type1][3] && 
						locked[type1][3] > 0 && locked[type2][2]>0) {
				locked[type2][2] -= 1
				locked[type1][3] -= 1
				free.none[2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 + Locked L3 ${out(type2)} + Locked L4 ${out(type1)}`)
			} else if (free.none[2]> 0 && free.none[2] < locked[type2][3] + locked[type1][3] && 
						locked[type2][2]+locked[type2][1]+locked[type2][0]>=locked[type1][2]+locked[type1][1]+locked[type1][0] &&
						locked[type2][3] > 0 && locked[type1][2]>0) {
				locked[type2][3] -= 1
				locked[type1][2] -= 1
				free.none[2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 + Locked L3 ${out(type1)} + Locked L4 ${out(type2)}`)
			} else if (free.none[2]> 0 && free.none[2] < locked[type2][3] + locked[type1][3] && 
						locked[type2][2]+locked[type2][1]+locked[type2][0]<=locked[type1][2]+locked[type1][1]+locked[type1][0] &&
						locked[type1][3] > 0 && locked[type2][2]>0) {
				locked[type2][2] -= 1
				locked[type1][3] -= 1
				free.none[2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 + Locked L3 ${out(type2)} + Locked L4 ${out(type1)}`)
			} else break
		}

		let total1_3 = locked[type1][2] + locked[type1][3] + free[type1][2] + free[type1][3];
		let total2_3 = locked[type2][2] + locked[type2][3] + free[type2][2] + free[type2][3];
		//Solution.push ("==Level 2 Merges==")
		let occupied1_3=0;
		let occupied2_3=0;
		while (true) {
			
			if (free.none[1] > free[type2][1] && locked[type1][1] > 0 && (locked[type2][2]+free[type2][2]-occupied2_3) > 0 && (total1_3<=total2_3 || locked[type2][1] == 0 )) {
				free.none[1] -= 1;
				locked[type1][1] -= 1;
				free[type1][2] += 1;
				total1_3 +=1;
				occupied1_3 += 1;
				occupied2_3 += 1;
				Solution.push (`Free L2 + Locked L2 ${out(type1)}`)
			} else if (free.none[1] > free[type1][1] &&  locked[type2][1] > 0 && (locked[type1][2]+free[type1][2]-occupied1_3) > 0) {
				free.none[1] -= 1
				locked[type2][1] -= 1
				free[type2][2] += 1
				total2_3 +=1;
				occupied1_3 += 1;
				occupied2_3 += 1;
				Solution.push (`Free L2 + Locked L2 ${out(type2)}`)
			} else if (free.none[1] > 1 && free.none[1] > free[type1][1]+free[type2][1] && (locked[type1][1]> 0) && (locked[type2][1]> 0) && (locked[type1][2] + free[type1][2] -occupied1_3> 0) && (locked[type2][2] + free[type2][2] -occupied2_3> 0)) {
				free.none[1] -= 1
				locked[type1][1] -= 1
				free[type1][2] += 1
				total1_3 +=1;
				Solution.push (`Free L2 + Locked L2 ${out(type1)}`)
				free.none[1] -= 1
				locked[type2][1] -= 1
				free[type2][2] += 1
				total2_3 +=1;
				Solution.push (`Free L2 + Locked L2 ${out(type2)}`)
				occupied1_3 += 2;
				occupied2_3 += 2;
			} else if (free[type1][1]> 0 && locked[type2][1]> 0 && (locked[type1][2] + free[type1][2] + locked[type2][2] + free[type2][2] - occupied1_3 - occupied2_3 - free.none[2] > 0)) {
				free[type1][1] -= 1
				locked[type2][1] -= 1
				free.full[2] += 1
				if (locked[type1][2]+free[type1][2]-occupied1_3>free[type2][2]+locked[type2][2]-occupied2_3) 
					occupied1_3 += 1 
				else 
					occupied2_3 += 1;
				Solution.push (`Free L2 ${out(type1)} + Locked L2 ${out(type2)}`)
			} else if (free[type2][1]> 0 && locked[type1][1]> 0 && (locked[type1][2] + free[type1][2] + locked[type2][2] + free[type2][2] - occupied1_3 - occupied2_3 - free.none[2] > 0)) {
				free[type2][1] -= 1
				locked[type1][1] -= 1
				free.full[2] += 1
				if (locked[type1][2]+free[type1][2]-occupied1_3>free[type2][2]+locked[type2][2]-occupied2_3) 
					occupied1_3 += 1 
				else 
					occupied2_3 += 1;
				Solution.push (`Free L2 ${out(type2)} + Locked L2 ${out(type1)} (1)`)
			} else if (free.none[1] > 1 && free.none[1] > free[type1][1]+free[type2][1] && (locked[type1][1] + free[type1][1] > 0) && (locked[type2][1] + free[type2][1] > 0) && (locked[type1][2] + free[type1][2] -occupied1_3> 0) && (locked[type2][2] + free[type2][2] -occupied2_3> 0)) {
				if (locked[type1][1] > 0) {
					free.none[1] -= 1
					locked[type1][1] -= 1
					free[type1][2] += 1
					Solution.push (`Free L2 + Locked L2 ${out(type1)}`)
				} else {
					free.none[1] -= 1
					free[type1][1] -= 1
					free[type1][2] += 1
					Solution.push (`Free L2 + Free L2 ${out(type1)}`)
				}
				if (locked[type2][1] > 0) {
					free.none[1] -= 1
					locked[type2][1] -= 1
					free[type2][2] += 1
					Solution.push (`Free L2 + Locked L2 ${out(type2)}`)
				} else {
					free.none[1] -= 1
					free[type2][1] -= 1
					free[type2][2] += 1
					Solution.push (`Free L2 + Free L2 ${out(type2)}`)
				}
				occupied1_3 += 2;
				occupied2_3 += 2;
			} else if (free[type1][1] > 0 && locked[type2][1] > 0) {
				free[type1][1] -= 1
				free.full[2] += 1
				locked[type2][1] -= 1
				Solution.push (`Free L2 ${out(type1)} + Locked L2 ${out(type2)}`)
			} else if (free[type2][1] > 0 && locked[type1][1] > 0) {
				free[type2][1] -= 1
				free.full[2] += 1
				locked[type1][1] -= 1
				Solution.push (`Free L2 ${out(type2)} + Locked L2 ${out(type1)} (2)`)
			} else if (free[type2][1] > 0 && free[type1][1] > 0) {
				free[type2][1] -= 1
				free[type1][1] -= 1
				free.full[2] += 1
				Solution.push (`Free L2 ${out(type2)} + Free L2 ${out(type1)} (1)`)
			} else if (free.none[1] > 0 && (locked[type1][1] + locked[type2][1]) > 0) {
				let pick = null
				if (total2_3 == total1_3) {
					if (total2_ > total1_) {
						if (locked[type1][1] > 0)
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][1] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if (total2_3 > total1_3) {
					if (locked[type1][1] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][1] > 0)
						pick = type2
					else
						pick = type1
				}
				if (pick == type1) {
					free.none[1] -= 1
					free[type1][2] += 1
					locked[type1][1] -= 1
					total1_3 += 1
					Solution.push (`Free L2 + Locked L2 ${out(type1)}`)
				} else {
					free.none[1] -= 1
					free[type2][2] += 1
					locked[type2][1] -= 1
					total2_3 += 1
					Solution.push (`Free L2 + Locked L2 ${out(type2)}`)
				}
			} else if (free[type1][1] > 0 && locked[type1][1] > 0) {
				free[type1][1] -= 1
				locked[type1][1] -= 1
				free[type1][2] += 1
				Solution.push (`Free L2 ${out(type1)} + Locked L2 ${out(type1)}`)
			} else if (free[type2][1] > 0 && locked[type2][1] > 0) {
				free[type2][1] -= 1
				locked[type2][1] -= 1
				free[type2][2] += 1
				Solution.push (`Free L2 ${out(type2)} + Locked L2 ${out(type2)}`)
			} else if (free[type2][1] > 0 && free.none[1] > 0) {
				free[type2][1] -= 1
				free.none[1] -= 1
				free[type2][2] += 1
				Solution.push (`Free L2 + Free L2 ${out(type2)}`)
			} else if (free[type1][1] > 0 && free.none[1] > 0) {
				free[type1][1] -= 1
				free.none[1] -= 1
				free[type1][2] += 1
				Solution.push (`Free L2 + Free L2 ${out(type1)}`)
			} else if (free.none[1] >= 2) {
				free.none[1] -= 2
				free.none[2] += 1
				Solution.push ("Free L2 + Free L2")
			} else if (free[type1][1] >= 2) {
				free[type1][1] -= 2
				free[type1][2] += 1
				Solution.push (`Free L2 ${out(type1)} + Free L2 ${out(type1)}`)
			} else if (free[type2][1] >= 2) {
				free[type2][1] -= 2
				free[type2][2] += 1
				Solution.push (`Free L2 ${out(type2)} + Free L2 ${out(type2)}`)
			} else break
		}      
		//Solution.push ("==Level 3 Merges==")
		let total1_4 = locked[type1][3] + free[type1][3];
		let total2_4 = locked[type2][3] + free[type2][3];
		let occupied1_4=0;
		let occupied2_4=0;
		while (true) {
			
			if (free.none[2] >= locked[type1][2]+locked[type2][2]+free[type1][2]+free[type2][2] + free["full"][2] && locked[type1][2]+locked[type2][2]+free[type1][2]+free[type2][2]+ free["full"][2] > 0) {
				for (let x=0; x<locked[type1][2];x++) Solution.push (`Free L3 + Locked L3 ${out(type1)}`)
				free[type1][3] += locked[type1][2];
				for (let x=0; x<free[type1][2];x++) Solution.push (`Free L3 + Free L3 ${out(type1)}`)
				free[type1][3] += free[type1][2];
				for (let x=0; x<locked[type2][2];x++) Solution.push (`Free L3 + Locked L3 ${out(type2)}`)
				free[type2][3] += locked[type2][2];
				for (let x=0; x<free[type2][2];x++) Solution.push (`Free L3 + Free L3 ${out(type2)}`)
				free[type2][3] += free[type2][2];
				for (let x=0; x<free["full"][2];x++) Solution.push (`Free L3 + Free L3 full`)
				free["full"][3] += free["full"][2];
				
				free.none[2] -= locked[type1][2]+locked[type2][2]+free[type1][2]+free[type2][2]+free["full"][2];
				locked[type1][2] = 0;
				free[type1][2] = 0;
				locked[type2][2] = 0;
				free[type2][2] = 0;
				free["full"][2] = 0;
				
			} else if (free.none[2] > 0 && locked[type1][2] > 0 && (locked[type2][3]+free[type2][3]-occupied2_4) > 0 && (total1_4<=total2_4 || locked[type2][2]==0)) {
				free.none[2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				Solution.push (`Free L3 + Locked L3 ${out(type1)} `)
				total1_4 +=1;
				occupied1_4 +=1;
				occupied2_4 +=1;
			} else if (free.none[2] > 0 &&  locked[type2][2] > 0 && (locked[type1][3]+free[type1][3]-occupied1_4) > 0) {
				free.none[2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				Solution.push (`Free L3 + Locked L3 ${out(type2)}`)
				total2_4 +=1;
				occupied1_4 +=1;
				occupied2_4 +=1;
			} else if (free.none[2] > 1 && (locked[type1][2] + free[type1][2] > 0) && (locked[type2][2] + free[type2][2] > 0) && (locked[type1][3] + free[type1][3] - occupied1_4 > 0) && (locked[type2][3] + free[type2][3] - occupied2_4 > 0)) {
				//console.log("L3 double used")
				if (locked[type1][2] > 0) {
					free.none[2] -= 1
					locked[type1][2] -= 1
					free[type1][3] += 1
					Solution.push (`Free L3 + Locked L3 ${out(type1)}`)
				} else {
					free.none[2] -= 1
					free[type1][2] -= 1
					free[type1][3] += 1
					Solution.push (`Free L3 + Free L3 ${out(type1)} `)
				}
				if (locked[type2][2] > 0) {
					free.none[2] -= 1
					locked[type2][2] -= 1
					free[type2][3] += 1
					Solution.push (`Free L3 + Locked L3 ${out(type2)}`)
				} else {
					free.none[2] -= 1
					free[type2][2] -= 1
					free[type2][3] += 1
					Solution.push (`Free L3 + Free L3 ${out(type2)}`)
				}
				occupied1_4 += 2;
				occupied2_4 += 2;
				
			} else if (free[type1][2] > 0 && locked[type2][2] > 0) {
				free[type1][2] -= 1
				locked[type2][2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 ${out(type1)} + Locked L3 ${out(type2)}`)
			} else if ( free[type2][2] > 0 && locked[type1][2] > 0) {
				free[type2][2] -= 1
				locked[type1][2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 ${out(type2)} + Locked L3 ${out(type1)}`)
			} else if ( free[type2][2] > 0 && free[type1][2] > 0) {
				free[type2][2] -= 1
				free[type1][2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 ${out(type2)} + Free L3 ${out(type1)}`)
			} else if ( free.none[2] > 0 && locked[type1][2] > 0 && (locked[type2][3] + free[type2][3] - occupied2_4) > 0) {
				free.none[2] -= 1
				locked[type1][2] -= 1
				locked[type1][3] += 1
				occupied1_4 +=1
				occupied2_4 += 1
				Solution.push (`Free L3 + Locked L3 ${out(type1)}`)
				
			} else if ( free.none[2] > 0 && locked[type2][2] > 0 && (locked[type1][3] + free[type1][3] - occupied1_4) > 0) {
				free.none[2] -= 1
				locked[type2][2] -= 1
				locked[type2][3] += 1
				occupied1_4 +=1
				occupied2_4 += 1
				Solution.push (`Free L3 + Locked L3 ${out(type2)}`)
				
			} else if (free.none[2] > 0 && free[type1][2] > 0 && (locked[type2][3] + free[type2][3] - occupied2_4) > 0) {
				free.none[2] -= 1
				free[type1][2] -= 1
				free[type1][3] += 1
				occupied1_4 +=1
				occupied2_4 += 1
				Solution.push (`Free L3 + Free L3 ${out(type1)} `)
				
			} else if (free.none[2] > 0 &&  free[type2][2] > 0 && (locked[type1][3] + free[type1][3] - occupied1_4) > 0) {
				free.none[2] -= 1
				free[type2][2] -= 1
				free[type2][3] += 1
				occupied1_4 += 1
				occupied2_4 += 1
				Solution.push (`Free L3 + Free L3 ${out(type2)}`)

			} else if (free[type1][2] >0 && locked[type1][2]>0 && (locked[type2][3] + free[type2][3] - occupied2_4) > 0) {
				free[type1][2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				occupied1_4 += 1
				occupied2_4 += 1
				Solution.push (`Free L3 ${out(type1)} + Locked L3 ${out(type1)}`)
			
			} else if (free[type2][2] >0 && locked[type2][2]>0 && (locked[type1][3] + free[type1][3] - occupied1_4)>0) {
				free[type2][2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				occupied1_4 += 1
				occupied2_4 += 1
				Solution.push (`Free L3 ${out(type2)} + Locked L3 ${out(type2)}`)
			
			} else if ((free.none[2]+locked[type1][2]+locked[type2][2] - free.full[2] > 1) && free.none[2]>1 && locked[type2][2]>0 && locked[type1][2]>0) {
				free.none[2] -= 2
				locked[type2][2] -= 1
				locked[type1][2] -= 1
				free[type2][3] += 1
				free[type1][3] += 1
				occupied1_4 += 1
				occupied2_4 += 1
				Solution.push (`Free L3 + Locked L3 ${out(type2)}`)
				Solution.push (`Free L3 + Locked L3 ${out(type1)}`)
			
			} else if (free.full[2] > 0 && ((free.none[2] + free[type2][2] + free[type1][2] + locked[type2][2] + locked[type1][2]) > 0 || free.full[2] >= 2)) {
				if (locked[type2][2] > 0) {
					free.full[2] -= 1
					locked[type2][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Locked L3 ${out(type2)}`)
				} else if ( locked[type1][2] > 0) {
					free.full[2] -= 1
					locked[type1][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Locked L3 ${out(type1)}`)
				} else if ( free.none[2] > 0) {
					free.full[2] -= 1
					free.none[2] -= 1
					free.full[3] += 1
					Solution.push ("Free L3 Full + Free L3")
				} else if ( free[type1][2] > 0) {
					free.full[2] -= 1
					free[type1][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Free L3 ${out(type1)}`)
				} else if ( free[type2][2] > 0) {
					free.full[2] -= 1
					free[type2][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Free L3 ${out(type2)}`)
				} else {
					free.full[2] -= 2
					free.full[3] += 1
					Solution.push ("Free L3 Full + Free L3 Full")
				}
			} else if ( free.none[2] > 0 && (locked[type1][2] + locked[type2][2]) > 0) {
				pick = null
				if (total2_4 == total1_4) {
					if (total2_ > total1_) {
						if (locked[type1][2] > 0)
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][2] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if ( total2_4 > total1_4) {
					if (locked[type1][2] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][2] > 0)
						pick = type2
					else
						pick = type1
				}
				if (pick == type1) {
					free.none[2] -= 1
					free[type1][3] += 1
					locked[type1][2] -= 1
					total1_4 += 1
					Solution.push (`Free L3 + Locked L3 ${out(type1)}`)
				} else {
					free.none[2] -= 1
					free[type2][3] += 1
					locked[type2][2] -= 1
					total2_4 += 1
					Solution.push (`Free L3 + Locked L3 ${out(type2)}`)
				}
			} else if ( free[type1][2] > 0 && locked[type1][2] > 0) {
				free[type1][2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				Solution.push (`Free L3 ${out(type1)} + Locked L3 ${out(type1)}`)
			} else if ( free[type2][2] > 0 && locked[type2][2] > 0) {
				free[type2][2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				Solution.push (`Free L3 ${out(type2)} + Locked L3 ${out(type2)}`)
			} else if ( free[type2][2] > 0 && free.none[2] > 0) {
				free[type2][2] -= 1
				free.none[2] -= 1
				free[type2][3] += 1
				Solution.push (`Free L3 + Free L3 ${out(type2)}`)
			} else if ( free[type1][2] > 0 && free.none[2] > 0) {
				free[type1][2] -= 1
				free.none[2] -= 1
				free[type1][3] += 1
				Solution.push (`Free L3 + Free L3 ${out(type1)}`)
			} else if ( free.none[2] >= 2) {
				free.none[2] -= 2
				free.none[3] += 1
				Solution.push ("Free L3 + Free L3")
			} else if ( free[type1][2] >= 2) {
				free[type1][2] -= 2
				free[type1][3] += 1
				Solution.push (`Free L3 ${out(type1)} + Free L3 ${out(type1)}`)
			} else if ( free[type2][2] >= 2) {
				free[type2][2] -= 2
				free[type2][3] += 1
				Solution.push (`Free L3 ${out(type2)} + Free L3 ${out(type2)}`)
			} else break
		}            
		//Solution.push ("==Level 4 Merges==")
		total2_4 = locked[type2][3]
		total1_4 = locked[type1][3]
		while (true) {
			if (free[type1][3] > 0 && locked[type2][3] > 0) {
				free[type1][3] -= 1
				free.full[3] += 1
				locked[type2][3] -= 1
				Solution.push (`Free L4 ${out(type1)} + Locked L4 ${out(type2)}`)
			} else if ( free[type2][3] > 0 && locked[type1][3] > 0) {
				free[type2][3] -= 1
				free.full[3] += 1
				locked[type1][3] -= 1
				Solution.push (`Free L4 ${out(type2)} + Locked L4 ${out(type1)}`)
			} else if ( free[type2][3] > 0 && free[type1][3] > 0) {
				free[type2][3] -= 1
				free[type1][3] -= 1
				free.full[3] += 1
				Solution.push (`Free L4 ${out(type2)} + Free L4 ${out(type1)}`)
			} else if ( free.none[3] > 0 && (locked[type1][3] + locked[type2][3]) > 0) {
				pick = null
				if (total2_4 == total1_4) {
					if (total2_ > total1_) {
						if (locked[type1][3] > 0) 
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][3] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if ( total2_4 > total1_4) {
					if (locked[type1][3] > 0) 
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][3] > 0)
						pick = type2
					else
						pick = type1
				}   
				if (pick == type1) {
					free.none[3] -= 1
					free[type1][3] += 1
					locked[type1][3] -= 1
					total1_4 -= 1
					Solution.push (`Free L4 + Locked L4 ${out(type1)}`)
				} else {
					free.none[3] -= 1
					free[type2][3] += 1
					locked[type2][3] -= 1
					total2_4 -= 1
					Solution.push (`Free L4 + Locked L4 ${out(type2)}`)
				}
			} else if (free.full[3] > 0 && (locked[type2][3] + locked[type1][3]) > 0) {
				if (locked[type2][3] > 0) {
					free.full[3] -= 1
					locked[type2][3] -= 1
					free.full[3] += 1
					Solution.push (`Free L4 Full + Locked L4 ${out(type2)}`)
				} else if (locked[type1][3] > 0) {
					free.full[3] -= 1
					locked[type1][3] -= 1
					free.full[3] += 1
					Solution.push (`Free L4 Full + Locked L4 ${out(type1)}`)
				}
			} else break
		}
		//Solution.push ("==Results==")
		let endProgress = 0;
		//Progress:
		for (let t of [type1,type2]) {
			for (let l of [1,2,3,4]) {
				endProgress += locked[t][l-1]*mergerGame.levelValues[l]
			}
		}
		//Progress:
		let keys = 0
		for (let l of [3,4]) {
			keys += free["full"][l-1]*mergerGame.keyValues[l]
		}
			
		return {keys:keys, progress:startProgress-endProgress,locked:lockedO, free:freeO,solution:Solution}
	},
	debugginfo:(x)=>{
		let out=[`Original (color ${x.color}):`];
		//out.push(`freeBot = ${JSON.stringify(x.solved[x.color].free[type2])}`)
		//out.push(`freeTop = ${JSON.stringify(x.solved[x.color].free[type1])}`)
		//out.push(`freeFull = ${JSON.stringify(x.solved[x.color].free.full)}`)
		//out.push(`free = ${JSON.stringify(x.solved[x.color].free.none)}`)
		//out.push(`lockedB = ${JSON.stringify(x.solved[x.color].locked[type2])}`)
		//out.push(`lockedT = ${JSON.stringify(x.solved[x.color].locked[type1])}`)
		//out.push(``);
		out.push(`modified by level ${x.level}):`);
		//out.push(`freeBot = ${JSON.stringify(x.free[type2])}`)
		//out.push(`freeTop = ${JSON.stringify(x.free[type1])}`)
		//out.push(`freeFull = ${JSON.stringify(x.free.full)}`)
		//out.push(`free = ${JSON.stringify(x.free.none)}`)
		//out.push(`lockedB = ${JSON.stringify(x.solved[x.color].locked[type2])}`)
		//out.push(`lockedT = ${JSON.stringify(x.solved[x.color].locked[type1])}`)
		out.push(`mergerGame.cells = ${JSON.stringify(mergerGame.cells)}`)
		out.push(`mergerGame.updateTable()`)
		out.push(`mergerGame.ShowDialog()`)
		return out.join('\n')
	},
	solver2:(locked,free, color)=>{ //Moo Original
		let lockedO = window.structuredClone(locked),
			freeO = window.structuredClone(free),
			type1 = mergerGame.types[0],
			type2 = mergerGame.types[1],
			total1_ = locked[type1].reduce((a, b) => a + b, 0)+free[type1].reduce((a, b) => a + b, 0),
			total2_ = locked[type2].reduce((a, b) => a + b, 0)+free[type2].reduce((a, b) => a + b, 0),
			total1_2 = total1_ - locked[type1][0],
			total2_2 = total2_ - locked[type2][0],
			startProgress = 0,
			Solution=[],
			out = (type) => mergerGame.eventData[mergerGame.event].solverOut[type];
		//Progress:
		for (let t of [type1,type2]) {
			for (let l of [1,2,3,4]) {
				startProgress += locked[t][l-1]*mergerGame.levelValues[l]
			}
		}
		
		Solution.push ({text:"=======Mooing cat's solver=======",css:"color:"+mergerGame.eventData[mergerGame.event].CSScolors[color]})
		//Solution.push ("==Level 1 Merges==")
		while (true) {
			if (free.none[0] == 0) break;
			
			if (locked[type2][0] == 0 && locked[type1][0] == 0) {
				if (free.none[0] >= 2) {
					free.none[0] -= 2
					free.none[1] += 1
					Solution.push ("Free L1 + Free L1")
					continue;
				} else break;
			}
			let pick = null
			if (total2_2 == total1_2) {
				if (total2_ > total1_) {
					if (locked[type1][0] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][0] > 0)
						pick = type2
					else
						pick = type1
				}
			} else if (total2_2 > total1_2) {
				if (locked[type1][0] > 0)
					pick = type1
				else
					pick = type2
			} else {
				if (locked[type2][0] > 0)
					pick = type2
				else
					pick = type1
			}        
			if (pick == type1) {
				free.none[0] -= 1
				free[type1][1] += 1
				locked[type1][0] -= 1
				total1_2 += 1
				Solution.push (`Free L1 + Locked L1 ${out(type1)}`)
			} else {
				free.none[0] -= 1
				free[type2][1] += 1
				locked[type2][0] -= 1
				total2_2 += 1
				Solution.push (`Free L1 + Locked L1 ${out(type2)}`)
			}
		}
		let total2_3 = locked[type2][2] + locked[type2][3];
		let total1_3 = locked[type1][2] + locked[type1][3];
		//Solution.push ("==Level 2 Merges==")
		while (true) {
			
			
			if (free.none[1] > 1 && (locked[type1][1] + free[type1][1] > 0) && (locked[type2][1] + free[type2][1] > 0) && (locked[type1][2] + free[type1][2] > 0) && (locked[type2][2] + free[type2][2] > 0)) {
				if (locked[type1][1] > 0) {
					free.none[1] -= 1
					locked[type1][1] -= 1
					free[type1][2] += 1
					Solution.push (`Free L2 + Locked L2 ${out(type1)}`)
				} else {
					free.none[1] -= 1
					free[type1][1] -= 1
					free[type1][2] += 1
					Solution.push (`Free L2 + Free L2 ${out(type1)}`)
				}
				if (locked[type2][1] > 0) {
					free.none[1] -= 1
					locked[type2][1] -= 1
					free[type2][2] += 1
					Solution.push (`Free L2 + Locked L2 ${out(type2)}`)
				} else {
					free.none[1] -= 1
					free[type2][1] -= 1
					free[type2][2] += 1
					Solution.push (`Free L2 + Free L2 ${out(type2)}`)
				}
			} else if (free[type1][1] > 0 && locked[type2][1] > 0) {
				free[type1][1] -= 1
				free.full[2] += 1
				locked[type2][1] -= 1
				Solution.push (`Free L2 ${out(type1)} + Locked L2 ${out(type2)}`)
			} else if (free[type2][1] > 0 && locked[type1][1] > 0) {
				free[type2][1] -= 1
				free.full[2] += 1
				locked[type1][1] -= 1
				Solution.push (`Free L2 ${out(type2)} + Locked L2 ${out(type1)}`)
			} else if (free[type2][1] > 0 && free[type1][1] > 0) {
				free[type2][1] -= 1
				free[type1][1] -= 1
				free.full[2] += 1
				Solution.push (`Free L2 ${out(type2)} + Free L2 ${out(type1)}`)
			} else if (free.none[1] > 0 && (locked[type1][1] + locked[type2][1]) > 0) {
				let pick = null
				if (total2_3 == total1_3) {
					if (total2_ > total1_) {
						if (locked[type1][1] > 0)
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][1] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if (total2_3 > total1_3) {
					if (locked[type1][1] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][1] > 0)
						pick = type2
					else
						pick = type1
				}
				if (pick == type1) {
					free.none[1] -= 1
					free[type1][2] += 1
					locked[type1][1] -= 1
					total1_3 += 1
					Solution.push (`Free L2 + Locked L2 ${out(type1)}`)
				} else {
					free.none[1] -= 1
					free[type2][2] += 1
					locked[type2][1] -= 1
					total2_3 += 1
					Solution.push (`Free L2 + Locked L2 ${out(type2)}`)
				}
			} else if (free[type1][1] > 0 && locked[type1][1] > 0) {
				free[type1][1] -= 1
				locked[type1][1] -= 1
				free[type1][2] += 1
				Solution.push (`Free L2 ${out(type1)} + Locked L2 ${out(type1)}`)
			} else if (free[type2][1] > 0 && locked[type2][1] > 0) {
				free[type2][1] -= 1
				locked[type2][1] -= 1
				free[type2][2] += 1
				Solution.push (`Free L2 ${out(type2)} + Locked L2 ${out(type2)}`)
			} else if (free[type2][1] > 0 && free.none[1] > 0) {
				free[type2][1] -= 1
				free.none[1] -= 1
				free[type2][2] += 1
				Solution.push (`Free L2 + Free L2 ${out(type2)}`)
			} else if (free[type1][1] > 0 && free.none[1] > 0) {
				free[type1][1] -= 1
				free.none[1] -= 1
				free[type1][2] += 1
				Solution.push (`Free L2 + Free L2 ${out(type1)}`)
			} else if (free.none[1] >= 2) {
				free.none[1] -= 2
				free.none[2] += 1
				Solution.push ("Free L2 + Free L2")
			} else if (free[type1][1] >= 2) {
				free[type1][1] -= 2
				free[type1][2] += 1
				Solution.push (`Free L2 ${out(type1)} + Free L2 ${out(type1)}`)
			} else if (free[type2][1] >= 2) {
				free[type2][1] -= 2
				free[type2][2] += 1
				Solution.push (`Free L2 ${out(type2)} + Free L2 ${out(type2)}`)
			} else break
		}      
		//Solution.push ("==Level 3 Merges==")
		let total2_4 = locked[type2][3]
		let total1_4 = locked[type1][3]
		while (true) {
			
			let numtopTrios = Math.min(free.none[3],locked[type1][3],locked[type2][3])
			if (free.none[2] > 1 && (locked[type1][2] + free[type1][2] > 0) && (locked[type2][2] + free[type2][2] > 0) && (locked[type1][3] - numtopTrios + free[type1][3] > 0) && (locked[type2][3] - numtopTrios + free[type2][3] > 0)) {
				if (locked[type1][2] > 0) {
					free.none[2] -= 1
					locked[type1][2] -= 1
					free[type1][3] += 1
					Solution.push (`Free L3 + Locked L3 ${out(type1)}`)
				} else {
					free.none[2] -= 1
					free[type1][2] -= 1
					free[type1][3] += 1
					Solution.push (`Free L3 + Free L3 ${out(type1)} `)
				}
				if (locked[type2][2] > 0) {
					free.none[2] -= 1
					locked[type2][2] -= 1
					free[type2][3] += 1
					Solution.push (`Free L3 + Locked L3 ${out(type2)}`)
				} else {
					free.none[2] -= 1
					free[type2][2] -= 1
					free[type2][3] += 1
					Solution.push (`Free L3 + Free L3 ${out(type2)}`)
				}
			} else if (free[type1][2] > 0 && locked[type2][2] > 0) {
				free[type1][2] -= 1
				free.full[3] += 1
				locked[type2][2] -= 1
				Solution.push (`Free L3 ${out(type1)} + Locked L3 ${out(type2)}`)
			} else if ( free[type2][2] > 0 && locked[type1][2] > 0) {
				free[type2][2] -= 1
				free.full[3] += 1
				locked[type1][2] -= 1
				Solution.push (`Free L3 ${out(type2)} + Locked L3 ${out(type1)}`)
			} else if ( free[type2][2] > 0 && free[type1][2] > 0) {
				free[type2][2] -= 1
				free[type1][2] -= 1
				free.full[3] += 1
				Solution.push (`Free L3 ${out(type2)} + Free L3 ${out(type1)}`)
			} else if ( free.none[2] > 0 && locked[type1][2] > 0 && (locked[type2][3] - numtopTrios) > free[type1][3]) {
				free.none[2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				Solution.push (`Free L3 + Locked L3 ${out(type1)}`)
			} else if ( free.none[2] > 0 && locked[type2][2] > 0 && (locked[type1][3] - numtopTrios) > free[type2][3]) {
				free.none[2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				Solution.push (`Free L3 + Locked L3 ${out(type2)}`)
			} else if ( free.full[2] > 0 && ((free.none[2] + free[type2][2] + free[type1][2] + locked[type2][2] + locked[type1][2]) > 0 || free.full[2] >= 2)) {
				if (locked[type2][2] > 0) {
					free.full[2] -= 1
					locked[type2][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Locked L3 ${out(type2)}`)
				} else if ( locked[type1][2] > 0) {
					free.full[2] -= 1
					locked[type1][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Locked L3 ${out(type1)}`)
				} else if ( free.none[2] > 0) {
					free.full[2] -= 1
					free.none[2] -= 1
					free.full[3] += 1
					Solution.push ("Free L3 Full + Free L3")
				} else if ( free[type1][2] > 0) {
					free.full[2] -= 1
					free[type1][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Free L3 ${out(type1)}`)
				} else if ( free[type2][2] > 0) {
					free.full[2] -= 1
					free[type2][2] -= 1
					free.full[3] += 1
					Solution.push (`Free L3 Full + Free L3 ${out(type2)}`)
				} else {
					free.full[2] -= 2
					free.full[3] += 1
					Solution.push ("Free L3 Full + Free L3 Full")
				}
			} else if ( free.none[2] > 0 && (locked[type1][2] + locked[type2][2]) > 0) {
				pick = null
				if (total2_4 == total1_4) {
					if (total2_ > total1_) {
						if (locked[type1][2] > 0)
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][2] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if ( total2_4 > total1_4) {
					if (locked[type1][2] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][2] > 0)
						pick = type2
					else
						pick = type1
				}
				if (pick == type1) {
					free.none[2] -= 1
					free[type1][3] += 1
					locked[type1][2] -= 1
					total1_4 += 1
					Solution.push (`Free L3 + Locked L3 ${out(type1)}`)
				} else {
					free.none[2] -= 1
					free[type2][3] += 1
					locked[type2][2] -= 1
					total2_4 += 1
					Solution.push (`Free L3 + Locked L3 ${out(type2)}`)
				}
			} else if ( free[type1][2] > 0 && locked[type1][2] > 0) {
				free[type1][2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				Solution.push (`Free L3 ${out(type1)} + Locked L3 ${out(type1)}`)
			} else if ( free[type2][2] > 0 && locked[type2][2] > 0) {
				free[type2][2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				Solution.push (`Free L3 ${out(type2)} + Locked L3 ${out(type2)}`)
			} else if ( free[type2][2] > 0 && free.none[2] > 0) {
				free[type2][2] -= 1
				free.none[2] -= 1
				free[type2][3] += 1
				Solution.push (`Free L3 + Free L3 ${out(type2)}`)
			} else if ( free[type1][2] > 0 && free.none[2] > 0) {
				free[type1][2] -= 1
				free.none[2] -= 1
				free[type1][3] += 1
				Solution.push (`Free L3 + Free L3 ${out(type1)}`)
			} else if ( free.none[2] >= 2) {
				free.none[2] -= 2
				free.none[3] += 1
				Solution.push ("Free L3 + Free L3")
			} else if ( free[type1][2] >= 2) {
				free[type1][2] -= 2
				free[type1][3] += 1
				Solution.push (`Free L3 ${out(type1)} + Free L3 ${out(type1)}`)
			} else if ( free[type2][2] >= 2) {
				free[type2][2] -= 2
				free[type2][3] += 1
				Solution.push (`Free L3 ${out(type2)} + Free L3 ${out(type2)}`)
			} else break
		}            
		//Solution.push ("==Level 4 Merges==")
		total2_4 = locked[type2][3]
		total1_4 = locked[type1][3]
		while (true) {
			if (free[type1][3] > 0 && locked[type2][3] > 0) {
				free[type1][3] -= 1
				free.full[3] += 1
				locked[type2][3] -= 1
				Solution.push (`Free L4 ${out(type1)} + Locked L4 ${out(type2)}`)
			} else if ( free[type2][3] > 0 && locked[type1][3] > 0) {
				free[type2][3] -= 1
				free.full[3] += 1
				locked[type1][3] -= 1
				Solution.push (`Free L4 ${out(type2)} + Locked L4 ${out(type1)}`)
			} else if ( free[type2][3] > 0 && free[type1][3] > 0) {
				free[type2][3] -= 1
				free[type1][3] -= 1
				free.full[3] += 1
				Solution.push (`Free L4 ${out(type2)} + Free L4 ${out(type1)}`)
			} else if ( free.none[3] > 0 && (locked[type1][3] + locked[type2][3]) > 0) {
				pick = null
				if (total2_4 == total1_4) {
					if (total2_ > total1_) {
						if (locked[type1][3] > 0) 
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][3] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if ( total2_4 > total1_4) {
					if (locked[type1][3] > 0) 
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][3] > 0)
						pick = type2
					else
						pick = type1
				}   
				if (pick == type1) {
					free.none[3] -= 1
					free[type1][3] += 1
					locked[type1][3] -= 1
					total1_4 -= 1
					Solution.push (`Free L4 + Locked L4 ${out(type1)}`)
				} else {
					free.none[3] -= 1
					free[type2][3] += 1
					locked[type2][3] -= 1
					total2_4 -= 1
					Solution.push (`Free L4 + Locked L4 ${out(type2)}`)
				}
			} else if (free.full[3] > 0 && (locked[type2][3] + locked[type1][3]) > 0) {
				if (locked[type2][3] > 0) {
					free.full[3] -= 1
					locked[type2][3] -= 1
					free.full[3] += 1
					Solution.push (`Free L4 Full + Locked L4 ${out(type2)}`)
				} else if (locked[type1][3] > 0) {
					free.full[3] -= 1
					locked[type1][3] -= 1
					free.full[3] += 1
					Solution.push (`Free L4 Full + Locked L4 ${out(type1)}`)
				}
			} else break
		}
		//Solution.push ("==Results==")
		let endProgress = 0;
		//Progress:
		for (let t of [type1,type2]) {
			for (let l of [1,2,3,4]) {
				endProgress += locked[t][l-1]*mergerGame.levelValues[l]
			}
		}
		//Progress:
		let keys = 0
		for (let l of [3,4]) {
			keys += free["full"][l-1]*mergerGame.keyValues[l]
		}
			
		return {keys:keys, progress:startProgress-endProgress,locked:lockedO, free:freeO,solution:Solution}
	},
		}
