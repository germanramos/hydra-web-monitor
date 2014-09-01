Ext.define('HydraWM.config.Config',{
    singleton : true,
    config : {
        hydraServerAddr: 'localhost',
        hydraServerAdminPort: '7771',
        hydraServerEtcdPort: '4001',
        iframeAddr: 'http://www.marca.com',
        probePassword: '',
        hydraProbePort: '9099'
    }
    ,
    constructor : function(config){
        this.initConfig(config);
    }
});