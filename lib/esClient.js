/**
 * User: ngnono
 * Date: 15-1-29
 * Time: 下午4:03
 * To change this template use File | Settings | File Templates.
 */

'use strict';


'use strict';

var es = require('elasticsearch');
//var logging = require('./logging')('esclient');

/**
 * 封装的 ElasticSearch 客户端
 * @param opts
 * @returns {es.Client|*}
 * @constructor
 */
function esClient(opts) {
//    if (!(this instanceof esClient)) {
//        return new esClient(opts);
//    }

    //logging.debug(opts);

    var options = opts || {};

    //  host: this.options.host
    var client = new es.Client(options);

    return client;
}


exports.createESClient = esClient;