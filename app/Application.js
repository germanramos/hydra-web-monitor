Ext.define('HydraWM.Application', {
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
//    apps: [],
    entities: [],
    hydraAddr: '',
    init: function() {
        var me = this;
//        Ext.Ajax.request({
//            url: 'http://localhost:3000/apps?callback=?',
//            success: function(response, opts) {
//                var obj = Ext.decode(response.responseText);
//                this.entities = obj;
//                console.dir(obj);
//            },
//            failure: function(response, opts) {
//                console.log('server-side failure with status code ' + response.status);
//            }
//        });
//        Ext.data.JsonP.request({   
//            url: 'http://localhost:3000/apps?callback=?',
//            success: function(response, opts) {
//                var obj = Ext.decode(response.responseText);
//                this.entities = obj;
//                console.dir(obj);
//            },
//            failure: function(response, opts) {
//                console.log('server-side failure with status code ' + response.status);
//            }
//        });
//        $.ajax({
//            type: 'GET',
//            url: 'http://localhost:3000/apps?callback=?',
//            async: false,
//            jsonpCallback: 'jsonCallback',
//            contentType: "application/json",
//            dataType: 'jsonp',
//            success: function(jsonResponse) {
//                me.entities = jsonResponse;
//                console.dir(jsonResponse);
//            },
//            error: function(e) {
//                console.log(e.message);
//            }
//        });
//        this.entities = {
//            'App1': {
//                'PC1001': {
//                    hostname: 'pc1001',
//                    uri: 'http://pc1001:8080',
//                    cpuLoad: '70.56',
//                    mem: '23.88',
//                    cloud: 'amazon'
//                },
//                'PC1002': {
//                    hostname: 'pc1002',
//                    uri: 'http://pc1002:8080',
//                    cpuLoad: '10.22',
//                    mem: '16.90',
//                    cloud: 'azure'
//                },
//                'PC1003': {
//                    hostname: 'pc1003',
//                    uri: 'http://pc1003:8080',
//                    cpuLoad: '48.32',
//                    mem: '86.90',
//                    cloud: 'google'
//                }
//            },
//            'App2': {
//                'PC1101': {
//                    hostname: 'pc1101',
//                    uri: 'http://pc1101:8080',
//                    cpuLoad: '50.56',
//                    mem: '71.28',
//                    cloud: 'amazon',
//                    cost: '3',
//                    priority: '10'
//                },
//                'PC1102': {
//                    hostname: 'pc1102',
//                    uri: 'http://pc1102:8080',
//                    cpuLoad: '14.22',
//                    mem: '66.90',
//                    cloud: 'amazon',
//                    cost: '5',
//                    priority: '6'
//                },
//                'PC1103': {
//                    hostname: 'pc1103',
//                    uri: 'http://pc1103:8080',
//                    cpuLoad: '38.32',
//                    mem: '96.90',
//                    cloud: 'azure',
//                    cost: '7',
//                    priority: '1'
//                }
//            }
//        };
    },
    launch: function() {
        var me = this;
        $.ajax({
            type: 'GET',
            url: 'http://localhost:3000/apps?callback=?',
            async: false,
            jsonpCallback: 'jsonCallback',
            contentType: "application/json",
            dataType: 'jsonp',
            success: function(jsonResponse) {
                me.entities = jsonResponse;
                me.loadUI();
                console.dir(jsonResponse);
            },
            error: function(e) {
                console.log(e.message);
            }
        });
    },
    loadUI: function() {
        var me = this;
        var apps = this.entities;
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
                            tools: [{
                                    type: 'gear',
                                    callback: function(panel, tool) {
                                        function setWeight() {
                                            panel.setRegionWeight(parseInt(this.text, 10));
                                        }

                                        var regionMenu = panel.regionMenu || (panel.regionMenu =
                                                Ext.widget({
                                                    xtype: 'menu',
                                                    items: me.createChartsHeaderMenuItems(apps)
                                                }));

                                        regionMenu.showBy(tool.el);
                                    }
                                }],
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
            var chartAttrs = this.extractChartAttributes(instance);
            var tabPanel = Ext.getCmp('app-charts');
            for (var i = 0; i < chartAttrs.length; i++) {
                var tab = this.createChartPanel(appId, chartAttrs[i]);
                tabPanel.add(tab);
                if (i == 0) {
                    tabPanel.setActiveTab(0);
//                    var activeTab = tabPanel.getActiveTab();
//                    setTimeout(function() {
//                        activeTab.render();
//                    }, 1000);
//                    activeTab.render();
                }
//                this.createChart('#'+appId+'-'+chartAttrs[i]);
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
//            onShowComplete: function() {
            onResize: function() {
//                console.log("Rendering " + appId + '-' + attr);
//                if (!this.loaded) {
                    me.createChart('#' + appId + '-' + attr);
//                    this.loaded = false;
//                }
            }
        });
    },
    createChart: function(containerId) {
        $(function() {

            Highcharts.setOptions({
                global: {
                    useUTC: false
                }
            });

            // Create the chart
            console.log('Creating chart ' + containerId);
            $(containerId).highcharts('StockChart', {
                chart: {
                    events: {
                        load: function() {
                            // set up the updating of the chart each second
                            var series = this.series[0];
                            setInterval(function() {
                                var x = (new Date()).getTime(), // current time
                                        y = Math.round(Math.random() * 100);
                                series.addPoint([x, y], true, true);
                            }, 1000);
                        }
                    }
                },
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
        var advertisementRefresherTask = {
            run: doAjax,
            interval: 5000
//            repeat: 5     // infinite
        };

        Ext.TaskManager.start(advertisementRefresherTask);

        function doAjax() {
            Ext.Ajax.request({
                url: 'apps/' + appId + '/Instances',
                method: 'GET',
                success: function(result, request) {
                    var jsonData = Ext.util.JSON.decode(result.responseText);
                    store.loadData(jsonData);
                    // Add points to Charts
                },
                failure: function(result, request) {
                    var jsonData;
                    if (appId == 'App1') {
                        jsonData = [{
                                'id': 'PC1001',
                                'hostname': 'pc1001',
                                'uri': 'http://pc1001:8080',
                                'cpuLoad': '70.56',
                                'mem': '23.88',
                                'cloud': 'amazon'
                            }, {
                                'id': 'PC1002',
                                'hostname': 'pc1002',
                                'uri': 'http://pc1002:8080',
                                'cpuLoad': '30.56',
                                'mem': '93.88',
                                'cloud': 'azure'
                            }];
                    } else if (appId == 'App2') {
                        jsonData = [{
                                id: 'PC1101',
                                hostname: 'pc1101',
                                uri: 'http://pc1101:8080',
                                cpuLoad: '50.56',
                                mem: '71.28',
                                cloud: 'amazon',
                                cost: '3',
                                priority: '10'
                            }, {
                                id: 'PC1102',
                                hostname: 'pc1102',
                                uri: 'http://pc1102:8080',
                                cpuLoad: '70.56',
                                mem: '11.28',
                                cloud: 'google',
                                cost: '6',
                                priority: '1'
                            }];
                    }
                    // quiza deben ser modelos
                    store.loadData(jsonData);
//                    Ext.MessageBox.alert('Failed', 'Failed');
                }
            });
        }
    }
});
