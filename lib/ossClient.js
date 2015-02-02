/**
 * User: ngnono
 * Date: 15-1-29
 * Time: 下午3:19
 * To change this template use File | Settings | File Templates.
 */

'use strict';

var OSS = require('aliyun-oss');

function createOss(opts){
    return OSS.createClient(opts);
}


exports.createOssClient = createOss;