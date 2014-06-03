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
    config: {
    	'hydra-server-addr': 'hydra-v3-demo-server-0.aws-ireland.innotechapp.com',
        'hydra-server-admin-port': '7771',
        'hydra-server-etcd-port': '7401',
    	//'topic-thunder-url': 'http://topic-beta-topicthunder0.aws-ireland.innotechapp.com/#/panel?id=bbvaes-pro',
        //'topic-thunder-url': 'http://hydra-v3-demo-server-0:7401/mod/dashboard',
        'topic-thunder-url': '',
        'probe-password': '',
        'hydra-probe-port': '9099'
    },
    configWindow: null,
    maxAbsoluteChartPoints: 999,
    maxAreaChartPoints: 12,
    launch: function() {
        var me = this;
        $.ajax({
            type: 'GET',
            url: 'http://' + me.config['hydra-server-addr'] + ':' + me.config['hydra-server-admin-port'] + '/apps',
            contentType: "application/json",
            success: function(apps) {
                me.saveApps(apps);
                me.loadUI(me.makeItems(apps));
                me.makeDynamicComponents(apps);
            },
            error: function(e) {
                console.log(e.message);
            }
        });
    },
    saveApps: function(apps) {
        var finalApps = {};
        for (i in apps) {
            var app = apps[i];
            for (appId in app) {
                var appAttrs;
                for (instanceId in app[appId].Instances) {
                    appAttrs = app[appId].Instances[instanceId];
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
        }
        this.apps = finalApps;
    },
    makeItems: function(apps) {
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
                                                        },  {
                                                            fieldLabel: 'Hydra Server Admin Port',
                                                            afterLabelTextTpl: required,
                                                            id: 'hydra-server-admin-port',
                                                            name: 'hydra-server-admin-port',
                                                            allowBlank: false,
                                                            tooltip: 'Enter your hydra server admin port'
                                                        },  {
                                                            fieldLabel: 'Hydra Server Etcd Port',
                                                            afterLabelTextTpl: required,
                                                            id: 'hydra-server-etcd-port',
                                                            name: 'hydra-server-etcd-port',
                                                            allowBlank: false,
                                                            tooltip: 'Enter your hydra server etcd port'
                                                        },  {
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
    makeDynamicComponents: function(apps) {
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
        }
    },
    loadUI: function(items) {
        var me = this;
        Ext.create('Ext.container.Viewport', {
            id: 'viewport',
            layout: {
                type: 'fit'
            },
            items: me.makeItems(items)
        });
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
            console.log("DATA " + index + " = " + me.apps[appId].charts.absolutes[attr].data[index].length);
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
            console.log("ENTRA");
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
            collapsible: true,
            title: appId,
            store: store,
            multiSelect: true,
            viewConfig: {
                emptyText: 'No instances to display'
            },
            columns: this.defineGridColumns(fields)
        });
    },
    createStore: function(appId) {
        return Ext.create('Ext.data.Store', {
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
    preExecuteAction: function(action, grid, rowIndex) {
    	me = this
    	var rec = grid.getStore().getAt(rowIndex);
        var extractPort = function(uri) {
            return uri.substring(0, uri.lastIndexOf(":"));
        };
        var addr = extractPort(rec.get('uri')) + ":" + me.config['hydra-probe-port'];
        me.executeInstanceAction(action, addr);
    },
    executeDeleteAction: function(instance, app) {
    	var me = this;
    	addr = 'http://' + me.config['hydra-server-addr'] + ':' + me.config['hydra-server-etcd-port'] + '/v2/keys/db/apps/Instances/' + app + '/' + instance + '?recursive=true'; 
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
            width: 124,
            items: [{
                    iconCls: 'icon-stress',
                    text: 'Stress',
                    tooltip: 'stress',
                    handler: function(grid, rowIndex, colIndex) {
                    	me.preExecuteAction('stress', grid, rowIndex)
                    }
                }, {
                    iconCls: 'icon-halt',
                    text: 'Halt',
                    tooltip: 'halt',
                    handler: function(grid, rowIndex, colIndex) {
                        me.preExecuteAction('halt', grid, rowIndex)
                    }
                }, {
                    iconCls: 'icon-ready',
                    text: 'Ready',
                    tooltip: 'ready',
                    handler: function(grid, rowIndex, colIndex) {
                    	me.preExecuteAction('ready', grid, rowIndex)
                    }
                }, {
                    iconCls: 'icon-lock',
                    text: 'Lock',
                    tooltip: 'lock',
                    handler: function(grid, rowIndex, colIndex) {
                    	me.preExecuteAction('lock', grid, rowIndex)
                    }
                }, {
                    iconCls: 'icon-unlock',
                    text: 'Unlock',
                    tooltip: 'unlock',
                    handler: function(grid, rowIndex, colIndex) {
                    	me.preExecuteAction('unlock', grid, rowIndex)
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
            Ext.Ajax.request({
                url: 'http://' + me.config['hydra-server-addr'] + ':' + me.config['hydra-server-admin-port'] + '/apps/' + appId + '/Instances',
                success: function(response, request) {
                    console.log(result);
                    console.log(request);
                    var result = Ext.decode(response.responseText);
                    var now = (new Date()).getTime(); // current time
                    var records = [];
                    var j = 0;
                    for (i in result) {
                        var instance = result[i];
                        for (instanceId in instance) {
                            var record = {'id': instanceId};
                            for (key in instance[instanceId]) {
                                record[key] = instance[instanceId][key];
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
                                    console.log("DATA " + j + " = " + me.apps[appId].charts.absolutes[attr].data[j].length);
                                    areaSerie.addPoint([x, y], true, true);
                                    me.apps[appId].charts.areas[attr].data[j].push([x, y]);
                                    console.log("DATA " + j + " = " + me.apps[appId].charts.areas[attr].data[j].length);
                                }
                            }
                            records.push(record);
                            j++;
                        }
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
