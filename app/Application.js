Ext.define('HydraWM.Application', {
    requires:[
        'Ext.data.*'
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
    apps: {},
    highcharts: {},
    entities: [],
    hydraAddr: '',
//    init: function() {
//        var me = this;
//    },
    launch: function() {
        var me = this;
        $.ajax({
            type: 'GET',
            url: 'http://localhost:3000/apps?callback=?',
            async: false,
            jsonpCallback: 'jsonCallback',
            contentType: "application/json",
            dataType: 'jsonp',
            success: function(apps) {
//                me.entities = jsonResponse;
                me.saveApps(apps);
                me.loadUI(apps);
            },
            error: function(e) {
                console.log(e.message);
            }
        });
    },
    saveApps: function(apps) {
        var finalApps = {};
        for (appId in apps) {
            var appAttrs;
            for (instanceId in apps[appId]) {
                appAttrs = apps[appId][instanceId];
                break;
            }
            var chartAttrs = this.extractChartAttributes(appAttrs);
            finalApps[appId] = {
                'chartAttrs': chartAttrs,
                'charts': {}
            };
        }
        this.apps = finalApps;
    },
    loadUI: function(apps) {
        var me = this;
        Ext.create('Ext.container.Viewport', {
            layout: {
                type: 'fit'
            },
            items: [{
                    xtype: 'container',
                    layout: {
                        type: 'border'
                    },
                    items: [{
                            region: 'north',
                            xtype: 'tabpanel',
                            id: 'app-charts',
                            title: 'Charts',
                            collapsible: true,
                            split: true,
                            height: 400,
//                            tools: [{
//                                    type: 'gear',
//                                    callback: function(panel, tool) {
//                                        function setWeight() {
//                                            panel.setRegionWeight(parseInt(this.text, 10));
//                                        }
//
//                                        var regionMenu = panel.regionMenu || (panel.regionMenu =
//                                                Ext.widget({
//                                                    xtype: 'menu',
//                                                    items: me.createChartsHeaderMenuItems(apps)
//                                                }));
//
//                                        regionMenu.showBy(tool.el);
//                                    }
//                                }],
                            items: []
                        }, {
                            region: 'west',
                            xtype: 'panel',
                            title: 'Topic Thunder',
                            collapsible: true,
                            split: true,
                            width: 800
                        }, {
                            region: 'center',
                            xtype: 'panel',
                            id: 'app-grids',
                            title: 'Applications',
                            bodyPadding: 0,
                            layout: {
                                type: 'accordion',
                                multi: true
//                        align: 'stretch'
                            },
                            items: []
                        }]
                }]
        });

        for (appId in apps) {
            var instance = {};
            for (instanceId in apps[appId]) {
                instance = apps[appId][instanceId];
                instance['id'] = instanceId;
                break;
            }
            this.defineModel(appId + 'Model', this.extractFields(instance));
            var store = this.createStore(appId);
            var grid = this.createGrid(appId, store, instance);
            var gridPanel = Ext.getCmp('app-grids');
            gridPanel.add(grid);
            var tabPanel = Ext.getCmp('app-charts');
            for (var i = 0; i < me.apps[appId].chartAttrs.length; i++) {
                var tab = this.createChartPanel(appId, me.apps[appId].chartAttrs[i]);
                tabPanel.add(tab);
                if (i == 0) {
                    tabPanel.setActiveTab(0);
                }
            }
            this.makeIntervalAjaxRequest(appId, store);
        }

    },
    createChartPanel: function(appId, attr) {
        var me = this;
        return Ext.create('Ext.panel.Panel', {
            id: appId + '-' + attr,
            title: appId + '-' + attr,
            html: appId + '-' + attr,
            loaded: false,
            onResize: function() {
                me.createChart(appId, attr);
            }
        });
    },
    createChart: function(appId, attr) {
        var me = this;
        var containerId = '#' + appId + '-' + attr;
        $(function() {

            Highcharts.setOptions({
                global: {
                    useUTC: false
                }
            });

            // Create the chart
//            me.apps[appId].charts[attr] = $(containerId).highcharts('StockChart', {
            me.apps[appId].charts[attr] = new Highcharts.StockChart({
                chart: {
                    renderTo: appId + '-' + attr
                },    
//                chart: {
//                    events: {
//                        load: function() {
//                            // set up the updating of the chart each second
//                            var series = this.series[0];
//                            setInterval(function() {
//                                var x = (new Date()).getTime(), // current time
//                                    y = Math.round(Math.random() * 100);
//                                series.addPoint([x, y], true, true);
//                            }, 1000);
//                        }
//                    }
//                },
                rangeSelector: {
                    buttons: [{
                            count: 1,
                            type: 'second',
                            text: '1M'
                        }, {
                            count: 5,
                            type: 'second',
                            text: '5M'
                        }, {
                            type: 'all',
                            text: 'All'
                        }],
                    inputEnabled: false,
                    selected: 0
                },
//                title: {
//                    text: containerId
//                },
                exporting: {
                    enabled: false
                },
//                    navigator: {
//                        height: 40
//                    },
                series: [{
                    name: containerId,
                    data: (function() {
                        // generate an array of random data
                        var data = [], time = (new Date()).getTime(), i;

                        for (i = -999; i <= 0; i++) {
//                                for (i = -12; i <= 0; i++) {
                            data.push([
                                time + i * 1000,
                                Math.round(Math.random() * 100)
                            ]);
                        }
                        return data;
                    })()
                }]
            });

        });
    },
    createChartsHeaderMenuItems: function(apps) {
        var items = [];
        for (app in apps) {
            items.push({
                text: app,
                glyph: '9650@'
//                handler: function() {
//                    panel.setBorderRegion('north');
//                }
            });
        }
        return items;
    },
    createGrid: function(appId, store, fields) {
        return Ext.create('Ext.grid.Panel', {
//              height: 250,
            collapsible: true,
            title: appId,
            store: store,
            multiSelect: true,
            margin: '0',
            padding: '0',
            viewConfig: {
                emptyText: 'No instances to display'
            },
            columns: this.defineGridColumns(fields)
        });
    },
    createStore: function(appId) {
        var me = this;
        // Maybe not proxy
        return Ext.create('Ext.data.Store', {
            model: appId + 'Model',
            proxy: {
                type: 'ajax',
                url: 'http://' + me.hydraAddr + '/apps/' + appId + '/Instances',
                reader: {
                    type: 'json',
                    root: 'images'
                }
            }
        });
    },
    defineGridColumns: function(fields) {
        var columns = [];
        for (field in fields) {
            columns.push({
                text: field,
                dataIndex: field,
                flex: 1
            });
        }
        return columns;
    },
    defineModel: function(modelId, fields) {
        Ext.define(modelId, {
            extend: 'Ext.data.Model',
            fields: fields
        });
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
    extractFields: function(app) {
        var fields = [];
        for (key in app) {
            fields.push({
                name: key
            });
        }
        return fields;
    },
    makeIntervalAjaxRequest: function(appId, store) {
        var me = this;
        
        var advertisementRefresherTask = {
            run: doAjax,
            interval: 2000
//            repeat: 5     // infinite
        };

        Ext.TaskManager.start(advertisementRefresherTask);

        function doAjax() {
            Ext.data.JsonP.request({
                url: 'http://localhost:3000/apps/'+appId+'/instances',
                success: function(result, request) {
                    var now = (new Date()).getTime(); // current time
                    var records = [];
                    for (instanceId in result) {
                        var record = {'id': instanceId};
                        for (key in result[instanceId]) {
                            record[key] = result[instanceId][key];
                        }
                        records.push(record);
                        // add point to chart
//                        for (i in me.apps[appId].chartAttrs) {
//                            var attr = me.apps[appId].chartAttrs[i];
//                            var series = me.apps[appId].charts[attr].series[0];
//                            var x = now,
//                                y = parseFloat(record[attr]);
//                            series.addPoint([x, y], true, true);
//                        }
                    }
                    store.loadData(records);
                    for (i in me.apps[appId].chartAttrs) {
                        var attr = me.apps[appId].chartAttrs[i];
                        var series = me.apps[appId].charts[attr].series[0];
                        var x = now,
                            y = parseFloat(record[attr]);
                        series.addPoint([x, y], true, true);
                    }
                },
                failure: function(e) {
                    console.log("Ajax error");
                }
            });
        }
    }
});
