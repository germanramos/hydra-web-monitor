Ext.define('HydraWM.config.Config',{
    singleton : true,
    config : {
        hydraServerAddr: 'localhost',
        hydraServerAdminPort: '7771',
        hydraServerEtcdPort: '4001',
        iframeAddr: 'http://localhost:4001/mod/dashboard',
        probePassword: '',
        hydraProbePort: '9099'
    }
    ,
    constructor : function(config){
        this.initConfig(config);
    }
});