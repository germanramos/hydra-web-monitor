Ext.define('HydraWM.Application', {
    name: 'HydraWM',
    requires: [
        'Ext.data.JsonP',
        'Ext.ux.TabScrollerMenu',

        'HydraWM.config.Config'
    ],
    extend: 'Ext.app.Application',
    views: [
        // TODO: add views here
    ],
    controllers: [
        // TODO: add controllers here
    ],
    stores: [
        // TODO: add stores here
    ],
    
    REQUEST_INTERVAL: 2000,
    
    COLORS: [
        ["#0f7fff", "#0d6fe0", "#0c64c9", "#0a59b2", "#0950a0", "#08478e", "#073e7c"], // blue 
        ["#acff38", "#9eea33", "#8ed32e", "#7fbc29", "#6fa524", "#639320", "#567f1c"], // green
        ["#ff0a1e", "#e5091b", "#c90818", "#a30613", "#8c0510", "#75040e", "#5F030B"]  // red
    ],
    LUMINANCES: [1, 5, 2, 4, 3, 0, 6],
    
    colorAttr: "cloud",
    lastColorIndex: {},
    
    GRID_PANEL_SUFFIX: "-grid",
    TAB_PANEL_SUFFIX: "-tab",
    MODEL_SUFFIX: "Model",
    STORE_SUFFIX: "Store",
    
    apps: {},
    configWindow: null,
    maxAbsoluteChartPoints: 999,
    maxAreaChartPoints: 12,
    
    launch: function() {
        var me = this;
        me.loadUI(me.makeItems());
        me.makeNewIntervalAjaxRequest();
    },
    loadUI: function(items) {
        Ext.create('Ext.container.Viewport', {
            id: 'viewport',
            layout: {
                type: 'fit'
            },
            items: items
        });
    },
    makeNewIntervalAjaxRequest: function() {
//        console.log(">>> makeNewIntervalAjaxRequest");
        var me = this;

        var advertisementRefresherTask = {
            run: doAjax,
            interval: me.REQUEST_INTERVAL
        };

        Ext.TaskManager.start(advertisementRefresherTask);

        function doAjax() {
            Ext.Ajax.request({
                url: 'http://' + HydraWM.config.Config.config['hydraServerAddr'] + ':' + HydraWM.config.Config.config['hydraServerAdminPort'] + '/apps',
                success: function(response, request) {
                    var apps = Ext.decode(response.responseText);
                    me.deleteApps(apps);
                    me.parseApps(apps);
                    me.makeInstances(apps);
                    me.updateUI();
                    me.updateComponents(apps);
                },
                failure: function(e) {
                    console.log("Ajax error");
                }
            });
        }
    },
    deleteApps: function(apps) {
//        console.log(">>> deleteApps");
        var appsArray = [];
        for (var i = 0; i < apps.length; i++) {
            for (var appId in apps[i]) {
                appsArray.push(appId);
            }
        }
        for (var appId in this.apps) {
            if ($.inArray(appId, appsArray) === -1) {
                this.deleteApp(appId);
            }
        }
    },
    deleteApp: function(appId) {
//        console.log(">>> deleteApp");
        // Remove grid
        var grid = Ext.getCmp(appId + this.GRID_PANEL_SUFFIX);
        grid.destroy();
        // Remove Tabs
        var tabsToDestroy = [];
        var tabsContainer = Ext.getCmp('app-charts');
        for (var i = 0; i < tabsContainer.items.items.length; i++) {
            var panelId = tabsContainer.items.items[i].getId();
            if (panelId.indexOf(appId) > -1) {
                tabsToDestroy.push(tabsContainer.items.items[i]);
                // TODO: Maybe remove chart
            }
        }
        for (var i = 0; i < tabsToDestroy.length; i++) {
            tabsToDestroy[i].destroy();
        }
        
        delete this.apps[appId];
    },
    removeOldTabs: function(appId) {
//        console.log(">>> removeOldTabs");
        for (var i = 0; i < this.apps[appId].oldChartFields.length; i++) {
            if ($.inArray(this.apps[appId].oldChartFields[i], this.apps[appId].chartFields) === -1) {
                Ext.getCmp(appId + "-" + this.apps[appId].oldChartFields[i] + this.TAB_PANEL_SUFFIX).destroy();
            }
        }
    },
    parseApps: function(apps) {
//        console.log(">>> parseApps");
        for (var i in apps) {
            for (var appId in apps[i]) {
                var fields = this.newExtractFields(apps[i][appId].Instances);
                var chartFields = this.newExtractChartFields(apps[i][appId].Instances);
                if (!(appId in this.apps)) {
                    this.createApp(appId, fields, chartFields);
                } else {
                    this.apps[appId].oldFields = this.apps[appId].fields;
                    this.apps[appId].fields = fields;
                    this.apps[appId].oldChartFields = this.apps[appId].chartFields;
                    this.apps[appId].chartFields = chartFields;
                    if (!this.areFieldsEqual(this.apps[appId])) {
                        // Remove grid
                        var grid = Ext.getCmp(appId + this.GRID_PANEL_SUFFIX);
                        grid.destroy();
                        // Create new data layer
                        this.defineModel(appId, this.makeModelFields(fields));
                        this.createStore(appId);
                        // Remove tabs
                        this.removeOldTabs(appId);
                    }
                }
                break;
            }
        }
    },
    areFieldsEqual: function(app) {
//        console.log(">>> areFieldsEqual");
        var a = app.oldFields,
            b = app.fields;
        return $(a).not(b).get().length === 0 && $(b).not(a).get().length === 0;
    },
    makeInstances: function(apps) {
//        console.log(">>> makeInstances");
        var me = this;
        for (i in apps) {
            var app = apps[i];
            for (var appId in app) {
                var instance = {};
                var instances = {};
                var i = 0;
                for (var instanceId in app[appId].Instances) {
//                    if (i === 0) {
                        instance = app[appId].Instances[instanceId];
                        instance['id'] = instanceId;
//                    }
                    if (instanceId in me.apps[appId].instances) {
                        instance['color'] = me.apps[appId].instances[instanceId].color;
                    } else {
                        instance['color'] = me.getInstanceColor(instance, appId);
                    }
                    instances[instanceId] = instance;
                    i++;
                }
                me.apps[appId].instances = instances;
            }
        }
    },
    createApp: function(appId, fields, chartFields) {
//        console.log(">>> createApp");
        this.defineModel(appId, this.makeModelFields(fields));
        this.createStore(appId);
        var app = {
            'id': appId,
            'fields': fields,
            'oldField': [],
            'chartFields': chartFields,
            'oldChartFields': [],
            'charts': {
                'absolutes': {},
                'areas': {}
            },
            'instances': {}
        };
        this.apps[appId] = app;
    },
    // TODO: Refactor
    addSerieToChart: function(chart, instanceId, numberOfPoints) {
//        console.log(">>> addSerieToChart");
        var serie = {
            name: instanceId,
            data: (function() {
                // generate an array of random data
                var data = [], time = (new Date()).getTime(), i;

                // TODO: time - (interval * numOfPoints)
                for (var i = -numberOfPoints; i <= 0; i++) {
                    data.push([
                        time + i * 1000,
                        0
                    ]);
                }
                return data;
            })()
        };
        
        chart.chart.addSeries(serie, true);
    },
    // TODO: Work in progress
    removeSerieFromChart: function() {
//        console.log(">>> removeSerieFromChart");
        chart.series[i].remove();
    },
    checkIfSerieExists: function(series, serieName) {
//        console.log(">>> checkIfSerieExists");
        var createSerie = true;
        for (var k = 0; k < series.length; k++) {
            if (series[k] !== undefined && series[k].name === serieName) {
                createSerie = false;
                break;
            }
        }
        
        return createSerie;
    },
    updateUI: function() {
//        console.log(">>> updateUI");
        var apps = this.apps;
        var first = true;
        for (var i in apps) {
            var appId = apps[i].id;
            // Check if grid exists
            var grid = Ext.getCmp(appId + this.GRID_PANEL_SUFFIX);
            if (grid === undefined) {
                // Create grid
                var store = Ext.data.StoreManager.get(appId + this.STORE_SUFFIX);
                Ext.getCmp('app-grids').add(this.makeNewGridPanel(appId, store, this.makeGridColumns(apps[i].fields)));
            }
            // Check if tabs exist
            var tabsContainer = Ext.getCmp('app-charts');
            for (var j in apps[i].chartFields) {
                var attr = apps[i].chartFields[j],
                    tabPanel = Ext.getCmp(appId + "-" + attr + this.TAB_PANEL_SUFFIX);
                if (tabPanel === undefined) {
                    // Create tabPanel
                    tabsContainer.add(this.createChartsPanel(appId, attr));
                    if (first) {
                        tabsContainer.setActiveTab(0);
                        first = false;
                    }
                }
                
                // Check if serie exists
                var absoluteCharts = apps[appId].charts.absolutes[attr];
                var absoluteSeries = absoluteCharts !== undefined ? absoluteCharts.chart.series : undefined;
                var areaCharts = apps[appId].charts.areas[attr];
                var areaSeries = areaCharts !== undefined ? areaCharts.chart.series : undefined;
                for (var instanceId in apps[appId].instances) {
                    if (absoluteSeries !== undefined && this.checkIfSerieExists(absoluteSeries, instanceId)) {
                        this.addSerieToChart(apps[appId].charts.absolutes[attr], instanceId, this.maxAbsoluteChartPoints);
                    }
                    if (areaSeries !== undefined && this.checkIfSerieExists(areaSeries, instanceId)) {
                        this.addSerieToChart(apps[appId].charts.areas[attr], instanceId, this.maxAreaChartPoints);
                    }
                }
            }
        }
    },
    updateComponents: function(apps) {
//        console.log(">>> updateComponents");
        var me = this;
        var now = (new Date()).getTime(); // current time
        var records = [];
        for (var i = 0; i < apps.length; i++) {
            for (var appId in apps[i]) {
                var store = Ext.data.StoreManager.get(appId + me.STORE_SUFFIX);
                var records = [];
                var j = 0;
                for (var instanceId in apps[i][appId].Instances) {
                    // Grids
                    var record = {'id': instanceId};
                    for (var key in apps[i][appId].Instances[instanceId]) {
                        record[key] = apps[i][appId].Instances[instanceId][key];
                    }
                    // Charts
                    for (var k in me.apps[appId].chartFields) {
                        var attr = me.apps[appId].chartFields[k];
                        if (me.apps[appId].charts.absolutes[attr]) {
                            var absoluteSerie = me.apps[appId].charts.absolutes[attr].chart.series[j],
                                    areaSerie = me.apps[appId].charts.areas[attr].chart.series[j];
                            var x = now,
                                y = parseFloat(record[attr]);
                            // Absolute Charts
                            absoluteSerie.addPoint([x, y], true, true);
                            if (!(instanceId in me.apps[appId].charts.absolutes[attr].data)) {
                                me.apps[appId].charts.absolutes[attr].data[instanceId] = [];
                            }
                            if (me.apps[appId].charts.absolutes[attr].data[instanceId].length >= me.maxAbsoluteChartPoints) {
                                var extract = me.apps[appId].charts.absolutes[attr].data[instanceId].length - me.maxAbsoluteChartPoints + 1;
                                me.apps[appId].charts.absolutes[attr].data[instanceId] = me.apps[appId].charts.absolutes[attr].data[instanceId].slice(extract);
                            }
                            me.apps[appId].charts.absolutes[attr].data[instanceId].push([x, y]);
                            // Area Charts
                            areaSerie.addPoint([x, y], true, true);
                            if (!(instanceId in me.apps[appId].charts.areas[attr].data)) {
                                me.apps[appId].charts.areas[attr].data[instanceId] = [];
                            }
                            if (me.apps[appId].charts.areas[attr].data[instanceId].length >= me.maxAreaChartPoints) {
                                var extract = me.apps[appId].charts.areas[attr].data[instanceId].length - me.maxAreaChartPoints + 1;
                                me.apps[appId].charts.areas[attr].data[instanceId] = me.apps[appId].charts.areas[attr].data[instanceId].slice(extract);
                            } 
                            me.apps[appId].charts.areas[attr].data[instanceId].push([x, y]);
                        }
                    }
                    records.push(record);
                    j++;
                }
                store.loadData(records);
                break;
            }
        }
    },
    newExtractFields: function(instances) {
//        console.log(">>> newExtractFields");
        var fields = ['id'];
        for (var instanceId in instances) {
            for (var key in instances[instanceId]) {
                if ($.inArray(key, fields) === -1) {
                    fields.push(key);
                }
            }
        }
        return fields;
    },
    newExtractChartFields: function(instances) {
//        console.log(">>> newExtractChartFields");
        var fields = [];
        for (var instanceId in instances) {
            for (var key in instances[instanceId]) {
                if ((!isNaN(parseInt(instances[instanceId][key])) || !isNaN(parseFloat(instances[instanceId][key]))) 
                        && $.inArray(key, fields) === -1) {
                    fields.push(key);
                }
            }
        }
        return fields;
    },
    makeModelFields: function(fields) {
//        console.log(">>> makeModelFields");
        var modelFields = [];
        for (var i = 0; i < fields.length; i++) {
            modelFields.push({
                name: fields[i]
            });
        }
        return modelFields;
    },
    makeGridColumns: function(fields) {
//        console.log(">>> makeGridColumns");
        var me = this,
            columns = [];
        columns.push({
            width: 28,
            tdCls: 'x-change-cell'
        });
        for (var i = 0; i < fields.length; i++) {
            columns.push({
                text: fields[i],
                dataIndex: fields[i],
                flex: 1
            });
        }
        // Add action column
        columns.push({
            menuDisabled: true,
            sortable: false,
            xtype: 'actioncolumn',
            width: 124,
            items: [{
                    iconCls: 'icon-stress',
                    text: 'Stress',
                    tooltip: 'stress',
                    handler: function(grid, rowIndex, colIndex) {
                        me.preExecuteAction('stress', grid, rowIndex);
                    }
                }, {
                    iconCls: 'icon-halt',
                    text: 'Halt',
                    tooltip: 'halt',
                    handler: function(grid, rowIndex, colIndex) {
                        me.preExecuteAction('halt', grid, rowIndex);
                    }
                }, {
                    iconCls: 'icon-ready',
                    text: 'Ready',
                    tooltip: 'ready',
                    handler: function(grid, rowIndex, colIndex) {
                        me.preExecuteAction('ready', grid, rowIndex);
                    }
                }, {
                    iconCls: 'icon-lock',
                    text: 'Lock',
                    tooltip: 'lock',
                    handler: function(grid, rowIndex, colIndex) {
                        me.preExecuteAction('lock', grid, rowIndex);
                    }
                }, {
                    iconCls: 'icon-unlock',
                    text: 'Unlock',
                    tooltip: 'unlock',
                    handler: function(grid, rowIndex, colIndex) {
                        me.preExecuteAction('unlock', grid, rowIndex);
                    }
                }, {
                    iconCls: 'icon-delete',
                    text: 'Delete',
                    tooltip: 'delete',
                    handler: function(grid, rowIndex, colIndex) {
                        var rec = grid.getStore().getAt(rowIndex);
                        me.executeDeleteAction(rec.get('id'), grid.up('grid').title);
                    }
                }]
        });
        return columns;
    },
    getNextColor: function() {
//        console.log(">>> getNextColor");
        var nextColorIndex = 0,
            numOfColors = Object.keys(this.lastColorIndex).length;
    
        if (numOfColors < this.COLORS.length) {
            nextColorIndex = numOfColors;
        } else {
            nextColorIndex = numOfColors % this.COLORS.length;
        }
        
        return nextColorIndex;
    },
    getNextLuminance: function(lastIndex) {
//        console.log(">>> getNextLuminance");
        var luminanceIndex = 0;
        
        if (lastIndex < this.LUMINANCES.length - 1) {
            luminanceIndex = lastIndex + 1;
        }
        
        return luminanceIndex;
    },
    getInstanceColor: function(instance, appId) {
//        console.log(">>> getInstanceColor");
        var color = {
            'colorIndex': "",
            'luminanceIndex': ""
        };
        var colorAttrValue = instance[this.colorAttr];
        if (colorAttrValue in this.lastColorIndex) {
            var nextLuminanceIndex = this.getNextLuminance(this.lastColorIndex[colorAttrValue].luminanceIndex);
            color.colorIndex = this.lastColorIndex[colorAttrValue].colorIndex;
            color.luminanceIndex = nextLuminanceIndex;
            this.lastColorIndex[colorAttrValue].luminanceIndex = nextLuminanceIndex;
        } else {
            var colorIndex = this.getNextColor();
            color.colorIndex = colorIndex;
            color.luminanceIndex = 0;
            this.lastColorIndex[colorAttrValue] = {
                'luminanceIndex': 0,
                'colorIndex': colorIndex
            };
        }
        return color;
    },
    // getCellColorClass: function() {
        
    // },
    makeNewGridPanel: function(appId, store, columns) {
//        console.log(">>> makeNewGridPanel");
        var me = this;
        return Ext.create('Ext.grid.Panel', {
            id: appId + me.GRID_PANEL_SUFFIX,
            collapsible: true,
            title: appId,
            store: store,
            multiSelect: false,
            viewConfig: {
                emptyText: 'No instances to display',
                getRowClass: function(record, index) {
                    // Red line
                    var state = record.get('state');
                    if (state !== undefined && state !== "0.00") {
                        return "redline";
                    }
                    
                    var instanceId = record.get('id');
                    return "color-" + me.apps[appId].instances[instanceId].color.colorIndex + "-" + me.LUMINANCES[me.apps[appId].instances[instanceId].color.luminanceIndex];
                }
            },
            columns: columns
        });
    },
    makeNewTabPanel: function(appId, attr) {
//        console.log(">>> makeNewTabPanel");
        var me = this;
        return Ext.create('Ext.container.Container', {
            id: appId + '-' + attr + me.TAB_PANEL_SUFFIX,
            title: appId + ' -> ' + attr,
            layout: {
                type: 'border'
            },
            items: [{
                region: 'west',
                xtype: 'container',
                collapsible: true,
                split: true,
                layout: 'fit',
                flex: 1,
                items: [me.createAbsoluteChartPanel(appId, attr)]
            }, {
                region: 'center',
                xtype: 'container',
                layout: 'fit',
                flex: 1,
                items: [me.createAreaChartPanel(appId, attr)]
            }]
        });
    },
    makeItems: function() {
//        console.log(">>> makeItems");
        var me = this;
        var items =  [{
                xtype: 'container',
                layout: {
                    type: 'border'
                },
                items: [{
                        region: 'north',
                        xtype: 'tabpanel',
                        id: 'app-charts',
                        title: 'Hydra Web Monitor',
                        header: {
                            titlePosition: 1,
                            titleAlign: 'center'
                        },
                        collapsible: true,
                        split: true,
                        height: 400,
                        plugins: [{
                                ptype: 'tabscrollermenu',
                                maxText: 15,
                                pageSize: 5
                            }],
                        tools: [{
                                type: 'gear',
                                callback: function(panel, tool) {
                                    var required = '<span style="color:red;font-weight:bold" data-qtip="Required">*</span>';

                                    if (!me.configWindow) {
                                        me.configWindow = Ext.create('widget.window', {
                                            title: 'Configuration',
                                            header: {
                                                titlePosition: 2,
                                                titleAlign: 'center'
                                            },
                                            closable: true,
                                            closeAction: 'hide',
                                            width: 600,
                                            items: [{
                                                    xtype: 'form',
                                                    layout: 'form',
                                                    id: 'configForm',
                                                    bodyPadding: '5 5 5',
                                                    fieldDefaults: {
                                                        msgTarget: 'side',
                                                        labelWidth: 150
                                                    },
                                                    defaultType: 'textfield',
                                                    items: [{
                                                            fieldLabel: 'Hydra Server Address',
                                                            afterLabelTextTpl: required,
                                                            id: 'hydraServerAddr',
                                                            name: 'hydraServerAddr',
                                                            allowBlank: false,
                                                            tooltip: 'Enter your hydra server address'
                                                        },  {
                                                            fieldLabel: 'Hydra Server Admin Port',
                                                            afterLabelTextTpl: required,
                                                            id: 'hydraServerAdminPort',
                                                            name: 'hydraServerAdminPort',
                                                            allowBlank: false,
                                                            tooltip: 'Enter your hydra server admin port'
                                                        },  {
                                                            fieldLabel: 'Hydra Server Etcd Port',
                                                            afterLabelTextTpl: required,
                                                            id: 'hydraServerEtcdPort',
                                                            name: 'hydraServerEtcdPort',
                                                            allowBlank: false,
                                                            tooltip: 'Enter your hydra server etcd port'
                                                        },  {
                                                            fieldLabel: 'Iframe Address',
                                                            afterLabelTextTpl: required,
                                                            id: 'iframeAddr',
                                                            name: 'iframeAddr',
                                                            allowBlank: false,
                                                            tooltip: 'Enter your iframe address'
                                                        }, {
                                                            fieldLabel: 'Probe Password',
                                                            id: 'probePassword',
                                                            name: 'probePassword',
                                                            inputType: 'password',
                                                            allowBlank: true,
                                                            tooltip: 'Enter your hydra probe password'
                                                        }, {
                                                            fieldLabel: 'Hydra Probe Port',
                                                            id: 'hydraProbePort',
                                                            name: 'hydraProbePort',
                                                            allowBlank: true,
                                                            tooltip: 'Enter your hydra probe port'
                                                        }],
                                                    buttons: [{
                                                            text: 'Save',
                                                            handler: function() {
                                                                var form = this.up('form').getForm();
                                                                if (form.isValid()) {
                                                                    var fieldValues = form.getValues();
                                                                    for (key in HydraWM.config.Config.config) {
                                                                        HydraWM.config.Config.config[key] = form.findField(key).getValue();
                                                                    }
                                                                    Ext.getCmp('viewport').destroy();
                                                                    me.launch();
                                                                    me.configWindow.hide();
                                                                }
                                                            }
                                                        }, {
                                                            text: 'Cancel',
                                                            handler: function() {
                                                                me.configWindow.hide();
                                                            }
                                                        }]
                                                }]
                                        });
                                    }
                                    if (me.configWindow.isVisible()) {
                                        me.configWindow.hide(this, function() {
                                        });
                                    } else {
                                        me.configWindow.show(this, function() {
                                            var form = Ext.getCmp('configForm').getForm();
                                            for (key in HydraWM.config.Config.config) {
                                                form.findField(key).setValue(HydraWM.config.Config.config[key]);
                                            }
                                        });
                                    }
                                }
                            }],
                        items: []
                    }, {
                        region: 'west',
                        xtype: 'panel',
                        title: 'Iframe Panel',
                        collapsible: true,
                        split: true,
                        width: 800,
                        layout: 'fit',
                        items: [{
                                xtype: "component",
                                autoEl: {
                                    tag: "iframe",
                                    src: HydraWM.config.Config.config['iframeAddr']
                                }
                            }]
                    }, {
                        region: 'center',
                        xtype: 'panel',
                        id: 'app-grids',
                        title: 'Applications',
                        bodyPadding: 0,
                        layout: {
                            type: 'accordion',
                            multi: true
                        },
                        items: []
                    }]
            }];
        
        return items;
    },
    extractChartAttributes: function(instance) {
//        console.log(">>> extractChartAttributes");
        var attrs = [];
        for (key in instance) {
            if (!isNaN(parseInt(instance[key])) || !isNaN(parseFloat(instance[key]))) {
                attrs.push(key);
            }
        }
        return attrs;
    },
    createChartsPanel: function(appId, attr) {
//        console.log(">>> createChartsPanel");
        var me = this;
        return Ext.create('Ext.container.Container', {
            id: appId + '-' + attr + me.TAB_PANEL_SUFFIX,
            title: appId + ' - ' + attr,
            layout: {
                type: 'border'
            },
            items: [{
                region: 'west',
                xtype: 'container',
                collapsible: true,
                split: true,
                layout: 'fit',
                flex: 1,
                items: [me.createAbsoluteChartPanel(appId, attr)]
            }, {
                region: 'center',
                xtype: 'container',
                layout: 'fit',
                flex: 1,
                items: [me.createAreaChartPanel(appId, attr)]
            }]
        });
    },
    createAbsoluteChartPanel: function(appId, attr) {
//        console.log(">>> createAbsoluteChartPanel");
        var me = this,
            prefix = 'absolute';
        return Ext.create('Ext.panel.Panel', {
            id: prefix + '-' + appId + '-' + attr,
            title: prefix + '-' + appId + '-' + attr,
            html: prefix + '-' + appId + '-' + attr,
            header: false,
            loaded: false,
            onResize: function() {
                me.createAbsolutesChart(prefix, appId, attr);
            }
        });
    },
    createAreaChartPanel: function(appId, attr) {
//        console.log(">>> createAreaChartPanel");
        var me = this,
            prefix = 'area';
        return Ext.create('Ext.panel.Panel', {
            id: prefix + '-' + appId + '-' + attr,
            title: prefix + '-' + appId + '-' + attr,
            html: prefix + '-' + appId + '-' + attr,
            header: false,
            loaded: false,
            onResize: function() {
                me.createAreaChart(prefix, appId, attr);
            }
        });
    },
    createAreaChart: function(prefix, appId, attr) {
//        console.log(">>> createAreaChart");
        var me = this;

        var seriesOptions = [];
        var seriesData = {};
        for (var instanceId in me.apps[appId].instances) {
            seriesOptions.push({
                name: instanceId,
                color: me.COLORS[me.apps[appId].instances[instanceId].color.colorIndex][me.apps[appId].instances[instanceId].color.luminanceIndex],
                data: (function() {
                    var savedData = [];
                    if (me.apps[appId].charts.areas[attr] !== undefined) {
                        savedData = me.apps[appId].charts.areas[attr].data[instanceId];
                    }
                    // generate an array of random data
                    var data = [], time = (new Date()).getTime(), i;

                    var numOfFakePoints = me.maxAreaChartPoints - savedData.length;
                    for (i = -numOfFakePoints; i <= 0; i++) {
                        if (savedData.length > 0) {
                            time = savedData[0][0];
                        }
                        data.push([
                            time + i * me.REQUEST_INTERVAL,
                            0
                        ]);
                    }
                    data = data.concat(savedData);
                    seriesData[instanceId] = data;
                    return data;
                })()
            });
        }

        $(function() {
            var chart = {
                'chart': new Highcharts.Chart({
                    chart: {
                        type: 'area',
                        renderTo: prefix + '-' + appId + '-' + attr
                    },
                    title: {
                        text: ''
                    },
                    xAxis: {
                        tickmarkPlacement: 'on',
                        title: {
                            enabled: false
                        },
                        type: 'datetime'
                    },
                    yAxis: {
                        title: {
                            text: 'Percent'
                        }
                    },
                    tooltip: {
                        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.percentage:.1f}%</b> ({point.y:,.0f} millions)<br/>',
                        shared: true
                    },
                    plotOptions: {
                        area: {
                            stacking: 'percent',
                            lineColor: '#ffffff',
                            lineWidth: 1,
                            marker: {
                                lineWidth: 1,
                                lineColor: '#ffffff'
                            }
                        }
                    },
                    exporting: {
                        enabled: false
                    },
                    series: seriesOptions
                }),
                'data': seriesData
            };
            me.apps[appId].charts.areas[attr] = chart;
        });
    },
    createAbsolutesChart: function(prefix, appId, attr) {
//        console.log(">>> createAbsolutesChart");
        var me = this;

        var seriesOptions = [];
        var seriesData = {};
        for (var instanceId in me.apps[appId].instances) {
            seriesOptions.push({
                name: instanceId,
                color: me.COLORS[me.apps[appId].instances[instanceId].color.colorIndex][me.apps[appId].instances[instanceId].color.luminanceIndex],
                data: (function() {
                    var savedData = [];
                    if (me.apps[appId].charts.absolutes[attr] !== undefined) {
                        savedData = me.apps[appId].charts.absolutes[attr].data[instanceId];
                    }
                    // generate an array of random data
                    var data = [], time = (new Date()).getTime(), i;

                    var numOfFakePoints = me.maxAbsoluteChartPoints - savedData.length;
                    for (i = -numOfFakePoints; i <= 0; i++) {
                        if (savedData.length > 0) {
                            time = savedData[0][0];
                        }
                        data.push([
                            time + i * me.REQUEST_INTERVAL,
                            0
                        ]);
                    }
                    data = data.concat(savedData);
                    seriesData[instanceId] = data;
                    return data;
                })()
            });
        }

        $(function() {

            Highcharts.setOptions({
                global: {
                    useUTC: false
                }
            });

            // Create the chart
            var chart = {
                'chart': new Highcharts.StockChart({
                    chart: {
                        renderTo: prefix + '-' + appId + '-' + attr
                    },
                    plotOptions: {
                        series: {
                            lineWidth: 6,
                            states: {
                                hover: {
                                    enabled: true,
                                    lineWidth: 6
                                }
                            }
                        }
                    },
                    rangeSelector: {
                        buttons: [{
                                count: 1,
                                type: 'minute',
                                text: '1M'
                            }, {
                                count: 5,
                                type: 'minute',
                                text: '5M'
                            }, {
                                type: 'all',
                                text: 'All'
                            }],
                        inputEnabled: false,
                        selected: 0
                    },
                    exporting: {
                        enabled: false
                    },
                    series: seriesOptions
                }),
                'data': seriesData
            };
            me.apps[appId].charts.absolutes[attr] = chart;
        });
    },
    createStore: function(appId) {
//        console.log(">>> createStore");
        var me = this;
        return Ext.create('Ext.data.Store', {
            storeId: appId + me.STORE_SUFFIX,
            model: appId + 'Model'
        });
    },
    executeInstanceAction: function(action, addr) {
        var me = this;
        $.ajax({
            type: "GET",
            url: addr + "/" + action + "?password=" + HydraWM.config.Config.config['probePassword'],
            timeout: 3000,
            success: function(data) {
                console.log("Succesfull response " + data + " from '" + addr + "' to order '" + action + "'");
            },
            error: function(data) {
                console.log("Error response " + data + " from '" + addr + "' to order '" + action + "'");
            }
        });
    },
    preExecuteAction: function(action, grid, rowIndex) {
    	var me = this;
    	var rec = grid.getStore().getAt(rowIndex);
        var extractPort = function(uri) {
            return uri.substring(0, uri.lastIndexOf(":"));
        };
        var addr = extractPort(rec.get('uri')) + ":" + HydraWM.config.Config.config['hydraProbePort'];
        me.executeInstanceAction(action, addr);
    },
    executeDeleteAction: function(instance, app) {
    	var me = this;
    	addr = 'http://' + HydraWM.config.Config.config['hydraServerAddr'] + ':' + HydraWM.config.Config.config['hydraServerEtcdPort'] + '/v2/keys/db/apps/Instances/' + app + '/' + instance + '?recursive=true'; 
    	$.ajax({
            type: "DELETE",
            url: addr,
            timeout: 3000,
            success: function(data) {
                console.log("Succesfull response " + data + " from '" + addr + "' to order delete'");
            },
            error: function(data) {
                console.log("Error response " + data + " from '" + addr + "' to order delete");
            }
        });
    },
    defineModel: function(appId, fields) {
//        console.log(">>> defineModel");
        var me = this;
        Ext.define(appId + me.MODEL_SUFFIX, {
            extend: 'Ext.data.Model',
            fields: fields
        });
    }
});
