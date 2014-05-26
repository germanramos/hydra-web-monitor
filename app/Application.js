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
    apps: {},
    maxAbsoluteChartPoints: 999,
    maxAreaChartPoints: 12,
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
                'charts': {
                    'absolutes': {},
                    'areas': {}
                },
                'instances': []
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
                            plugins: [{
                                ptype: 'tabscrollermenu',
                                maxText  : 15,
                                pageSize : 5
                            }],
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
                            width: 800,
                            layout: 'fit',
                            items: [{
                                xtype: "component",
                                autoEl: {
                                    tag: "iframe",
                                    src: "http://topic-beta-topicthunder0.aws-ireland.innotechapp.com/#/panel?id=bbvaes-pro"
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
                }]
        });

        for (appId in apps) {
            var instance = {};
            var instances = [];
            var i = 0;
            for (instanceId in apps[appId]) {
                if (i == 0) {
                    instance = apps[appId][instanceId];
                    instance['id'] = instanceId;
                }
                instances.push(instanceId);
                i++;
            }
            me.apps[appId].instances = instances;
            this.defineModel(appId + 'Model', this.extractFields(instance));
            var store = this.createStore(appId);
            var grid = this.createGrid(appId, store, instance);
            var gridPanel = Ext.getCmp('app-grids');
            gridPanel.add(grid);
            var tabPanel = Ext.getCmp('app-charts');
            for (var i = 0; i < me.apps[appId].chartAttrs.length; i++) {
                var tab = this.createChartsPanel(appId, me.apps[appId].chartAttrs[i]);
                tabPanel.add(tab);
                if (i == 0) {
                    tabPanel.setActiveTab(0);
                }
            }
            this.makeIntervalAjaxRequest(appId, store);
        }

    },
    createChartsPanel: function(appId, attr) {
        var me = this;
        return Ext.create('Ext.container.Container', {
            id: appId + '-' + attr,
            title: appId + '-' + attr,
            layout: {
                type: 'border'
            },
            items: [{
                region: 'west',
                xtype: 'container',
                collapsible: true,
                split: true,
                layout: 'fit',
//                width: 800,
                flex: 1,
//                items: [me.createAreaChartPanel(appId, attr)]
                items: [me.createAbsoluteChartPanel(appId, attr)]
            }, {
                region: 'center',
                xtype: 'container',
                layout: 'fit',
                flex: 1,
                items: [me.createAreaChartPanel(appId, attr)]
//                items: [me.createAbsoluteChartPanel(appId, attr)]
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
        
//        var containerId = '#' + prefix + '-' + appId + '-' + attr;
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
            seriesOptions.push({
                name: me.apps[appId].instances[i],
                data: generateInitialData(i)
            });
            data.push([]);
        }
        
        $(function () {
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
                name: containerId + '-' + me.apps[appId].instances[i],
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
//            me.apps[appId].charts.absolutes[attr] = new Highcharts.StockChart({
            var chart = {
                'chart': new Highcharts.StockChart({
                    chart: {
                        renderTo: prefix + '-' + appId + '-' + attr
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
//            collapsible: true,
//            split: true,
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
    executeInstanceAction: function(action, menuElement, server) {
	var actionElement = document.createElement("a");
	actionElement.appendChild(document.createTextNode(action.charAt(0).toUpperCase()));
	actionElement.setAttribute('href', '#');
	actionElement.setAttribute('title', action);
	menuElement.appendChild(actionElement);
	password = $('#password').val();
	
	actionElement.onclick = function() {
            var url_parts = server.server.split(':');
            console.log("Sending order '" + action + "' to "+ server.server);
            $.ajax({
                type: "GET",
                url : url_parts[0] + ":" + url_parts[1] + ":" + PROBE_PORT + "/" + action + "?password=" + password,
                timeout : 3000,
                success : function(data) {
                    console.log("Succesfull response " + data + " from '" + server.server + "' to order '" + action + "'");
                },
                error : function(data) {
                    console.log("Error response " + data + " from '" + server.server + "' to order '" + action + "'");
                }
            });
	};
    },
    defineGridColumns: function(fields) {
        var me = this,
            columns = [];
        for (field in fields) {
            columns.push({
                text: field,
                dataIndex: field,
                flex: 1
            });
        }
        columns.push({
            menuDisabled: true,
            sortable: false,
            xtype: 'actioncolumn',
            width: 100,
//            ui: 'button',
            items: [{
//                iconCls: 'sell-col',
                xtype: 'button',
                scale: 'small',
                iconCls: 'icon-delete',
                text: 'Stress',
                tooltip: 'stress',
                handler: function(grid, rowIndex, colIndex) {
                    me.executeInstanceAction();
                }
            }, {
//                iconCls: 'H',
                xtype: 'button',
                text: 'H',
                tooltip: 'halt',
                handler: function(grid, rowIndex, colIndex) {
                    me.executeInstanceAction();
                }
            }, {
//                iconCls: 'sell-col',
                xtype: 'button',
                text: 'R',
                tooltip: 'ready',
                handler: function(grid, rowIndex, colIndex) {
                    me.executeInstanceAction();
                }
            }, {
//                iconCls: 'sell-col',
                xtype: 'button',
                text: 'L',
                tooltip: 'lock',
                handler: function(grid, rowIndex, colIndex) {
                    me.executeInstanceAction();
                }
            }, {
//                iconCls: 'sell-col',
                xtype: 'button',
                text: 'U',
                tooltip: 'unlock',
                handler: function(grid, rowIndex, colIndex) {
                    me.executeInstanceAction();
                }
            }, {
//                iconCls: 'sell-col',
                xtype: 'button',
                text: 'D',
                tooltip: 'delete',
                handler: function(grid, rowIndex, colIndex) {
                    me.executeInstanceAction();
                }
            }]
        });
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
                url: 'http://localhost:3000/apps/' + appId + '/instances',
                success: function(result, request) {
                    var now = (new Date()).getTime(); // current time
                    var records = [];
                    var j = 0;
                    for (instanceId in result) {
                        var record = {'id': instanceId};
                        for (key in result[instanceId]) {
                            record[key] = result[instanceId][key];
                        }
                        for (i in me.apps[appId].chartAttrs) {
                            var attr = me.apps[appId].chartAttrs[i];
                            if (me.apps[appId].charts.absolutes[attr]) {
                                var absoluteSerie = me.apps[appId].charts.absolutes[attr].chart.series[j],
                                    areaSerie = me.apps[appId].charts.areas[attr].chart.series[j];
                                var x = now,
                                    y = parseFloat(record[attr]);
                                absoluteSerie.addPoint([x, y], true, true);
                                me.apps[appId].charts.absolutes[attr].data[j].push([x, y]);
                                areaSerie.addPoint([x, y], true, true);
                                me.apps[appId].charts.areas[attr].data[j].push([x, y]);
                            }
                        }
                        records.push(record);
                        j++;
                    }
                    store.loadData(records);
                },
                failure: function(e) {
                    console.log("Ajax error");
                }
            });
        }
    }
});
