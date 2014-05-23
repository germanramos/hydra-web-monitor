Ext.define('HydraWM.view.Main', {
    extend: 'Ext.container.Container',
    requires:[
        'Ext.tab.Panel',
        'Ext.layout.container.Border'
    ],
    
    xtype: 'app-main',

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
        height: 250
//        tools: [{
//            type: 'gear',
//            callback: function (panel, tool) {
//                function setWeight () {
//                    panel.setRegionWeight(parseInt(this.text, 10));
//                }
//
//                var regionMenu = panel.regionMenu || (panel.regionMenu =
//                    Ext.widget({
//                        xtype: 'menu',
//                        items: [{
//                            text: 'North',
//                            glyph: '9650@',
//                            handler: function () {
//                                panel.setBorderRegion('north');
//                            }
//                        },{
//                            text: 'South',
//                            glyph: '9660@',
//                            handler: function () {
//                                panel.setBorderRegion('south');
//                            }
//                        },{
//                            text: 'East',
//                            glyph: '9658@',
//                            handler: function () {
//                                panel.setBorderRegion('east');
//                            }
//                        },{
//                            text: 'West',
//                            glyph: '9668@',
//                            handler: function () {
//                                panel.setBorderRegion('west');
//                            }
//                        },
//                        '-', {
//                            text: 'Weight',
//                            menu: [{
//                                text: '-10',
//                                group: 'weight',
//                                xtype: 'menucheckitem',
//                                handler: setWeight
//                            },{
//                                text: '10',
//                                group: 'weight',
//                                xtype: 'menucheckitem',
//                                handler: setWeight
//                            },{
//                                text: '20',
//                                group: 'weight',
//                                xtype: 'menucheckitem',
//                                handler: setWeight
//                            },{
//                                text: '50',
//                                group: 'weight',
//                                xtype: 'menucheckitem',
//                                handler: setWeight
//                            },{
//                                text: '100',
//                                group: 'weight',
//                                xtype: 'menucheckitem',
//                                handler: setWeight
//                            }]
//                        }]
//                    }));
//
//                regionMenu.showBy(tool.el);
//            }
//        }]
    },{
        region: 'west',
        xtype: 'panel',
        title: 'Topic Thunder',
        collapsible: true,
        split: true,
        width: 250
    },{
        region: 'center',
        xtype: 'panel',
        id: 'app-grids',
        title: 'Applications',
        layout: {
            type:'vbox',
            padding:'5',
            align:'stretch'
        },
        items: []
    }]
});