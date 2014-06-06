// attach the .equals method to Array's prototype to call it on any array
//Array.prototype.equals = function (array) {
//    // if the other array is a falsy value, return
//    if (!array)
//        return false;
//
//    // compare lengths - can save a lot of time 
//    if (this.length != array.length)
//        return false;
//
//    for (var i = 0, l=this.length; i < l; i++) {
//        // Check if we have nested arrays
//        if (this[i] instanceof Array && array[i] instanceof Array) {
//            // recurse into the nested arrays
//            if (!this[i].equals(array[i]))
//                return false;       
//        }           
//        else if (this[i] != array[i]) { 
//            // Warning - two different object instances will never be equal: {x:20} != {x:20}
//            return false;   
//        }           
//    }       
//    return true;
//} 

Ext.define('HydraWM.Application', {
    requires: [
        'Ext.data.JsonP',
        'Ext.ux.TabScrollerMenu'
    ],
    name: 'HydraWM',
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
    
    GRID_PANEL_SUFFIX: "-grid",
    TAB_PANEL_SUFFIX: "-tab",
    MODEL_SUFFIX: "Model",
    STORE_SUFFIX: "Store",
    
    apps: {},
    config: {
        'hydra-server-addr': 'localhost:7770',
        'topic-thunder-url': 'http://topic-beta-topicthunder0.aws-ireland.innotechapp.com/#/panel?id=bbvaes-pro',
        'probe-password': '',
        'hydra-probe-port': ''
    },
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
        var me = this;

        var advertisementRefresherTask = {
            run: doAjax,
            interval: 2000
        };

        Ext.TaskManager.start(advertisementRefresherTask);

        function doAjax() {
            Ext.Ajax.request({
                url: 'http://' + me.config['hydra-server-addr'] + '/apps',
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
        for (var i = 0; i < this.apps[appId].oldChartFields.length; i++) {
            if ($.inArray(this.apps[appId].oldChartFields[i], this.apps[appId].chartFields) === -1) {
                Ext.getCmp(appId + "-" + this.apps[appId].oldChartFields[i] + this.TAB_PANEL_SUFFIX).destroy();
            }
        }
    },
    parseApps: function(apps) {
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
                    this.apps[appId].instances = this.newExtractChartFields(apps[i][appId].Instances);
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
        var a = app.oldFields,
            b = app.fields;
        return $(a).not(b).get().length === 0 && $(b).not(a).get().length === 0;
    },
    makeInstances: function(apps) {
        var me = this;
        for (i in apps) {
            var app = apps[i];
            for (appId in app) {
                var instance = {};
                var instances = [];
                var i = 0;
                for (instanceId in app[appId].Instances) {
                    if (i == 0) {
                        instance = app[appId].Instances[instanceId];
                        instance['id'] = instanceId;
                    }
                    instances.push(instanceId);
                    i++;
                }
                me.apps[appId].instances = instances;
            }
        }
    },
    createApp: function(appId, fields, chartFields) {
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
            'instances': []
        };
        this.apps[appId] = app;
    },
    addSerieToChart: function(chart, instanceId, numberOfPoints) {
        var serie = {
            name: instanceId,
            data: (function() {
                // generate an array of random data
                var data = [], time = (new Date()).getTime(), i;

                // TODO: time - (interval * numOfPoints)
                console.log("Time: " + time);
                for (var i = -numberOfPoints; i <= 0; i++) {
                    data.push([
                        time + i * 1000,
                        0
                    ]);
                }
                return data;
            })()
        };
        
        console.log(chart);
        chart.chart.addSeries(serie, true);
    },
    removeSerieFromChart: function() {
        chart.series[i].remove();
    },
    checkIfSerieExists: function(series, serieName) {
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
                for (var k = 0; k < apps[appId].instances.length; k++) {
                    var instanceId = apps[appId].instances[k];
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
        var me = this;
        var now = (new Date()).getTime(); // current time
        var records = [];
        var j = 0;
        for (var i = 0; i < apps.length; i++) {
            for (var appId in apps[i]) {
                var store = Ext.data.StoreManager.get(appId + me.STORE_SUFFIX);
                var records = [];
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
                            console.log(appId + "-" + instanceId + "-" + attr + ": " + x + ", " + y);
                            absoluteSerie.addPoint([x, y], true, true);
//                            me.apps[appId].charts.absolutes[attr].data[j].push([x, y]);
                            areaSerie.addPoint([x, y], true, true);
//                            me.apps[appId].charts.areas[attr].data[j].push([x, y]);
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
        var modelFields = [];
        for (var i = 0; i < fields.length; i++) {
            modelFields.push({
                name: fields[i]
            });
        }
        return modelFields;
    },
    makeGridColumns: function(fields) {
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
                        me.executeInstanceAction('stress');
                    }
                }, {
                    iconCls: 'icon-halt',
                    text: 'Halt',
                    tooltip: 'halt',
                    handler: function(grid, rowIndex, colIndex) {
                        me.executeInstanceAction('halt');
                    }
                }, {
                    iconCls: 'icon-ready',
                    text: 'Ready',
                    tooltip: 'ready',
                    handler: function(grid, rowIndex, colIndex) {
                        me.executeInstanceAction('ready');
                    }
                }, {
                    iconCls: 'icon-lock',
                    text: 'Lock',
                    tooltip: 'lock',
                    handler: function(grid, rowIndex, colIndex) {
                        me.executeInstanceAction('lock');
                    }
                }, {
                    iconCls: 'icon-unlock',
                    text: 'Unlock',
                    tooltip: 'unlock',
                    handler: function(grid, rowIndex, colIndex) {
                        me.executeInstanceAction('unlock');
                    }
                }, {
                    iconCls: 'icon-delete',
                    text: 'Delete',
                    tooltip: 'delete',
                    handler: function(grid, rowIndex, colIndex) {
                        me.executeInstanceAction('delete');
                    }
                }]
        });
        return columns;
    },
    makeNewGridPanel: function(appId, store, columns) {
        var me = this;
        return Ext.create('Ext.grid.Panel', {
            id: appId + me.GRID_PANEL_SUFFIX,
            collapsible: true,
            title: appId,
            store: store,
            multiSelect: false,
            viewConfig: {
                emptyText: 'No instances to display'
            },
            columns: columns
        });
    },
    makeNewTabPanel: function(appId, attr) {
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
                                                            id: 'hydra-server-addr',
                                                            name: 'hydra-server-addr',
                                                            allowBlank: false,
                                                            tooltip: 'Enter your hydra server address'
                                                        }, {
                                                            fieldLabel: 'Topic Thunder',
                                                            afterLabelTextTpl: required,
                                                            id: 'topic-thunder-url',
                                                            name: 'topic-thunder-url',
                                                            vtype: 'url',
                                                            allowBlank: false,
                                                            tooltip: 'Enter your topic thunder address'
                                                        }, {
                                                            fieldLabel: 'Probe Password',
                                                            id: 'probe-password',
                                                            name: 'probe-password',
                                                            inputType: 'password',
                                                            allowBlank: true,
                                                            tooltip: 'Enter your hydra probe password'
                                                        }, {
                                                            fieldLabel: 'Hydra Probe Port',
                                                            id: 'hydra-probe-port',
                                                            name: 'hydra-probe-port',
                                                            allowBlank: true,
                                                            tooltip: 'Enter your hydra probe password'
                                                        }],
                                                    buttons: [{
                                                            text: 'Save',
                                                            handler: function() {
                                                                var form = this.up('form').getForm();
                                                                if (form.isValid()) {
                                                                    var fieldValues = form.getValues();
                                                                    for (key in me.config) {
                                                                        me.config[key] = form.findField(key).getValue();
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
                                            for (key in me.config) {
                                                form.findField(key).setValue(me.config[key]);
                                            }
                                        });
                                    }
                                }
                            }],
                        items: []
                    }, {
                        region: 'west',
                        xtype: 'panel',
                        title: 'Topic Thunder',
                        collapsible: true,
                        split: true,
                        width: 800,
                        layout: 'fit',
                        items: [{
                                xtype: "component",
                                autoEl: {
                                    tag: "iframe",
                                    src: me.config['topic-thunder-url']
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
        var attrs = [];
        for (key in instance) {
            if (!isNaN(parseInt(instance[key])) || !isNaN(parseFloat(instance[key]))) {
                attrs.push(key);
            }
        }
        return attrs;
    },
    createChartsPanel: function(appId, attr) {
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
        var me = this;
        var time = (new Date()).getTime();

        var seriesOptions = [];
        var data = [];
        var generateInitialData = function(index) {
            var data = [];
            for (var i = -me.maxAreaChartPoints + me.apps[appId].charts.absolutes[attr].data[index].length; i <= 0; i++) {
//            for (var i = -12; i <= 0; i++) {
                data.push([
                    time + i * 1000,
                    0
                ]);
            }
            data = data.concat(me.apps[appId].charts.absolutes[attr].data[index]);
            return data;
        };
        for (var i = 0; i < me.apps[appId].instances.length; i++) {
            var dataSerie = generateInitialData(i);
            seriesOptions.push({
                name: me.apps[appId].instances[i],
                data: dataSerie
//                data: generateInitialData(i)
            });
            data.push(dataSerie);
        }

        $(function() {
//            me.apps[appId].charts.areas[attr] = new Highcharts.Chart({
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
                'data': data
            };
            me.apps[appId].charts.areas[attr] = chart;
        });
    },
    createAbsolutesChart: function(prefix, appId, attr) {
        var me = this;
        var containerId = '#' + prefix + '-' + appId + '-' + attr;
        var seriesOptions = [];
        var data = [];
        for (var i = 0; i < me.apps[appId].instances.length; i++) {
            seriesOptions.push({
                name: me.apps[appId].instances[i],
                data: (function() {
                    // generate an array of random data
                    var data = [], time = (new Date()).getTime(), i;

                    for (i = -999; i <= 0; i++) {
                        data.push([
                            time + i * 1000,
//                            Math.round(Math.random() * 100)
                            0
                        ]);
                    }
                    return data;
                })()
            });
            data.push([]);
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
                'data': data
            };
            me.apps[appId].charts.absolutes[attr] = chart;
        });
    },
//    createChartsHeaderMenuItems: function(apps) {
//        var items = [];
//        for (app in apps) {
//            items.push({
//                text: app,
//                glyph: '9650@'
////                handler: function() {
////                    panel.setBorderRegion('north');
////                }
//            });
//        }
//        return items;
//    },
    createStore: function(appId) {
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
            url: addr + "/" + action + "?password=" + me.config['probe-password'],
            timeout: 3000,
            success: function(data) {
                console.log("Succesfull response " + data + " from '" + addr + "' to order '" + action + "'");
            },
            error: function(data) {
                console.log("Error response " + data + " from '" + addr + "' to order '" + action + "'");
            }
        });
    },
    defineModel: function(appId, fields) {
        var me = this;
        Ext.define(appId + me.MODEL_SUFFIX, {
            extend: 'Ext.data.Model',
            fields: fields
        });
    }
});
